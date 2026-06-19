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
    "recommendation": { "tier": "Critical", "priority": "P1 - act now", "action": "...", "dominant": "..." }
  }
}
```

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
