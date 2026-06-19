# CLAUDE.md — PulseGuard (Frontend)

> Place this file in the **`frontend/` directory**. Claude Code reads it automatically.
> This account owns `frontend/` only. It never reads or edits the Python code in `src/`/`api/`.

## Project in one line
PulseGuard is a predictive hardware-failure dashboard for the Dell AI Hackathon. This account
builds the React UI that consumes the backend API. The ML and backend live in another account;
you talk to them only through the frozen contract.

## Read first
- `../CONTRACT.md` — the frozen API shapes you consume. **Never invent field names or fake
  data shapes.** Render exactly what the contract defines. If something you need is missing,
  flag it for the backend account; don't quietly change the shape.

## Stack
Vite + React + TailwindCSS + Recharts. `App.jsx` (the full dashboard) drops into a fresh Vite
app — see the repo README for the exact steps. No other UI framework.

## Mock-first workflow (this is how we parallelize)
1. Build against a local mock that returns the exact `CONTRACT.md` JSON (a static file or a
   tiny mock module). Do this until the backend is live.
2. When the backend is up at `http://localhost:8000`, flip the base URL — nothing else changes,
   because you built to the contract.
3. The Live Monitor consumes `WS /ws/telemetry`. Until that endpoint exists, replay the
   `/api/timeline` data client-side on a timer (the component is already built for this).

## Pages / components to deliver
- **Fleet view:** triage grid sorted by risk; summary counts (total / healthy / at-risk /
  critical / predicted failures 30d). This ranked top-N view is our answer to false-alarm
  volume, so make the sort-by-risk obvious.
- **Device drill-down:** health gauge, degradation curve (history) crossing into red, SHAP
  reasons in plain English (`detail.why`), predicted failure window, recommended action +
  priority, alert timeline, and the per-subsystem risk breakdown beneath the headline score.
- **Model-metrics page:** PR-AUC, recall, FPR, confusion matrix, RUL errors from `/api/metrics`.
  Highlight the accuracy-trap contrast (naive accuracy vs failures actually caught).
- **Live Monitor:** play a real drive degrading; SMART counters climb, health collapses, tier
  flips to Critical, alert fires. Show latency is sub-5s.
- **Cascade diagram panel:** low fan speed -> rising temp -> disk thermal stress. Label it as a
  domain-reasoning view, never "model-discovered."

## Conventions
- Tier colors map to: `Healthy >= 65` (green), `At Risk 35..64` (amber), `Critical < 35` (red).
  Keep these consistent everywhere.
- All numbers come from the API — never hardcode metrics or device data into components.
- Keep the demo flow (fleet -> srv-014 critical -> metrics -> live monitor) smooth; that path
  is what gets recorded.

## Do NOT do
- Don't add backend logic, model code, or data generation here.
- Don't invent endpoints or fields not in `CONTRACT.md`.
- No state-management library unless genuinely needed; React state is enough for a 4-day build.

## Working style for credits
One scoped task per session (e.g. "build the device drill-down page against the mock"). Let me
read files from disk instead of pasting them. Commit after each working component; git is how
we sync with the backend account.
