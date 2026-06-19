import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { usePulseData } from "../data/usePulseData.js";

const SAMPLE = {
  summary: { total: 28, healthy: 17, atRisk: 6, critical: 5, predictedFailures30d: 8 },
  metrics: { storage: { recall: 0.7061 }, components: { recall: 0.9748 }, rul: { rmse: 15.93 } },
  fleet: [{ device: "srv-001", tier: "Healthy", health: 99 }],
};

beforeEach(() => {
  global.fetch = vi.fn(() =>
    Promise.resolve({ ok: true, json: () => Promise.resolve(SAMPLE) })
  );
});

describe("usePulseData", () => {
  it("loads and exposes summary, metrics, fleet", async () => {
    const { result } = renderHook(() => usePulseData());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.data.summary.total).toBe(28);
    expect(result.current.data.metrics.storage.recall).toBeCloseTo(0.7061);
    expect(result.current.data.fleet).toHaveLength(1);
  });
});
