"""
PulseGuard synthetic data generators.

The sandbox these models are first built in cannot reach Kaggle / Backblaze,
so we generate faithful, deterministic stand-ins that match the schema and the
failure physics of the three public datasets PulseGuard is designed around:

  1. STORAGE   -> Backblaze SMART drive telemetry  (HDD/SSD failure)
  2. COMPONENTS-> AI4I 2020 predictive maintenance  (thermal / power / mechanical)
  3. RUL       -> NASA C-MAPSS turbofan degradation (remaining useful life)

Each generator also has a `load_real_*` companion (see src/data_loaders.py) so
the exact same pipeline runs on the real CSVs once they are downloaded locally.

The AI4I generator reproduces the published failure rules exactly, so the
distribution and the ~3.4% class imbalance are authentic rather than invented.
"""
from __future__ import annotations

import os
import numpy as np
import pandas as pd

DATA_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "data")
SEED = 42


# --------------------------------------------------------------------------- #
# 1. STORAGE  (Backblaze SMART stand-in)
# --------------------------------------------------------------------------- #
# Backblaze themselves flag SMART 5, 187, 188, 197, 198 as the key failure
# indicators. Healthy drives sit near zero on these; drives heading for failure
# ramp them up over the ~30 days before death. We label "fails within 30 days".
SMART_FEATURES = [
    "smart_5_raw",     # Reallocated sectors count
    "smart_187_raw",   # Reported uncorrectable errors
    "smart_188_raw",   # Command timeout
    "smart_197_raw",   # Current pending sector count
    "smart_198_raw",   # Offline uncorrectable
    "smart_9_raw",     # Power-on hours
    "smart_194_raw",   # Temperature (C)
    "smart_12_raw",    # Power cycle count
]
DRIVE_MODELS = ["ST4000DM000", "ST8000NM0055", "TOSHIBA_MG07", "WDC_WUH721414", "HGST_HMS5C4040"]


def generate_storage(n_drives: int = 1500, days: int = 120, fail_frac: float = 0.06,
                     seed: int = SEED) -> pd.DataFrame:
    rng = np.random.default_rng(seed)
    rows = []
    n_fail = int(n_drives * fail_frac)
    fail_ids = set(rng.choice(n_drives, size=n_fail, replace=False).tolist())

    for d in range(n_drives):
        model = DRIVE_MODELS[d % len(DRIVE_MODELS)]
        cap = int(rng.choice([4, 8, 14])) * 1_000_000_000_000
        will_fail = d in fail_ids
        fail_day = int(rng.integers(40, days)) if will_fail else None

        # Realism knobs that make the problem genuinely hard (no perfect AUC):
        #  * ~14% of HEALTHY drives are "chronic": they carry a stable but elevated
        #    sector count that looks alarming yet never leads to failure (these are
        #    the false positives that keep precision honest).
        #  * failing drives vary in how much warning they give (severity + window).
        #  * ~18% of failing drives are "sudden death": almost no SMART warning
        #    (these are the false negatives that keep recall realistic).
        chronic = (not will_fail) and (rng.random() < 0.14)
        chronic_level = rng.integers(15, 60) if chronic else 0
        severity = float(rng.uniform(0.4, 1.0)) if will_fail else 0.0
        window = int(rng.integers(8, 36)) if will_fail else 0
        sudden = will_fail and (rng.random() < 0.18)

        base_temp = rng.normal(30, 3)
        poweron = int(rng.integers(2000, 40000))
        powercycles = int(rng.integers(20, 400))

        for day in range(days):
            poweron += 24
            if rng.random() < 0.01:
                powercycles += 1

            # healthy baseline noise
            s5 = max(0, int(rng.poisson(0.05)))
            s187 = max(0, int(rng.poisson(0.05)))
            s188 = max(0, int(rng.poisson(0.02)))
            s197 = max(0, int(rng.poisson(0.05)))
            s198 = max(0, int(rng.poisson(0.03)))
            temp = base_temp + rng.normal(0, 1.5)

            if chronic:  # persistent, non-fatal elevation -> looks risky, isn't
                s5 += chronic_level + int(rng.poisson(3))
                s197 += int(chronic_level * 0.4) + int(rng.poisson(2))

            if will_fail and fail_day is not None and not sudden:
                d_to_fail = fail_day - day
                if 0 <= d_to_fail <= window:
                    sev = severity * (window - d_to_fail) / window   # ramp toward death
                    s5 += int(rng.poisson(35 * sev) + 45 * sev)
                    s197 += int(rng.poisson(22 * sev) + 30 * sev)
                    s198 += int(rng.poisson(16 * sev) + 22 * sev)
                    s187 += int(rng.poisson(12 * sev) + 15 * sev)
                    s188 += int(rng.poisson(6 * sev))
                    temp += 7 * sev

            failed_today = int(will_fail and day == fail_day)
            fail_within_30 = int(will_fail and fail_day is not None and 0 <= (fail_day - day) <= 30)

            rows.append([
                day, f"D{d:05d}", model, cap, failed_today,
                s5, s187, s188, s197, s198, poweron, round(temp, 1), powercycles,
                fail_within_30,
            ])
            if failed_today:
                break  # drive removed from the fleet after it dies

    cols = ["day", "serial_number", "model", "capacity_bytes", "failure",
            *SMART_FEATURES, "label_fail_30d"]
    return pd.DataFrame(rows, columns=cols)


# --------------------------------------------------------------------------- #
# 2. COMPONENTS  (AI4I 2020 faithful generator)
# --------------------------------------------------------------------------- #
# Reproduces the exact failure-mode rules from Matzka (2020):
#   HDF: process_temp - air_temp < 8.6 K AND rotational_speed < 1380 rpm
#   PWF: power = torque * angular_velocity; fails if < 3500 W or > 9000 W
#   OSF: tool_wear * torque > {11000 L, 12000 M, 13000 H} min*Nm
#   TWF: tool wears out in the 200-240 min window
#   RNF: 0.1% random
# Mapped to the brief's components: HDF=thermal, PWF=power delivery,
# OSF/TWF=cooling/mechanical wear.
AI4I_FEATURES = ["air_temp_k", "process_temp_k", "rotational_speed_rpm",
                 "torque_nm", "tool_wear_min"]
OSF_THRESH = {"L": 11000, "M": 12000, "H": 13000}


def generate_components(n: int = 10000, seed: int = SEED) -> pd.DataFrame:
    rng = np.random.default_rng(seed + 1)
    types = rng.choice(["L", "M", "H"], size=n, p=[0.5, 0.3, 0.2])

    # air temp ~ N(300, 2); process temp sits ~10 K above it, so the thermal
    # margin (process - air) ~ N(10, 1): it dips below the 8.6 K HDF threshold ~8%
    # of the time.
    air = np.round(300.0 + rng.normal(0, 2, n), 1)
    process = np.round(air + rng.normal(10.0, 1.0, n), 1)

    # rotational speed ~ N(1539, 179) rpm (matches real AI4I), and torque is
    # inversely correlated with speed (constant-power machine) plus noise, so
    # their product (power) sits mostly inside the 3500-9000 W safe band and only
    # escapes it in the tails -> a realistic ~1-3% power-failure rate.
    speed = np.rint(np.clip(rng.normal(1539, 179, n), 1168, 2886)).astype(int)
    torque = np.round(np.clip(40.0 - 0.018 * (speed - 1539) + rng.normal(0, 7, n), 3.8, 76.6), 1)
    tool_wear = rng.integers(0, 254, n)

    ang_vel = speed * 2 * np.pi / 60.0
    power = torque * ang_vel

    twf = np.zeros(n, dtype=int)
    hdf = np.zeros(n, dtype=int)
    pwf = np.zeros(n, dtype=int)
    osf = np.zeros(n, dtype=int)
    rnf = np.zeros(n, dtype=int)

    for i in range(n):
        if (process[i] - air[i]) < 8.6 and speed[i] < 1380:
            hdf[i] = 1
        if power[i] < 3500 or power[i] > 9000:
            pwf[i] = 1
        if tool_wear[i] * torque[i] > OSF_THRESH[types[i]]:
            osf[i] = 1
        if 200 <= tool_wear[i] <= 240 and rng.random() < 0.06:
            twf[i] = 1
        if rng.random() < 0.001:
            rnf[i] = 1

    machine_failure = ((twf | hdf | pwf | osf | rnf) > 0).astype(int)

    df = pd.DataFrame({
        "udi": np.arange(1, n + 1),
        "product_id": [f"{t}{rng.integers(10000, 99999)}" for t in types],
        "type": types,
        "air_temp_k": air,
        "process_temp_k": process,
        "rotational_speed_rpm": speed,
        "torque_nm": torque,
        "tool_wear_min": tool_wear,
        "machine_failure": machine_failure,
        "twf": twf, "hdf": hdf, "pwf": pwf, "osf": osf, "rnf": rnf,
    })
    return df


# --------------------------------------------------------------------------- #
# 3. RUL  (NASA C-MAPSS turbofan stand-in)
# --------------------------------------------------------------------------- #
# Multivariate run-to-failure trajectories. Sensors drift monotonically (plus
# noise) toward the failure cycle. RUL = max_cycle - cycle, piecewise-capped at
# 125 (the standard C-MAPSS convention). We treat "cycles" as "days" in the UI.
RUL_SENSORS = [f"sensor_{i}" for i in range(1, 22)]
RUL_CAP = 125


def generate_rul(n_units: int = 100, seed: int = SEED) -> pd.DataFrame:
    rng = np.random.default_rng(seed + 2)
    rows = []
    for u in range(1, n_units + 1):
        life = int(rng.integers(130, 360))
        # each unit gets slightly different degradation slopes
        slopes = rng.normal(1.0, 0.25, len(RUL_SENSORS))
        base = rng.normal(0, 1, len(RUL_SENSORS))
        for c in range(1, life + 1):
            frac = c / life                       # 0 -> 1 over life
            op1, op2, op3 = rng.normal(0, 0.2), rng.normal(0, 0.2), rng.normal(100, 0.2)
            sensors = base + slopes * (frac ** 1.5) * 8.0 + rng.normal(0, 0.4, len(RUL_SENSORS))
            rul = min(life - c, RUL_CAP)
            rows.append([u, c, op1, op2, op3, *np.round(sensors, 3), rul])
    cols = ["unit", "cycle", "op_setting_1", "op_setting_2", "op_setting_3",
            *RUL_SENSORS, "RUL"]
    return pd.DataFrame(rows, columns=cols)


# --------------------------------------------------------------------------- #
def main():
    os.makedirs(DATA_DIR, exist_ok=True)
    print("Generating storage (Backblaze-style) telemetry ...")
    storage = generate_storage()
    storage.to_csv(os.path.join(DATA_DIR, "storage.csv"), index=False)
    pos = storage["label_fail_30d"].mean()
    print(f"  rows={len(storage):,}  drive-days  |  positive (fail<=30d)={pos:.2%}")

    print("Generating components (AI4I 2020) data ...")
    comp = generate_components()
    comp.to_csv(os.path.join(DATA_DIR, "components.csv"), index=False)
    print(f"  rows={len(comp):,}  |  failure rate={comp['machine_failure'].mean():.2%}"
          f"  (HDF={comp.hdf.mean():.2%} PWF={comp.pwf.mean():.2%} OSF={comp.osf.mean():.2%})")

    print("Generating RUL (C-MAPSS) trajectories ...")
    rul = generate_rul()
    rul.to_csv(os.path.join(DATA_DIR, "rul.csv"), index=False)
    print(f"  rows={len(rul):,}  |  units={rul['unit'].nunique()}")

    print("Done. CSVs written to", DATA_DIR)


if __name__ == "__main__":
    main()
