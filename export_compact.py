"""Produce a compact JSON (rounded, trimmed) for embedding directly in the
single-file React dashboard so it renders in the chat with real numbers."""
import json, os

full = json.load(open(os.path.join(os.path.dirname(__file__), "frontend_data.json")))


def r(x, n=3):
    return None if x is None else round(float(x), n)


fleet = [{"device": d["device"], "rack": d["rack"], "health": d["health"],
          "tier": d["tier"], "storageRisk": r(d["storageRisk"]),
          "componentRisk": r(d["componentRisk"]), "rulDays": r(d["rulDays"], 1),
          "dominant": d["dominant"], "priority": d["priority"]} for d in full["fleet"]]

details = {}
for dev, det in full["details"].items():
    tier = det["recommendation"]["tier"]
    if tier == "Healthy":
        continue  # the component renders a nominal panel for healthy devices
    hist = det["history"]
    hist = hist[::2][-20:] if len(hist) > 20 else hist  # thin to <=20 points
    why = [{"signal": w["signal"], "value": r(w.get("value"), 2),
            "direction": w["direction"], "note": w.get("note", ""),
            "impact": r(w.get("impact"), 3)} for w in det["why"]]
    details[dev] = {
        "why": why, "history": hist, "alerts": det["alerts"],
        "predictedFailureDays": det["predictedFailureDays"],
        "subsystems": {k: {"risk": r(v["risk"]), **({"days": r(v["days"], 1)} if "days" in v else {})}
                       for k, v in det["subsystems"].items()},
        "recommendation": det["recommendation"],
    }

timeline = {"serial": full["timeline"]["serial"],
            "steps": [{"day": s["day"], "daysToFailure": s["daysToFailure"],
                       "storageRisk": r(s["storageRisk"]), "health": s["health"],
                       "tier": s["tier"], "smart5": s["smart5"],
                       "smart197": s["smart197"], "smart198": s["smart198"]}
                      for s in full["timeline"]["steps"]]}

compact = {"summary": full["summary"], "metrics": full["metrics"],
           "fleet": fleet, "details": details, "timeline": timeline,
           "weights": full["weights"]}

out = os.path.join(os.path.dirname(__file__), "frontend_data_compact.json")
json.dump(compact, open(out, "w"), separators=(",", ":"))
print("wrote", out, "|", os.path.getsize(out), "bytes |", len(details), "detailed devices")
