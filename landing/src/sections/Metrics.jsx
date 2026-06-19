import { motion } from "framer-motion";
import SectionWrapper from "../components/SectionWrapper.jsx";
import Counter from "../components/Counter.jsx";
import { T } from "../theme.js";

// Real values pulled from data.metrics / data.summary; falls back to brief numbers.
export default function Metrics({ metrics, summary }) {
  const recall = Math.round((metrics?.storage?.recall ?? 0.7061) * 100);
  const prevented = summary?.predictedFailures30d ?? 8;

  const STATS = [
    { value: recall, suffix: "%", label: "Failure recall", note: "of failing drives caught, 30 days ahead", color: T.brand },
    { value: 30, suffix: "", label: "Day lead time", note: "advance warning before failure", color: T.dell },
    { value: 1, suffix: "s", label: "Predictions", note: "real-time scoring per device", color: T.healthy, literal: "sub-second" },
    { value: prevented, suffix: "", label: "Failures prevented", note: "flagged across the live fleet", color: T.risk },
  ];

  return (
    <SectionWrapper id="metrics" className="grid place-items-center">
      <div className="mx-auto max-w-6xl px-6 text-center">
        <motion.h2 initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.6 }} transition={{ duration: 0.8 }}
          className="text-3xl font-bold tracking-tight md:text-5xl">
          Measured on real, imbalanced failure data.
        </motion.h2>
        <div className="mt-14 grid grid-cols-2 gap-6 md:grid-cols-4">
          {STATS.map((s) => (
            <div key={s.label}>
              <div className="font-mono text-5xl font-extrabold md:text-6xl" style={{ color: s.color }}>
                {s.literal ? s.literal : <Counter value={s.value} suffix={s.suffix} />}
              </div>
              <div className="mt-3 text-sm font-semibold">{s.label}</div>
              <div className="mt-1 text-xs text-muted">{s.note}</div>
            </div>
          ))}
        </div>
      </div>
    </SectionWrapper>
  );
}
