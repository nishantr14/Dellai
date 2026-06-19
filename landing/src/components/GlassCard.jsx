export default function GlassCard({ children, className = "", accent, style = {} }) {
  return (
    <div
      className={`rounded-2xl border backdrop-blur-xl ${className}`}
      style={{
        background: "rgba(17,24,36,0.55)",
        borderColor: accent ? `${accent}55` : "rgba(34,45,61,0.9)",
        boxShadow: accent ? `inset 0 0 30px ${accent}14, 0 10px 40px rgba(0,0,0,0.4)` : "0 10px 40px rgba(0,0,0,0.4)",
        ...style,
      }}
    >
      {children}
    </div>
  );
}
