import { useEffect, useRef, useState } from "react";

// Global fixed cinematic backdrop: the holographic-telemetry loop. React's JSX
// `muted` attribute is unreliable for autoplay, so we set muted imperatively and
// call play() — otherwise browsers block autoplay and the video stays black.
export default function VideoBackground() {
  const ref = useRef(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const v = ref.current;
    if (!v) return;
    v.muted = true;
    v.defaultMuted = true;
    const tryPlay = () => v.play().catch(() => {});
    tryPlay();
    // Fallback: if the browser still blocked it, start on first user gesture.
    const onGesture = () => {
      tryPlay();
      window.removeEventListener("pointerdown", onGesture);
    };
    window.addEventListener("pointerdown", onGesture);
    return () => window.removeEventListener("pointerdown", onGesture);
  }, []);

  return (
    <div className="fixed inset-0 z-0 overflow-hidden" style={{ background: "#06080d" }}>
      {!failed && (
        <video
          ref={ref}
          className="absolute inset-0 h-full w-full object-cover"
          src="/media/bg.mp4"
          autoPlay
          muted
          loop
          playsInline
          preload="auto"
          onError={() => setFailed(true)}
          style={{ transform: "scale(1.06)", opacity: 0.78, filter: "blur(4px) brightness(1.12) saturate(1.12)" }}
        />
      )}
      {/* frosted-glass sheen: cool top highlight for a premium glassy feel */}
      <div
        className="absolute inset-0"
        style={{ background: "linear-gradient(180deg, rgba(140,170,230,0.08), rgba(140,170,230,0) 34%)" }}
      />
      {/* gentle scrim for legibility — lighter so the glassy video stays present */}
      <div
        className="absolute inset-0"
        style={{ background: "radial-gradient(ellipse at 50% 32%, rgba(6,8,13,0.04), rgba(6,8,13,0.4) 86%)" }}
      />
      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(180deg, rgba(6,8,13,0.26) 0%, rgba(6,8,13,0.08) 30%, rgba(6,8,13,0.10) 70%, rgba(6,8,13,0.56) 100%)",
        }}
      />
    </div>
  );
}
