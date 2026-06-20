# Prediction Latency Benchmark

**Validates the brief's <5 s real-time requirement.** Measurement only — no model
or API code was changed. Reproduce with `python benchmarks/latency.py` (API on :8000).

## TL;DR (slide line)

> **p95 prediction latency: 10 ms (storage) / 6 ms (device) — ~500× under the 5 s real-time requirement.**

Even the worst observed single request (cold path excluded) was **35 ms**, still ~140× under budget.

## Method

- **Endpoints:** `POST /api/predict/storage` (SmartReading) and `POST /api/predict/device` (DeviceTelemetry).
- **Payloads:** realistic *degrading*-drive telemetry (elevated + rising reallocated/pending
  sectors; component overstrain; RUL 18 d) so the classifier **and** SHAP do real work —
  not a trivial all-zero healthy row.
- **Load:** single persistent keep-alive HTTP connection, **250 timed requests** per endpoint,
  issued sequentially (per-request latency is the metric the <5 s requirement targets).
- **Warmup:** 25 requests excluded. The **first** request lazily loads the models and builds
  the SHAP `TreeExplainer` — a one-time startup cost, not steady-state prediction.
- **Clock:** end-to-end client wall-clock via `time.perf_counter` (includes HTTP round-trip
  over loopback + JSON serialization + inference + SHAP). Server-reported `latency_ms`
  (handler-internal) recorded for context.

## Environment

- Windows 11, Python 3.14.4, FastAPI 0.136.3, uvicorn 0.49.0 (single worker), localhost loopback.
- Date: 2026-06-21. Numbers are one representative run; expect minor run-to-run variance.

## Results (client wall-clock, milliseconds)

| Endpoint | mean | p50 | p95 | p99 | min | max | cold 1st req (server) |
|---|---|---|---|---|---|---|---|
| `POST /api/predict/storage` | 8.55 | 8.19 | **10.24** | 14.55 | 6.93 | 35.10 | 21.3 ms |
| `POST /api/predict/device`  | 4.93 | 4.82 | **6.05**  | 6.65  | 4.10 | 7.41  | 80.3 ms |

Server-reported handler time (excludes HTTP/serialization): storage mean **7.12 ms**,
device mean **3.70 ms**.

## Notes

- **Storage > device latency is expected and explainable:** `/predict/storage` returns a SHAP
  "why" (`explain()` on the gradient-boosted tree), which dominates its cost; `/predict/device`
  runs two `predict_proba` calls + fusion/recommendation but **no SHAP**, so it is faster
  despite touching more models.
- **Headroom vs. 5 s budget:** storage p95 → ~488×, device p95 → ~826×. The requirement is met
  with three orders of magnitude to spare; the system is far from the real-time boundary.
- Cold first-request cost (model + SHAP-explainer load) is one-time at process start and is not
  part of steady-state serving; it too is well under 5 s.
