import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { DEFAULT_PLATFORM_METRICS, fetchPlatformMetrics } from "@/lib/metrics";

describe("platform metrics", () => {
  it("provides valid and complete default platform baseline metrics", () => {
    expect(DEFAULT_PLATFORM_METRICS).toBeDefined();
    expect(DEFAULT_PLATFORM_METRICS.publishedSites).toBeGreaterThanOrEqual(100);
    expect(DEFAULT_PLATFORM_METRICS.activeTemplates).toBeGreaterThanOrEqual(0);
    expect(DEFAULT_PLATFORM_METRICS.uptimePercent).toBeGreaterThanOrEqual(99.0);
    expect(DEFAULT_PLATFORM_METRICS.uptimePercent).toBeLessThanOrEqual(100.0);
    expect(DEFAULT_PLATFORM_METRICS.launchSpeedMinutes).toBeGreaterThan(0);
    expect(DEFAULT_PLATFORM_METRICS.launchSpeedMinutes).toBeLessThanOrEqual(10);
    expect(DEFAULT_PLATFORM_METRICS.makerRating).toBeGreaterThanOrEqual(4.0);
    expect(DEFAULT_PLATFORM_METRICS.makerRating).toBeLessThanOrEqual(5.0);
    expect(DEFAULT_PLATFORM_METRICS.weeklyInstallsSample).toBeGreaterThan(0);
    expect(DEFAULT_PLATFORM_METRICS.conversionRate).toBeGreaterThan(0);
  });

  it("gracefully falls back to baseline metrics without throwing when env is unconfigured", async () => {
    const metrics = await fetchPlatformMetrics();
    expect(metrics).toBeDefined();
    expect(metrics.publishedSites).toBeGreaterThanOrEqual(100);
    expect(metrics.uptimePercent).toBe(99.9);
    expect(metrics.makerRating).toBe(4.9);
    expect(metrics.activeTemplates).toBeGreaterThanOrEqual(0);
    expect(metrics.weeklyInstallsSample).toBe(842);
    expect(metrics.conversionRate).toBe(18.4);
  });

  it("ensures all metric values are non-null and formatted numbers", async () => {
    const metrics = await fetchPlatformMetrics();
    for (const [key, value] of Object.entries(metrics)) {
      expect(typeof value).toBe("number");
      expect(Number.isNaN(value)).toBe(false);
      expect(Number.isFinite(value)).toBe(true);
      if (key === "activeTemplates") {
        expect(value, `Metric ${key} must be non-negative`).toBeGreaterThanOrEqual(0);
      } else {
        expect(value, `Metric ${key} must be strictly positive`).toBeGreaterThan(0);
      }
    }
  });
});
