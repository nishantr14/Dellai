import { motion } from "framer-motion";
import SectionWrapper from "../components/SectionWrapper.jsx";
import { tierColor } from "../theme.js";

// Digital-twin grid of the real fleet, sorted so critical nodes lead.
export default function FleetView({ fleet = [], summary }) {
  const order = { Critical: 0, "At Risk": 1, Healthy: 2 };
  const sorted = [...fleet].sort((a, b) => (order[a.tier] - order[b.tier]) || a.health - b.health);

  return (
    <SectionWrapper id="fleet" className="grid place-items-center">
      <div className="mx-auto max-w-6xl px-6">
        <div className="text-center">
          <motion.h2 initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.6 }} transition={{ duration: 0.8 }}
            className="text-3xl font-bold tracking-tight md:text-5xl">
            Your whole fleet, prioritized automatically.
          </motion.h2>
          {summary && (
            <p className="mt-4 text-muted">
              {summary.total} devices · <span style={{ color: "#e0564f" }}>{summary.critical} critical</span> ·{" "}
              <span style={{ color: "#e0a92e" }}>{summary.atRisk} at risk</span> ·{" "}
              <span style={{ color: "#3fb98a" }}>{summary.healthy} healthy</span>
            </p>
          )}
        </div>

        <div className="mt-12 grid grid-cols-4 gap-3 sm:grid-cols-7">
          {sorted.map((d, i) => {
            const col = tierColor(d.tier);
            return (
              <motion.div key={d.device}
                initial={{ opacity: 0, scale: 0.8 }} whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true, amount: 0.2 }}
                transition={{ duration: 0.4, delay: (i % 7) * 0.05 + Math.floor(i / 7) * 0.08 }}
                className="aspect-square rounded-xl p-2"
                style={{ background: `${col}14`, border: `1px solid ${col}55`, boxShadow: `0 0 18px ${col}22` }}
                title={`${d.device} · ${d.tier} · health ${d.health}`}>
                <div className="flex h-full flex-col justify-between">
                  <span className="font-mono text-[10px] text-muted">{d.device?.replace("srv-", "#")}</span>
                  <span className="font-mono text-lg font-bold" style={{ color: col }}>{d.health}</span>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </SectionWrapper>
  );
}
