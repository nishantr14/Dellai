import { useEffect } from "react";
import { gsap, ScrollTrigger } from "../lib/gsap.js";

// Runs a setup callback inside a gsap.context scoped to `scopeRef`, so all
// ScrollTriggers/timelines created in it are reverted on unmount (no leaks).
export function useScrollScene(scopeRef, setup, deps = []) {
  useEffect(() => {
    if (!scopeRef.current) return;
    const ctx = gsap.context(setup, scopeRef);
    ScrollTrigger.refresh();
    return () => ctx.revert();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}
