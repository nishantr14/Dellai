"""
Authored domain-reasoning overlay: cross-subsystem failure cascades + a
signal-driven recommendation engine.

THIS IS NOT A LEARNED MODEL. It is a small, hand-authored rule layer that sits
*on top of* the already-computed subsystem risks and SHAP "why" signals. It does
not retrain, re-score, or alter health / tiers / fusion in any way -- it only
adds interpretation.

Honesty note (must stay in the framing shown to judges): the three subsystems
come from three DIFFERENT datasets (Backblaze drives, AI4I components, NASA
C-MAPSS engines). A device in this demo binds one row from each. So a "cascade"
here is an engineering-reasoning hypothesis over *co-occurring subsystem states*
-- a pattern an operator would recognize as consistent with a known hardware
failure mechanism -- NOT physical causation proven inside one physical drive.
Every cascade we emit carries that disclaimer in its `basis` field.

A cascade only fires when the relevant subsystem signals are GENUINELY elevated
in that device. Devices without co-occurring conditions get an explicit
"no cascade detected" -- we never fabricate a chain.
"""
from __future__ import annotations

# --------------------------------------------------------------------------- #
# Thresholds. A subsystem must clear ELEVATED to be a credible *upstream* driver
# of a cascade; a co-occurring downstream subsystem must clear RISING to count.
# These are deliberately conservative so the cascade stays rare and defensible.
# --------------------------------------------------------------------------- #
ELEVATED = 0.50   # subsystem is clearly contributing failure risk
RISING = 0.35     # subsystem is meaningfully stressed (not just noise)

BASIS = ("authored domain-reasoning overlay (hand-written rules over co-occurring "
         "subsystem states; not learned, not model-discovered)")

# The components model (AI4I) mixes thermal, mechanical and electrical failure
# modes. We read its top SHAP signal to decide which physical mechanism is
# driving it, which in turn selects the plausible cascade + the right action.
THERMAL_FEATURES = {"air_temp_k", "process_temp_k", "temp_diff_k"}
MECHANICAL_FEATURES = {"tool_wear_min", "torque_nm", "wear_torque", "rotational_speed_rpm"}
POWER_FEATURES = {"power_w"}

# Storage SHAP signals that specifically indicate disk-surface end-of-life
# (as opposed to mere age / power-cycles).
SECTOR_PREFIXES = ("smart_5_raw", "smart_197_raw", "smart_198_raw", "smart_187_raw")

SUBSYSTEM_LABEL = {
    "storage": "Storage (disk)",
    "components": "Thermal / power / mechanical",
    "rul": "Engine wear (remaining useful life)",
}


# --------------------------------------------------------------------------- #
# Signal helpers
# --------------------------------------------------------------------------- #
def _top_risk_signals(signals):
    """Top 'raises risk' SHAP signals (already ordered by |impact| descending)."""
    return [s for s in (signals or []) if s.get("direction") == "raises risk"]


def _component_nature(component_signals):
    """Classify the dominant physical mechanism of an elevated components reading
    from its top risk-raising SHAP signal: 'thermal' | 'mechanical' | 'power'.
    Returns None if no recognized driver is present (so we don't fabricate)."""
    for s in _top_risk_signals(component_signals):
        f = s.get("raw_feature")
        if f in THERMAL_FEATURES:
            return "thermal"
        if f in MECHANICAL_FEATURES:
            return "mechanical"
        if f in POWER_FEATURES:
            return "power"
    return None


def _storage_is_surface_wear(storage_signals):
    """True if the storage risk is driven by sector/uncorrectable growth (a
    physical-surface failure that vibration / heat can plausibly accelerate),
    not merely drive age."""
    for s in _top_risk_signals(storage_signals):
        f = s.get("raw_feature", "")
        if any(f.startswith(p) for p in SECTOR_PREFIXES):
            return True
    return False


# --------------------------------------------------------------------------- #
# 1. Failure cascade
# --------------------------------------------------------------------------- #
def _no_cascade(reason):
    return {
        "detected": False,
        "chain": None,
        "summary": f"No cascade detected — {reason}.",
        "rootCause": None,
        "rootCauseLabel": None,
        "links": [],
        "basis": BASIS,
    }


def infer_cascade(subsystem_risk: dict, signals: dict) -> dict:
    """Infer a likely cross-subsystem causal chain for ONE device.

    subsystem_risk : {"storage": r, "components": r, "rul": r}  (all 0-1 risks)
    signals        : {"storage": [why...], "components": [why...], "rul": [why...]}
                     (partial is fine; each why item has raw_feature + direction)

    Returns a cascade dict (see CONTRACT.md). Fires ONLY when an upstream driver
    is genuinely ELEVATED and a downstream subsystem is genuinely RISING.
    """
    r_s = float(subsystem_risk.get("storage", 0.0))
    r_c = float(subsystem_risk.get("components", 0.0))
    r_r = float(subsystem_risk.get("rul", 0.0))

    # Every authored chain in this set is rooted in the thermal/mechanical/power
    # components subsystem, because that is the only subsystem whose telemetry
    # exposes a physical driver (heat / vibration / power) that could plausibly
    # stress a neighbor. If components isn't elevated, there is no upstream cause
    # to author a chain from.
    if r_c < ELEVATED:
        return _no_cascade("no elevated upstream driver (thermal/mechanical/power)")

    nature = _component_nature(signals.get("components"))
    if nature is None:
        return _no_cascade("components elevated but no recognized physical driver")

    downstream_storage = r_s >= RISING
    downstream_rul = r_r >= RISING

    links = []
    chain = None
    summary = None

    if nature == "thermal" and downstream_storage:
        chain = "Thermal stress → accelerated storage degradation"
        links = [{"from": "components", "to": "storage", "mechanism": "heat-driven media wear"}]
        summary = (
            f"Elevated thermal stress (components risk {r_c:.2f}) is co-occurring with "
            f"rising storage risk ({r_s:.2f}). Sustained heat is a known accelerant of "
            f"disk-surface degradation — a pattern consistent with thermal stress "
            f"shortening drive life."
        )
    elif nature == "mechanical" and downstream_storage:
        chain = "Mechanical wear → vibration → drive stress"
        links = [{"from": "components", "to": "storage", "mechanism": "vibration coupling"}]
        summary = (
            f"Mechanical overstrain (components risk {r_c:.2f}) is co-occurring with "
            f"rising storage risk ({r_s:.2f}). Worn rotating assemblies raise vibration, "
            f"which is a recognized driver of read/write errors and head stress on nearby "
            f"drives."
        )
    elif nature == "power" and (downstream_storage or downstream_rul):
        chain = "Power instability → multi-subsystem stress"
        if downstream_storage:
            links.append({"from": "components", "to": "storage", "mechanism": "rail/voltage instability"})
        if downstream_rul:
            links.append({"from": "components", "to": "rul", "mechanism": "rail/voltage instability"})
        affected = " and ".join(
            x for x, on in [("storage", downstream_storage), ("engine", downstream_rul)] if on)
        summary = (
            f"Unstable power delivery (components risk {r_c:.2f}, power-draw the top signal) "
            f"is co-occurring with stress on {affected}. Power-rail instability stresses "
            f"multiple subsystems at once — consistent with a shared electrical root cause."
        )
    else:
        return _no_cascade("components elevated but no co-occurring downstream subsystem")

    # If a third subsystem is also elevated, note the multi-subsystem co-occurrence
    # (kept as an honest add-on, not a new fabricated causal link).
    extra = []
    if chain and chain.startswith(("Thermal", "Mechanical")) and downstream_rul:
        extra.append("engine remaining-useful-life is also low")
    if extra:
        summary += " (Also co-occurring: " + "; ".join(extra) + ".)"

    return {
        "detected": True,
        "chain": chain,
        "summary": summary,
        "rootCause": "components",
        "rootCauseLabel": SUBSYSTEM_LABEL["components"],
        "rootCauseNature": nature,
        "links": links,
        "basis": BASIS,
    }


# --------------------------------------------------------------------------- #
# 2. Recommendation engine (rule-based, driven by the explanation)
# --------------------------------------------------------------------------- #
# Concrete action per (subsystem, physical-driver). No generic boilerplate.
_STORAGE_SURFACE = ("Back up data now and replace the drive",
                    "reallocated / pending sector growth is the dominant failure signal")
_STORAGE_AGE = ("Back up data and schedule drive replacement",
                "drive age / wear is the dominant failure signal")
_COMP_ACTION = {
    "thermal": ("Check airflow; clean or replace the cooling fan",
                "thermal margin is the dominant failure signal"),
    "mechanical": ("Inspect the mechanical assembly and reduce load",
                   "mechanical overstrain (wear×load) is the dominant failure signal"),
    "power": ("Stabilize power delivery; inspect the PSU / power rails",
              "power draw is the dominant failure signal"),
}
_RUL_ACTION = ("Schedule component replacement within the predicted window",
               "remaining useful life is below the maintenance horizon")


def _priority_code(tier_name: str, predicted_failure_days) -> tuple[str, str]:
    """P1 (act now) … P4 (routine), from tier + lead time."""
    if tier_name == "Critical":
        return "P1", "act now — high, near-term failure probability"
    if tier_name == "At Risk":
        if predicted_failure_days is not None and predicted_failure_days <= 14:
            return "P2", "schedule this week — short lead time"
        return "P3", "schedule within the maintenance window"
    return "P4", "routine — continue monitoring"


def _maintenance_window(tier_name: str, predicted_failure_days) -> str:
    if tier_name == "Critical":
        return "Immediate (within 24–48h)"
    if tier_name == "Healthy":
        return "Routine — next scheduled cycle"
    if predicted_failure_days is not None:
        buffer = max(3, predicted_failure_days - 3)
        return f"Within ~{buffer} days (ahead of predicted failure at ~{predicted_failure_days}d)"
    return "Within the next maintenance window (≤14 days)"


def _base_action(subsystem: str, signals, nature_hint=None):
    """(headline, reason, top_signal_label) for a subsystem from its top signal."""
    top = _top_risk_signals(signals)
    top_label = top[0]["signal"] if top else None
    if subsystem == "storage":
        head, reason = _STORAGE_SURFACE if _storage_is_surface_wear(signals) else _STORAGE_AGE
    elif subsystem == "components":
        nat = nature_hint or _component_nature(signals) or "thermal"
        head, reason = _COMP_ACTION[nat]
    else:  # rul
        head, reason = _RUL_ACTION
    return head, reason, top_label


def build_recommendation(tier_name: str, dominant: str, dominant_signals,
                         predicted_failure_days, rul_days, cascade: dict,
                         root_signals=None) -> dict:
    """Rule-based recommendation: matches the dominant subsystem AND its top SHAP
    signal, with priority + maintenance window from tier + lead time. If a cascade
    fired, the action targets the ROOT cause (upstream), not just the symptom."""
    code, code_reason = _priority_code(tier_name, predicted_failure_days)
    window = _maintenance_window(tier_name, predicted_failure_days)

    if tier_name == "Healthy":
        return {
            "priorityCode": code,
            "priorityReason": code_reason,
            "maintenanceWindow": window,
            "headline": "No action required — continue monitoring",
            "action": "No action required. Continue routine monitoring.",
            "topSignal": None,
            "rootCause": dominant,
            "targetsRootCause": False,
            "basis": "rule-based; driven by dominant subsystem + top SHAP signal",
        }

    # Default: act on the dominant subsystem's own top signal.
    target = dominant
    target_signals = dominant_signals
    nature_hint = None
    targets_root = False

    # If a cascade fired and the root cause is a DIFFERENT subsystem than the
    # dominant (visible) symptom, pivot the action upstream to the root cause.
    if cascade.get("detected") and cascade.get("rootCause") and cascade["rootCause"] != dominant:
        target = cascade["rootCause"]
        target_signals = root_signals if root_signals is not None else dominant_signals
        nature_hint = cascade.get("rootCauseNature")
        targets_root = True
    elif cascade.get("detected"):
        # Root == dominant: action already on the root; note the relief downstream.
        nature_hint = cascade.get("rootCauseNature")

    head, reason, top_label = _base_action(target, target_signals, nature_hint)
    action = f"{head} — {reason}."

    if cascade.get("detected"):
        if targets_root:
            action += (f" This targets the cascade root cause ({cascade['rootCauseLabel']}); "
                       f"the visible {SUBSYSTEM_LABEL.get(dominant, dominant)} risk is the "
                       f"downstream symptom.")
        else:
            action += " Resolving this root cause also relieves the co-occurring downstream stress."

    return {
        "priorityCode": code,
        "priorityReason": code_reason,
        "maintenanceWindow": window,
        "headline": head,
        "action": action,
        "topSignal": top_label,
        "rootCause": target,
        "targetsRootCause": targets_root,
        "basis": "rule-based; driven by dominant subsystem + top SHAP signal",
    }
