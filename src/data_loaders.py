"""
Loaders for the REAL public datasets.

The sandbox cannot download these, so the team runs this locally after grabbing
the files. Each loader maps a real dataset onto the exact schema the synthetic
generators produce, so the rest of the pipeline (features -> train -> export)
runs unchanged. Workflow:

    1. download the datasets (see paths below)
    2. python -m src.data_loaders --storage <dir> --components <csv> --rul <txt>
    3. python -m src.train      # now trains on real data
    4. python export_data.py

These functions are written to the documented schemas of each dataset. Verify
column names against your downloaded copy, since vendors occasionally rename.
"""
from __future__ import annotations

import argparse
import glob
import os

import numpy as np
import pandas as pd

from .data_gen import DATA_DIR, SMART_FEATURES, RUL_SENSORS, RUL_CAP, record_source


# --------------------------------------------------------------------------- #
# Backblaze: https://www.backblaze.com/cloud-storage/resources/hard-drive-test-data
# Daily snapshot CSVs (one per day) with date, serial_number, model,
# capacity_bytes, failure, and many smart_N_raw / smart_N_normalized columns.
# --------------------------------------------------------------------------- #
def load_real_storage(path: str, label_horizon: int = 30) -> pd.DataFrame:
    files = sorted(glob.glob(os.path.join(path, "*.csv"))) if os.path.isdir(path) else [path]
    keep = ["date", "serial_number", "model", "capacity_bytes", "failure", *SMART_FEATURES]
    frames = []
    for f in files:
        df = pd.read_csv(f)
        cols = [c for c in keep if c in df.columns]
        frames.append(df[cols])
    df = pd.concat(frames, ignore_index=True)
    df["date"] = pd.to_datetime(df["date"])
    df = df.sort_values(["serial_number", "date"])
    # integer day index per serial (keeps the time order; enables time-based split)
    df["day"] = df.groupby("serial_number").cumcount()
    for c in SMART_FEATURES:
        if c not in df.columns:
            df[c] = 0
        df[c] = df[c].fillna(0)

    # label: does this drive fail within the next `label_horizon` days?
    fail_day = df[df["failure"] == 1].groupby("serial_number")["day"].min().to_dict()
    df["label_fail_30d"] = 0
    mask = df["serial_number"].isin(fail_day)
    fd = df.loc[mask, "serial_number"].map(fail_day)
    df.loc[mask, "label_fail_30d"] = ((fd - df.loc[mask, "day"]).between(0, label_horizon)).astype(int)
    return df[["day", "serial_number", "model", "capacity_bytes", "failure",
               *SMART_FEATURES, "label_fail_30d"]]


# --------------------------------------------------------------------------- #
# AI4I 2020: https://archive.ics.uci.edu/dataset/601/ai4i+2020+predictive+maintenance+dataset
# --------------------------------------------------------------------------- #
AI4I_RENAME = {
    "Air temperature [K]": "air_temp_k", "Process temperature [K]": "process_temp_k",
    "Rotational speed [rpm]": "rotational_speed_rpm", "Torque [Nm]": "torque_nm",
    "Tool wear [min]": "tool_wear_min", "Machine failure": "machine_failure",
    "TWF": "twf", "HDF": "hdf", "PWF": "pwf", "OSF": "osf", "RNF": "rnf",
    "UDI": "udi", "Product ID": "product_id", "Type": "type",
}


def load_real_components(csv_path: str) -> pd.DataFrame:
    df = pd.read_csv(csv_path).rename(columns=AI4I_RENAME)
    df.columns = [c.lower() for c in df.columns]
    return df


# --------------------------------------------------------------------------- #
# NASA C-MAPSS FD001: https://www.nasa.gov/intelligent-systems-division (PCoE)
# Space-separated, no header: unit, cycle, op1..3, sensor1..21.
# --------------------------------------------------------------------------- #
def load_real_rul(txt_path: str) -> pd.DataFrame:
    cols = ["unit", "cycle", "op_setting_1", "op_setting_2", "op_setting_3", *RUL_SENSORS]
    df = pd.read_csv(txt_path, sep=r"\s+", header=None).dropna(axis=1, how="all")
    df = df.iloc[:, :len(cols)]
    df.columns = cols
    max_cycle = df.groupby("unit")["cycle"].transform("max")
    df["RUL"] = np.minimum(max_cycle - df["cycle"], RUL_CAP)
    return df


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--storage", help="Backblaze dir or csv")
    ap.add_argument("--components", help="AI4I csv")
    ap.add_argument("--rul", help="C-MAPSS train_FD001.txt")
    a = ap.parse_args()
    os.makedirs(DATA_DIR, exist_ok=True)
    if a.storage:
        load_real_storage(a.storage).to_csv(os.path.join(DATA_DIR, "storage.csv"), index=False)
        record_source("storage", "real")
        print("wrote real storage.csv")
    if a.components:
        load_real_components(a.components).to_csv(os.path.join(DATA_DIR, "components.csv"), index=False)
        record_source("components", "real")
        print("wrote real components.csv")
    if a.rul:
        load_real_rul(a.rul).to_csv(os.path.join(DATA_DIR, "rul.csv"), index=False)
        record_source("rul", "real")
        print("wrote real rul.csv")


if __name__ == "__main__":
    main()
