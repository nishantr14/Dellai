import { useRef } from "react";
import SectionWrapper from "../components/SectionWrapper.jsx";
import { useScrollScene } from "../hooks/useScrollScene.js";
import { gsap } from "../lib/gsap.js";
import { prefersReducedMotion } from "../hooks/useGpuTier.js";
import { T } from "../theme.js";

const STAGES = [
  "Telemetry", "Storage Model", "Component Model", "RUL Model", "Fusion Engine", "Device Health Score",
];

export default function Architecture() {
  const scopeRef = useRef(null);

  useScrollScene(scopeRef, () => {
    if (prefersReducedMotion()) return;
    gsap.from(".pg-stage", {
      opacity: 0, y: 24, stagger: 0.5, ease: "none",
      scrollTrigger: { trigger: scopeRef.current, start: "top top", end: "+=200%", pin: true, scrub: true },
    });
    gsap.fromTo(".pg-spine",
      { scaleY: 0 }, { scaleY: 1, ease: "none",
        scrollTrigger: { trigger: scopeRef.current, start: "top top", end: "+=200%", scrub: true } });
  }, []);

  return (
    <SectionWrapper id="architecture" ref={scopeRef} className="grid place-items-center">
      <div className="mx-auto max-w-3xl px-6 text-center">
        <h2 className="mb-12 text-3xl font-bold tracking-tight md:text-5xl">From raw telemetry to one number.</h2>
        <div className="relative flex flex-col items-center gap-5">
          <div className="pg-spine absolute left-1/2 top-0 h-full w-px origin-top -translate-x-1/2"
            style={{ background: `linear-gradient(${T.brand},${T.dell})` }} />
          {STAGES.map((s, i) => (
            <div key={s}
              className="pg-stage relative z-10 w-full max-w-sm rounded-xl border px-6 py-4"
              style={{
                background: "rgba(17,24,36,0.88)",
                borderColor: i === STAGES.length - 1 ? `${T.brand}88` : T.line,
                boxShadow: i === STAGES.length - 1 ? `0 0 30px ${T.brand}33` : "none",
              }}>
              <span className="font-mono text-xs text-faint">{String(i + 1).padStart(2, "0")}</span>
              <div className="mt-1 text-lg font-semibold" style={{ color: i === STAGES.length - 1 ? T.brand : T.text }}>{s}</div>
            </div>
          ))}
        </div>
      </div>
    </SectionWrapper>
  );
}
