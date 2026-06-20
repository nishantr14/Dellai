# PulseGuard — Scoring Rubric & Score-Raising Roadmap

> Forward-looking planning doc. Reflects the **current state of `main`**.
> For the frozen API shapes see [`CONTRACT.md`](CONTRACT.md); for setup and the
> honest-metrics framing see [`README.md`](README.md) and [`CLAUDE.md`](CLAUDE.md).

## Where the models stand today (real data, on `main`)

All three models train on **real** public data and are tagged `source: "real"` in
`models/metrics.json`. Failure prediction is severely imbalanced, so we report
**recall + ROC-AUC + lead-time**, never accuracy or PR-AUC alone.

| Model | Dataset | Split (leakage-safe) | Honest headline |
|---|---|---|---|
| **Storage** | Backblaze SMART | **by-serial AND time-based** (drives disjoint across train/test *and* train on earlier dates, test on later) | **0.79 of failing drives caught**, median **20 days** early, 76% flagged ≥7 days ahead (ROC-AUC 0.77; day-level recall 0.54 @ 15% FPR cap) |
| **Components** | AI4I 2020 | stratified i.i.d. snapshots | recall **0.95**, ROC-AUC 0.97, PR-AUC 0.79 |
| **RUL** | NASA C-MAPSS FD001 | disjoint engine units | RMSE **17.5** cycles, MAE 13.3 |

Operational line for the demo: *"79% of failing drives caught, median 20 days
early, on drives never seen in training, at a 15% false-alarm cap."* The
by-serial **+ time-based** split is the official storage metric — it is the
honest, judge-proof number and is **not** superseded by any looser split.

> The 28-device fleet and the live-monitor decline drive (`ZHZ4486P`) are curated
> for presentation — real model scores on real drives, hand-arranged for a clear
> spread / most-dramatic example. They do **not** affect the held-out metrics above.

---

## 7. Scoring rubric & where the points are

| Category | Weight | What they reward |
|---|---|---|
| Technical Excellence | **40%** | Innovation in algorithms/features, prediction accuracy/reliability, real-time/scalability, robustness/edge cases |
| Business Impact | **30%** | Downtime/cost reduction, integration ease, UX/adoption, ROI/TCO |
| Implementation Quality | **20%** | Code quality + docs, security/privacy, deployment automation, testing coverage |
| Presentation | **10%** | Problem-solution fit, demo effectiveness, documentation clarity |

**Required deliverables** (from the problem statement): prediction engine, real-time
pipeline, dashboard, alert system, **3+ monitoring-platform integration adapters**,
**API docs**, architecture doc, model methodology doc, integration guide, user
manual, deployment guide, benchmarking/validation.

Deliverable status on `main`:

- ✅ Prediction engine — 3 real-data models + fusion → Device Health Score.
- ✅ Real-time API — FastAPI (`api/main.py`): `/api/fleet`, `/api/device/{id}`,
  `/api/metrics`, `/api/timeline`, `/api/predict/storage`, `/api/predict/device`,
  and the integration adapters `/api/integrations/{scom|nagios|zabbix}`; Swagger `/docs`.
- ✅ Dashboard — `frontend/App.jsx` (fleet triage + device drill-down: gauge,
  subsystem risk, health trajectory, SHAP "why", recommendation, cascade panel,
  alerts) plus the cinematic `landing/` app.
- ✅ Explainability — SHAP `TreeExplainer` with human-readable signal names, verified on real models.
- ✅ Authored cross-subsystem cascade + signal-driven recommendation (P1–P4) — `src/cascade.py`.
- ⬜ Architecture doc, model-methodology doc, integration guide, user manual,
  deployment guide, benchmarking/validation — see §8.C.

---

## 8. Prioritized roadmap to raise the score (do in this order)

### A. Technical Excellence (40% — biggest lever)

1. **Push storage accuracy honestly, keeping the by-serial + time-based split.**
   The split stays as-is (it is the official, honest metric); raise the model *under*
   it and re-measure every time:
   - **Per-drive-model normalization** — different HDD models have wildly different
     SMART scales. Normalize SMART raws within `model`, add `model`/`capacity` as
     features, or train per-family. Single biggest honest accuracy lever.
   - Add more SMART signals: `smart_1` (read error rate), `smart_7` (seek error),
     `smart_193` (load cycles), `smart_240/241/242`. (`smart_9` power-on hours is
     already in.)
   - Probability **calibration** (isotonic) so the 0–1 risks feeding `fusion.py` are trustworthy.
   - Try LightGBM / class-balanced focal loss; small hyperparameter search.
   - Re-measure on the held-out by-serial + time-based split after each change;
     update `models/metrics.json` (keep `source: "real"`).
2. **Stretch — unsupervised anomaly detection** (IsolationForest / autoencoder) for
   "unknown failure patterns," fused as a 4th signal. High innovation points.
3. **Real-time latency benchmark** — the brief requires <5 s. Measure `/predict`
   p50/p95 and report (it is sub-second). Add a short load test for the
   10,000-device scalability claim.
4. **Robustness** — handle missing SMART fields, unseen drive models, empty history;
   show graceful degradation rather than a crash.

### B. Business Impact (30%)

5. **Showcase the integration adapters** (`/api/integrations/{scom|nagios|zabbix}`)
   in the demo and docs — directly answers "integrate with existing tools without replacement."
6. **ROI / TCO module** (stretch) — translate caught failures + lead time into
   $ downtime avoided and MTTR reduction; put a headline number on a slide.
7. **Tiered alerting demo** — P1/P2/P4 escalation with channels (email/Slack mock),
   driven by the existing recommendation priorities.

### C. Implementation Quality (20%)

8. **Add backend tests** (pytest): fusion math, cascade gating (fires only on
   genuinely co-occurring elevated subsystems), feature backward-looking invariants,
   threshold selection. (The `landing/` app already has Vitest.)
9. **Write the required docs**: architecture, model methodology (with the honesty
   section), integration guide, user manual, deployment guide. Much can be assembled
   from `README.md`, `CLAUDE.md`, `CONTRACT.md`, and this file.
10. **Deployment automation**: `Dockerfile` + `docker-compose` (api + dashboard + landing).
11. **Security/privacy note**: telemetry handling, no PII, on-prem option.

### D. Presentation (10%)

12. **Demo script** (~90 s): landing story → dashboard fleet triage → click a
    critical device (SHAP "why" + cascade + recommendation) → live monitor decline on
    `ZHZ4486P` → metrics page with the **honesty framing**. End on the ROI number.
13. **One slide on rigor**: "we split by serial **and** by time to prevent leakage —
    here is the held-out number." Judges reward teams that audit themselves.

---

## Honesty rules (non-negotiable — consistent with `CLAUDE.md`)

1. **Never fabricate or inflate metrics.** Change the model → re-measure on the
   held-out by-serial + time-based split and report the real number.
2. **The official storage metric is the by-serial + time-based split.** Do not
   present a looser split (e.g. by-serial only, no time component) as the headline.
3. **Never report accuracy alone** for the imbalanced classifiers — always recall + ROC-AUC.
4. **PR-AUC is naturally tiny** at this base rate; report it alongside recall/ROC-AUC, never alone.
5. **Don't overclaim lead time** — say "predicts within a 30-day window; median 20-day lead."
6. Disclose that the fleet / live-monitor drive are curated for the demo and that the
   datasets are proxies from three domains (only Backblaze is computer hardware); each
   model would retrain on Dell iDRAC / OpenManage telemetry in production.

## Repo facts to keep straight

- **Models are not committed.** `models/*.joblib` are gitignored; only
  `models/metrics.json` is tracked. The API loads models built locally via `python -m src.train`.
- **Raw datasets are local-only** (`realdata/` and generated `data/` are gitignored, ~12 GB).
- **Two front-ends**: `frontend/App.jsx` (ops dashboard) and the `landing/` Vite app
  (cinematic landing). Both read the `frontend_data.json` snapshot.
- **`CONTRACT.md` is the frozen API contract** shared with the frontend account — change
  fields there first, never silently.
