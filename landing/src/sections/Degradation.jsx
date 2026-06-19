import { useRef, useState } from "react";
import {
  AreaChart, Area, XAxis, YAxis, ReferenceLine, ResponsiveContainer, CartesianGrid,
} from "recharts";
import SectionWrapper from "../components/SectionWrapper.jsx";
import { useScrollScene } from "../hooks/useScrollScene.js";
import { gsap } from "../lib/gsap.js";
import { T } from "../theme.js";

const STAGES = [96, 74, 41, 5];
const SERIES = [
  { t: -40, h: 96 }, { t: -30, h: 92 }, { t: -22, h: 80 }, { t: -16, h: 74 },
  { t: -10, h: 55 }, { t: -6, h: 41 }, { t: -3, h: 20 }, { t: 0, h: 5 },
];

export default function Degradation() {
  const scopeRef = useRef(null);
  const [health, setHealth] = useState(96);
  const [revealT, setRevealT] = useState(-40);

  useScrollScene(scopeRef, () => {
    const proxy = { p: 0 };
    gsap.to(proxy, {
      p: 1,
      ease: "none",
      scrollTrigger: {
        trigger: scopeRef.current,
        start: "top top",
        end: "+=160%",
        pin: true,
        scrub: true,
      },
      onUpdate: () => {
        const idx = Math.min(STAGES.length - 1, Math.floor(proxy.p * STAGES.length));
        setHealth(STAGES[idx]);
        setRevealT(-40 + proxy.p * 40);
      },
    });
  }, []);

  const col = health > 65 ? T.healthy : health > 35 ? T.risk : T.critical;
  const shown = SERIES.filter((d) => d.t <= revealT);

  return (
    <SectionWrapper ref={scopeRef} className="grid place-items-center">
      <div className="mx-auto grid max-w-6xl gap-10 px-6 md:grid-cols-2 md:items-center">
        <div>
          <h2 className="text-3xl font-bold tracking-tight md:text-5xl">
            Watch a healthy node<br />slip toward failure.
          </h2>
          <p className="mt-4 max-w-md text-muted">
            Degradation is gradual and invisible to threshold alarms. PulseGuard sees the
            slope, not just the cliff.
          </p>
          <div className="mt-8 font-mono tabular-nums" style={{ color: col }}>
            <span className="text-7xl font-extrabold md:text-8xl">{health}</span>
            <span className="ml-3 text-sm uppercase tracking-widest text-muted">health score</span>
          </div>
        </div>
        <div style={{ height: 300 }}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={shown} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
              <defs>
                <linearGradient id="dg" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={col} stopOpacity={0.4} />
                  <stop offset="100%" stopColor={col} stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke={T.line} strokeDasharray="2 4" vertical={false} />
              <XAxis dataKey="t" stroke={T.faint} tick={{ fontSize: 11, fill: T.faint }}
                tickFormatter={(v) => (v === 0 ? "fail" : `${v}d`)} domain={[-40, 0]} type="number" />
              <YAxis domain={[0, 100]} stroke={T.faint} tick={{ fontSize: 11, fill: T.faint }} />
              <ReferenceLine y={65} stroke={T.healthy} strokeDasharray="4 4" strokeOpacity={0.5} />
              <ReferenceLine y={35} stroke={T.critical} strokeDasharray="4 4" strokeOpacity={0.5} />
              <Area type="monotone" dataKey="h" stroke={col} strokeWidth={2.6} fill="url(#dg)" dot={false} isAnimationActive={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </SectionWrapper>
  );
}
