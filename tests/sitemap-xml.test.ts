import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("server-only", () => ({}));

import {
  escapeXml,
  formatSitemapXml,
  resolveSitemapEntries,
} from "@/lib/sitemap";
import { GET } from "@/app/site.xml/route";
import type { MetadataRoute } from "next";

// Mock Supabase admin and site lookup
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(),
}));

vi.mock("@/lib/site-lookup", () => ({
  resolvePublicSite: vi.fn(),
}));

describe("XML Sitemap formatting for Google search crawler", () => {
  it("escapes special characters to prevent XML parsing errors", () => {
    expect(escapeXml("https://example.com/test?a=1&b=2")).toBe(
      "https://example.com/test?a=1&amp;b=2"
    );
    expect(escapeXml("<tag>'quote'\"double\"")).toBe(
      "&lt;tag&gt;&apos;quote&apos;&quot;double&quot;"
    );
  });

  it("formats metadata entries into standard Sitemaps.org 0.9 XML with image namespace", () => {
    const entries: MetadataRoute.Sitemap = [
      {
        url: "https://mycoolapp.com",
        lastModified: new Date("2026-10-16T12:00:00.000Z"),
        changeFrequency: "weekly",
        priority: 1.0,
        images: [
          "https://assets.shipsprint.site/shots/preview1.png",
          "https://assets.shipsprint.site/shots/logo.png",
        ],
      },
      {
        url: "https://mycoolapp.com/privacy",
        lastModified: new Date("2026-10-16T12:00:00.000Z"),
        changeFrequency: "monthly",
        priority: 0.5,
      },
    ];

    const xml = formatSitemapXml(entries);

    expect(xml).toContain('<?xml version="1.0" encoding="UTF-8"?>');
    expect(xml).toContain(
      '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">'
    );
    expect(xml).toContain("<loc>https://mycoolapp.com</loc>");
    expect(xml).toContain("<lastmod>2026-10-16T12:00:00.000Z</lastmod>");
    expect(xml).toContain("<changefreq>weekly</changefreq>");
    expect(xml).toContain("<priority>1.0</priority>");

    // Check Google Image extensions
    expect(xml).toContain(
      "<image:image>\n      <image:loc>https://assets.shipsprint.site/shots/preview1.png</image:loc>\n    </image:image>"
    );
    expect(xml).toContain(
      "<image:image>\n      <image:loc>https://assets.shipsprint.site/shots/logo.png</image:loc>\n    </image:image>"
    );

    // Check subpage entry
    expect(xml).toContain("<loc>https://mycoolapp.com/privacy</loc>");
    expect(xml).toContain("<changefreq>monthly</changefreq>");
    expect(xml).toContain("<priority>0.5</priority>");
  });

  it("handles empty or minimalist entries gracefully", () => {
    const emptyXml = formatSitemapXml([]);
    expect(emptyXml).toContain('<?xml version="1.0" encoding="UTF-8"?>');
    expect(emptyXml).toContain("</urlset>");
  });
});

describe("Sitemap route resolution", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.ROOT_DOMAIN = "shipsprint.site";
    process.env.NEXT_PUBLIC_ROOT_DOMAIN = "shipsprint.site";
  });

  it("resolves customer published site routes with images and legal pages", async () => {
    const { resolvePublicSite } = await import("@/lib/site-lookup");
    (resolvePublicSite as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      site: {
        id: "site-123",
        slug: "focusflow",
        custom_domain: "focusflow.app",
        status: "published",
        updated_at: "2026-10-16T10:00:00Z",
        content: {
          brand: {
            app_icon_url: "https://assets.shipsprint.site/icon.png",
            logo_url: "https://assets.shipsprint.site/logo.png",
          },
          hero: {
            device_screenshot_url: "https://assets.shipsprint.site/hero.png",
          },
          screenshots: ["https://assets.shipsprint.site/screen1.png"],
          pages: [
            {
              id: "p1",
              slug: "changelog",
              is_published: true,
              updated_at: "2026-10-16T11:00:00Z",
            },
            {
              id: "p2",
              slug: "draft-page",
              is_published: false,
            },
          ],
        },
      },
      plan: { id: "pro" },
    });

    const entries = await resolveSitemapEntries("focusflow.app");

    expect(entries.length).toBeGreaterThanOrEqual(5);

    // Root page
    const home = entries.find((e) => e.url === "https://focusflow.app");
    expect(home).toBeDefined();
    expect(home?.priority).toBe(1.0);
    expect(home?.images).toContain("https://assets.shipsprint.site/icon.png");
    expect(home?.images).toContain("https://assets.shipsprint.site/hero.png");
    expect(home?.images).toContain("https://assets.shipsprint.site/screen1.png");

    // Standard legal pages
    expect(entries.some((e) => e.url === "https://focusflow.app/privacy")).toBe(true);
    expect(entries.some((e) => e.url === "https://focusflow.app/terms")).toBe(true);
    expect(entries.some((e) => e.url === "https://focusflow.app/support")).toBe(true);

    // Custom published subpage included, draft subpage excluded
    expect(entries.some((e) => e.url === "https://focusflow.app/changelog")).toBe(true);
    expect(entries.some((e) => e.url === "https://focusflow.app/draft-page")).toBe(false);
  });

  it("returns empty array when customer site is not published", async () => {
    const { resolvePublicSite } = await import("@/lib/site-lookup");
    (resolvePublicSite as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      site: {
        id: "site-456",
        slug: "draftsite",
        status: "draft",
      },
    });

    const entries = await resolveSitemapEntries("draftsite.shipsprint.site");
    expect(entries).toEqual([]);
  });

  it("resolves root platform sitemap without leaking cross-domain custom domains", async () => {
    const { createAdminClient } = await import("@/lib/supabase/admin");
    const mockFrom = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue({
            data: [
              { slug: "appone", custom_domain: null, updated_at: "2026-10-15T00:00:00Z" },
              { slug: "apptwo", custom_domain: "external.com", updated_at: "2026-10-15T00:00:00Z" },
            ],
          }),
        }),
      }),
    });
    (createAdminClient as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      from: mockFrom,
    });

    const entries = await resolveSitemapEntries("shipsprint.site");

    expect(entries.some((e) => e.url === "https://shipsprint.site")).toBe(true);
    expect(entries.some((e) => e.url === "https://shipsprint.site/privacy")).toBe(true);
    expect(entries.some((e) => e.url === "https://shipsprint.site/terms")).toBe(true);
    expect(entries.some((e) => e.url === "https://shipsprint.site/imprint")).toBe(true);

    // Subdomains must map to shipsprint.site to satisfy Google cross-domain policy
    expect(entries.some((e) => e.url === "https://appone.shipsprint.site")).toBe(true);
    expect(entries.some((e) => e.url === "https://apptwo.shipsprint.site")).toBe(true);
    expect(entries.some((e) => e.url === "https://external.com")).toBe(false);
  });
});

describe("/site.xml Route Handler", () => {
  it("serves valid XML response with 200 status and application/xml Content-Type", async () => {
    const { resolvePublicSite } = await import("@/lib/site-lookup");
    (resolvePublicSite as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      site: {
        id: "site-101",
        slug: "coolrunner",
        status: "published",
        updated_at: "2026-10-16T08:00:00Z",
        content: {
          brand: { name: "CoolRunner" },
          hero: { app_name: "CoolRunner", header: "Run faster" },
        },
      },
    });

    const request = new Request("https://coolrunner.shipsprint.site/site.xml", {
      headers: { host: "coolrunner.shipsprint.site" },
    });

    const response = await GET(request as any);

    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toBe("application/xml; charset=utf-8");
    expect(response.headers.get("X-Robots-Tag")).toBe("noindex");
    expect(response.headers.get("Cache-Control")).toContain("public");

    const bodyText = await response.text();
    expect(bodyText).toContain('<?xml version="1.0" encoding="UTF-8"?>');
    expect(bodyText).toContain("<loc>https://coolrunner.shipsprint.site</loc>");
    expect(bodyText).toContain("</urlset>");
  });
});
