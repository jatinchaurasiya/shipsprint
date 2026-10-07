import { describe, it, expect } from "vitest";
import { BUILTIN_TEMPLATES } from "@/lib/templates";
import { getDefaultSitePages } from "@/lib/legal-pages";
import { PLAN_PAGE_LIMITS, canCreateCustomPages, getMaxPages } from "@/lib/tier-limits";
import { updateSiteSchema } from "@/lib/validation";

describe("Template Architecture Pruning", () => {
  it("ensures all built-in templates are completely removed from system", () => {
    expect(BUILTIN_TEMPLATES.length).toBe(0);
  });
});


describe("Legal Compliance Page Generators", () => {
  it("generates App Store §5.1.1 compliant privacy policy with deletion clause", () => {
    const pages = getDefaultSitePages("OrbitHealth", "privacy@orbithealth.app");
    const privacy = pages.find((p) => p.slug === "privacy");

    expect(privacy).toBeDefined();
    expect(privacy?.content_markdown).toContain("OrbitHealth");
    expect(privacy?.content_markdown).toContain("Account Deletion");
    expect(privacy?.content_markdown).toContain("privacy@orbithealth.app");
  });

  it("generates App Store §1.5 compliant support center with direct contact", () => {
    const pages = getDefaultSitePages("OrbitHealth", "support@orbithealth.app");
    const support = pages.find((p) => p.slug === "support");

    expect(support).toBeDefined();
    expect(support?.content_markdown).toContain("support@orbithealth.app");
    expect(support?.content_markdown).toContain("Restore Purchases");
  });
});

describe("Tier Gating for Multi-Page System", () => {
  it("restricts Free tier to 4 system pages and denies custom pages", () => {
    expect(canCreateCustomPages("free")).toBe(false);
    expect(getMaxPages("free")).toBe(4);
    expect(PLAN_PAGE_LIMITS.free.allowedSystemPages).toEqual(["home", "privacy", "terms", "support"]);
  });

  it("permits Basic and Pro tiers to create custom subpages with higher page caps", () => {
    expect(canCreateCustomPages("basic")).toBe(true);
    expect(getMaxPages("basic")).toBe(8);

    expect(canCreateCustomPages("pro")).toBe(true);
    expect(getMaxPages("pro")).toBe(15);
  });
});

describe("Validation Schema for Mobile App Launch Attributes", () => {
  it("accepts updateSiteSchema with theme, store availability, and app icon", () => {
    const payload = {
      theme: "midnight",
      content: {
        brand: {
          name: "Sonder",
          logo_url: "https://example.com/logo.png",
          app_icon_url: "https://example.com/icon.png",
        },
        hero: {
          app_name: "Sonder",
          badge_text: "Now on iOS",
          header: "Sleep deeply.",
          short_description: "Gentle sleep soundscapes.",
          device_screenshot_url: "https://example.com/screen.png",
        },
        features: [
          { id: "f1", icon: "Moon", title: "Delta Waves", description: "Binaural delta sound." },
        ],
        store_links: {
          availability: "app_store_only" as const,
          app_store_url: "https://apps.apple.com/app/id1234",
          play_store_url: "",
          testflight_url: "",
        },
        screenshots: ["https://example.com/s1.png"],
        pages: getDefaultSitePages("Sonder", "rest@sonder.app"),
        footer: {
          brand_name: "Sonder",
          legal_links: [{ label: "Privacy", url: "/privacy" }],
          contact_email: "rest@sonder.app",
        },
      },
      status: "published" as const,
    };

    const res = updateSiteSchema.safeParse(payload);
    expect(res.success).toBe(true);
  });
});

describe("Vector App Store & Google Play Download Badges", () => {
  it("renders GooglePlayBadge with pure SVG vector graphics and official copy", async () => {
    const React = await import("react");
    const { renderToString } = await import("react-dom/server");
    const { GooglePlayBadge } = await import("@/components/ui/store-badges");

    const html = renderToString(
      React.createElement(GooglePlayBadge, {
        href: "https://play.google.com/store/apps/details?id=com.example.app",
      })
    );

    // Pure vector SVG (zero <img> raster tags)
    expect(html).not.toContain("<img");
    expect(html).toContain("<svg");
    expect(html).toContain('viewBox="0 0 180 60"');
    // Typography
    expect(html).toContain("GET IT ON");
    expect(html).toContain("Google Play");
  });

  it("renders AppStoreBadge with pure SVG Apple silhouette and official typography", async () => {
    const React = await import("react");
    const { renderToString } = await import("react-dom/server");
    const { AppStoreBadge } = await import("@/components/ui/store-badges");

    const html = renderToString(
      React.createElement(AppStoreBadge, {
        href: "https://apps.apple.com/app/id123456789",
      })
    );

    // Pure vector SVG (zero <img> raster tags)
    expect(html).not.toContain("<img");
    expect(html).toContain("<svg");
    expect(html).toContain('viewBox="0 0 180 60"');
    // Apple silhouette vector path
    expect(html).toContain("M37.05 30.2");
    // Typography
    expect(html).toContain("Download on the");
    expect(html).toContain("App Store");
  });

  it("renders TestFlightBadge for public beta releases", async () => {
    const React = await import("react");
    const { renderToString } = await import("react-dom/server");
    const { TestFlightBadge } = await import("@/components/ui/store-badges");

    const html = renderToString(
      React.createElement(TestFlightBadge, {
        href: "https://testflight.apple.com/join/abcdef",
      })
    );

    expect(html).not.toContain("<img");
    expect(html).toContain("<svg");
    expect(html).toContain("Join the Beta on");
    expect(html).toContain("TestFlight");
  });

  it("renders AppDownloadButtons container with custom alignment and URLs", async () => {
    const React = await import("react");
    const { renderToString } = await import("react-dom/server");
    const { default: AppDownloadButtons } = await import("@/components/ui/store-badges");

    const html = renderToString(
      React.createElement(AppDownloadButtons, {
        playStoreUrl: "https://play.google.com/store/apps/details?id=com.test",
        appStoreUrl: "https://apps.apple.com/app/id987",
        alignment: "justify-start",
      })
    );

    expect(html).toContain("justify-start");
    expect(html).toContain("GET IT ON");
    expect(html).toContain("Download on the");
    expect(html).not.toContain("<img");
  });
});

describe("ShipSprint Flagship Landing Page Generator", () => {
  it("generates complete, valid flagship content mirroring ShipSprint landing page", async () => {
    const { getFlagshipDefaultContent } = await import("@/lib/templates");
    const { siteContentSchema } = await import("@/lib/validation");

    const content = getFlagshipDefaultContent("DayFlow", "hello@dayflow.app");

    expect(content.brand.name).toBe("DayFlow");
    expect(content.hero.app_name).toBe("DayFlow");
    expect(content.hero.badge_text).toBe("Built for indie app makers");
    expect(content.hero.device_screenshot_url).toBe("");
    expect(content.hero.device_screenshot_url_secondary).toBe("");
    expect(content.impacts?.title).toBe("Real results. Real impact.");
    expect(content.impacts?.metric_stat).toBe("1,200+");
    expect(content.features.length).toBe(3);
    expect(content.features[0]?.proof_type).toBe("checklist");
    expect(content.features[1]?.proof_type).toBe("chart");
    expect(content.features[2]?.proof_type).toBe("readiness");
    expect(content.how_it_works?.length).toBe(3);
    expect(content.pages?.length).toBe(4);

    // Strict validation verification
    const parsed = siteContentSchema.safeParse(content);
    expect(parsed.success).toBe(true);
  });
});

