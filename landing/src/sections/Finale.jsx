import { motion } from "framer-motion";
import { ShieldCheck } from "lucide-react";
import SectionWrapper from "../components/SectionWrapper.jsx";
import CTAButton from "../components/CTAButton.jsx";
import { T } from "../theme.js";

const LINES = ["Know Which Device Will Fail.", "Know Why.", "Know When.", "Prevent Downtime Before It Happens."];

export default function Finale() {
  return (
    <SectionWrapper className="grid place-items-center text-center">
      <div className="mx-auto max-w-3xl px-6">
        <motion.div initial={{ scale: 0.4, opacity: 0 }} whileInView={{ scale: 1, opacity: 1 }}
          viewport={{ once: true, amount: 0.6 }} transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
          className="mx-auto mb-10 grid h-24 w-24 place-items-center rounded-3xl"
          style={{ background: `${T.brand}18`, border: `1px solid ${T.brand}55`, boxShadow: `0 0 60px ${T.brand}44` }}>
          <ShieldCheck size={44} color={T.brand} />
        </motion.div>

        <div className="space-y-2">
          {LINES.map((line, i) => (
            <motion.p key={line}
              initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.6 }} transition={{ duration: 0.7, delay: i * 0.2 }}
              className="text-2xl font-bold tracking-tight md:text-4xl">
              {line}
            </motion.p>
          ))}
        </div>

        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.6 }} transition={{ duration: 1, delay: 0.9 }}
          className="mt-16">
          <div className="font-mono text-4xl font-black tracking-[0.2em] md:text-6xl"
            style={{ background: `linear-gradient(90deg,${T.brand},${T.dell})`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
            PULSEGUARD
          </div>
          <p className="mt-3 text-sm text-muted">AI-Powered Predictive Hardware Failure Detection</p>
          <div className="mt-8"><CTAButton>Launch Dashboard</CTAButton></div>
        </motion.div>
      </div>
    </SectionWrapper>
  );
}
