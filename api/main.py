"""
PulseGuard API (FastAPI).

Serves the dashboard and exposes real-time prediction endpoints. Run from the
repo root:

    uvicorn api.main:app --reload --port 8000

Then open http://localhost:8000/docs for the auto-generated Swagger UI (this is
the "comprehensive API documentation" deliverable: it is generated from the code,
always in sync, and is a good 15-second moment in the demo).

Endpoints
  GET  /api/fleet                 fleet snapshot + summary counts
  GET  /api/device/{id}           one device: risks, SHAP reasons, recommendation
  GET  /api/metrics               model metrics (PR-AUC / recall / FPR / RMSE)
  GET  /api/timeline              the live-replay degradation timeline
  POST /api/predict/storage       score a single drive's SMART reading (+ why)
  POST /api/predict/device        fuse raw telemetry into a Device Health Score
  GET  /api/integrations/{system} mock SCOM / Nagios / Zabbix adapter

The fleet/metrics/timeline routes serve the precomputed snapshot in
frontend_data.json (so the API and dashboard always agree). Regenerate it with
`python export_data.py`. The /predict routes run live model inference.
"""
from __future__ import annotations

import json
import os
import time

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from src import features as fe
from src import fusion
from src.explain import explain, predict_proba
from src.data_gen import SMART_FEATURES

ROOT = os.path.dirname(os.path.dirname(__file__))
SNAPSHOT = os.path.join(ROOT, "frontend_data.json")

app = FastAPI(title="PulseGuard API",
              description="Predictive hardware failure detection.",
              version="1.0.0")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

_snap = {}


@app.on_event("startup")
def _load():
    global _snap
    if os.path.exists(SNAPSHOT):
        _snap = json.load(open(SNAPSHOT))
    # warm the model cache so the first /predict is also fast
    predict_proba("storage", {f: 0.0 for f in SMART_FEATURES})


# --------------------------------------------------------------------------- #
# snapshot routes
# --------------------------------------------------------------------------- #
@app.get("/api/fleet")
def fleet():
    if not _snap:
        raise HTTPException(503, "snapshot not generated; run export_data.py")
    return {"summary": _snap["summary"], "fleet": _snap["fleet"]}


@app.get("/api/device/{device_id}")
def device(device_id: str):
    row = next((d for d in _snap.get("fleet", []) if d["device"] == device_id), None)
    det = _snap.get("details", {}).get(device_id)
    if row is None:
        raise HTTPException(404, "unknown device")
    return {**row, "detail": det}


@app.get("/api/metrics")
def metrics():
    return _snap.get("metrics", {})


@app.get("/api/timeline")
def timeline():
    return _snap.get("timeline", {})


# --------------------------------------------------------------------------- #
# live prediction
# --------------------------------------------------------------------------- #
class SmartReading(BaseModel):
    smart_5_raw: float = Field(0, description="Reallocated sectors")
    smart_187_raw: float = 0
    smart_188_raw: float = 0
    smart_197_raw: float = Field(0, description="Pending sectors")
    smart_198_raw: float = Field(0, description="Offline uncorrectable")
    smart_9_raw: float = 10000
    smart_194_raw: float = 30
    smart_12_raw: float = 50
    # optional 7-day-ago values to compute trend; default to current (no change)
    prev_smart_5_raw: float | None = None
    prev_smart_197_raw: float | None = None
    prev_smart_198_raw: float | None = None
    prev_smart_187_raw: float | None = None


def _storage_row(r: SmartReading) -> dict:
    row = {f: getattr(r, f) for f in SMART_FEATURES}
    for c in ["smart_5_raw", "smart_197_raw", "smart_198_raw", "smart_187_raw"]:
        prev = getattr(r, "prev_" + c)
        row[f"{c}_d7"] = float(row[c] - (prev if prev is not None else row[c]))
        row[f"{c}_roll7"] = float(row[c])
    return row


@app.post("/api/predict/storage")
def predict_storage(reading: SmartReading):
    t0 = time.time()
    row = _storage_row(reading)
    risk = predict_proba("storage", row)
    why = explain("storage", row, top_k=3)
    return {"storage_risk": round(risk, 4), "why": why,
            "latency_ms": round((time.time() - t0) * 1000, 1)}


class DeviceTelemetry(BaseModel):
    smart: SmartReading
    air_temp_k: float = 300
    process_temp_k: float = 310
    rotational_speed_rpm: float = 1500
    torque_nm: float = 40
    tool_wear_min: float = 100
    rul_days: float = 120


@app.post("/api/predict/device")
def predict_device(t: DeviceTelemetry):
    t0 = time.time()
    s_risk = predict_proba("storage", _storage_row(t.smart))
    comp = fe.component_features_single({
        "air_temp_k": t.air_temp_k, "process_temp_k": t.process_temp_k,
        "rotational_speed_rpm": t.rotational_speed_rpm, "torque_nm": t.torque_nm,
        "tool_wear_min": t.tool_wear_min})
    c_risk = predict_proba("components", comp)
    fused = fusion.fuse(s_risk, c_risk, t.rul_days)
    rec = fusion.recommend(fused)
    return {**fused, "recommendation": rec,
            "latency_ms": round((time.time() - t0) * 1000, 1)}


# --------------------------------------------------------------------------- #
# mock monitoring integration adapter (the brief asks for SCOM/Nagios/Zabbix).
# A real deployment would poll the system's API; here we show the normalization
# layer that maps any source's fields onto PulseGuard's telemetry schema.
# --------------------------------------------------------------------------- #
_ADAPTERS = {
    "scom":   {"DiskReallocCount": "smart_5_raw", "PendingSectors": "smart_197_raw",
               "DriveTempC": "smart_194_raw"},
    "nagios": {"reallocated_sectors": "smart_5_raw", "pending_sectors": "smart_197_raw",
               "temperature": "smart_194_raw"},
    "zabbix": {"smart.reallocated": "smart_5_raw", "smart.pending": "smart_197_raw",
               "sensor.temp": "smart_194_raw"},
}


@app.get("/api/integrations/{system}")
def integration(system: str):
    system = system.lower()
    if system not in _ADAPTERS:
        raise HTTPException(404, f"no adapter for '{system}'. options: {list(_ADAPTERS)}")
    mapping = _ADAPTERS[system]
    # a sample raw payload as the source system would emit it
    sample_raw = {src: v for src, v in zip(mapping, [128, 64, 41])}
    normalized = {mapping[src]: val for src, val in sample_raw.items()}
    return {"system": system, "field_mapping": mapping,
            "sample_raw_payload": sample_raw, "normalized_to_pulseguard": normalized}


@app.get("/")
def root():
    return {"service": "PulseGuard API", "docs": "/docs",
            "endpoints": ["/api/fleet", "/api/device/{id}", "/api/metrics",
                          "/api/timeline", "/api/predict/storage",
                          "/api/predict/device", "/api/integrations/{system}"]}
