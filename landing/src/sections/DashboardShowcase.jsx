import { motion, useScroll, useTransform } from "framer-motion";
import { useRef } from "react";
import SectionWrapper from "../components/SectionWrapper.jsx";
import GlassCard from "../components/GlassCard.jsx";
import CTAButton from "../components/CTAButton.jsx";
import TiltCard from "../components/TiltCard.jsx";
import { T } from "../theme.js";

// Stylized monitor mockup of the real ops dashboard. (Optional: drop a real
// screenshot at public/img/dashboard.png and swap the inner content for <img>.)
function MonitorMock() {
  return (
    <GlassCard className="overflow-hidden p-0" accent={T.brand}>
      <div className="flex items-center gap-1.5 border-b px-4 py-2" style={{ borderColor: T.line }}>
        <span className="h-2.5 w-2.5 rounded-full" style={{ background: T.critical }} />
        <span className="h-2.5 w-2.5 rounded-full" style={{ background: T.risk }} />
        <span className="h-2.5 w-2.5 rounded-full" style={{ background: T.healthy }} />
        <span className="ml-3 font-mono text-xs text-faint">pulseguard — fleet overview</span>
      </div>
      <div className="grid grid-cols-3 gap-3 p-5">
        {["96", "74", "41"].map((v, i) => (
          <div key={i} className="rounded-lg p-3" style={{ background: T.bg, border: `1px solid ${T.line}` }}>
            <div className="text-[10px] text-faint">srv-00{i + 1}</div>
            <div className="font-mono text-2xl font-bold"
              style={{ color: i === 0 ? T.healthy : i === 1 ? T.risk : T.critical }}>{v}</div>
          </div>
        ))}
        <div className="col-span-3 mt-1 h-24 rounded-lg"
          style={{ background: `linear-gradient(180deg, ${T.brand}22, transparent)`, border: `1px solid ${T.line}` }} />
      </div>
    </GlassCard>
  );
}

export default function DashboardShowcase() {
  const ref = useRef(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const y = useTransform(scrollYProgress, [0, 1], [60, -60]);

  return (
    <SectionWrapper ref={ref} className="grid place-items-center">
      <div className="mx-auto max-w-5xl px-6 text-center">
        <motion.h2 initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.6 }} transition={{ duration: 0.8 }}
          className="text-3xl font-bold tracking-tight md:text-5xl">
          A control room for your infrastructure.
        </motion.h2>
        <motion.div style={{ y }} className="mt-12">
          <TiltCard max={9} className="rounded-2xl">
            <MonitorMock />
          </TiltCard>
        </motion.div>
        <div className="mt-10"><CTAButton>Launch the Dashboard</CTAButton></div>
      </div>
    </SectionWrapper>
  );
}
