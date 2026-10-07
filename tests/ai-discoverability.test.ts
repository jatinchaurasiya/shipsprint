import { describe, it, expect } from "vitest";
import {
  generateDeterministicAiSummary,
  safeJsonLdStringify,
  generateSchemaOrgJsonLd,
  generateRobotsTxtContent,
  generateLlmsTxtContent,
  calculateDiscoverabilityHealth,
} from "@/lib/ai-discovery";
import {
  FREE_PLAN,
  planForDisplay,
  canUseAiDiscovery,
  isProPlan,
  PLAN_FEATURES,
} from "@/lib/plans";
import { updateAiDiscoverySchema } from "@/lib/validation";
import type { Site, SiteContent } from "@/types/database";

describe("AI Search & LLM Discoverability - Plans & Entitlements", () => {
  it("ensures Free and Basic plans have ai_discovery disabled while Pro has it enabled", () => {
    expect(FREE_PLAN.has_ai_discovery).toBe(false);
    expect(canUseAiDiscovery(FREE_PLAN)).toBe(false);

    const basic = planForDisplay("basic");
    expect(basic.has_ai_discovery).toBe(false);
    expect(canUseAiDiscovery(basic)).toBe(false);

    const pro = planForDisplay("pro");
    expect(pro.has_ai_discovery).toBe(true);
    expect(canUseAiDiscovery(pro)).toBe(true);
    expect(isProPlan("pro")).toBe(true);
    expect(isProPlan("basic")).toBe(false);
    expect(isProPlan("free")).toBe(false);
  });

  it("lists AI Search & LLM Discoverability on the pricing plan features", () => {
    const aiFeature = PLAN_FEATURES.find(
      (f) => f.label === "AI Search & LLM Discoverability"
    );
    expect(aiFeature).toBeDefined();
    expect(aiFeature?.get(FREE_PLAN)).toBe(false);
    expect(aiFeature?.get(planForDisplay("basic"))).toBe(false);
    expect(aiFeature?.get(planForDisplay("pro"))).toBe(true);
  });
});

describe("Deterministic AI-Readable Summary", () => {
  const mockContent: SiteContent = {
    brand: {
      name: "FocusFlow",
      categories: ["Productivity", "Time Management"],
    },
    hero: {
      app_name: "FocusFlow",
      badge_text: "For indie founders and creators",
      header: "Master your deep work flow",
      short_description: "A timer and habit tracker built for distraction-free execution.",
    },
    features: [
      {
        id: "f1",
        icon: "Timer",
        title: "Adaptive Pomodoro",
        description: "Custom session lengths that sync with your circadian rhythm.",
      },
      {
        id: "f2",
        icon: "Shield",
        title: "Notification Blocker",
        description: "Mutes desktop alerts during active sessions.",
      },
    ],
    store_links: {
      app_store_url: "https://apps.apple.com/app/id123456789",
      play_store_url: "https://play.google.com/store/apps/details?id=com.focusflow",
    },
    screenshots: [],
    footer: {
      brand_name: "FocusFlow Inc",
      legal_links: [],
      contact_email: "support@focusflow.app",
    },
  };

  it("generates honest, factual app summary using only stored user data", () => {
    const summary = generateDeterministicAiSummary(mockContent, {
      customCategory: "Focus & Habit Tracker",
      customAudience: "Indie hackers and deep workers",
    });

    expect(summary).toContain("App Name: FocusFlow");
    expect(summary).toContain("What it does: A timer and habit tracker built for distraction-free execution.");
    expect(summary).toContain("Category: Focus & Habit Tracker");
    expect(summary).toContain("Target Audience: Indie hackers and deep workers");
    expect(summary).toContain("Adaptive Pomodoro: Custom session lengths that sync with your circadian rhythm.");
    expect(summary).toContain("Notification Blocker: Mutes desktop alerts during active sessions.");
    expect(summary).toContain("Platforms: iOS, Android");
    expect(summary).toContain("App Store: https://apps.apple.com/app/id123456789");
    expect(summary).toContain("Google Play: https://play.google.com/store/apps/details?id=com.focusflow");

    // Strictly verify no fabricated claims
    expect(summary).not.toContain("4.9 stars");
    expect(summary).not.toContain("10,000+ users");
    expect(summary).not.toContain("#1 Productivity App");
  });

  it("handles minimal content gracefully without throwing", () => {
    const minimalContent: SiteContent = {
      brand: { name: "MinimalApp" },
      hero: {
        app_name: "MinimalApp",
        badge_text: "",
        header: "Simple app",
        short_description: "",
      },
      features: [],
      store_links: {},
      screenshots: [],
      footer: {
        brand_name: "MinimalApp",
        legal_links: [],
        contact_email: "",
      },
    };

    const summary = generateDeterministicAiSummary(minimalContent);
    expect(summary).toContain("App Name: MinimalApp");
    expect(summary).toContain("Platforms: Web");
  });
});

describe("Schema.org JSON-LD Structured Data", () => {
  const mockSite: Site = {
    id: "site-123",
    user_id: "user-456",
    slug: "focusflow",
    custom_domain: "focusflow.app",
    status: "published",
    content: {
      brand: { name: "FocusFlow" },
      hero: {
        app_name: "FocusFlow",
        badge_text: "",
        header: "Master your deep work",
        short_description: "Deep work timer for focused execution.",
      },
      features: [],
      store_links: {
        app_store_url: "https://apps.apple.com/app/id12345",
      },
      screenshots: ["https://assets.shipsprint.site/shots/preview.png"],
      pricing: [
        {
          id: "tier-1",
          name: "Pro",
          price: "$4.99",
          period: "month",
          features: ["Unlimited timers"],
          cta_label: "Get Pro",
        },
      ],
      footer: {
        brand_name: "FocusFlow",
        legal_links: [],
        contact_email: "support@focusflow.app",
      },
    },
    theme: "v1",
    template_id: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    published_at: new Date().toISOString(),
    ai_category: "ProductivityApplication",
  };

  it("generates correct Schema.org MobileApplication structure with no fabricated fields", () => {
    const jsonLd = generateSchemaOrgJsonLd(mockSite, "https://focusflow.app");

    expect(jsonLd["@context"]).toBe("https://schema.org");
    expect(jsonLd["@type"]).toBe("MobileApplication");
    expect(jsonLd.name).toBe("FocusFlow");
    expect(jsonLd.description).toBe("Deep work timer for focused execution.");
    expect(jsonLd.url).toBe("https://focusflow.app");
    expect(jsonLd.applicationCategory).toBe("ProductivityApplication");
    expect(jsonLd.operatingSystem).toBe("iOS");
    expect(jsonLd.downloadUrl).toBe("https://apps.apple.com/app/id12345");
    expect(jsonLd.offers).toEqual({
      "@type": "Offer",
      price: "4.99",
      priceCurrency: "USD",
    });

    // Verify absence of fabricated review stats
    expect(jsonLd.aggregateRating).toBeUndefined();
    expect(jsonLd.reviewCount).toBeUndefined();
  });

  it("safely serializes JSON-LD protecting against script injection and XSS", () => {
    const maliciousPayload = {
      name: "</script><script>alert('xss')</script>",
      description: "Safe text with <tag> and & and newline \u2028",
    };

    const serialized = safeJsonLdStringify(maliciousPayload);
    expect(serialized).not.toContain("</script>");
    expect(serialized).toContain("\\u003c/script\\u003e");
    expect(serialized).toContain("\\u0026");
  });
});

describe("Host-Aware Robots.txt & Crawler Policies", () => {
  it("blocks all crawlers when the site is not published", () => {
    const robots = generateRobotsTxtContent({
      isPublished: false,
      isPro: true,
      aiDiscoveryEnabled: true,
      aiSearchEnabled: true,
      aiTrainingEnabled: false,
      canonicalOrigin: "https://draft.shipsprint.site",
    });

    expect(robots.trim()).toBe("User-agent: *\nDisallow: /");
  });

  it("generates separate directives for OAI-SearchBot and GPTBot on Pro published sites", () => {
    const robots = generateRobotsTxtContent({
      isPublished: true,
      isPro: true,
      aiDiscoveryEnabled: true,
      aiSearchEnabled: true,
      aiTrainingEnabled: false,
      canonicalOrigin: "https://mycoolapp.com",
    });

    expect(robots).toContain("User-agent: OAI-SearchBot\nAllow: /");
    expect(robots).toContain("User-agent: GPTBot\nDisallow: /");
    expect(robots).toContain("User-agent: PerplexityBot\nAllow: /");
    expect(robots).toContain("User-agent: ClaudeBot\nAllow: /");
    expect(robots).toContain("Sitemap: https://mycoolapp.com/sitemap.xml");
  });

  it("respects user choice to disable AI search crawling", () => {
    const robots = generateRobotsTxtContent({
      isPublished: true,
      isPro: true,
      aiDiscoveryEnabled: true,
      aiSearchEnabled: false,
      aiTrainingEnabled: false,
      canonicalOrigin: "https://mycoolapp.com",
    });

    expect(robots).toContain("User-agent: OAI-SearchBot\nDisallow: /");
    expect(robots).toContain("User-agent: GPTBot\nDisallow: /");
  });

  it("allows GPTBot only when explicitly enabled by user", () => {
    const robots = generateRobotsTxtContent({
      isPublished: true,
      isPro: true,
      aiDiscoveryEnabled: true,
      aiSearchEnabled: true,
      aiTrainingEnabled: true,
      canonicalOrigin: "https://mycoolapp.com",
    });

    expect(robots).toContain("User-agent: GPTBot\nAllow: /");
  });
});

describe("Machine-Readable /llms.txt Generation", () => {
  const mockSite: Site = {
    id: "site-789",
    user_id: "user-123",
    slug: "llmsapp",
    custom_domain: null,
    status: "published",
    content: {
      brand: { name: "AgentHelper" },
      hero: {
        app_name: "AgentHelper",
        badge_text: "AI tooling",
        header: "Automation agent platform",
        short_description: "Automate background workflow steps with verified safety.",
      },
      features: [],
      store_links: {
        app_store_url: "https://apps.apple.com/app/agenthelper",
      },
      screenshots: [],
      pages: [
        {
          id: "p1",
          slug: "privacy",
          title: "Privacy Policy",
          page_type: "privacy",
          is_published: true,
          content_markdown: "Privacy content",
        },
      ],
      footer: {
        brand_name: "AgentHelper",
        legal_links: [],
        contact_email: "agent@helper.ai",
      },
    },
    theme: "v1",
    template_id: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    published_at: new Date().toISOString(),
    ai_summary: "AgentHelper is an automation tool for developers.",
  };

  it("generates clean markdown with public routes and excludes secrets", () => {
    const llmsTxt = generateLlmsTxtContent(mockSite, "https://llmsapp.shipsprint.site");

    expect(llmsTxt).toContain("# AgentHelper");
    expect(llmsTxt).toContain("> Automate background workflow steps with verified safety.");
    expect(llmsTxt).toContain("## Summary");
    expect(llmsTxt).toContain("AgentHelper is an automation tool for developers.");
    expect(llmsTxt).toContain("- [Home](https://llmsapp.shipsprint.site)");
    expect(llmsTxt).toContain("- [Privacy Policy](https://llmsapp.shipsprint.site/privacy)");
    expect(llmsTxt).toContain("- [Apple App Store](https://apps.apple.com/app/agenthelper)");

    // Ensure no private user data or secrets
    expect(llmsTxt).not.toContain("user-123");
    expect(llmsTxt).not.toContain("api_key");
    expect(llmsTxt).not.toContain("/dashboard");
  });
});

describe("Discoverability Health Score Calculator", () => {
  it("calculates a high readiness score when all 10 checks pass", () => {
    const fullSite: Site = {
      id: "site-999",
      user_id: "user-111",
      slug: "readyapp",
      custom_domain: "readyapp.com",
      status: "published",
      content: {
        brand: { name: "ReadyApp", logo_url: "https://readyapp.com/logo.png" },
        hero: {
          app_name: "ReadyApp",
          badge_text: "Production ready",
          header: "The ultimate developer utility",
          short_description: "Build faster with integrated command line workflows and real-time sync.",
        },
        features: [
          { id: "f1", icon: "Zap", title: "Instant Sync", description: "Syncs within 20ms." },
          { id: "f2", icon: "Lock", title: "End-to-End Encryption", description: "Zero-knowledge architecture." },
        ],
        store_links: { app_store_url: "https://apple.com" },
        screenshots: ["https://readyapp.com/shot.png"],
        footer: { brand_name: "ReadyApp", legal_links: [], contact_email: "hi@readyapp.com" },
      },
      theme: "v1",
      template_id: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      published_at: new Date().toISOString(),
      ai_summary: "ReadyApp is a developer utility.",
    };

    const health = calculateDiscoverabilityHealth(fullSite, {
      isLiveReachable: true,
      robotsAccessible: true,
      sitemapAccessible: true,
    });

    expect(health.score).toBe(100);
    expect(health.ratingLabel).toBe("Excellent");
    expect(health.checks.every((c) => c.passed)).toBe(true);
  });

  it("reduces score and marks warnings for draft pages with incomplete descriptions", () => {
    const draftSite: Site = {
      id: "site-draft",
      user_id: "user-111",
      slug: "draftapp",
      custom_domain: null,
      status: "draft",
      content: {
        brand: { name: "" },
        hero: {
          app_name: "",
          badge_text: "",
          header: "Short",
          short_description: "Too short",
        },
        features: [],
        store_links: {},
        screenshots: [],
        footer: { brand_name: "", legal_links: [], contact_email: "" },
      },
      theme: "v1",
      template_id: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      published_at: null,
    };

    const health = calculateDiscoverabilityHealth(draftSite, {
      isLiveReachable: false,
      robotsAccessible: false,
      sitemapAccessible: false,
    });

    expect(health.score).toBeLessThan(50);
    expect(health.ratingLabel).toBe("Needs improvement");

    const accessibleCheck = health.checks.find((c) => c.id === "page_accessible");
    expect(accessibleCheck?.passed).toBe(false);

    const descCheck = health.checks.find((c) => c.id === "desc_present");
    expect(descCheck?.passed).toBe(false);
  });
});

describe("Schema.org Application Type Variations & Canonical Priority", () => {
  it("generates WebApplication when no mobile store links are present", () => {
    const webSite: Site = {
      id: "site-web",
      user_id: "user-1",
      slug: "webtool",
      custom_domain: "webtool.io",
      status: "published",
      content: {
        brand: { name: "WebTool" },
        hero: {
          app_name: "WebTool",
          badge_text: "",
          header: "Browser-based tool",
          short_description: "Run scripts directly inside your browser sandbox.",
        },
        features: [],
        store_links: {},
        screenshots: [],
        footer: {
          brand_name: "WebTool",
          legal_links: [],
          contact_email: "hi@webtool.io",
        },
      },
      theme: "v1",
      template_id: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      published_at: new Date().toISOString(),
    };

    const jsonLd = generateSchemaOrgJsonLd(webSite, "https://webtool.io");
    expect(jsonLd["@type"]).toBe("SoftwareApplication");
    expect(jsonLd.name).toBe("WebTool");
    expect(jsonLd.operatingSystem).toBe("Web");
  });

  it("prioritizes verified custom domain over hosted subdomain in robots sitemap reference", () => {
    const robots = generateRobotsTxtContent({
      isPublished: true,
      isPro: true,
      aiDiscoveryEnabled: true,
      aiSearchEnabled: true,
      aiTrainingEnabled: false,
      canonicalOrigin: "https://customdomain.com",
    });

    expect(robots).toContain("Sitemap: https://customdomain.com/sitemap.xml");
  });
});

describe("Zod Validation Schema for Discoverability Settings", () => {
  it("accepts valid discoverability settings payload", () => {
    const parsed = updateAiDiscoverySchema.safeParse({
      ai_discovery_enabled: true,
      ai_search_crawling_enabled: true,
      ai_training_crawling_enabled: false,
      llms_txt_enabled: true,
      ai_category: "Productivity",
      ai_target_audience: "Solo founders",
      ai_summary: "FocusFlow is a timer app.",
    });

    expect(parsed.success).toBe(true);
  });

  it("rejects unknown keys due to strict validation guard", () => {
    const parsed = updateAiDiscoverySchema.safeParse({
      ai_discovery_enabled: true,
      arbitrary_injected_key: "malicious payload",
    });

    expect(parsed.success).toBe(false);
  });
});


