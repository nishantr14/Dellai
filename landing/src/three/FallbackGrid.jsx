// Lightweight abstract grid used when GPU is weak or reduced-motion is set.
// Pure CSS perspective grid + drifting glow — no WebGL.
export default function FallbackGrid() {
  return (
    <div className="fixed inset-0 -z-10 overflow-hidden" style={{ background: "#0a0e14" }}>
      <div
        className="absolute inset-0"
        style={{
          backgroundImage:
            "linear-gradient(#8b8cf014 1px, transparent 1px), linear-gradient(90deg,#8b8cf014 1px, transparent 1px)",
          backgroundSize: "60px 60px",
          transform: "perspective(600px) rotateX(60deg) scale(2)",
          transformOrigin: "center 40%",
          maskImage: "radial-gradient(ellipse at center, #000 40%, transparent 75%)",
        }}
      />
      <div className="absolute left-1/2 top-1/3 h-72 w-72 -translate-x-1/2 rounded-full"
        style={{ background: "radial-gradient(circle,#8b8cf033,transparent 70%)", filter: "blur(20px)" }} />
    </div>
  );
}
