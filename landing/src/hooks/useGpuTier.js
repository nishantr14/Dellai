import { useEffect, useState } from "react";

export function prefersReducedMotion() {
  if (typeof window === "undefined" || !window.matchMedia) return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

// Rough GPU capability check: WebGL availability + renderer string heuristic.
export function detectLowGpu() {
  try {
    const canvas = document.createElement("canvas");
    const gl = canvas.getContext("webgl") || canvas.getContext("experimental-webgl");
    if (!gl) return true;
    const dbg = gl.getExtension("WEBGL_debug_renderer_info");
    const renderer = dbg ? gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL) : "";
    return /swiftshader|software|llvmpipe/i.test(renderer);
  } catch {
    return true;
  }
}

// True => render the lightweight fallback instead of the full 3D scene.
export function useGpuTier() {
  const [useFallback, setUseFallback] = useState(false);
  useEffect(() => {
    setUseFallback(prefersReducedMotion() || detectLowGpu());
  }, []);
  return useFallback;
}
