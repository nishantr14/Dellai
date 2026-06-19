# CLAUDE.md — PulseGuard (Python: ML + Backend)

> Place this file at the **repo root**. Claude Code reads it automatically every session.
> This account owns `src/` and `api/` only. It does **not** touch `frontend/`.

## Project in one line
PulseGuard predicts hardware failures 7–30 days ahead: which component fails, why, when,
and what to do. Dell AI Hackathon, problem "Intelligent Device Management with Predictive
Hardware Failure Detection."

## Read first
- `CONTRACT.md` — the frozen API shapes. **Never invent or rename a field.** If a change is
  truly needed, edit `CONTRACT.md` and tell the frontend account; don't change it silently.

## Repo areas you own
```
src/  data_gen.py  features.py  train.py  fusion.py  explain.py  fleet.py  data_loaders.py
api/  main.py   (FastAPI: REST + predict + integration adapter + WS /ws/telemetry)
data/   models/   export_data.py   requirements.txt
```

## Hard rules (these protect our credibility with judges — do not bend them)
1. **Real vs synthetic must never be blurred.** Synthetic generators are for the skeleton
   only. Any metric that will be shown to judges MUST be produced from the REAL CSV via
   `data_loaders.py`. When you write `metrics.json`, tag each model's source as
   `"real"` or `"synthetic"`. The credibility slide uses only `"real"` numbers.
2. **Never report accuracy as a headline.** Report PR-AUC, recall, and FPR. ~98% of
   drive-days are non-failures, so accuracy is the trap this project exists to avoid.
3. **Leakage-safe splits, always.** Backblaze: split by `serial_number` (no drive in both
   train and test) AND time-based (train earlier months, test later). RUL/C-MAPSS: split by
   engine/unit id. Never random row splits.
4. **Label definition is fixed:** a drive-day is positive if the drive fails within the next
   30 days.
5. **Choose thresholds on purpose:** maximize recall while holding FPR <= 15%. Do not use the
   default 0.5. Also save a PR / operating-point curve, not just one point.
6. **The cascade is authored, not learned.** It is a small rule layer in `fusion.py`/a cascade
   module. Never write code or comments implying the model "discovered" it.
7. **Calibrate probabilities** (e.g. `CalibratedClassifierCV`, isotonic) before they feed
   `fusion.py`, so the 0–1 risks are trustworthy.

## Fusion rule (already defined — keep it exactly)
```
risk_storage, risk_components = calibrated classifier probabilities in [0,1]
risk_rul = clip((30 - RUL_days)/30, 0, 1)            # 0 when RUL >= 30 days
weighted     = 0.40*risk_storage + 0.40*risk_components + 0.20*risk_rul
dominant     = max(risk_storage, risk_components, risk_rul)
overall_risk = max(weighted, 0.70*dominant)          # one dying subsystem can't be masked
health_score = round(100 * (1 - overall_risk))
Tiers: Healthy >= 65 | At Risk 35..64 | Critical < 35
```

## Conventions
- `features.py` is the single source of feature engineering, shared by `train.py` and the
  serving path. Never duplicate feature logic in the API.
- `train.py` writes `models/*.joblib` and `models/metrics.json`.
- `export_data.py` turns models into `frontend_data.json` (the snapshot the API/dashboard read).
- Keep FastAPI responses byte-for-byte matching `CONTRACT.md`. `/docs` must stay clean.
- SQLite or JSON for storage — no real DB cluster.

## Current priorities (in order)
1. **Day 1:** Wire REAL Backblaze through `data_loaders.py`; leakage-safe + time-based split;
   regenerate storage metrics; tag source `"real"` in `metrics.json`.
2. **Day 1–2:** Bring up REAL AI4I components model (expect recall to drop from the synthetic
   97% — that's correct and more honest). Confirm SHAP runs on real data.
3. **Day 2:** Backend WebSocket replay simulator at `WS /ws/telemetry`; fusion + recommendation
   endpoints solid; prove sub-5s latency (record the measured ms).
4. **Day 3:** Real C-MAPSS RUL; finalize fusion; author cascade + SHAP-to-action recommendation
   mapping; lock integration adapter.
5. Own the metrics slide + lead-time analysis (how many days early we flag failures).

## Do NOT build
Kubernetes, Kafka, message buses beyond the WebSocket, real DB cluster, mobile app, federated
learning, custom LLMs, deep survival models, trained Bayesian-net cascade, real vendor APIs.
Isolation Forest / auto-tickets / email alerts only if everything else is done.

## Run
```
pip install -r requirements.txt
python -m src.data_gen        # synthetic skeleton (dev only)
python -m src.train           # trains 3 models, writes metrics.json
python export_data.py         # -> frontend_data.json
uvicorn api.main:app --port 8000   # then open /docs
```

## Working style for credits
One scoped task per session. Let me read files from disk — don't paste large files. Commit
after each working change; treat git as the integration layer with the frontend account.
