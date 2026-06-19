import { motion } from "framer-motion";
import SectionWrapper from "../components/SectionWrapper.jsx";
import CTAButton from "../components/CTAButton.jsx";

export default function Hero() {
  return (
    <SectionWrapper id="hero" className="flex flex-col items-center justify-center text-center px-6 pt-28 pb-20">
      {/* soft brand halo behind the headline */}
      <div className="pointer-events-none absolute left-1/2 top-1/2 -z-0 h-[42rem] w-[42rem] -translate-x-1/2 -translate-y-1/2 rounded-full"
        style={{ background: "radial-gradient(circle, rgba(79,139,255,0.16), transparent 62%)", filter: "blur(40px)" }} />
      <div className="relative px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
          className="mb-4 text-xs font-mono uppercase tracking-[0.3em] text-brand"
        >
          AI-Powered Predictive Maintenance
        </motion.div>
        <motion.h1
          initial={{ opacity: 0, y: 28 }} animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1.1, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
          className="text-glow-soft mx-auto max-w-4xl text-5xl font-bold leading-[1.05] tracking-tight md:text-7xl"
        >
          Predict Hardware Failures<br />Before They Happen.
        </motion.h1>
        <motion.p
          initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          transition={{ duration: 1, delay: 0.5 }}
          className="mx-auto mt-6 max-w-xl text-lg text-muted"
        >
          AI-powered predictive maintenance for enterprise infrastructure.
        </motion.p>
        <motion.div
          initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 0.75 }}
          className="mt-9 flex items-center justify-center gap-3"
        >
          <CTAButton>Launch Dashboard</CTAButton>
          <CTAButton secondary href="#fleet">See the Fleet</CTAButton>
        </motion.div>
      </div>
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 text-xs text-faint animate-pulse">
        scroll to explore
      </div>
    </SectionWrapper>
  );
}
