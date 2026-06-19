import { motion } from "framer-motion";
import { HardDrive, Thermometer, Zap, Clock } from "lucide-react";
import SectionWrapper from "../components/SectionWrapper.jsx";
import GlassCard from "../components/GlassCard.jsx";
import { T } from "../theme.js";

const SIGNALS = [
  { icon: HardDrive, title: "Offline Uncorrectable Sectors Increasing", detail: "SMART 198 climbing 4×/week — irreversible media damage.", impact: 0.92 },
  { icon: Thermometer, title: "Thermal Margin Falling", detail: "Operating 9°C above 30-day baseline; headroom nearly gone.", impact: 0.71 },
  { icon: Zap, title: "Power Instability Detected", detail: "Rail voltage variance up 3.1× — early PSU degradation.", impact: 0.58 },
];

export default function AIAnalysis() {
  return (
    <SectionWrapper className="grid place-items-center">
      <div className="mx-auto max-w-5xl px-6">
        <motion.div className="text-center"
          initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.6 }} transition={{ duration: 0.8 }}>
          <div className="mb-3 font-mono text-xs uppercase tracking-[0.3em] text-brand">Explainable AI · SHAP</div>
          <h2 className="text-3xl font-bold tracking-tight md:text-5xl">Not just a prediction. The reasons.</h2>
        </motion.div>

        <div className="mt-12 grid gap-4 md:grid-cols-3">
          {SIGNALS.map((s, i) => (
            <motion.div key={s.title}
              initial={{ opacity: 0, y: 28 }} whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.4 }} transition={{ duration: 0.6, delay: i * 0.12 }}>
              <GlassCard accent={T.critical} className="h-full p-5">
                <s.icon size={20} color={T.critical} />
                <div className="mt-4 font-semibold leading-snug">{s.title}</div>
                <div className="mt-2 text-sm text-muted">{s.detail}</div>
                <div className="mt-4 h-1.5 rounded-full" style={{ background: T.bg }}>
                  <motion.div className="h-full rounded-full"
                    initial={{ width: 0 }} whileInView={{ width: `${s.impact * 100}%` }}
                    viewport={{ once: true }} transition={{ duration: 0.9, delay: 0.3 + i * 0.12 }}
                    style={{ background: T.critical }} />
                </div>
                <div className="mt-1 text-right font-mono text-xs text-faint">{Math.round(s.impact * 100)}% impact</div>
              </GlassCard>
            </motion.div>
          ))}
        </div>

        <motion.div className="mt-6"
          initial={{ opacity: 0, scale: 0.96 }} whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true, amount: 0.6 }} transition={{ duration: 0.7, delay: 0.3 }}>
          <GlassCard accent={T.critical} className="flex items-center justify-between p-6">
            <div className="flex items-center gap-3">
              <Clock size={22} color={T.critical} />
              <span className="text-lg font-semibold">Predicted Failure</span>
            </div>
            <span className="font-mono text-4xl font-extrabold" style={{ color: T.critical }}>10 days</span>
          </GlassCard>
        </motion.div>
      </div>
    </SectionWrapper>
  );
}
