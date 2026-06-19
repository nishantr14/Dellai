import { describe, it, expect } from "vitest";
import { formatCount } from "../hooks/useCountUp.js";

describe("formatCount", () => {
  it("rounds integers and respects suffix", () => {
    expect(formatCount(70.6, 0, "%")).toBe("71%");
    expect(formatCount(8.0, 0, "")).toBe("8");
    expect(formatCount(15.93, 1, "")).toBe("15.9");
  });
});
