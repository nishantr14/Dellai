import { motion } from "framer-motion";

// Primary call-to-action. `href` defaults to the dashboard dev server; override
// via prop or VITE_DASHBOARD_URL at build time.
export default function CTAButton({ children, href, secondary = false }) {
  const target = href || import.meta.env.VITE_DASHBOARD_URL || "http://localhost:5173";
  return (
    <motion.a
      href={target}
      whileHover={{ scale: 1.03 }}
      whileTap={{ scale: 0.98 }}
      className="inline-flex items-center gap-2 rounded-xl px-6 py-3 text-sm font-semibold"
      style={
        secondary
          ? { color: "#e8eef6", background: "transparent", border: "1px solid #222d3d" }
          : { color: "#0a0e14", background: "#8b8cf0", border: "none" }
      }
    >
      {children}
    </motion.a>
  );
}
