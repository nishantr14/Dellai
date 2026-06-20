"""
Explainability layer (SHAP).

Every alert PulseGuard raises comes with a "why": the top signals pushing this
device toward failure, in plain English. This is the decision trail judges (and
real operators) need to trust an automated prediction.

We use SHAP TreeExplainer (exact and fast for gradient-boosted trees).
"""
from __future__ import annotations

import functools
import os

import joblib
import numpy as np
import pandas as pd
import shap

MODEL_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "models")

# human-readable signal names for the SMART + AI4I features
SIGNAL_NAMES = {
    "smart_5_raw": "Reallocated sectors",
    "smart_187_raw": "Uncorrectable errors reported",
    "smart_188_raw": "Command timeouts",
    "smart_197_raw": "Pending sectors (awaiting reallocation)",
    "smart_198_raw": "Offline uncorrectable sectors",
    "smart_9_raw": "Power-on hours",
    "smart_194_raw": "Drive temperature",
    "smart_12_raw": "Power-cycle count",
    "smart_5_raw_d7": "Reallocated sectors (7-day rise)",
    "smart_197_raw_d7": "Pending sectors (7-day rise)",
    "smart_198_raw_d7": "Offline uncorrectable (7-day rise)",
    "smart_187_raw_d7": "Uncorrectable errors (7-day rise)",
    "smart_5_raw_roll7": "Reallocated sectors (7-day avg)",
    "smart_197_raw_roll7": "Pending sectors (7-day avg)",
    "smart_198_raw_roll7": "Offline uncorrectable (7-day avg)",
    "smart_187_raw_roll7": "Uncorrectable errors (7-day avg)",
    "air_temp_k": "Ambient temperature",
    "process_temp_k": "Process temperature",
    "rotational_speed_rpm": "Fan / rotor speed",
    "torque_nm": "Torque / load",
    "tool_wear_min": "Mechanical wear",
    "temp_diff_k": "Thermal margin (process - ambient)",
    "power_w": "Power draw",
    "wear_torque": "Wear x load (overstrain index)",
    # NASA C-MAPSS turbofan sensors (canonical FD001 definitions, Saxena 2008)
    "sensor_1": "Fan inlet temperature",
    "sensor_2": "LPC outlet temperature",
    "sensor_3": "HPC outlet temperature",
    "sensor_4": "LPT outlet temperature",
    "sensor_5": "Fan inlet pressure",
    "sensor_6": "Bypass-duct pressure",
    "sensor_7": "HPC outlet pressure",
    "sensor_8": "Physical fan speed",
    "sensor_9": "Physical core speed",
    "sensor_10": "Engine pressure ratio",
    "sensor_11": "HPC outlet static pressure",
    "sensor_12": "Fuel flow to HPC-pressure ratio",
    "sensor_13": "Corrected fan speed",
    "sensor_14": "Corrected core speed",
    "sensor_15": "Bypass ratio",
    "sensor_16": "Burner fuel-air ratio",
    "sensor_17": "Bleed enthalpy",
    "sensor_18": "Demanded fan speed",
    "sensor_19": "Demanded corrected fan speed",
    "sensor_20": "HPT coolant bleed flow",
    "sensor_21": "LPT coolant bleed flow",
    "op_setting_1": "Operating condition (altitude)",
    "op_setting_2": "Operating condition (Mach number)",
    "op_setting_3": "Operating condition (throttle angle)",
}


@functools.lru_cache(maxsize=4)
def _load(name: str):
    bundle = joblib.load(os.path.join(MODEL_DIR, f"{name}.joblib"))
    explainer = shap.TreeExplainer(bundle["model"])
    return bundle, explainer


def explain(name: str, feature_row: dict, top_k: int = 3) -> list[dict]:
    """Return the top_k signals driving this prediction, with direction."""
    bundle, explainer = _load(name)
    feats = bundle["features"]
    X = pd.DataFrame([{f: feature_row.get(f, 0.0) for f in feats}])
    sv = explainer.shap_values(X)
    vals = sv[0] if isinstance(sv, list) else np.asarray(sv)[0]
    # The storage/components models predict FAILURE risk, so SHAP>0 => raises risk.
    # The RUL model is a regressor predicting REMAINING life, so the sign is
    # inverted: SHAP>0 pushes remaining life UP => lowers risk.
    risk_sign = -1.0 if name == "rul" else 1.0
    order = np.argsort(np.abs(vals))[::-1][:top_k]
    out = []
    for i in order:
        f = feats[i]
        out.append({
            "signal": SIGNAL_NAMES.get(f, f),
            "raw_feature": f,
            "value": round(float(X.iloc[0, i]), 2),
            "impact": round(float(vals[i]), 4),
            "direction": "raises risk" if vals[i] * risk_sign > 0 else "lowers risk",
        })
    return out


def predict_proba(name: str, feature_row: dict) -> float:
    bundle, _ = _load(name)
    feats = bundle["features"]
    X = pd.DataFrame([{f: feature_row.get(f, 0.0) for f in feats}])
    return float(bundle["model"].predict_proba(X)[0, 1])
