import { motion } from "framer-motion";
import { Thermometer, Zap, HardDrive, Fan, Activity } from "lucide-react";
import SectionWrapper from "../components/SectionWrapper.jsx";
import GlassCard from "../components/GlassCard.jsx";

const CHIPS = [
  { icon: Thermometer, label: "Temperature", value: "47°C", trend: "nominal", color: "#3fb98a" },
  { icon: Zap, label: "Power Draw", value: "412 W", trend: "stable", color: "#0085c3" },
  { icon: HardDrive, label: "Storage Health", value: "98%", trend: "healthy", color: "#3fb98a" },
  { icon: Fan, label: "Fan Speed", value: "6,200 RPM", trend: "nominal", color: "#8b8cf0" },
  { icon: Activity, label: "SMART Data", value: "0 reallocated", trend: "clean", color: "#3fb98a" },
];

export default function RackFlythrough() {
  return (
    <SectionWrapper className="grid place-items-center">
      <div className="mx-auto max-w-5xl px-6 text-center">
        <motion.h2
          initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.6 }} transition={{ duration: 0.8 }}
          className="text-3xl font-bold tracking-tight md:text-5xl"
        >
          Every signal, streaming in real time.
        </motion.h2>
        <p className="mx-auto mt-4 max-w-xl text-muted">
          PulseGuard watches the telemetry that precedes failure — across every node, continuously.
        </p>
        <div className="mt-12 grid grid-cols-2 gap-4 md:grid-cols-5">
          {CHIPS.map((c, i) => (
            <motion.div key={c.label}
              initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.5 }}
              transition={{ duration: 0.6, delay: i * 0.1 }}>
              <GlassCard accent={c.color} className="p-4 text-left">
                <c.icon size={18} color={c.color} />
                <div className="mt-3 font-mono text-xl font-bold">{c.value}</div>
                <div className="text-xs text-muted">{c.label}</div>
                <div className="mt-1 text-[10px] uppercase tracking-wider" style={{ color: c.color }}>{c.trend}</div>
              </GlassCard>
            </motion.div>
          ))}
        </div>
      </div>
    </SectionWrapper>
  );
}
