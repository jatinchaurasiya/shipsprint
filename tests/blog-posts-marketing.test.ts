/* Hallmark · pre-emit critique: P5 H5 E5 S5 R5 V5 */
import { describe, it, expect, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { sitePageSchema, siteContentSchema } from "@/lib/validation";
import {
  canCreateBlogPages,
  getMaxBlogPages,
  isBlogLimitReached,
} from "@/lib/tier-limits";
import {
  generateBlogPostingJsonLd,
  generateLlmsTxtContent,
} from "@/lib/ai-discovery";
import { formatSitemapXml } from "@/lib/sitemap";
import type { Site, SitePage } from "@/types/database";

describe("Blog Posts Architecture & Marketing Features", () => {
  const sampleBlogPost: SitePage = {
    id: "blog-1",
    slug: "launching-version-2",
    title: "Launching Orbit v2.0: Calm Sleep Tracking",
    nav_label: "v2.0 Launch",
    show_in_nav: false,
    show_in_footer: true,
    page_type: "blog",
    is_system: false,
    is_published: true,
    excerpt: "Everything new in our biggest update yet, including offline delta soundscapes.",
    author: "Elena Rostova",
    published_date: "2026-10-22",
    cover_image_url: "https://example.com/cover.png",
    reading_time_minutes: 4,
    content_markdown: "# Launching Orbit v2.0\n\nWe are thrilled to unveil our new update.",
    updated_at: "2026-10-22T12:00:00Z",
  };

  describe("Validation Schema for Blog Posts", () => {
    it("accepts valid blog post with full marketing metadata", () => {
      const res = sitePageSchema.safeParse(sampleBlogPost);
      expect(res.success).toBe(true);
    });

    it("accepts blog post inside siteContentSchema with up to expanded caps", () => {
      const siteContent = {
        brand: { name: "Orbit" },
        hero: {
          app_name: "Orbit",
          badge_text: "Now on iOS & Android",
          header: "Sleep deeply.",
          short_description: "Gentle soundscapes.",
        },
        features: [],
        store_links: {
          availability: "app_store_only" as const,
          app_store_url: "https://apps.apple.com/app/id1234",
        },
        screenshots: [],
        pages: [sampleBlogPost],
        footer: {
          brand_name: "Orbit",
          legal_links: [],
          contact_email: "support@orbit.app",
        },
      };

      const res = siteContentSchema.safeParse(siteContent);
      expect(res.success).toBe(true);
    });

    it("rejects invalid page_type or dangerous URLs in cover image", () => {
      const badType = { ...sampleBlogPost, page_type: "invalid_type" };
      expect(sitePageSchema.safeParse(badType).success).toBe(false);

      const xssCover = { ...sampleBlogPost, cover_image_url: "javascript:alert(1)" };
      expect(sitePageSchema.safeParse(xssCover).success).toBe(false);
    });
  });

  describe("Tier Limit Enforcement for Blog Pages", () => {
    it("disallows blog pages on Free tier", () => {
      expect(canCreateBlogPages("free")).toBe(false);
      expect(getMaxBlogPages("free")).toBe(0);
      expect(isBlogLimitReached(0, "free")).toBe(true);
    });

    it("enforces exactly 10 blog pages on Basic tier matching advertised plan", () => {
      expect(canCreateBlogPages("basic")).toBe(true);
      expect(getMaxBlogPages("basic")).toBe(10);
      expect(isBlogLimitReached(9, "basic")).toBe(false);
      expect(isBlogLimitReached(10, "basic")).toBe(true);
    });

    it("enforces unlimited / 100 blog pages on Pro tier matching advertised plan", () => {
      expect(canCreateBlogPages("pro")).toBe(true);
      expect(getMaxBlogPages("pro")).toBe(100);
      expect(isBlogLimitReached(10, "pro")).toBe(false);
      expect(isBlogLimitReached(99, "pro")).toBe(false);
    });
  });

  describe("SEO & AEO Discoverability Engine for Blog Posts", () => {
    const mockSite: Site = {
      id: "123e4567-e89b-12d3-a456-426614174000",
      user_id: "123e4567-e89b-12d3-a456-426614174001",
      slug: "orbit",
      custom_domain: null,
      template_id: null,
      status: "published",
      theme: "midnight",
      created_at: "2026-10-22T00:00:00Z",
      updated_at: "2026-10-22T00:00:00Z",
      published_at: "2026-10-22T00:00:00Z",
      content: {
        brand: {
          name: "Orbit",
          logo_url: "https://example.com/logo.png",
        },
        hero: {
          app_name: "Orbit",
          badge_text: "Now on iOS & Android",
          header: "Sleep peacefully",
          short_description: "The calmest sleep tracker on iOS and Android.",
        },
        store_links: {
          availability: "both",
          app_store_url: "https://apps.apple.com/app/id1234",
          play_store_url: "https://play.google.com/store/apps/details?id=com.orbit",
        },
        features: [],
        screenshots: [],
        pages: [sampleBlogPost],
        footer: {
          brand_name: "Orbit",
          legal_links: [],
          contact_email: "support@orbit.app",
        },
      },
    };

    it("generates valid Schema.org BlogPosting JSON-LD for rich Google & LLM citations", () => {
      const jsonLd = generateBlogPostingJsonLd({
        site: mockSite,
        page: sampleBlogPost,
        canonicalUrl: "https://orbit.shipsprint.site/launching-version-2",
      });

      expect(jsonLd["@context"]).toBe("https://schema.org");
      expect(jsonLd["@type"]).toBe("BlogPosting");
      expect(jsonLd.headline).toBe(sampleBlogPost.title);
      expect(jsonLd.description).toBe(sampleBlogPost.excerpt);
      expect(jsonLd.image).toBe(sampleBlogPost.cover_image_url);
      expect((jsonLd.author as { name: string }).name).toBe("Elena Rostova");
      expect((jsonLd.publisher as { name: string }).name).toBe("Orbit");
    });

    it("indexes blog posts under ## Blog & Product Updates in /llms.txt for Answer Engines (AEO)", () => {
      const llmsTxt = generateLlmsTxtContent(mockSite, "https://orbit.shipsprint.site");

      expect(llmsTxt).toContain("## Blog & Product Updates");
      expect(llmsTxt).toContain(
        "- [Launching Orbit v2.0: Calm Sleep Tracking](https://orbit.shipsprint.site/launching-version-2): Everything new in our biggest update yet, including offline delta soundscapes."
      );
    });
  });

  describe("Sitemap Dynamic Generation for Customer Blog", () => {
    it("ensures blog posts are formatted with priority 0.8, weekly frequency and image tags", () => {
      const xml = formatSitemapXml([
        {
          url: "https://orbit.shipsprint.site/launching-version-2",
          lastModified: new Date("2026-10-22T12:00:00Z"),
          changeFrequency: "weekly",
          priority: 0.8,
          images: ["https://example.com/cover.png"],
        },
      ]);

      expect(xml).toContain("<loc>https://orbit.shipsprint.site/launching-version-2</loc>");
      expect(xml).toContain("<changefreq>weekly</changefreq>");
      expect(xml).toContain("<priority>0.8</priority>");
      expect(xml).toContain("<image:loc>https://example.com/cover.png</image:loc>");
    });
  });
});
