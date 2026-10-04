import { describe, expect, it } from "vitest";

describe("analytics beacon & validation logic", () => {
  const VALID_EVENT_TYPES = ["page_view", "button_click"];
  const META_KEY_ALLOWLIST = new Set([
    "referrer",
    "path",
    "screen",
    "button_type",
    "target_host",
    "target_url",
  ]);
  const MAX_META_BYTES = 1024;

  function sanitizeMeta(input: unknown): Record<string, string> {
    if (typeof input !== "object" || input === null || Array.isArray(input)) return {};

    const out: Record<string, string> = {};
    let bytes = 0;

    for (const [key, value] of Object.entries(input as Record<string, unknown>)) {
      if (!META_KEY_ALLOWLIST.has(key)) continue;
      if (typeof value !== "string") continue;
      if (value.length > 512) continue;
      bytes += key.length + value.length;
      if (bytes > MAX_META_BYTES) break;
      out[key] = value;
    }

    return out;
  }

  function inferDevice(userAgent: string): "mobile" | "tablet" | "desktop" {
    if (/ipad|tablet|playbook|silk|(?!.*mobile)android/i.test(userAgent)) {
      return "tablet";
    }
    if (/mobile|iphone|ipod|windows.*phone|blackberry|opera mini/i.test(userAgent)) {
      return "mobile";
    }
    return "desktop";
  }

  it("validates event types", () => {
    expect(VALID_EVENT_TYPES.includes("page_view")).toBe(true);
    expect(VALID_EVENT_TYPES.includes("button_click")).toBe(true);
    expect(VALID_EVENT_TYPES.includes("arbitrary_event")).toBe(false);
  });

  it("sanitizes meta keys strictly to the allowlist including target_url", () => {
    const meta = {
      referrer: "https://twitter.com",
      path: "/cc-c",
      screen: "1920x1080",
      button_type: "app_store_hero",
      target_url: "https://apps.apple.com/app/id12345",
      malicious_key: "should_be_stripped",
      injection: "<script>alert(1)</script>",
    };

    const sanitized = sanitizeMeta(meta);

    expect(sanitized.referrer).toBe("https://twitter.com");
    expect(sanitized.target_url).toBe("https://apps.apple.com/app/id12345");
    expect(sanitized.button_type).toBe("app_store_hero");
    expect((sanitized as Record<string, unknown>).malicious_key).toBeUndefined();
    expect((sanitized as Record<string, unknown>).injection).toBeUndefined();
  });

  it("accurately infers device categories from user agents", () => {
    const iPhoneUA =
      "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148 Safari/604.1";
    const iPadUA =
      "Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Safari/604.1";
    const androidPhoneUA =
      "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 Mobile Safari/537.36";
    const desktopMacUA =
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36";

    expect(inferDevice(iPhoneUA)).toBe("mobile");
    expect(inferDevice(iPadUA)).toBe("tablet");
    expect(inferDevice(androidPhoneUA)).toBe("mobile");
    expect(inferDevice(desktopMacUA)).toBe("desktop");
  });
});

describe("analytics aggregation & mathematical parity", () => {
  it("synchronizes timeline day count with selected period", () => {
    const periods = ["7d", "30d", "90d"] as const;

    periods.forEach((p) => {
      const numDays = p === "7d" ? 7 : p === "90d" ? 90 : 30;
      const dailyMap: Record<string, { views: number; clicks: number }> = {};
      const now = new Date();
      const todayUTC = new Date(
        Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())
      );

      for (let i = numDays - 1; i >= 0; i--) {
        const d = new Date(todayUTC.getTime() - i * 86400000);
        const key = d.toISOString().slice(0, 10);
        dailyMap[key] = { views: 0, clicks: 0 };
      }

      expect(Object.keys(dailyMap).length).toBe(numDays);
    });
  });

  it("correctly categorizes App Store vs. Google Play clicks", () => {
    const ctas = [
      { button_type: "app_store_hero", clicks: 12 },
      { button_type: "app_store_nav", clicks: 5 },
      { button_type: "play_store_hero", clicks: 8 },
      { button_type: "play_store_footer", clicks: 3 },
      { button_type: "custom_contact", clicks: 4 },
    ];

    let appStoreClicks = 0;
    let playStoreClicks = 0;
    let otherClicks = 0;

    ctas.forEach((cta) => {
      const btn = cta.button_type.toLowerCase();
      if (btn.includes("app_store") || btn.includes("ios") || btn.includes("apple")) {
        appStoreClicks += cta.clicks;
      } else if (
        btn.includes("play_store") ||
        btn.includes("android") ||
        btn.includes("google")
      ) {
        playStoreClicks += cta.clicks;
      } else {
        otherClicks += cta.clicks;
      }
    });

    expect(appStoreClicks).toBe(17);
    expect(playStoreClicks).toBe(11);
    expect(otherClicks).toBe(4);
    expect(appStoreClicks + playStoreClicks + otherClicks).toBe(32);
  });

  it("normalizes direct referrers case-insensitively", () => {
    const rawSources = [
      { source: "Direct", views: 100 },
      { source: "direct", views: 50 },
      { source: "", views: 20 },
      { source: "google.com", views: 80 },
    ];

    const refMap: Record<string, number> = {};
    rawSources.forEach((src) => {
      const rawRef = (src.source || "").trim();
      const ref = rawRef.toLowerCase() === "direct" || !rawRef ? "Direct" : rawRef;
      refMap[ref] = (refMap[ref] || 0) + src.views;
    });

    expect(refMap["Direct"]).toBe(170);
    expect(refMap["google.com"]).toBe(80);
  });
});
