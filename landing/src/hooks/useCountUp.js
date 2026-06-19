import { useEffect, useRef, useState } from "react";
import { useInView } from "framer-motion";

export function formatCount(value, decimals = 0, suffix = "") {
  const n = decimals > 0 ? value.toFixed(decimals) : Math.round(value).toString();
  return `${n}${suffix}`;
}

// Counts from 0 to `target` once the element scrolls into view.
export function useCountUp(target, { decimals = 0, suffix = "", duration = 1400 } = {}) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, amount: 0.5 });
  const [display, setDisplay] = useState(formatCount(0, decimals, suffix));

  useEffect(() => {
    if (!inView) return;
    let raf, start;
    const tick = (t) => {
      if (start == null) start = t;
      const p = Math.min(1, (t - start) / duration);
      const eased = 1 - Math.pow(1 - p, 3); // easeOutCubic
      setDisplay(formatCount(target * eased, decimals, suffix));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [inView, target, decimals, suffix, duration]);

  return { ref, display };
}
