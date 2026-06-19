export default function GlassCard({ children, className = "", accent, style = {} }) {
  return (
    <div
      className={`rounded-2xl border ${className}`}
      style={{
        background:
          "linear-gradient(180deg, rgba(255,255,255,0.05), rgba(255,255,255,0) 42%), rgba(17,24,36,0.82)",
        borderColor: accent ? `${accent}4a` : "rgba(120,150,210,0.16)",
        boxShadow: accent
          ? `inset 0 1px 0 rgba(255,255,255,0.06), inset 0 0 34px ${accent}12, 0 12px 44px rgba(0,0,0,0.5)`
          : "inset 0 1px 0 rgba(255,255,255,0.06), 0 12px 44px rgba(0,0,0,0.5)",
        ...style,
      }}
    >
      {children}
    </div>
  );
}
