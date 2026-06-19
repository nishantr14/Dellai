import { describe, it, expect } from "vitest";
import { T, tierColor } from "../theme.js";

describe("theme", () => {
  it("exposes the dashboard base palette", () => {
    expect(T.bg).toBe("#0a0e14");
    expect(T.brand).toBe("#4f8bff");
    expect(T.critical).toBe("#e0564f");
  });
  it("maps tiers to status colors", () => {
    expect(tierColor("Healthy")).toBe(T.healthy);
    expect(tierColor("At Risk")).toBe(T.risk);
    expect(tierColor("Critical")).toBe(T.critical);
  });
});
