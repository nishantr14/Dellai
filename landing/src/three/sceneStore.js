// Plain mutable store shared between DOM (GSAP writes) and R3F (reads each frame).
// Avoids React re-renders for per-frame camera/scroll values.
export const sceneState = {
  scroll: 0, // 0..1 overall page progress; CameraRig derives dolly + pull-back from this
};
