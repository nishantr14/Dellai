import { useRef } from "react";
import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";
import { prefersReducedMotion } from "../hooks/useGpuTier.js";

// Mouse-tracked 3D perspective tilt. Pure CSS transforms (preserve-3d) so it
// stays at 60fps. Disabled under reduced-motion. `glare` adds a soft moving
// highlight for a premium glassy feel.
export default function TiltCard({ children, className = "", style = {}, max = 7, glare = true }) {
  const ref = useRef(null);
  const reduced = prefersReducedMotion();
  const mx = useMotionValue(0.5);
  const my = useMotionValue(0.5);

  const rx = useSpring(useTransform(my, [0, 1], [max, -max]), { stiffness: 150, damping: 18 });
  const ry = useSpring(useTransform(mx, [0, 1], [-max, max]), { stiffness: 150, damping: 18 });
  const gx = useTransform(mx, [0, 1], ["0%", "100%"]);
  const gy = useTransform(my, [0, 1], ["0%", "100%"]);

  if (reduced) {
    return (
      <div className={className} style={style}>
        {children}
      </div>
    );
  }

  const onMove = (e) => {
    const r = ref.current.getBoundingClientRect();
    mx.set((e.clientX - r.left) / r.width);
    my.set((e.clientY - r.top) / r.height);
  };
  const onLeave = () => {
    mx.set(0.5);
    my.set(0.5);
  };

  return (
    <motion.div
      ref={ref}
      onMouseMove={onMove}
      onMouseLeave={onLeave}
      style={{ rotateX: rx, rotateY: ry, transformPerspective: 1000, transformStyle: "preserve-3d", ...style }}
      className={`relative ${className}`}
    >
      {children}
      {glare && (
        <motion.div
          aria-hidden
          className="pointer-events-none absolute inset-0 rounded-[inherit]"
          style={{
            background: useTransform(
              [gx, gy],
              ([x, y]) => `radial-gradient(circle at ${x} ${y}, rgba(255,255,255,0.10), transparent 45%)`
            ),
          }}
        />
      )}
    </motion.div>
  );
}
