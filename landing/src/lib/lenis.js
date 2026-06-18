import Lenis from "lenis";
import { gsap, ScrollTrigger } from "./gsap.js";

// Initialize Lenis smooth scroll and sync it with GSAP's ticker + ScrollTrigger.
export function initLenis() {
  const lenis = new Lenis({ duration: 1.1, smoothWheel: true });
  lenis.on("scroll", ScrollTrigger.update);
  gsap.ticker.add((time) => lenis.raf(time * 1000));
  gsap.ticker.lagSmoothing(0);
  return lenis;
}
