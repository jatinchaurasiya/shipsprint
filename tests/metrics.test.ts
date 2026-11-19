import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

// Deterministic: no Supabase env in the test run, so fetchPlatformMetrics()
// must take the honest empty-state path.
vi.mock("@/lib/env", () => ({
  publicEnv: () => {
    throw new Error("not configured");
  },
}));

import { EMPTY_PLATFORM_METRICS, fetchPlatformMetrics } from "@/lib/metrics";

describe("platform metrics (real values only)", () => {
  it("has an honest empty state with no fabricated numbers", () => {
    expect(EMPTY_PLATFORM_METRICS).toEqual({ publishedSites: 0, totalClicks: 0 });
  });

  it("returns the empty state when Supabase is not configured", async () => {
    const metrics = await fetchPlatformMetrics();
    expect(metrics).toEqual(EMPTY_PLATFORM_METRICS);
    expect(metrics.publishedSites).toBe(0);
    expect(metrics.totalClicks).toBe(0);
  });

  it("never invents a floor for published sites or clicks", async () => {
    const metrics = await fetchPlatformMetrics();
    // The old implementation clamped with Math.max(120, real) / 842 / 4.9.
    // There must be no such floor: with no data, the honest answer is 0.
    expect(metrics.publishedSites).toBe(0);
    expect(metrics.totalClicks).toBe(0);
  });

  it("returns finite, non-negative numbers", async () => {
    const metrics = await fetchPlatformMetrics();
    for (const value of Object.values(metrics)) {
      expect(typeof value).toBe("number");
      expect(Number.isFinite(value)).toBe(true);
      expect(value).toBeGreaterThanOrEqual(0);
    }
  });
});