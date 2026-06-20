# PulseGuard API Contract — FROZEN

This is the single shared truth between the Python (backend/ML) and Frontend accounts.
**Do not change a field name without telling the other account and updating this file.**
Both `CLAUDE.md` files point here. If the contract and the code disagree, the contract wins
until a human changes it here.

Base URL (dev): `http://localhost:8000`

---

## REST endpoints

### `GET /api/fleet`
```json
{
  "summary": { "total": 28, "healthy": 17, "atRisk": 6, "critical": 5, "predictedFailures30d": 8 },
  "fleet": [
    {
      "device": "srv-001", "rack": "RACK-A", "health": 99, "tier": "Healthy",
      "storageRisk": 0.02, "componentRisk": 0.01, "rulDays": 124.6,
      "dominant": "Storage (disk)", "priority": "P4 - routine"
    }
  ]
}
```

### `GET /api/device/{id}`
Returns the fleet row PLUS a `detail` object:
```json
{
  "device": "srv-014", "health": 5, "tier": "Critical",
  "detail": {
    "why": [
      { "signal": "Offline uncorrectable sectors", "value": 12, "direction": "raises risk", "impact": 1.8 }
    ],
    "history": [ { "t": -39, "health": 96 }, { "t": 0, "health": 5 } ],
    "alerts": [ { "t": -12, "level": "Critical", "text": "Device crossed into Critical" } ],
    "predictedFailureDays": 10,
    "subsystems": {
      "storage":    { "risk": 0.96 },
      "components": { "risk": 0.99 },
      "rul":        { "risk": 0.83, "days": 5 }
    },
    "recommendation": {
      "tier": "Critical", "priority": "P1 - act now", "dominant": "...",
      "action": "Inspect the mechanical assembly and reduce load — mechanical overstrain (wear×load) is the dominant failure signal. Resolving this root cause also relieves the co-occurring downstream stress.",
      "headline": "Inspect the mechanical assembly and reduce load",
      "priorityCode": "P1", "priorityReason": "act now — high, near-term failure probability",
      "maintenanceWindow": "Immediate (within 24–48h)",
      "topSignal": "Wear x load (overstrain index)",
      "rootCause": "components", "targetsRootCause": false,
      "basis": "rule-based; driven by dominant subsystem + top SHAP signal"
    },
    "cascade": {
      "detected": true,
      "chain": "Mechanical wear → vibration → drive stress",
      "summary": "Mechanical overstrain (components risk 0.99) is co-occurring with rising storage risk (0.83). ...",
      "rootCause": "components", "rootCauseLabel": "Thermal / power / mechanical",
      "rootCauseNature": "mechanical",
      "links": [ { "from": "components", "to": "storage", "mechanism": "vibration coupling" } ],
      "basis": "authored domain-reasoning overlay (hand-written rules over co-occurring subsystem states; not learned, not model-discovered)"
    }
  }
}
```

#### `detail.recommendation` — fields (enriched 2026-06-20)
`tier`, `priority`, `dominant` are **unchanged** from before. `action` is now
**signal-specific and cascade-aware** (was generic per-subsystem text). New fields:
`headline` (short imperative action), `priorityCode` (`P1`…`P4` from tier + lead time),
`priorityReason`, `maintenanceWindow` (derived from predicted failure days / RUL),
`topSignal` (the dominant SHAP signal driving the action), `rootCause` (subsystem key
the action targets), `targetsRootCause` (true when a cascade re-pointed the action
upstream of the visible symptom), `basis`.

#### `detail.cascade` — NEW field (added 2026-06-20)
An **authored domain-reasoning overlay** — a hand-written rule layer, NOT a learned
model — that flags likely cross-subsystem failure chains within a device from its
co-occurring subsystem risks + top signals. Honesty framing: the three subsystems come
from three different datasets, so a cascade is an engineering-reasoning hypothesis over
co-occurring states, not proven physical causation in one drive; the `basis` field says
so. Fields: `detected` (bool). When `false`: `chain`/`rootCause`/`rootCauseLabel` are
`null`, `links` is `[]`, and `summary` reads "No cascade detected — ...". When `true`:
`chain` (label), `summary`, `rootCause`/`rootCauseLabel`/`rootCauseNature`
(`thermal|mechanical|power`), `links` (list of `{from,to,mechanism}`), `basis`.
Fires only when an upstream driver is genuinely elevated AND a downstream subsystem is
co-occurring/rising; otherwise `detected:false`.

> ⚠️ **Machine B (frontend) — coordinated contract change.** This adds `detail.cascade`
> and the enriched `detail.recommendation.*` fields, and upgrades `recommendation.action`
> text. Fleet rows, health, tiers, fusion, metrics, and the timeline are unchanged. Please
> render the cascade chain + the new recommendation fields on the device-detail view.

### `GET /api/metrics`
Returns the `metrics.json` structure: per-model PR-AUC, recall, FPR, confusion matrix, RUL errors.

### `GET /api/timeline`
Live-replay series for the Live Monitor:
```json
{
  "serial": "D00121",
  "steps": [
    { "day": 54, "daysToFailure": 34, "storageRisk": 0.04, "health": 96, "tier": "Healthy",
      "smart5": 1, "smart197": 0, "smart198": 0 }
  ]
}
```

### `POST /api/predict/storage`
Body: a SMART reading. Returns `{ "storage_risk": 0.0, "why": [], "latency_ms": 0 }`.

### `POST /api/predict/device`
Body: raw telemetry. Returns `{ "health_score": 0, "recommendation": {}, "latency_ms": 0 }`.

### `GET /api/integrations/{scom|nagios|zabbix}`
Returns the field mapping and one normalized sample row.

---

## WebSocket — `WS /ws/telemetry`
Pushes one message per tick:
```json
{
  "device": "D00121", "ts": 1718700000,
  "smart": { "smart_5_raw": 120, "smart_197_raw": 0, "smart_198_raw": 0 },
  "health": 42, "tier": "At Risk"
}
```
The frontend Live Monitor consumes this stream. Until the WS endpoint is live, the
frontend replays the `/api/timeline` data client-side on a timer.

---

## Tier thresholds (must match `fusion.py`)
`Healthy >= 65` · `At Risk 35..64` · `Critical < 35`
