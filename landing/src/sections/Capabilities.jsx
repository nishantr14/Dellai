import { motion } from "framer-motion";
import { Gauge, TrendingDown, Activity, Radio, Wrench, Layers } from "lucide-react";
import SectionWrapper from "../components/SectionWrapper.jsx";
import GlassCard from "../components/GlassCard.jsx";
import TiltCard from "../components/TiltCard.jsx";
import { T } from "../theme.js";

// Apple-style bento grid of the six core capabilities. Asymmetric spans, soft
// glass surfaces over the video, mouse-tracked 3D tilt.
const FEATURES = [
  {
    icon: Gauge, title: "Device Health Score", accent: T.brand, span: "md:col-span-3 md:row-span-2",
    body: "One number, fused from storage, thermal, power and wear models — so an operator knows a node's state at a glance.",
    feature: true,
  },
  {
    icon: TrendingDown, title: "Failure Prediction", accent: T.brand, span: "md:col-span-3",
    body: "Which component will fail, and the 7–30 day window before it does.",
  },
  {
    icon: Activity, title: "Explainable AI · SHAP", accent: T.brand, span: "md:col-span-2",
    body: "Every prediction comes with the signals that drove it.",
  },
  {
    icon: Radio, title: "Real-Time Telemetry", accent: T.dell, span: "md:col-span-2",
    body: "Live SMART, thermal, power and fan streams.",
  },
  {
    icon: Wrench, title: "Predictive Maintenance", accent: T.healthy, span: "md:col-span-2",
    body: "Prioritized actions — fix before downtime, not after.",
  },
  {
    icon: Layers, title: "Fleet Risk Prioritization", accent: T.risk, span: "md:col-span-6",
    body: "Triage the entire fleet automatically — critical nodes surface first, every time.",
  },
];

export default function Capabilities() {
  return (
    <SectionWrapper className="grid place-items-center py-28">
      <div className="mx-auto max-w-6xl px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.6 }} transition={{ duration: 0.8 }}
          className="mb-14 max-w-2xl"
        >
          <div className="mb-3 font-mono text-xs uppercase tracking-[0.3em] text-brand">Platform</div>
          <h2 className="text-4xl font-bold leading-[1.08] tracking-tight md:text-6xl">
            Everything you need to<br />stay ahead of failure.
          </h2>
        </motion.div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-6 md:auto-rows-[minmax(160px,auto)]">
          {FEATURES.map((f, i) => (
            <motion.div
              key={f.title}
              className={f.span}
              initial={{ opacity: 0, y: 26 }} whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.3 }}
              transition={{ duration: 0.55, delay: (i % 3) * 0.08 }}
            >
              <TiltCard className="h-full" max={6}>
                <GlassCard accent={f.accent} className="flex h-full flex-col justify-between p-6">
                  <div className="flex items-start justify-between">
                    <span
                      className="grid h-11 w-11 place-items-center rounded-xl"
                      style={{ background: `${f.accent}1c`, border: `1px solid ${f.accent}44` }}
                    >
                      <f.icon size={20} color={f.accent} />
                    </span>
                    {f.feature && (
                      <span className="font-mono text-5xl font-extrabold tabular-nums text-glow"
                        style={{ color: f.accent }}>96</span>
                    )}
                  </div>
                  <div className={f.feature ? "mt-10" : "mt-6"}>
                    <h3 className={`font-semibold tracking-tight ${f.feature ? "text-2xl" : "text-lg"}`}>{f.title}</h3>
                    <p className="mt-2 max-w-md text-sm leading-relaxed text-muted">{f.body}</p>
                  </div>
                </GlassCard>
              </TiltCard>
            </motion.div>
          ))}
        </div>
      </div>
    </SectionWrapper>
  );
}
