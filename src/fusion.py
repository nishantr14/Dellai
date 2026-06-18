"""
Device Health Score fusion engine.

Each subsystem (storage / thermal-power-mechanical / engine-RUL) produces a risk
in [0, 1]. We fuse them into a single 0-100 Device Health Score.

Design choice worth defending in Q&A: we do NOT use a plain weighted average,
because one dying subsystem must not be hidden by two healthy ones. We blend a
weighted mean with a dominant-risk term so a single critical subsystem pulls the
whole device toward critical. (This is the same weighted-fusion-with-override
pattern behind multi-signal detection systems.)
"""
from __future__ import annotations

from dataclasses import dataclass, field

WEIGHTS = {"storage": 0.40, "components": 0.40, "rul": 0.20}

# tier thresholds on the 0-100 health score
TIERS = [
    (65, "Healthy", "#2ecc71"),
    (35, "At Risk", "#f1c40f"),
    (0,  "Critical", "#e74c3c"),
]


def rul_to_risk(rul_days: float, window: int = 30) -> float:
    """RUL only contributes risk once it drops inside the maintenance window."""
    if rul_days >= window:
        return 0.0
    return round(min(1.0, (window - rul_days) / window), 4)


def fuse(storage_risk: float, component_risk: float, rul_days: float,
         weights: dict | None = None) -> dict:
    w = weights or WEIGHTS
    rul_risk = rul_to_risk(rul_days)
    subsystems = {"storage": storage_risk, "components": component_risk, "rul": rul_risk}
    weighted = sum(w[k] * subsystems[k] for k in subsystems)
    dominant = max(subsystems.values())
    overall = max(weighted, 0.7 * dominant)        # dominant-risk override
    health = round(100 * (1 - overall))
    return {
        "health_score": int(health),
        "overall_risk": round(overall, 4),
        "subsystem_risk": {k: round(v, 4) for k, v in subsystems.items()},
        "dominant_subsystem": max(subsystems, key=subsystems.get),
        "rul_days": round(rul_days, 1),
    }


def tier(health_score: int):
    for cutoff, name, color in TIERS:
        if health_score >= cutoff:
            return name, color
    return TIERS[-1][1], TIERS[-1][2]


# --------------------------------------------------------------------------- #
# Prescriptive layer: turn a score + dominant subsystem into a concrete action.
# --------------------------------------------------------------------------- #
SUBSYSTEM_LABEL = {
    "storage": "Storage (disk)",
    "components": "Thermal / power / mechanical",
    "rul": "Engine wear (remaining useful life)",
}

ACTIONS = {
    "storage": "Back up data now and schedule drive replacement. Reallocated and "
               "pending-sector growth indicates the disk is approaching end of life.",
    "components": "Inspect cooling and power delivery. Telemetry shows the thermal "
                  "margin or power envelope drifting toward the failure boundary.",
    "rul": "Plan an engine/component service inside the predicted window. Degradation "
           "trend puts remaining useful life below the safe maintenance horizon.",
}


def recommend(fused: dict) -> dict:
    health = fused["health_score"]
    tier_name, color = tier(health)
    dom = fused["dominant_subsystem"]
    if tier_name == "Healthy":
        action = "No action required. Continue monitoring."
        priority = "P4 - routine"
    elif tier_name == "At Risk":
        action = ACTIONS[dom]
        priority = "P2 - schedule within maintenance window"
    else:
        action = ACTIONS[dom]
        priority = "P1 - act now, high failure probability"
    return {
        "tier": tier_name, "color": color, "priority": priority,
        "dominant_label": SUBSYSTEM_LABEL[dom], "action": action,
    }


# --------------------------------------------------------------------------- #
@dataclass
class Device:
    """A monitored server: bundles the three subsystem readings + fused result."""
    device_id: str
    rack: str
    storage_risk: float
    component_risk: float
    rul_days: float
    fused: dict = field(default_factory=dict)
    rec: dict = field(default_factory=dict)
    detail: dict = field(default_factory=dict)

    def score(self):
        self.fused = fuse(self.storage_risk, self.component_risk, self.rul_days)
        self.rec = recommend(self.fused)
        return self
