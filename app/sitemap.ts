import type { MetadataRoute } from "next";
import { createAdminClient } from "@/lib/supabase/admin";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const rootDomain = process.env.NEXT_PUBLIC_ROOT_DOMAIN || "shipsprint.site";
  const baseUrl = `https://${rootDomain}`;

  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 1.0,
    },
    {
      url: `${baseUrl}/templates`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.9,
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
