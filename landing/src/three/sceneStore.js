// Plain mutable store shared between DOM (GSAP writes) and R3F (reads each frame).
// Avoids React re-renders for per-frame camera/scroll values.
export const sceneState = {
  scroll: 0,        // 0..1 overall page progress
  camZ: 14,         // camera dolly target
  camX: 0,
  focusTier: null,  // 'Critical' to highlight degradation
  fleetReveal: 0,   // 0..1 Scene 5 constellation reveal
};
