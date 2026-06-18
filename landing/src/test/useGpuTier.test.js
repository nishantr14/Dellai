import { describe, it, expect } from "vitest";
import { prefersReducedMotion } from "../hooks/useGpuTier.js";

describe("prefersReducedMotion", () => {
  it("returns false when matchMedia reports no preference", () => {
    window.matchMedia = () => ({ matches: false, addEventListener() {}, removeEventListener() {} });
    expect(prefersReducedMotion()).toBe(false);
  });
  it("returns true when matchMedia reports reduce", () => {
    window.matchMedia = () => ({ matches: true, addEventListener() {}, removeEventListener() {} });
    expect(prefersReducedMotion()).toBe(true);
  });
});
