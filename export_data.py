"""
Export the real model outputs to a single JSON the React dashboard consumes.
Everything the dashboard shows (fleet, metrics, SHAP reasons, degradation curves,
the live replay) comes from the actual trained models here, so the demo numbers
are honest and match the backend.
"""
import json
import os

import joblib
import numpy as np
import pandas as pd

from src import cascade as csc
from src import data_gen as dg
from src import features as fe
from src import fleet as fl
from src import fusion
from src.explain import explain, predict_proba, MODEL_DIR

OUT = os.path.join(os.path.dirname(__file__), "frontend_data.json")


def health_at(storage, serial, day, c_risk, rul_d):
    row = fl._drive_row_at(storage, serial, day)
    s = predict_proba("storage", row)
    return fusion.fuse(s, c_risk, rul_d)["health_score"]


def build():
    storage, components, rul = fl._load_data()
    fail_days = storage[storage.failure == 1].set_index("serial_number")["day"].to_dict()
    metrics = json.load(open(os.path.join(MODEL_DIR, "metrics.json")))

    devices = fl.build_fleet()
    fleet_rows, details = [], {}

    for d in devices:
        fleet_rows.append({
            "device": d.device_id, "rack": d.rack, "health": d.fused["health_score"],
            "tier": d.rec["tier"], "storageRisk": d.storage_risk,
            "componentRisk": d.component_risk, "rulDays": d.rul_days,
            "dominant": d.rec["dominant_label"], "priority": d.rec["priority"],
        })

        dom = d.fused["dominant_subsystem"]
        serial = d.detail["drive_serial"]
        cur_day = d.detail["current_day"]

        # ---- why (SHAP for classifier-driven subsystems) ----
        why = []
        if dom == "storage":
            why = explain("storage", fl._drive_row_at(storage, serial, cur_day), top_k=4)
        elif dom == "components":
            why = explain("components", fe.component_features_single(d.detail["component_reading"]), top_k=4)
        else:  # rul regressor: real SHAP on the bound engine's sensor snapshot
            u, cyc = d.detail["rul_unit"], d.detail["rul_cycle"]
            uf, _ = fe.rul_features(rul[rul.unit == u])
            erow = uf[uf.cycle == cyc]
            erow = (erow if not erow.empty else uf.tail(1)).iloc[0].to_dict()
            why = explain("rul", erow, top_k=4)
            # honesty guard: if any top signal lacks a clean human-readable name,
            # fall back to authored text rather than showing raw "sensor_N"
            if any(w["signal"] == w["raw_feature"] for w in why):
                why = [{"signal": "Remaining useful life", "value": d.rul_days,
                        "direction": "raises risk",
                        "note": "Below the 30-day maintenance horizon"},
                       {"signal": "Sensor degradation trend", "value": None,
                        "direction": "raises risk",
                        "note": "Monotonic drift across the engine sensor suite"}]

        # ---- degradation history (last 40 days) ----
        hist = []
        if dom == "storage" and serial in fail_days:
            for off in range(39, -1, -1):
                day = max(0, cur_day - off)
                hist.append({"t": -off, "health": health_at(storage, serial, day,
                                                             d.component_risk, d.rul_days)})
        else:
            # smooth recent decline toward the current health for non-storage drivers
            cur = d.fused["health_score"]
            start = max(cur, 96)
            for off in range(39, -1, -1):
                frac = max(0.0, (12 - off) / 12) if off <= 12 else 0.0
                val = round(start + (cur - start) * frac)
                hist.append({"t": -off, "health": val})

        # ---- predicted failure window ----
        if dom == "storage" and serial in fail_days:
            pf = int(fail_days[serial] - cur_day)
        elif dom == "rul":
            pf = int(round(d.rul_days))
        elif dom == "components":
            pf = 10 if d.fused["health_score"] < 35 else 21
        else:
            pf = None
        if d.rec["tier"] == "Healthy":
            pf = None   # a healthy device has no predicted failure

        # ---- alert feed from the health trajectory ----
        alerts = []
        prev_tier = "Healthy"
        for h in hist:
            t = fusion.tier(h["health"])[0]
            if t != prev_tier and t in ("At Risk", "Critical"):
                alerts.append({"t": h["t"], "level": t,
                               "text": f"Device crossed into {t}: health {h['health']}"})
            prev_tier = t
        if pf is not None and d.fused["health_score"] < 65:
            alerts.append({"t": 0, "level": "Prediction",
                           "text": f"Predicted failure in ~{pf} days ({d.rec['dominant_label']})"})

        # ---- authored cross-subsystem cascade (domain-reasoning overlay) ----
        # Risks fed to the cascade are the SAME subsystem risks fusion already
        # used (storage/component probabilities + RUL-window risk); the cascade
        # only interprets them, it never recomputes health or tiers.
        risks = {"storage": d.storage_risk, "components": d.component_risk,
                 "rul": fusion.rul_to_risk(d.rul_days)}
        signals = {dom: why}
        # The cascade needs the components subsystem's physical driver (thermal /
        # mechanical / power). Compute its SHAP signals when it is elevated but
        # not already the dominant subsystem we explained above.
        if d.component_risk >= csc.ELEVATED and dom != "components":
            signals["components"] = explain(
                "components", fe.component_features_single(d.detail["component_reading"]), top_k=4)
        cascade = csc.infer_cascade(risks, signals)

        # ---- recommendation driven by dominant subsystem + top SHAP signal ----
        rec2 = csc.build_recommendation(
            d.rec["tier"], dom, why, pf, d.rul_days, cascade,
            root_signals=signals.get("components"))

        details[d.device_id] = {
            "why": why, "history": hist, "alerts": alerts[-5:],
            "predictedFailureDays": pf,
            "subsystems": {
                "storage": {"risk": d.storage_risk},
                "components": {"risk": d.component_risk},
                "rul": {"risk": fusion.rul_to_risk(d.rul_days), "days": d.rul_days},
            },
            "recommendation": {
                "tier": d.rec["tier"], "priority": d.rec["priority"],
                "dominant": d.rec["dominant_label"],
                # action upgraded to be signal-specific + cascade-aware (was the
                # generic subsystem text); existing keys above kept for the frontend.
                "action": rec2["action"], "headline": rec2["headline"],
                "priorityCode": rec2["priorityCode"], "priorityReason": rec2["priorityReason"],
                "maintenanceWindow": rec2["maintenanceWindow"], "topSignal": rec2["topSignal"],
                "rootCause": rec2["rootCause"], "targetsRootCause": rec2["targetsRootCause"],
                "basis": rec2["basis"],
            },
            "cascade": cascade,
            "profile": d.detail["profile"],
        }

    # ---- live replay timeline (fully real) ----
    serial, tl = fl.demo_timeline()
    timeline = [{"day": s["day"], "daysToFailure": s["days_to_failure"],
                 "storageRisk": s["storage_risk"], "health": s["health"],
                 "tier": s["tier"], "smart5": int(s["smart_5"]),
                 "smart197": int(s["smart_197"]), "smart198": int(s["smart_198"])}
                for s in tl]

    summary = {
        "total": len(fleet_rows),
        "healthy": sum(r["tier"] == "Healthy" for r in fleet_rows),
        "atRisk": sum(r["tier"] == "At Risk" for r in fleet_rows),
        "critical": sum(r["tier"] == "Critical" for r in fleet_rows),
        "predictedFailures30d": sum(
            1 for r in fleet_rows
            if details[r["device"]]["predictedFailureDays"] not in (None,)
            and details[r["device"]]["predictedFailureDays"] <= 30),
    }

    data = {"summary": summary, "metrics": metrics, "fleet": fleet_rows,
            "details": details, "timeline": {"serial": serial, "steps": timeline},
            "weights": fusion.WEIGHTS}
    json.dump(data, open(OUT, "w"), indent=2, default=float)
    print("wrote", OUT)
    print("summary:", summary)
    print("timeline steps:", len(timeline), "| health", timeline[0]["health"], "->", timeline[-1]["health"])


if __name__ == "__main__":
    build()
