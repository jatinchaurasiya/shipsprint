/* Hallmark · pre-emit critique: P5 H5 E5 S5 R5 V5 */
import type { MetadataRoute } from "next";
import { headers } from "next/headers";
import { classifyHost } from "@/proxy";
import { createAdminClient } from "@/lib/supabase/admin";
import { resolvePublicSite } from "@/lib/site-lookup";
import { canUseAiDiscovery } from "@/lib/plans";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";

export default async function robots(): Promise<MetadataRoute.Robots> {
  const rootDomain = process.env.NEXT_PUBLIC_ROOT_DOMAIN || "shipsprint.site";
  const defaultBaseUrl = `https://${rootDomain}`;

  try {
    const reqHeaders = await headers();
    const rawHost = reqHeaders.get("host") || "";
    const classified = classifyHost(rawHost);

    // If request is on a customer domain or customer subdomain
    if (classified.kind !== "app" && classified.value) {
      const lookup =
        classified.kind === "custom"
          ? `custom:${classified.value}`
          : classified.value;

      const admin = createAdminClient();
      const resolved = await resolvePublicSite(lookup, admin);

      if (!resolved || resolved.site.status !== "published") {
        return {
          rules: [
            {
              userAgent: "*",
              disallow: "/",
            },
          ],
        };
      }

      const { site, plan } = resolved;
      const isPro = canUseAiDiscovery(plan);
      const isAiDiscoveryActive = isPro && Boolean(site.ai_discovery_enabled);

      const canonicalOrigin = site.custom_domain
        ? `https://${site.custom_domain}`
        : `https://${site.slug}.${rootDomain}`;

      if (isAiDiscoveryActive) {
        const searchAllowed = site.ai_search_crawling_enabled ?? true;
        const trainingAllowed = site.ai_training_crawling_enabled ?? false;

        const rules: MetadataRoute.Robots["rules"] = [
          {
            userAgent: "*",
            allow: "/",
            disallow: ["/api/"],
          },
          {
            userAgent: "OAI-SearchBot",
            ...(searchAllowed ? { allow: "/" } : { disallow: "/" }),
          },
          {
            userAgent: "GPTBot",
            ...(trainingAllowed ? { allow: "/" } : { disallow: "/" }),
          },
          {
            userAgent: "PerplexityBot",
            ...(searchAllowed ? { allow: "/" } : { disallow: "/" }),
          },
          {
            userAgent: "ClaudeBot",
            ...(searchAllowed ? { allow: "/" } : { disallow: "/" }),
          },
        ];

        return {
          rules,
          sitemap: `${canonicalOrigin}/sitemap.xml`,
        };
      }

      // Default rules for standard published sites
      return {
        rules: [
          {
            userAgent: "*",
            allow: "/",
            disallow: ["/api/"],
          },
        ],
        sitemap: `${canonicalOrigin}/sitemap.xml`,
      };
    }
  } catch (err) {
    logger.warn("robots.txt dynamic evaluation failed, falling back to root platform rules", {
      error: err instanceof Error ? err.message : String(err),
    });
  }

  // Root platform robots.txt (shipsprint.site)
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/dashboard/", "/api/"],
      },
    ],
    sitemap: `${defaultBaseUrl}/sitemap.xml`,
  };
}
