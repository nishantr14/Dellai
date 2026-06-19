# PulseGuard Landing

Cinematic scroll-driven landing page for PulseGuard. Vite + React + Tailwind +
Framer Motion + GSAP ScrollTrigger + React Three Fiber.

## Run

```bash
cd landing
npm install
npm run dev      # http://localhost:5180
```

The "Launch Dashboard" CTA points to `VITE_DASHBOARD_URL` (default
`http://localhost:5173`). Set it for your deployed dashboard:

```bash
VITE_DASHBOARD_URL=https://your-dashboard npm run build
```

## Data

All on-screen numbers come from `public/data/frontend_data.json`, a snapshot of
the repo root `frontend_data.json` produced by `export_data.py`. Refresh with:

```bash
cp ../frontend_data.json public/data/frontend_data.json
```

## Test

```bash
npm run test
```
