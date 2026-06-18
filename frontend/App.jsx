import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  LineChart, Line, AreaChart, Area, XAxis, YAxis, ReferenceLine,
  ResponsiveContainer, Tooltip, CartesianGrid,
} from "recharts";
import {
  Activity, HardDrive, Thermometer, Server, AlertTriangle, ShieldCheck,
  Play, Pause, RotateCcw, ChevronLeft, Gauge as GaugeIcon, TrendingDown, Layers,
  Clock, Cpu, Wrench, Radio,
} from "lucide-react";

// ---- real data exported from the trained models -------------------------
const DATA = __DATA__;

// ---- theme: diagnostic-instrument dark; status colors carry meaning ------
const T = {
  bg: "#0a0e14", panel: "#111824", panel2: "#161f2c", line: "#222d3d",
  text: "#e8eef6", muted: "#8a98ab", faint: "#586676",
  brand: "#8b8cf0", brandDim: "#2c2f55",
  healthy: "#3fb98a", risk: "#e0a92e", critical: "#e0564f",
  mono: 'ui-monospace, "SF Mono", SFMono-Regular, Menlo, Consolas, monospace',
  sans: 'ui-sans-serif, -apple-system, "Segoe UI", Roboto, system-ui, sans-serif',
};
const tierColor = (t) => (t === "Healthy" ? T.healthy : t === "At Risk" ? T.risk : T.critical);
const subIcon = (label, size = 14, color = T.muted) => {
  if (label.startsWith("Storage")) return <HardDrive size={size} color={color} />;
  if (label.startsWith("Thermal")) return <Thermometer size={size} color={color} />;
  return <Cpu size={size} color={color} />;
};
const tLabel = (t) => (t === 0 ? "now" : `${Math.abs(t)}d ago`);

const Panel = ({ children, style = {}, className = "" }) => (
  <div className={className} style={{ background: T.panel, border: `1px solid ${T.line}`, borderRadius: 14, ...style }}>
    {children}
  </div>
);

const ChartTip = ({ active, payload, label }) =>
  active && payload && payload.length ? (
    <div style={{ background: T.panel2, border: `1px solid ${T.line}`, borderRadius: 8, padding: "6px 10px" }} className="text-xs">
      <div style={{ color: T.faint }}>{typeof label === "number" ? `${label >= 0 ? "+" : ""}${label}d` : label}</div>
      {payload.filter((p) => p.value != null).map((p, i) => (
        <div key={i} style={{ color: p.color }} className="font-mono">{p.name}: {Math.round(p.value)}</div>
      ))}
    </div>
  ) : null;

// ---- semicircular health gauge (explicit points; no arc ambiguity) -------
function Gauge({ health, tier, size = 220 }) {
  const cx = size / 2, cy = size * 0.52, r = size * 0.4, sw = size * 0.075;
  const col = tierColor(tier);
  const pts = (from, to, steps = 64) => {
    const a = [];
    for (let i = 0; i <= steps; i++) {
      const pct = from + (to - from) * (i / steps);
      const deg = (180 + pct * 180) * Math.PI / 180;
      a.push([cx + r * Math.cos(deg), cy + r * Math.sin(deg)]);
    }
    return a;
  };
  const toPath = (a) => a.map((p, i) => `${i ? "L" : "M"}${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(" ");
  const tick = (pct) => {
    const deg = (180 + pct * 180) * Math.PI / 180;
    return [[cx + (r - sw) * Math.cos(deg), cy + (r - sw) * Math.sin(deg)],
            [cx + (r + sw * 0.5) * Math.cos(deg), cy + (r + sw * 0.5) * Math.sin(deg)]];
  };
  const t35 = tick(0.35), t65 = tick(0.65);
  return (
    <svg width={size} height={size * 0.66} viewBox={`0 0 ${size} ${size * 0.66}`}>
      <path d={toPath(pts(0, 1))} stroke={T.line} strokeWidth={sw} fill="none" strokeLinecap="round" />
      <path d={toPath(pts(0, Math.max(0.001, health / 100)))} stroke={col} strokeWidth={sw} fill="none" strokeLinecap="round" />
      {[t35, t65].map((tk, i) => (
        <line key={i} x1={tk[0][0]} y1={tk[0][1]} x2={tk[1][0]} y2={tk[1][1]} stroke={T.bg} strokeWidth={2.5} />
      ))}
      <text x={cx} y={cy - size * 0.02} textAnchor="middle" style={{ fontFamily: T.mono, fontSize: size * 0.22, fontWeight: 700, fill: col }}>{health}</text>
      <text x={cx} y={cy + size * 0.11} textAnchor="middle" style={{ fontFamily: T.sans, fontSize: size * 0.062, fill: T.muted, letterSpacing: 1 }}>HEALTH SCORE</text>
    </svg>
  );
}

const RiskBar = ({ label, risk, days }) => {
  const pct = Math.round(risk * 100);
  const col = risk >= 0.65 ? T.critical : risk >= 0.35 ? T.risk : T.healthy;
  return (
    <div>
      <div className="flex items-center justify-between" style={{ marginBottom: 6 }}>
        <span className="flex items-center gap-2 text-sm" style={{ color: T.text }}>{subIcon(label, 14, T.muted)} {label}</span>
        <span className="font-mono tabular-nums text-sm" style={{ color: col }}>
          {days != null ? `${days}d RUL` : `${pct}%`}
        </span>
      </div>
      <div style={{ height: 7, background: T.bg, borderRadius: 99, overflow: "hidden" }}>
        <div style={{ width: `${pct}%`, height: "100%", background: col, borderRadius: 99, transition: "width .3s" }} />
      </div>
    </div>
  );
};

const Pill = ({ color, children }) => (
  <span className="inline-flex items-center gap-1.5 text-xs font-medium" style={{ color, background: `${color}1f`, border: `1px solid ${color}3a`, padding: "3px 9px", borderRadius: 99 }}>
    <span style={{ width: 6, height: 6, borderRadius: 99, background: color }} /> {children}
  </span>
);

// ---- KPI cards -----------------------------------------------------------
function Kpi({ icon, label, value, sub, color = T.text }) {
  return (
    <Panel style={{ padding: 16, flex: 1, minWidth: 150 }}>
      <div className="flex items-center gap-2 text-xs" style={{ color: T.muted, marginBottom: 10 }}>{icon}{label}</div>
      <div className="font-mono tabular-nums" style={{ fontSize: 30, fontWeight: 700, color, lineHeight: 1 }}>{value}</div>
      {sub && <div className="text-xs" style={{ color: T.faint, marginTop: 6 }}>{sub}</div>}
    </Panel>
  );
}

// ---- fleet view ----------------------------------------------------------
function FleetView({ onSelect }) {
  const { summary, fleet } = DATA;
  const order = { Critical: 0, "At Risk": 1, Healthy: 2 };
  const sorted = [...fleet].sort((a, b) => order[a.tier] - order[b.tier] || a.health - b.health);
  const avail = Math.round((summary.healthy / summary.total) * 100);
  return (
    <div className="flex flex-col gap-5">
      <div className="flex gap-3 flex-wrap">
        <Kpi icon={<Server size={13} />} label="Devices monitored" value={summary.total} sub="across 4 racks" />
        <Kpi icon={<TrendingDown size={13} />} label="Predicted failures (30d)" value={summary.predictedFailures30d} sub="flagged 7-30 days ahead" color={T.risk} />
        <Kpi icon={<AlertTriangle size={13} />} label="Critical now" value={summary.critical} sub="act immediately" color={T.critical} />
        <Kpi icon={<ShieldCheck size={13} />} label="Fleet availability" value={`${avail}%`} sub={`${summary.healthy} healthy nodes`} color={T.healthy} />
      </div>

      <div>
        <div className="flex items-center justify-between" style={{ marginBottom: 12 }}>
          <span className="text-sm" style={{ color: T.muted }}>Fleet triage <span style={{ color: T.faint }}>· sorted by risk</span></span>
          <div className="flex gap-2">
            <Pill color={T.critical}>{summary.critical} critical</Pill>
            <Pill color={T.risk}>{summary.atRisk} at risk</Pill>
            <Pill color={T.healthy}>{summary.healthy} healthy</Pill>
          </div>
        </div>
        <div className="grid gap-3" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))" }}>
          {sorted.map((d) => {
            const col = tierColor(d.tier);
            return (
              <button key={d.device} className="pg-tile text-left" onClick={() => onSelect(d.device)}
                style={{ background: T.panel, border: `1px solid ${T.line}`, borderLeft: `3px solid ${col}`, borderRadius: 12, padding: 14, cursor: "pointer" }}>
                <div className="flex items-center justify-between" style={{ marginBottom: 12 }}>
                  <span className="font-mono text-sm" style={{ color: T.text }}>{d.device}</span>
                  <span className="text-xs" style={{ color: T.faint }}>{d.rack}</span>
                </div>
                <div className="flex items-end justify-between">
                  <div>
                    <div className="font-mono tabular-nums" style={{ fontSize: 28, fontWeight: 700, color: col, lineHeight: 1 }}>{d.health}</div>
                    <div className="flex items-center gap-1.5" style={{ marginTop: 8, color: T.muted }}>{subIcon(d.dominant, 13)}<span className="text-xs">{d.dominant}</span></div>
                  </div>
                  <span className="text-xs font-medium" style={{ color: col }}>{d.tier}</span>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ---- device drill-down ---------------------------------------------------
function DeviceView({ device, onBack }) {
  const row = DATA.fleet.find((d) => d.device === device);
  const det = DATA.details[device];
  const col = tierColor(row.tier);

  if (!det) {
    // healthy device: nominal panel generated client-side
    return (
      <div className="flex flex-col gap-4">
        <BackHeader row={row} onBack={onBack} col={col} />
        <Panel style={{ padding: 24 }} className="flex items-center gap-4">
          <ShieldCheck size={26} color={T.healthy} />
          <div>
            <div style={{ color: T.text, fontWeight: 600 }}>All subsystems nominal</div>
            <div className="text-sm" style={{ color: T.muted, marginTop: 4 }}>No degradation signals above threshold. Storage, thermal/power/mechanical and engine wear all within healthy bounds. Continue routine monitoring.</div>
          </div>
        </Panel>
        <Panel style={{ padding: 18 }}>
          <SectionTitle icon={<Layers size={14} />}>Subsystem risk</SectionTitle>
          <div className="flex flex-col gap-4" style={{ marginTop: 14 }}>
            <RiskBar label="Storage (disk)" risk={row.storageRisk} />
            <RiskBar label="Thermal / power / mechanical" risk={row.componentRisk} />
            <RiskBar label="Engine wear (remaining useful life)" risk={0} days={row.rulDays} />
          </div>
        </Panel>
      </div>
    );
  }

  const past = det.history.map((h) => ({ t: h.t, health: h.health }));
  const cur = past[past.length - 1].health;
  const pf = det.predictedFailureDays;
  const proj = [];
  if (pf != null && pf > 0) {
    proj.push({ t: 0, proj: cur });
    proj.push({ t: pf, proj: 6 });
  }
  const chart = [...past.map((p) => ({ ...p, proj: null })), ...proj.map((p) => ({ t: p.t, health: null, proj: p.proj }))];

  return (
    <div className="flex flex-col gap-4">
      <BackHeader row={row} onBack={onBack} col={col} />

      <div className="grid gap-4" style={{ gridTemplateColumns: "minmax(280px, 360px) 1fr" }}>
        {/* left: gauge + subsystems + prediction */}
        <div className="flex flex-col gap-4">
          <Panel style={{ padding: 18 }} className="flex flex-col items-center">
            <Gauge health={row.health} tier={row.tier} />
            <div style={{ marginTop: 4 }}><Pill color={col}>{row.tier}</Pill></div>
          </Panel>
          <Panel style={{ padding: 18 }}>
            <SectionTitle icon={<Layers size={14} />}>Subsystem risk</SectionTitle>
            <div className="flex flex-col gap-4" style={{ marginTop: 14 }}>
              <RiskBar label="Storage (disk)" risk={det.subsystems.storage.risk} />
              <RiskBar label="Thermal / power / mechanical" risk={det.subsystems.components.risk} />
              <RiskBar label="Engine wear (remaining useful life)" risk={det.subsystems.rul.risk} days={det.subsystems.rul.days} />
            </div>
          </Panel>
          {pf != null && (
            <Panel style={{ padding: 18, borderColor: `${col}55` }}>
              <div className="flex items-center gap-2 text-xs" style={{ color: T.muted }}><Clock size={13} /> PREDICTED FAILURE WINDOW</div>
              <div className="font-mono tabular-nums" style={{ fontSize: 34, fontWeight: 700, color: col, marginTop: 8 }}>~{pf} days</div>
              <div className="text-sm" style={{ color: T.faint, marginTop: 4 }}>before {row.dominant.toLowerCase()} failure</div>
            </Panel>
          )}
        </div>

        {/* right: degradation, why, action, alerts */}
        <div className="flex flex-col gap-4">
          <Panel style={{ padding: 18 }}>
            <SectionTitle icon={<TrendingDown size={14} />}>Health trajectory <span style={{ color: T.faint, fontWeight: 400 }}>· last 40 days + projection</span></SectionTitle>
            <div style={{ height: 200, marginTop: 12 }}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chart} margin={{ top: 6, right: 8, left: -18, bottom: 0 }}>
                  <defs>
                    <linearGradient id="hg" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={col} stopOpacity={0.35} />
                      <stop offset="100%" stopColor={col} stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke={T.line} strokeDasharray="2 4" vertical={false} />
                  <XAxis dataKey="t" stroke={T.faint} tick={{ fontSize: 11, fill: T.faint }} tickFormatter={(v) => (v === 0 ? "now" : v > 0 ? `+${v}` : v)} />
                  <YAxis domain={[0, 100]} stroke={T.faint} tick={{ fontSize: 11, fill: T.faint }} />
                  <Tooltip content={<ChartTip />} />
                  <ReferenceLine y={65} stroke={T.healthy} strokeDasharray="4 4" strokeOpacity={0.5} />
                  <ReferenceLine y={35} stroke={T.critical} strokeDasharray="4 4" strokeOpacity={0.5} />
                  <ReferenceLine x={0} stroke={T.muted} strokeOpacity={0.4} />
                  <Area type="monotone" dataKey="health" name="health" stroke={col} strokeWidth={2.4} fill="url(#hg)" connectNulls={false} dot={false} />
                  <Area type="monotone" dataKey="proj" name="projected" stroke={col} strokeWidth={2} strokeDasharray="5 5" fill="none" connectNulls dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </Panel>

          <Panel style={{ padding: 18 }}>
            <SectionTitle icon={<Activity size={14} />}>Why · top signals driving this prediction</SectionTitle>
            <div className="flex flex-col gap-3" style={{ marginTop: 14 }}>
              {det.why.map((w, i) => {
                const raises = w.direction === "raises risk";
                const wcol = raises ? T.critical : T.healthy;
                const mag = w.impact != null ? Math.min(1, Math.abs(w.impact) / Math.max(0.01, Math.max(...det.why.map((x) => Math.abs(x.impact || 0))))) : 0.6;
                return (
                  <div key={i}>
                    <div className="flex items-center justify-between text-sm" style={{ marginBottom: 5 }}>
                      <span style={{ color: T.text }}>{w.signal}{w.value != null ? <span className="font-mono" style={{ color: T.faint }}> · {w.value}</span> : null}</span>
                      <span style={{ color: wcol }} className="text-xs">{w.direction}</span>
                    </div>
                    <div style={{ height: 6, background: T.bg, borderRadius: 99 }}>
                      <div style={{ width: `${Math.round(mag * 100)}%`, height: "100%", background: wcol, borderRadius: 99 }} />
                    </div>
                    {w.note ? <div className="text-xs" style={{ color: T.faint, marginTop: 4 }}>{w.note}</div> : null}
                  </div>
                );
              })}
            </div>
          </Panel>

          <Panel style={{ padding: 18, background: `${col}10`, borderColor: `${col}44` }}>
            <div className="flex items-start gap-3">
              <Wrench size={18} color={col} style={{ marginTop: 2 }} />
              <div className="flex-1">
                <div className="flex items-center gap-2" style={{ marginBottom: 6 }}>
                  <span style={{ color: T.text, fontWeight: 600 }}>Recommended action</span>
                  <span className="text-xs font-mono" style={{ color: col, border: `1px solid ${col}55`, padding: "1px 7px", borderRadius: 6 }}>{det.recommendation.priority}</span>
                </div>
                <div className="text-sm" style={{ color: T.muted }}>{det.recommendation.action}</div>
              </div>
            </div>
          </Panel>

          {det.alerts.length > 0 && (
            <Panel style={{ padding: 18 }}>
              <SectionTitle icon={<Radio size={14} />}>Alert timeline</SectionTitle>
              <div className="flex flex-col gap-2" style={{ marginTop: 12 }}>
                {det.alerts.map((a, i) => {
                  const ac = a.level === "Critical" ? T.critical : a.level === "At Risk" ? T.risk : T.brand;
                  return (
                    <div key={i} className="flex items-center gap-3 text-sm" style={{ color: T.muted }}>
                      <span style={{ width: 7, height: 7, borderRadius: 99, background: ac, flexShrink: 0 }} />
                      <span className="font-mono text-xs" style={{ color: T.faint, width: 64, flexShrink: 0 }}>{tLabel(a.t)}</span>
                      <span>{a.text}</span>
                    </div>
                  );
                })}
              </div>
            </Panel>
          )}
        </div>
      </div>
    </div>
  );
}

const SectionTitle = ({ icon, children }) => (
  <div className="flex items-center gap-2 text-sm" style={{ color: T.muted, fontWeight: 600 }}>{icon}{children}</div>
);

function BackHeader({ row, onBack, col }) {
  return (
    <div className="flex items-center justify-between flex-wrap gap-3">
      <div className="flex items-center gap-3">
        <button className="pg-btn flex items-center gap-1 text-sm" onClick={onBack}
          style={{ color: T.muted, background: T.panel, border: `1px solid ${T.line}`, borderRadius: 9, padding: "7px 11px", cursor: "pointer" }}>
          <ChevronLeft size={15} /> Fleet
        </button>
        <div>
          <div className="flex items-center gap-2">
            <span className="font-mono" style={{ fontSize: 20, fontWeight: 700, color: T.text }}>{row.device}</span>
            <Pill color={col}>{row.tier}</Pill>
          </div>
          <div className="text-xs" style={{ color: T.faint, marginTop: 2 }}>{row.rack} · dominant risk: {row.dominant}</div>
        </div>
      </div>
    </div>
  );
}

// ---- model metrics view --------------------------------------------------
function MetricsView() {
  const m = DATA.metrics;
  const naive = Math.round(m.storage.naive_accuracy_baseline * 1000) / 10;
  const recall = Math.round(m.storage.recall * 100);
  const ModelCard = ({ title, icon, mm, kind }) => (
    <Panel style={{ padding: 18, flex: 1, minWidth: 250 }}>
      <SectionTitle icon={icon}>{title}</SectionTitle>
      {kind === "clf" ? (
        <>
          <div className="grid grid-cols-3 gap-3" style={{ marginTop: 14 }}>
            {[["PR-AUC", mm.pr_auc], ["Recall", mm.recall], ["FPR", mm.fpr]].map(([k, v]) => (
              <div key={k}>
                <div className="text-xs" style={{ color: T.faint }}>{k}</div>
                <div className="font-mono tabular-nums" style={{ fontSize: 22, fontWeight: 700, color: k === "FPR" ? T.muted : T.brand }}>{v}</div>
              </div>
            ))}
          </div>
          <div className="text-xs" style={{ color: T.faint, marginTop: 12, marginBottom: 6 }}>Confusion matrix · {mm.n_test.toLocaleString()} test samples · {Math.round(mm.positive_rate * 1000) / 10}% positive</div>
          <div className="grid grid-cols-2 gap-1.5">
            {[["True neg", mm.confusion.tn, T.muted], ["False pos", mm.confusion.fp, T.risk], ["False neg", mm.confusion.fn, T.critical], ["True pos", mm.confusion.tp, T.healthy]].map(([k, v, c]) => (
              <div key={k} style={{ background: T.bg, borderRadius: 8, padding: "8px 10px" }}>
                <div className="text-xs" style={{ color: T.faint }}>{k}</div>
                <div className="font-mono tabular-nums" style={{ color: c, fontWeight: 600 }}>{v.toLocaleString()}</div>
              </div>
            ))}
          </div>
        </>
      ) : (
        <div className="grid grid-cols-3 gap-3" style={{ marginTop: 14 }}>
          {[["RMSE", `${mm.rmse}`], ["MAE", `${mm.mae}`], ["Cap", `${mm.rul_cap}`]].map(([k, v]) => (
            <div key={k}>
              <div className="text-xs" style={{ color: T.faint }}>{k} {k !== "Cap" ? "(cycles)" : ""}</div>
              <div className="font-mono tabular-nums" style={{ fontSize: 22, fontWeight: 700, color: T.brand }}>{v}</div>
            </div>
          ))}
        </div>
      )}
    </Panel>
  );

  return (
    <div className="flex flex-col gap-5">
      <div className="grid gap-4" style={{ gridTemplateColumns: "1fr 1fr" }}>
        <Panel style={{ padding: 20, background: `${T.critical}10`, borderColor: `${T.critical}40` }}>
          <div className="text-xs" style={{ color: T.muted }}>NAIVE "NEVER FAILS" MODEL</div>
          <div className="font-mono tabular-nums" style={{ fontSize: 44, fontWeight: 800, color: T.critical, lineHeight: 1.1 }}>{naive}%</div>
          <div className="text-sm" style={{ color: T.text, marginTop: 4 }}>accuracy — and catches <span className="font-mono" style={{ color: T.critical }}>0</span> failures</div>
          <div className="text-xs" style={{ color: T.faint, marginTop: 8 }}>Why accuracy is a trap on imbalanced failure data.</div>
        </Panel>
        <Panel style={{ padding: 20, background: `${T.healthy}10`, borderColor: `${T.healthy}40` }}>
          <div className="text-xs" style={{ color: T.muted }}>PULSEGUARD STORAGE MODEL</div>
          <div className="font-mono tabular-nums" style={{ fontSize: 44, fontWeight: 800, color: T.healthy, lineHeight: 1.1 }}>{recall}%</div>
          <div className="text-sm" style={{ color: T.text, marginTop: 4 }}>of failing drives caught, <span style={{ color: T.healthy }}>30 days ahead</span></div>
          <div className="text-xs" style={{ color: T.faint, marginTop: 8 }}>At a deliberately capped {Math.round(m.storage.fpr * 100)}% false-alarm rate.</div>
        </Panel>
      </div>

      <div className="flex gap-4 flex-wrap">
        <ModelCard title="Storage · drive failure ≤30d" icon={<HardDrive size={14} />} mm={m.storage} kind="clf" />
        <ModelCard title="Components · thermal/power/mech" icon={<Thermometer size={14} />} mm={m.components} kind="clf" />
        <ModelCard title="Engine · remaining useful life" icon={<GaugeIcon size={14} />} mm={m.rul} kind="reg" />
      </div>

      <Panel style={{ padding: 18 }}>
        <SectionTitle icon={<Activity size={14} />}>How we evaluate</SectionTitle>
        <div className="text-sm" style={{ color: T.muted, marginTop: 10, lineHeight: 1.6 }}>
          Hardware failure is severely imbalanced, so we never report accuracy alone. Each classifier is tuned with class weighting,
          and the decision threshold is chosen to maximise recall (failures caught) while holding the false-positive rate at or below 15%,
          the operational ceiling for alert fatigue. PR-AUC and recall are the metrics that matter; the RUL model is scored on RMSE in cycles.
        </div>
      </Panel>
    </div>
  );
}

// ---- live monitor (real telemetry replay) --------------------------------
function LiveMonitor() {
  const steps = DATA.timeline.steps;
  const [idx, setIdx] = useState(0);
  const [playing, setPlaying] = useState(false);
  const timer = useRef(null);

  useEffect(() => {
    if (playing) {
      timer.current = setInterval(() => {
        setIdx((i) => { if (i >= steps.length - 1) { setPlaying(false); return i; } return i + 1; });
      }, 380);
    }
    return () => clearInterval(timer.current);
  }, [playing, steps.length]);

  const s = steps[idx];
  const col = tierColor(s.tier);
  const shown = steps.slice(0, idx + 1).map((x) => ({ t: -x.daysToFailure, health: x.health }));
  const crit = s.tier === "Critical";

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="text-sm" style={{ color: T.muted }}>
          Replaying drive <span className="font-mono" style={{ color: T.text }}>{DATA.timeline.serial}</span> · real SMART telemetry, 34 days before failure → failure
        </div>
        <div className="flex gap-2">
          <button className="pg-btn flex items-center gap-1.5 text-sm" onClick={() => setPlaying((p) => !p)}
            style={{ color: T.bg, background: T.brand, border: "none", borderRadius: 9, padding: "8px 14px", cursor: "pointer", fontWeight: 600 }}>
            {playing ? <Pause size={15} /> : <Play size={15} />}{playing ? "Pause" : idx >= steps.length - 1 ? "Replay" : "Play"}
          </button>
          <button className="pg-btn flex items-center gap-1.5 text-sm" onClick={() => { setPlaying(false); setIdx(0); }}
            style={{ color: T.muted, background: T.panel, border: `1px solid ${T.line}`, borderRadius: 9, padding: "8px 12px", cursor: "pointer" }}>
            <RotateCcw size={14} />
          </button>
        </div>
      </div>

      {crit && (
        <Panel style={{ padding: 14, background: `${T.critical}18`, borderColor: T.critical }}>
          <div className="flex items-center gap-3">
            <AlertTriangle size={18} color={T.critical} />
            <div className="text-sm" style={{ color: T.text }}>
              <span style={{ fontWeight: 700, color: T.critical }}>CRITICAL ALERT · </span>
              predicted drive failure in ~{s.daysToFailure} days. Back up data now and schedule replacement (P1).
            </div>
          </div>
        </Panel>
      )}

      <div className="grid gap-4" style={{ gridTemplateColumns: "minmax(220px, 280px) 1fr" }}>
        <div className="flex flex-col gap-4">
          <Panel style={{ padding: 18 }}>
            <div className="text-xs" style={{ color: T.muted }}>DEVICE HEALTH</div>
            <div className="font-mono tabular-nums" style={{ fontSize: 56, fontWeight: 800, color: col, lineHeight: 1.05 }}>{s.health}</div>
            <div style={{ marginTop: 4 }}><Pill color={col}>{s.tier}</Pill></div>
            <div className="text-sm" style={{ color: T.faint, marginTop: 12 }} >
              Day {s.day} · <span className="font-mono" style={{ color: T.muted }}>{s.daysToFailure}d</span> to failure
            </div>
          </Panel>
          <Panel style={{ padding: 18 }}>
            <div className="text-xs" style={{ color: T.muted, marginBottom: 10 }}>LIVE SMART COUNTERS</div>
            {[["Reallocated sectors (5)", s.smart5], ["Pending sectors (197)", s.smart197], ["Offline uncorrectable (198)", s.smart198]].map(([k, v]) => (
              <div key={k} className="flex items-center justify-between" style={{ padding: "6px 0", borderBottom: `1px solid ${T.line}` }}>
                <span className="text-xs" style={{ color: T.muted }}>{k}</span>
                <span className="font-mono tabular-nums text-sm" style={{ color: v > 40 ? T.critical : v > 5 ? T.risk : T.muted, fontWeight: 600 }}>{v}</span>
              </div>
            ))}
          </Panel>
        </div>

        <Panel style={{ padding: 18 }}>
          <SectionTitle icon={<Activity size={14} />}>Health score · streaming</SectionTitle>
          <div style={{ height: 270, marginTop: 12 }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={shown} margin={{ top: 6, right: 10, left: -18, bottom: 0 }}>
                <CartesianGrid stroke={T.line} strokeDasharray="2 4" vertical={false} />
                <XAxis dataKey="t" stroke={T.faint} tick={{ fontSize: 11, fill: T.faint }} domain={[-34, 0]} type="number" tickFormatter={(v) => (v === 0 ? "fail" : v)} />
                <YAxis domain={[0, 100]} stroke={T.faint} tick={{ fontSize: 11, fill: T.faint }} />
                <Tooltip content={<ChartTip />} />
                <ReferenceLine y={65} stroke={T.healthy} strokeDasharray="4 4" strokeOpacity={0.5} />
                <ReferenceLine y={35} stroke={T.critical} strokeDasharray="4 4" strokeOpacity={0.5} />
                <Line type="monotone" dataKey="health" name="health" stroke={col} strokeWidth={2.6} dot={false} isAnimationActive={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <input type="range" min={0} max={steps.length - 1} value={idx} onChange={(e) => { setPlaying(false); setIdx(+e.target.value); }}
            className="pg-range" style={{ width: "100%", marginTop: 8, accentColor: T.brand }} />
        </Panel>
      </div>
    </div>
  );
}

// ---- app shell -----------------------------------------------------------
export default function App() {
  const [view, setView] = useState("fleet");
  const [device, setDevice] = useState(null);
  const { summary } = DATA;

  const nav = [
    { id: "fleet", label: "Fleet", icon: Server },
    { id: "metrics", label: "Model metrics", icon: GaugeIcon },
    { id: "live", label: "Live monitor", icon: Radio },
  ];
  const go = (id) => { setView(id); setDevice(null); };

  return (
    <div style={{ background: T.bg, color: T.text, fontFamily: T.sans, minHeight: 600 }}>
      <style>{`
        .pg-tile{transition:transform .12s ease, border-color .12s ease, background .12s ease}
        .pg-tile:hover{transform:translateY(-2px); background:${T.panel2}}
        .pg-btn{transition:background .12s ease, color .12s ease}
        .pg-btn:hover{background:${T.panel2}}
        .pg-nav{transition:background .12s ease, color .12s ease}
        .pg-nav:hover{background:${T.panel}}
        *:focus-visible{outline:2px solid ${T.brand}; outline-offset:2px; border-radius:6px}
        .pg-range{height:4px}
      `}</style>

      <div className="flex" style={{ minHeight: 600 }}>
        {/* left rail */}
        <div style={{ width: 210, borderRight: `1px solid ${T.line}`, padding: 16, flexShrink: 0 }} className="flex flex-col gap-1">
          <div className="flex items-center gap-2" style={{ padding: "6px 8px 18px" }}>
            <div style={{ width: 30, height: 30, borderRadius: 9, background: `${T.brand}22`, border: `1px solid ${T.brand}55`, display: "grid", placeItems: "center" }}>
              <Activity size={17} color={T.brand} />
            </div>
            <div>
              <div style={{ fontWeight: 700, letterSpacing: 0.5 }}>PulseGuard</div>
              <div className="text-xs" style={{ color: T.faint }}>predictive maintenance</div>
            </div>
          </div>
          {nav.map((n) => {
            const active = view === n.id && !device;
            const Icon = n.icon;
            return (
              <button key={n.id} className="pg-nav flex items-center gap-2.5 text-sm" onClick={() => go(n.id)}
                style={{ color: active ? T.text : T.muted, background: active ? T.panel : "transparent", border: `1px solid ${active ? T.line : "transparent"}`, borderLeft: `2px solid ${active ? T.brand : "transparent"}`, borderRadius: 9, padding: "9px 11px", cursor: "pointer", textAlign: "left" }}>
                <Icon size={16} color={active ? T.brand : T.faint} /> {n.label}
              </button>
            );
          })}
          <div style={{ marginTop: "auto" }}>
            <Panel style={{ padding: 12 }}>
              <div className="text-xs" style={{ color: T.faint, marginBottom: 6 }}>MODELS</div>
              <div className="flex items-center gap-2 text-xs" style={{ color: T.healthy }}><ShieldCheck size={13} /> 3 trained · live</div>
              <div className="text-xs" style={{ color: T.faint, marginTop: 6 }}>Backblaze · AI4I · C-MAPSS</div>
            </Panel>
          </div>
        </div>

        {/* main */}
        <div className="flex-1" style={{ minWidth: 0 }}>
          <div className="flex items-center justify-between" style={{ borderBottom: `1px solid ${T.line}`, padding: "14px 22px" }}>
            <div className="text-sm" style={{ color: T.muted }}>
              {device ? "Device detail" : view === "fleet" ? "Fleet overview" : view === "metrics" ? "Model performance" : "Live failure replay"}
            </div>
            <div className="flex items-center gap-2">
              <Pill color={T.critical}>{summary.critical}</Pill>
              <Pill color={T.risk}>{summary.atRisk}</Pill>
              <Pill color={T.healthy}>{summary.healthy}</Pill>
            </div>
          </div>
          <div style={{ padding: 22 }}>
            {device ? <DeviceView device={device} onBack={() => setDevice(null)} />
              : view === "fleet" ? <FleetView onSelect={setDevice} />
              : view === "metrics" ? <MetricsView />
              : <LiveMonitor />}
          </div>
        </div>
      </div>
    </div>
  );
}
