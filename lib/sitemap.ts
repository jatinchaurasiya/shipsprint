/* Hallmark · pre-emit critique: P5 H5 E5 S5 R5 V5 */
import type { MetadataRoute } from "next";
import { classifyHost } from "@/proxy";
import { createAdminClient } from "@/lib/supabase/admin";
import { resolvePublicSite } from "@/lib/site-lookup";
import { logger } from "@/lib/logger";

export function escapeXml(unsafe: string): string {
  return unsafe.replace(/[<>&'"]/g, (c) => {
    switch (c) {
      case "<":
        return "&lt;";
      case ">":
        return "&gt;";
      case "&":
        return "&amp;";
      case "'":
        return "&apos;";
      case '"':
        return "&quot;";
      default:
        return c;
    }
  });
}

/**
 * Formats sitemap entries into standard XML compliant with Google Search Crawler
 * and Sitemaps.org 0.9 schema, including Google Image Sitemap extensions.
 */
export function formatSitemapXml(entries: MetadataRoute.Sitemap): string {
  const urlNodes = entries
    .map((entry) => {
      const loc = escapeXml(entry.url);
      const lines: string[] = [`    <loc>${loc}</loc>`];

      if (entry.lastModified) {
        const d =
          entry.lastModified instanceof Date
            ? entry.lastModified
            : new Date(entry.lastModified);
        if (!isNaN(d.getTime())) {
          lines.push(`    <lastmod>${d.toISOString()}</lastmod>`);
        }
      }

      if (entry.changeFrequency) {
        lines.push(`    <changefreq>${entry.changeFrequency}</changefreq>`);
      }

      if (typeof entry.priority === "number") {
        lines.push(`    <priority>${entry.priority.toFixed(1)}</priority>`);
      }

      if (entry.images && Array.isArray(entry.images) && entry.images.length > 0) {
        for (const imgUrl of entry.images) {
          if (typeof imgUrl === "string" && imgUrl.trim()) {
            lines.push(
              `    <image:image>\n      <image:loc>${escapeXml(imgUrl.trim())}</image:loc>\n    </image:image>`
            );
          }
        }
      }

      return `  <url>\n${lines.join("\n")}\n  </url>`;
    })
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
${urlNodes}
</urlset>`.trim();
}

/**
 * Resolves all public URLs for a given request hostname, whether it is
 * the root platform (shipsprint.site) or a customer custom domain/subdomain.
 */
export async function resolveSitemapEntries(
  rawHost?: string
): Promise<MetadataRoute.Sitemap> {
  const rootDomain = (
    process.env.ROOT_DOMAIN ||
    process.env.NEXT_PUBLIC_ROOT_DOMAIN ||
    "shipsprint.site"
  )
    .toLowerCase()
    .split(":")[0]!;
  const baseUrl = `https://${rootDomain}`;

  const hostname = rawHost ? rawHost.toLowerCase().split(":")[0]! : "";
  const isPlatformHost =
    !hostname ||
    hostname === rootDomain ||
    hostname === `www.${rootDomain}` ||
    hostname === "localhost" ||
    hostname === "127.0.0.1";

  if (!isPlatformHost) {
    const classified = classifyHost(rawHost!);

    // If request is on a customer domain or customer subdomain
    if (classified.kind !== "app" && classified.value) {
      const lookup =
        classified.kind === "custom"
          ? `custom:${classified.value}`
          : classified.value;

      try {
        const admin = createAdminClient();
        const resolved = await resolvePublicSite(lookup, admin);

        if (!resolved || resolved.site.status !== "published") {
          return [];
        }

        const site = resolved.site;
        const canonicalOrigin = site.custom_domain
          ? `https://${site.custom_domain}`
          : `https://${site.slug}.${rootDomain}`;

        const siteLastMod = site.updated_at
          ? new Date(site.updated_at)
          : new Date();

        // Extract high-res media for Google Image search crawling
        const imageSet = new Set<string>();
        if (site.content?.brand?.app_icon_url) {
          imageSet.add(site.content.brand.app_icon_url);
        }
        if (site.content?.brand?.logo_url) {
          imageSet.add(site.content.brand.logo_url);
        }
        if (site.content?.hero?.device_screenshot_url) {
          imageSet.add(site.content.hero.device_screenshot_url);
        }
        if (site.content?.hero?.device_screenshot_url_secondary) {
          imageSet.add(site.content.hero.device_screenshot_url_secondary);
        }
        if (site.content?.screenshots && Array.isArray(site.content.screenshots)) {
          for (const s of site.content.screenshots) {
            if (typeof s === "string" && s.trim()) {
              imageSet.add(s.trim());
            }
          }
        }

        const homeImages = Array.from(imageSet);

        const customerRoutes: MetadataRoute.Sitemap = [
          {
            url: canonicalOrigin,
            lastModified: siteLastMod,
            changeFrequency: "weekly",
            priority: 1.0,
            ...(homeImages.length > 0 ? { images: homeImages } : {}),
          },
        ];

        // Standard legal & support pages
        const standardSlugs = ["privacy", "terms", "support", "imprint"];
        for (const slug of standardSlugs) {
          customerRoutes.push({
            url: `${canonicalOrigin}/${slug}`,
            lastModified: siteLastMod,
            changeFrequency: "monthly",
            priority: 0.5,
          });
        }

        // Custom published pages
        const contentPages = site.content?.pages || [];
        for (const p of contentPages) {
          if (
            p.is_published !== false &&
            p.slug &&
            !standardSlugs.includes(p.slug)
          ) {
            customerRoutes.push({
              url: `${canonicalOrigin}/${p.slug}`,
              lastModified: p.updated_at ? new Date(p.updated_at) : siteLastMod,
              changeFrequency: "monthly",
              priority: 0.6,
            });
          }
        }

        return customerRoutes;
      } catch (err) {
        logger.warn("sitemap dynamic evaluation failed for customer host", {
          host: rawHost,
          error: err instanceof Error ? err.message : String(err),
        });
        return [];
      }
    }
  }

  // Root platform sitemap (shipsprint.site)
  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 1.0,
    },
    {
      url: `${baseUrl}/terms`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.3,
    },
    {
      url: `${baseUrl}/privacy`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.3,
    },
    {
      url: `${baseUrl}/imprint`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.2,
    },
  ];

  try {
    const supabase = createAdminClient();
    const { data: publishedSites } = await supabase
      .from("sites")
      .select("slug, custom_domain, updated_at")
      .eq("status", "published")
      .limit(200);

    // Only include subdomains belonging to root domain to avoid cross-domain sitemap warnings from Google
    const siteRoutes: MetadataRoute.Sitemap = (publishedSites || [])
      .filter((site) => Boolean(site.slug))
      .map((site) => ({
        url: `https://${site.slug}.${rootDomain}`,
        lastModified: site.updated_at ? new Date(site.updated_at) : new Date(),
        changeFrequency: "weekly" as const,
        priority: 0.7,
      }));

    return [...staticRoutes, ...siteRoutes];
  } catch (err) {
    logger.warn("sitemap evaluation failed for root platform", {
      error: err instanceof Error ? err.message : String(err),
    });
    return staticRoutes;
  }
}
