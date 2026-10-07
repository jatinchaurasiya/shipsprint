/* Hallmark · pre-emit critique: P5 H5 E5 S5 R5 V5 */
import type { MetadataRoute } from "next";
import { headers } from "next/headers";
import { classifyHost } from "@/proxy";
import { createAdminClient } from "@/lib/supabase/admin";
import { resolvePublicSite } from "@/lib/site-lookup";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const rootDomain = process.env.NEXT_PUBLIC_ROOT_DOMAIN || "shipsprint.site";
  const baseUrl = `https://${rootDomain}`;

  try {
    const reqHeaders = await headers();
    const rawHost = reqHeaders.get("host") || "";
    const classified = classifyHost(rawHost);

    // If request is on a customer domain or subdomain
    if (classified.kind !== "app" && classified.value) {
      const lookup =
        classified.kind === "custom"
          ? `custom:${classified.value}`
          : classified.value;

      const admin = createAdminClient();
      const resolved = await resolvePublicSite(lookup, admin);

      if (!resolved || resolved.site.status !== "published") {
        return [];
      }

      const site = resolved.site;
      const canonicalOrigin = site.custom_domain
        ? `https://${site.custom_domain}`
        : `https://${site.slug}.${rootDomain}`;

      const siteLastMod = site.updated_at ? new Date(site.updated_at) : new Date();

      const customerRoutes: MetadataRoute.Sitemap = [
        {
          url: canonicalOrigin,
          lastModified: siteLastMod,
          changeFrequency: "weekly",
          priority: 1.0,
        },
      ];

      // Add legal & support standard public pages
      const standardSlugs = ["privacy", "terms", "support"];
      for (const slug of standardSlugs) {
        customerRoutes.push({
          url: `${canonicalOrigin}/${slug}`,
          lastModified: siteLastMod,
          changeFrequency: "monthly",
          priority: 0.5,
        });
      }

      // Add custom published pages from content
      const contentPages = site.content?.pages || [];
      for (const p of contentPages) {
        if (p.is_published !== false && p.slug && !standardSlugs.includes(p.slug)) {
          customerRoutes.push({
            url: `${canonicalOrigin}/${p.slug}`,
            lastModified: p.updated_at ? new Date(p.updated_at) : siteLastMod,
            changeFrequency: "monthly",
            priority: 0.6,
          });
        }
      }

      return customerRoutes;
    }
  } catch (err) {
    logger.warn("sitemap.xml dynamic evaluation failed", {
      error: err instanceof Error ? err.message : String(err),
    });
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

    const siteRoutes: MetadataRoute.Sitemap = (publishedSites || []).map((site) => ({
      url: site.custom_domain
        ? `https://${site.custom_domain}`
        : `https://${site.slug}.${rootDomain}`,
      lastModified: site.updated_at ? new Date(site.updated_at) : new Date(),
      changeFrequency: "weekly" as const,
      priority: 0.7,
    }));

    return [...staticRoutes, ...siteRoutes];
  } catch {
    return staticRoutes;
  }
}
