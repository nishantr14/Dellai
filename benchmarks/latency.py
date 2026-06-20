"""
Latency benchmark for the PulseGuard prediction endpoints (measurement only —
touches no model or API code). Validates the brief's <5 s real-time requirement.

Method: a single persistent keep-alive HTTP connection (realistic for a streaming
telemetry pipeline) issues sequential requests with realistic payloads matching the
SmartReading / DeviceTelemetry schemas. We warm up first (the first request lazily
loads the models and builds the SHAP TreeExplainer — a one-time cost, not a
steady-state prediction), then time N requests with time.perf_counter (end-to-end
client wall-clock). We also record the server-reported latency_ms for context.

Run:  python benchmarks/latency.py
"""
from __future__ import annotations

import http.client
import json
import statistics
import time

HOST, PORT = "localhost", 8000
WARMUP = 25
N = 250

# A realistic *degrading* drive: elevated/ rising reallocated + pending sectors so
# the classifier and SHAP do real work (not a trivial all-zero healthy row).
SMART = {
    "smart_5_raw": 120, "smart_187_raw": 5, "smart_188_raw": 0,
    "smart_197_raw": 80, "smart_198_raw": 16, "smart_9_raw": 18000,
    "smart_194_raw": 38, "smart_12_raw": 60,
    "prev_smart_5_raw": 40, "prev_smart_197_raw": 10,
    "prev_smart_198_raw": 0, "prev_smart_187_raw": 1,
}
DEVICE = {
    "smart": SMART,
    "air_temp_k": 300, "process_temp_k": 312, "rotational_speed_rpm": 1480,
    "torque_nm": 45, "tool_wear_min": 180, "rul_days": 18,
}

PAYLOADS = {
    "/api/predict/storage": SMART,
    "/api/predict/device": DEVICE,
}


def _post(conn, path, body_bytes):
    conn.request("POST", path, body=body_bytes,
                 headers={"Content-Type": "application/json",
                          "Content-Length": str(len(body_bytes))})
    resp = conn.getresponse()
    data = resp.read()
    if resp.status != 200:
        raise RuntimeError(f"{path} -> HTTP {resp.status}: {data[:200]!r}")
    return json.loads(data)


def bench(path, payload):
    body = json.dumps(payload).encode()
    conn = http.client.HTTPConnection(HOST, PORT, timeout=30)
    # warmup (excluded): triggers lazy model load + SHAP explainer build
    server_warm0 = None
    for i in range(WARMUP):
        r = _post(conn, path, body)
        if i == 0:
            server_warm0 = r.get("latency_ms")
    # timed run
    client_ms, server_ms = [], []
    for _ in range(N):
        t0 = time.perf_counter()
        r = _post(conn, path, body)
        client_ms.append((time.perf_counter() - t0) * 1000.0)
        if "latency_ms" in r:
            server_ms.append(r["latency_ms"])
    conn.close()

    s = sorted(client_ms)

    def pct(p):
        # nearest-rank percentile
        k = max(0, min(len(s) - 1, int(round(p / 100.0 * len(s) + 0.5)) - 1))
        return s[k]

    return {
        "path": path, "n": N, "warmup": WARMUP,
        "first_request_server_ms": server_warm0,
        "client": {
            "mean": statistics.fmean(client_ms),
            "p50": pct(50), "p95": pct(95), "p99": pct(99),
            "min": s[0], "max": s[-1],
        },
        "server_mean": statistics.fmean(server_ms) if server_ms else None,
    }


def main():
    print(f"Benchmarking {HOST}:{PORT}  (warmup={WARMUP}, timed N={N} each)\n")
    results = []
    for path, payload in PAYLOADS.items():
        res = bench(path, payload)
        results.append(res)
        c = res["client"]
        print(f"{path}")
        print(f"  first request (cold, incl. model+SHAP load): {res['first_request_server_ms']} ms server-side")
        print(f"  client wall-clock ms  mean={c['mean']:.2f}  p50={c['p50']:.2f}  "
              f"p95={c['p95']:.2f}  p99={c['p99']:.2f}  min={c['min']:.2f}  max={c['max']:.2f}")
        print(f"  server-reported latency_ms mean={res['server_mean']:.2f}\n")
    return results


if __name__ == "__main__":
    main()
