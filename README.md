# PulseGuard

Predictive hardware failure detection for a device fleet. Predicts which subsystem will fail (storage, thermal, power, mechanical wear), why, when (a 7 to 30 day window), and what to do, with a live ops dashboard and a real-time API.

Built for the Dell AI Hackathon. See `PulseGuard_Team_Brief.md` for the full plan, architecture, API contract, role split, and demo script.

## Quick start (backend + models)

```bash
pip install -r requirements.txt
python -m src.data_gen      # generate synthetic datasets (runs offline)
python -m src.train         # train 3 models, write models/metrics.json
python export_data.py       # snapshot models -> frontend_data.json
uvicorn api.main:app --reload --port 8000
# open http://localhost:8000/docs  for the Swagger API
```

## Frontend (React dashboard)

`frontend/App.jsx` is the full dashboard. To run it as a real app:

```bash
npm create vite@latest pulseguard-ui -- --template react
cd pulseguard-ui && npm install recharts lucide-react
# install Tailwind per https://tailwindcss.com/docs/guides/vite
# replace src/App.jsx with the PulseGuard App.jsx, then:
npm run dev
```

The dashboard ships with embedded snapshot data so it renders standalone. To make it live, point `fetch` calls at the FastAPI endpoints in section 7 of the team brief (`/api/fleet`, `/api/device/{id}`, `/api/metrics`, `/api/timeline`).

## Using the real datasets

The synthetic generators are faithful stand-ins (the AI4I one uses the exact published failure rules) so the system runs with no downloads. For the final submission, download the real data and swap it in:

```bash
python -m src.data_loaders --storage <backblaze_dir> --components <ai4i.csv> --rul <train_FD001.txt>
python -m src.train
python export_data.py
```

- Backblaze hard drive stats (storage)
- AI4I 2020 predictive maintenance, UCI (thermal / power / mechanical)
- NASA C-MAPSS FD001 (remaining useful life)

## Honest data note

These three datasets are from three domains; only Backblaze is computer hardware. Each model trains on the best available proxy, scores one synthetic server fleet, and would retrain on Dell iDRAC / OpenManage telemetry in production. The failure cascade is an authored rule layer, not learned. C-MAPSS RUL is in cycles, mapped to days for the demo. Details in the team brief, section 3.

## What the models report

Failure prediction is severely imbalanced, so we report recall, false-positive rate, and PR-AUC, never accuracy alone. A "never fails" baseline scores 98.1 percent accuracy and catches zero failures. Our storage model catches 71 percent of failures 30 days ahead at a 15 percent false-alarm cap; components catches 97 percent; RUL is about 16 cycles RMSE.
```
```
