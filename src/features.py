"""Feature engineering shared by training and live inference.

Keeping this in one place means the dashboard scores a device with exactly the
same features the model was trained on (no train/serve skew).
"""
from __future__ import annotations

import numpy as np
import pandas as pd

from .data_gen import SMART_FEATURES, AI4I_FEATURES, RUL_SENSORS


# --------------------------------------------------------------------------- #
# STORAGE: current SMART values + short rolling trends per drive.
# The rate of change of reallocated/pending sectors is far more predictive than
# the raw level, so we engineer 7-day deltas and slopes.
# --------------------------------------------------------------------------- #
STORAGE_TREND_BASE = ["smart_5_raw", "smart_197_raw", "smart_198_raw", "smart_187_raw"]


def storage_features(df: pd.DataFrame) -> pd.DataFrame:
    df = df.sort_values(["serial_number", "day"]).copy()
    # Vectorized cythonized groupby ops (no per-group python lambda) so this
    # scales to the real Backblaze fleet (~10^5 drives) instead of crawling.
    # 7-day delta + 7-day rolling level per failure-indicator SMART attr; raw
    # smart_9_raw (power-on hours = drive age) is already a feature. NOTE: 1-day
    # deltas and cumulative-growth features were tested (see ablation) and dropped
    # -- on this extremely sparse problem they overfit and regressed held-out
    # ROC/PR-AUC, so we keep the leaner 16-feature set that generalizes better.
    g = df.groupby("serial_number", sort=False, observed=True)
    for col in STORAGE_TREND_BASE:
        df[f"{col}_d7"] = (df[col] - g[col].shift(7)).fillna(0)
        df[f"{col}_roll7"] = (
            g[col].rolling(7, min_periods=1).mean().reset_index(level=0, drop=True)
        )
    feat = SMART_FEATURES + [f"{c}_d7" for c in STORAGE_TREND_BASE] + \
        [f"{c}_roll7" for c in STORAGE_TREND_BASE]
    return df, feat


def storage_features_single(history: pd.DataFrame) -> dict:
    """Feature vector for one drive given its recent history (ascending by day).
    MUST stay in lockstep with storage_features() to avoid train/serve skew."""
    history = history.sort_values("day")
    row = {c: float(history[c].iloc[-1]) for c in SMART_FEATURES}
    for col in STORAGE_TREND_BASE:
        s = history[col]
        row[f"{col}_d7"] = float(s.iloc[-1] - (s.iloc[-8] if len(s) > 7 else s.iloc[0]))
        row[f"{col}_roll7"] = float(s.tail(7).mean())
    return row


# --------------------------------------------------------------------------- #
# COMPONENTS: AI4I features + two physics-derived terms the failure rules use.
# --------------------------------------------------------------------------- #
def component_features(df: pd.DataFrame) -> pd.DataFrame:
    df = df.copy()
    df["temp_diff_k"] = df["process_temp_k"] - df["air_temp_k"]
    df["power_w"] = df["torque_nm"] * df["rotational_speed_rpm"] * 2 * np.pi / 60.0
    df["wear_torque"] = df["tool_wear_min"] * df["torque_nm"]
    feat = AI4I_FEATURES + ["temp_diff_k", "power_w", "wear_torque"]
    return df, feat


def component_features_single(reading: dict) -> dict:
    r = dict(reading)
    r["temp_diff_k"] = r["process_temp_k"] - r["air_temp_k"]
    r["power_w"] = r["torque_nm"] * r["rotational_speed_rpm"] * 2 * np.pi / 60.0
    r["wear_torque"] = r["tool_wear_min"] * r["torque_nm"]
    return r


# --------------------------------------------------------------------------- #
# RUL: per-cycle sensors + op settings. train_rul drops the constant/low-variance
# columns (FD001 has several flat sensors); the kept list rides in the model
# bundle so serving stays consistent. NOTE: per-unit rolling mean/std features
# were tested (see ablation) and dropped -- they regressed held-out RMSE
# (17.48 -> 17.86), so we keep the leaner raw-sensor set.
# --------------------------------------------------------------------------- #
def rul_features(df: pd.DataFrame) -> tuple[pd.DataFrame, list]:
    df = df.sort_values(["unit", "cycle"]).copy()
    feat = RUL_SENSORS + ["op_setting_1", "op_setting_2", "op_setting_3"]
    return df, feat
