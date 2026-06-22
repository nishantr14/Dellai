# PulseGuard — Data Sources

The three models train on **real, public** datasets. This file documents, for each:
the official source, the license / terms, the exact subset/version we used, and where
to place the files locally so `src/data_loaders.py` picks them up.

URLs and licenses below were re-verified against the live source pages (June 2026), not
assumed. Raw datasets are **never committed** — `realdata/` and the generated `data/`
CSVs are gitignored (they total ~12 GB+). Only the derived `data/*.csv`, the trained
`models/metrics.json`, and the `frontend_data.json` snapshot are produced from them.
`data/sources.json` records only a provenance tag per model (`"real"` / `"synthetic"`),
not URLs — this file is the source-of-truth reference.

---

## 1. Storage — Backblaze Hard Drive Test Data (SMART)

- **Official source:** <https://www.backblaze.com/cloud-storage/resources/hard-drive-test-data>
- **License / terms:** Open and free to use. Backblaze asks three things: (1) **cite
  Backblaze as the source**, (2) you accept you are solely responsible for how you use
  the data, and (3) **you may not sell the data itself** (it is free). Updated quarterly.
- **What it is:** one daily-snapshot CSV per day (~190 columns), with `date`,
  `serial_number`, `model`, `capacity_bytes`, `failure`, and raw + normalized
  `smart_N_*` attributes.
- **Exact subset we used:** **Q4 2025 daily snapshots, 2025-10-01 → 2025-12-31** (the
  date range recorded in `models/metrics.json` → `storage.split`). The loader takes a
  **30% prevalence-preserving, by-serial subsample** (default `--storage-sample-pct 30`):
  whole drives are kept or dropped by `hash(serial_number) % 100 < 30`, so the failure
  rate is unchanged and the by-serial split stays leakage-safe. That yields ~15.5M
  drive-days in `data/storage.csv`.
- **Columns we read** (`src/data_loaders.py:load_real_storage`): `date`,
  `serial_number`, `model`, `capacity_bytes`, `failure`, and the SMART set in
  `SMART_FEATURES` (`smart_5/187/188/197/198/9/194/12_raw`). The real `date` is preserved
  so `train.py` can do the by-serial **and** time-based split (hard rule #3).

## 2. Components — AI4I 2020 Predictive Maintenance Dataset (thermal / power / mechanical)

- **Official source:** UCI Machine Learning Repository, dataset 601 —
  <https://archive.ics.uci.edu/dataset/601/ai4i+2020+predictive+maintenance+dataset>
  (DOI: <https://doi.org/10.24432/C5HS5C>)
- **License / terms:** **Creative Commons Attribution 4.0 International (CC BY 4.0)** —
  verbatim from the UCI page. Free to use/share/adapt with attribution.
- **Citation:** Matzka, S. (2020). *AI4I 2020 Predictive Maintenance Dataset* [Dataset].
  UCI Machine Learning Repository. Donated 2020-08-29. (Note: this is itself a
  *synthetically generated* benchmark that reflects real predictive-maintenance behavior.)
- **What it is:** **10,000 rows**, 14 columns — 6 input features (`Air temperature [K]`,
  `Process temperature [K]`, `Rotational speed [rpm]`, `Torque [Nm]`, `Tool wear [min]`,
  product `Type`) plus the `Machine failure` label and the failure-mode flags
  (`TWF/HDF/PWF/OSF/RNF`).
- **Exact subset we used:** the **full 10,000-row dataset** (single CSV). The loader
  (`load_real_components`) renames columns to our snake_case schema; the per-mode flags
  (`hdf/pwf/osf`) feed the component attribution heads in `train_components`.

## 3. RUL — NASA C-MAPSS Turbofan Engine Degradation Simulation (FD001)

- **Official source:** NASA Prognostics Center of Excellence (PCoE) Data Set Repository —
  <https://www.nasa.gov/intelligent-systems-division/discovery-and-systems-health/pcoe/pcoe-data-set-repository/>
  (the older `ti.arc.nasa.gov` link is deprecated). Direct download is item **#6,
  "Turbofan Engine Degradation Simulation Data Set"**:
  <https://phm-datasets.s3.amazonaws.com/NASA/6.+Turbofan+Engine+Degradation+Simulation+Data+Set.zip>
  Mirror: PHM Society — <https://data.phmsociety.org/nasa/>
- **License / terms:** No formal license is declared on the repository. The data is a
  **U.S. Government work** produced by NASA (generally not subject to domestic copyright /
  public domain in the U.S.). The repository states a **disclaimer** — *"Users employ the
  data at their own risk. Neither NASA nor the donators of the data sets assume any
  liability for the use of the data"* — and **requests acknowledgment** of the PCoE
  repository and the data donors when publishing results. We treat it accordingly: cite,
  acknowledge, no warranty.
- **Citation:** A. Saxena and K. Goebel (2008), *Turbofan Engine Degradation Simulation
  Data Set*, NASA Ames Prognostics Data Repository. Method paper: Saxena, Goebel, Simon &
  Eklund, *"Damage Propagation Modeling for Aircraft Engine Run-to-Failure Simulation,"*
  PHM 2008.
- **What it is:** four subsets (FD001–FD004). The zip contains `train_FD001.txt`,
  `test_FD001.txt`, `RUL_FD001.txt`, etc. Files are space-separated, no header:
  `unit, cycle, op_setting_1..3, sensor_1..21`.
- **Exact subset we used:** **`train_FD001.txt` only** — 100 engine units, single
  operating condition, single fault mode (HPC degradation), run-to-failure. The loader
  (`load_real_rul`) computes `RUL = min(max_cycle − cycle, RUL_CAP)` with `RUL_CAP = 125`
  (a standard C-MAPSS cap). Train/test is split by **disjoint engine unit**.

---

## Local placement & how to load

Raw files are gitignored under `realdata/` (create it locally; never commit). The
loader accepts any paths, but the documented convention is:

```
realdata/
  backblaze/                 # directory of Backblaze daily snapshot CSVs (one per day, Q4 2025)
    2025-10-01.csv
    ...
    2025-12-31.csv
  ai4i2020.csv               # AI4I 2020 single CSV (10,000 rows)
  train_FD001.txt            # NASA C-MAPSS FD001 training file
```

Then run the loaders (writes the real `data/*.csv` and tags provenance in
`data/sources.json`):

```bash
python -m src.data_loaders \
  --storage    realdata/backblaze \
  --components realdata/ai4i2020.csv \
  --rul        realdata/train_FD001.txt
# optional: --storage-sample-pct 30   (default; prevalence-preserving by-serial sample)

python -m src.train          # trains on the real data -> models/metrics.json
python export_data.py        # -> frontend_data.json
```

This produces `data/storage.csv`, `data/components.csv`, `data/rul.csv`, consumed
unchanged by `src/features.py` → `src/train.py` → `export_data.py`.

---

## Honest note: these are public **proxy** datasets

These three datasets come from three different domains, and **only Backblaze is actually
computer-hardware telemetry**. AI4I 2020 is a synthetic industrial-machine benchmark, and
C-MAPSS is simulated turbofan-engine data; both stand in for thermal/power/mechanical and
remaining-useful-life signals we don't have a public Dell-server source for. Each model
trains on the best available public proxy and scores one curated demo fleet. In
production, PulseGuard would **retrain on real Dell iDRAC / OpenManage device telemetry**.
Consistent with the project's framing: we report **recall, FPR, and PR-AUC — never
accuracy alone** — and the failure cascade is an **authored domain-reasoning layer, not
learned**. See [`README.md`](README.md) and [`ROADMAP.md`](ROADMAP.md).
