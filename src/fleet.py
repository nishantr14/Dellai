"""
Fleet assembly: bind the three models to concrete 'devices' (servers) so the
dashboard has a realistic fleet to monitor, and provide the degrading-device
timeline used for the live demo's 'wow' moment.

A device = one disk (storage telemetry) + one thermal/power/mechanical reading
+ one engine unit at a given wear cycle. The fleet is deterministic (seeded) so
the demo is identical every run.
"""
from __future__ import annotations

import os
import numpy as np
import pandas as pd

from . import data_gen as dg
from . import features as fe
from . import fusion
from .explain import predict_proba, MODEL_DIR

RACKS = ["RACK-A", "RACK-B", "RACK-C", "RACK-D"]
_cache = {}


def _load_data():
    if "storage" not in _cache:
        _cache["storage"] = pd.read_csv(os.path.join(dg.DATA_DIR, "storage.csv"))
        _cache["components"] = pd.read_csv(os.path.join(dg.DATA_DIR, "components.csv"))
        _cache["rul"] = pd.read_csv(os.path.join(dg.DATA_DIR, "rul.csv"))
    return _cache["storage"], _cache["components"], _cache["rul"]


def _drive_row_at(storage: pd.DataFrame, serial: str, current_day: int) -> dict:
    h = storage[(storage.serial_number == serial) & (storage.day <= current_day)]
    if h.empty:
        h = storage[storage.serial_number == serial]
    return fe.storage_features_single(h)


def _failing_serials(storage: pd.DataFrame):
    f = storage.groupby("serial_number")["failure"].max()
    return f[f == 1].index.tolist()


def _component_risk(reading: dict) -> float:
    return predict_proba("components", fe.component_features_single(reading))


def _rul_days(rul: pd.DataFrame, unit: int, cycle: int) -> float:
    import joblib
    if "rul_bundle" not in _cache:
        _cache["rul_bundle"] = joblib.load(os.path.join(MODEL_DIR, "rul.joblib"))
    bundle = _cache["rul_bundle"]
    row = rul[(rul.unit == unit) & (rul.cycle == cycle)]
    if row.empty:
        row = rul[rul.unit == unit].tail(1)
    pred = float(bundle["model"].predict(row[bundle["features"]])[0])
    return max(0.0, pred)


def _day_for_storage_risk(storage, serial, target, fd):
    """Find the day in this drive's life whose storage risk is closest to target."""
    best_day, best_gap = max(5, fd - 40), 9.9
    for day in range(max(5, fd - 42), fd):
        r = predict_proba("storage", _drive_row_at(storage, serial, day))
        if abs(r - target) < best_gap:
            best_gap, best_day = abs(r - target), day
    return best_day


# (target_storage_risk, use_failing_drive, component_failed, rul_days)
PROFILES = (
    [("healthy", 0.05, False, False, None)] * 17 +
    [("watch_disk", 0.60, True, False, None)] * 4 +
    [("watch_engine", 0.02, False, False, 12.0)] * 2 +
    [("crit_disk", 0.95, True, False, None)] * 2 +
    [("crit_thermal", 0.02, False, True, None)] * 2 +
    [("crit_multi", 0.95, True, True, 5.0)] * 1
)


def build_fleet(n: int = 28, seed: int = 11) -> list[fusion.Device]:
    storage, components, rul = _load_data()
    rng = np.random.default_rng(seed)

    fail_serials = _failing_serials(storage)
    healthy_serials = [s for s in storage.serial_number.unique() if s not in fail_serials]
    fail_days = storage[storage.failure == 1].set_index("serial_number")["day"].to_dict()
    comp_fail = components[components.machine_failure == 1].reset_index(drop=True)
    comp_ok = components[components.machine_failure == 0].reset_index(drop=True)
    units = rul.unit.unique()

    profiles = list(PROFILES)[:n]
    rng.shuffle(profiles)

    devices = []
    for i, (prof, s_target, use_fail, comp_failed, rul_override) in enumerate(profiles):
        did = f"srv-{i+1:03d}"
        rack = RACKS[i % len(RACKS)]

        # ---- storage subsystem ----
        if use_fail:
            serial = str(rng.choice(fail_serials))
            fd = fail_days.get(serial, 80)
            cur_day = _day_for_storage_risk(storage, serial, s_target, fd)
        else:
            serial = str(rng.choice(healthy_serials))
            cur_day = int(rng.integers(30, 90))
        s_risk = predict_proba("storage", _drive_row_at(storage, serial, cur_day))

        # ---- thermal / power / mechanical subsystem ----
        pool = comp_fail if comp_failed else comp_ok
        comp_reading = pool.sample(1, random_state=int(rng.integers(0, 1e6))).iloc[0].to_dict()
        c_risk = _component_risk(comp_reading)

        # ---- engine RUL subsystem ----
        if rul_override is not None:
            rul_d = rul_override
        else:
            rul_d = _rul_days(rul, int(rng.choice(units)), int(rng.integers(5, 55)))

        dev = fusion.Device(did, rack, round(s_risk, 4), round(c_risk, 4), round(rul_d, 1))
        dev.detail = {"profile": prof, "drive_serial": serial, "current_day": cur_day,
                      "component_reading": comp_reading}
        devices.append(dev.score())

    return devices


def fleet_to_frame(devices) -> pd.DataFrame:
    rows = []
    for d in devices:
        rows.append({
            "device": d.device_id, "rack": d.rack,
            "health": d.fused["health_score"], "tier": d.rec["tier"],
            "storage_risk": d.storage_risk, "component_risk": d.component_risk,
            "rul_days": d.rul_days, "dominant": d.rec["dominant_label"],
            "priority": d.rec["priority"],
        })
    return pd.DataFrame(rows)


# --------------------------------------------------------------------------- #
# Live-demo timeline: one disk degrading from healthy to failure. Storage drives
# the story; thermal and engine are held steady so the disk collapse is clear.
# --------------------------------------------------------------------------- #
def demo_timeline(component_risk: float = 0.05, rul_days: float = 90.0):
    storage, _, _ = _load_data()
    fail_serials = _failing_serials(storage)
    fail_days = storage[storage.failure == 1].set_index("serial_number")["day"].to_dict()
    # pick a failing drive with a decent warning window for a clean narrative
    serial = max(fail_serials, key=lambda s: fail_days.get(s, 0))
    fd = fail_days[serial]
    timeline = []
    for day in range(max(0, fd - 34), fd + 1):
        row = _drive_row_at(storage, serial, day)
        s_risk = predict_proba("storage", row)
        fused = fusion.fuse(s_risk, component_risk, rul_days)
        rec = fusion.recommend(fused)
        timeline.append({
            "day": day, "days_to_failure": fd - day,
            "storage_risk": round(s_risk, 4), "health": fused["health_score"],
            "tier": rec["tier"], "color": rec["color"],
            "smart_5": row["smart_5_raw"], "smart_197": row["smart_197_raw"],
            "smart_198": row["smart_198_raw"], "row": row,
        })
    return serial, timeline
