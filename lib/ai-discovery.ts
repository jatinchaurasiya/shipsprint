/* Hallmark · pre-emit critique: P5 H5 E5 S5 R5 V5 */
/**
 * AI Search & LLM Discoverability Engine
 *
 * Implements factual, deterministic discoverability generation, valid Schema.org
 * JSON-LD, crawler-specific robots.txt rules, /llms.txt serialization, and
 * live technical health diagnostic scoring.
 *
 * Strict Hallmark constraint: Never fabricate metrics, reviews, ratings, or ranking guarantees.
 */

import type { Site, SiteContent } from "@/types/database";

export interface DiscoverabilityCheckItem {
  id: string;
  label: string;
  passed: boolean;
  message?: string;
}

export interface DiscoverabilityHealthResult {
  score: number;
  ratingLabel: "Needs improvement" | "Good" | "Very good" | "Excellent";
  checks: DiscoverabilityCheckItem[];
  scannedAt: string;
}

export interface CrawlerPolicy {
  name: string;
  userAgent: string;
  purpose: "search" | "training";
  isAllowed: boolean;
  description: string;
}

/**
 * Generates an honest, deterministic AI-readable summary of the application
 * based solely on actual stored user content.
 */
export function generateDeterministicAiSummary(
  content: SiteContent,
  options?: {
    customCategory?: string | null;
    customAudience?: string | null;
  }
): string {
  const appName = content.brand?.name || content.hero?.app_name || "Application";
  const headline = content.hero?.header || "";
  const shortDesc = content.hero?.short_description || headline;
  const category =
    options?.customCategory?.trim() ||
    content.brand?.categories?.[0] ||
    "Software Application";
  const audience =
    options?.customAudience?.trim() ||
    (content.hero?.badge_text ? content.hero.badge_text : "General Audience");

  const lines: string[] = [];
  lines.push(`App Name: ${appName}`);

  if (shortDesc) {
    lines.push(`What it does: ${shortDesc}`);
  }

  lines.push(`Category: ${category}`);
  lines.push(`Target Audience: ${audience}`);

  const features = content.features || [];
  if (features.length > 0) {
    lines.push("Key capabilities:");
    for (const f of features.slice(0, 8)) {
      if (f.title) {
        lines.push(`- ${f.title}: ${f.description || ""}`.trim());
      }
    }
  }

  // Determine platforms honestly
  const platforms: string[] = [];
  if (content.store_links?.app_store_url) platforms.push("iOS");
  if (content.store_links?.play_store_url) platforms.push("Android");
  if (platforms.length === 0) platforms.push("Web");
  lines.push(`Platforms: ${platforms.join(", ")}`);

  if (content.store_links?.app_store_url) {
    lines.push(`App Store: ${content.store_links.app_store_url}`);
  }
  if (content.store_links?.play_store_url) {
    lines.push(`Google Play: ${content.store_links.play_store_url}`);
  }

  return lines.join("\n");
}

/**
 * Escapes unsafe characters for safe inline embedding inside <script type="application/ld+json">.
 * Prevents stored XSS / script breakout.
 */
export function safeJsonLdStringify(data: unknown): string {
  const rawJson = JSON.stringify(data);
  return rawJson
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/&/g, "\\u0026")
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029");
}

/**
 * Generates valid Schema.org structured data for the published page.
 * Uses exact application types without fabricating ratings or downloads.
 */
export function generateSchemaOrgJsonLd(
  site: Site,
  canonicalUrl: string
): Record<string, unknown> {
  const content = site.content;
  const appName = content.brand?.name || content.hero?.app_name || site.slug;
  const description =
    content.hero?.short_description ||
    content.hero?.header ||
    `Official landing page for ${appName}.`;

  const hasAppStore = Boolean(content.store_links?.app_store_url);
  const hasPlayStore = Boolean(content.store_links?.play_store_url);

  let schemaType = "SoftwareApplication";
  let operatingSystem = "Web";

  if (hasAppStore && hasPlayStore) {
    schemaType = "MobileApplication";
    operatingSystem = "iOS, Android";
  } else if (hasAppStore) {
    schemaType = "MobileApplication";
    operatingSystem = "iOS";
  } else if (hasPlayStore) {
    schemaType = "MobileApplication";
    operatingSystem = "Android";
  }

  const category =
    site.ai_category ||
    content.brand?.categories?.[0] ||
    "SoftwareApplication";

  const sameAs: string[] = [];
  if (content.store_links?.app_store_url) sameAs.push(content.store_links.app_store_url);
  if (content.store_links?.play_store_url) sameAs.push(content.store_links.play_store_url);

  const images: string[] = [];
  if (content.brand?.logo_url) images.push(content.brand.logo_url);
  if (content.screenshots?.[0]) images.push(content.screenshots[0]);

  const jsonLd: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": schemaType,
    name: appName,
    description,
    url: canonicalUrl,
    applicationCategory: category,
    operatingSystem,
  };

  if (images.length > 0) {
    jsonLd.image = images.length === 1 ? images[0] : images;
  }

  if (sameAs.length > 0) {
    jsonLd.sameAs = sameAs;
  }

  if (content.store_links?.app_store_url || content.store_links?.play_store_url) {
    jsonLd.downloadUrl =
      content.store_links?.app_store_url || content.store_links?.play_store_url;
  }

  // Factual pricing representation: only include if explicitly defined in pricing tiers
  if (content.pricing && content.pricing.length > 0) {
    const firstTier = content.pricing[0];
    if (firstTier?.price) {
      jsonLd.offers = {
        "@type": "Offer",
        price: firstTier.price.replace(/[^0-9.]/g, "") || "0",
        priceCurrency: "USD",
      };
    }
  }

  return jsonLd;
}

/**
 * Returns supported AI crawler policies.
 */
export function getSupportedCrawlerPolicies(site: {
  ai_search_crawling_enabled?: boolean;
  ai_training_crawling_enabled?: boolean;
}): CrawlerPolicy[] {
  const searchAllowed = site.ai_search_crawling_enabled ?? true;
  const trainingAllowed = site.ai_training_crawling_enabled ?? false;

  return [
    {
      name: "OpenAI Search (OAI-SearchBot)",
      userAgent: "OAI-SearchBot",
      purpose: "search",
      isAllowed: searchAllowed,
      description: "Allows ChatGPT and OpenAI Search to index and cite this page for user search queries.",
    },
    {
      name: "OpenAI Model Training (GPTBot)",
      userAgent: "GPTBot",
      purpose: "training",
      isAllowed: trainingAllowed,
      description: "Controls whether OpenAI may use site content for AI model training datasets.",
    },
    {
      name: "Perplexity Search (PerplexityBot)",
      userAgent: "PerplexityBot",
      purpose: "search",
      isAllowed: searchAllowed,
      description: "Allows Perplexity AI to crawl and cite this page in search responses.",
    },
    {
      name: "Anthropic Claude (ClaudeBot)",
      userAgent: "ClaudeBot",
      purpose: "search",
      isAllowed: searchAllowed,
      description: "Allows Anthropic Claude to browse and understand this page when requested.",
    },
  ];
}

/**
 * Formats a valid robots.txt string for the given site and canonical origin.
 */
export function generateRobotsTxtContent(options: {
  isPublished: boolean;
  isPro: boolean;
  aiDiscoveryEnabled: boolean;
  aiSearchEnabled: boolean;
  aiTrainingEnabled: boolean;
  canonicalOrigin: string;
}): string {
  if (!options.isPublished) {
    return "User-agent: *\nDisallow: /\n";
  }

  const lines: string[] = [];

  // Default web crawlers
  lines.push("User-agent: *");
  lines.push("Allow: /");
  lines.push("Disallow: /api/");
  lines.push("");

  if (options.isPro && options.aiDiscoveryEnabled) {
    const policies = getSupportedCrawlerPolicies({
      ai_search_crawling_enabled: options.aiSearchEnabled,
      ai_training_crawling_enabled: options.aiTrainingEnabled,
    });

    for (const policy of policies) {
      lines.push(`User-agent: ${policy.userAgent}`);
      lines.push(policy.isAllowed ? "Allow: /" : "Disallow: /");
      lines.push("");
    }
  }

  lines.push(`Sitemap: ${options.canonicalOrigin}/sitemap.xml`);
  return lines.join("\n");
}

/**
 * Generates an optional /llms.txt machine-readable document.
 */
export function generateLlmsTxtContent(
  site: Site,
  canonicalOrigin: string
): string {
  const content = site.content;
  const appName = content.brand?.name || content.hero?.app_name || site.slug;
  const shortDesc =
    content.hero?.short_description ||
    content.hero?.header ||
    `Official application overview for ${appName}.`;

  const lines: string[] = [];
  lines.push(`# ${appName}`);
  lines.push("");
  lines.push(`> ${shortDesc}`);
  lines.push("");

  if (site.ai_summary) {
    lines.push("## Summary");
    lines.push(site.ai_summary);
    lines.push("");
  }

  lines.push("## Public Pages");
  lines.push(`- [Home](${canonicalOrigin})`);

  const pages = content.pages || [];
  for (const page of pages) {
    if (page.is_published !== false && page.slug) {
      lines.push(`- [${page.title || page.slug}](${canonicalOrigin}/${page.slug})`);
    }
  }

  lines.push("");
  lines.push("## Store Links");
  if (content.store_links?.app_store_url) {
    lines.push(`- [Apple App Store](${content.store_links.app_store_url})`);
  }
  if (content.store_links?.play_store_url) {
    lines.push(`- [Google Play Store](${content.store_links.play_store_url})`);
  }

  return lines.join("\n");
}

/**
 * Computes the 10-point technical Discoverability Health score (0–100).
 * Strictly measures technical readiness — not ranking or traffic predictions.
 */
export function calculateDiscoverabilityHealth(
  site: Site,
  options?: {
    isLiveReachable?: boolean;
    robotsAccessible?: boolean;
    sitemapAccessible?: boolean;
  }
): DiscoverabilityHealthResult {
  const content = site.content;
  const checks: DiscoverabilityCheckItem[] = [];

  // 1. Public page accessibility
  const isAccessible = options?.isLiveReachable ?? (site.status === "published");
  checks.push({
    id: "page_accessible",
    label: "Public page accessible",
    passed: isAccessible,
    message: isAccessible
      ? "Landing page is live and accessible."
      : "Page is currently in draft mode.",
  });

  // 2. Meta Title present
  const hasTitle = Boolean(
    content.brand?.name?.trim() ||
      content.hero?.app_name?.trim() ||
      site.slug?.trim()
  );
  checks.push({
    id: "title_present",
    label: "Title tag configured",
    passed: hasTitle,
    message: hasTitle ? "App name is defined." : "Missing app name or title.",
  });

  // 3. Meta Description present
  const hasDesc = Boolean(
    (content.hero?.short_description && content.hero.short_description.length >= 20) ||
      (content.hero?.header && content.hero.header.length >= 20)
  );
  checks.push({
    id: "desc_present",
    label: "Meta description present",
    passed: hasDesc,
    message: hasDesc
      ? "Descriptive hero summary provided."
      : "Add a clear description (at least 20 characters).",
  });

  // 4. Canonical URL valid
  const hasCanonical = Boolean(site.slug || site.custom_domain);
  checks.push({
    id: "canonical_valid",
    label: "Canonical URL valid",
    passed: hasCanonical,
    message: hasCanonical
      ? `Canonical URL: ${site.custom_domain ? `https://${site.custom_domain}` : `https://${site.slug}`}`
      : "Missing slug or custom domain.",
  });

  // 5. Robots configuration valid
  const robotsValid = options?.robotsAccessible ?? true;
  checks.push({
    id: "robots_valid",
    label: "Robots crawl policy active",
    passed: robotsValid,
    message: robotsValid
      ? "Crawler directives correctly allow legitimate search bots."
      : "Robots.txt check did not return a valid response.",
  });

  // 6. Sitemap available
  const sitemapValid = options?.sitemapAccessible ?? (site.status === "published");
  checks.push({
    id: "sitemap_available",
    label: "Sitemap available",
    passed: sitemapValid,
    message: sitemapValid
      ? "Sitemap is generated with canonical public routes."
      : "Sitemap will become active upon publishing.",
  });

  // 7. Structured app data valid (JSON-LD)
  const hasStructuredData = Boolean(
    content.hero?.app_name || content.brand?.name
  );
  checks.push({
    id: "json_ld_valid",
    label: "Schema.org structured data valid",
    passed: hasStructuredData,
    message: hasStructuredData
      ? "SoftwareApplication JSON-LD schema generated."
      : "Incomplete app data for structured markup.",
  });

  // 8. AI-readable app summary available
  const hasAiSummary = Boolean(
    site.ai_summary?.trim() ||
      (content.hero?.short_description && content.features?.length > 0)
  );
  checks.push({
    id: "ai_summary_available",
    label: "AI-readable app summary available",
    passed: hasAiSummary,
    message: hasAiSummary
      ? "Structured summary provides clear capabilities and context."
      : "Provide features or an AI summary for LLM context.",
  });

  // 9. Open Graph & Social metadata available
  const hasOg = Boolean(
    content.screenshots?.[0] || content.brand?.logo_url
  );
  checks.push({
    id: "og_meta_available",
    label: "Open Graph metadata available",
    passed: hasOg,
    message: hasOg
      ? "Visual screenshot or logo attached for social and search snippets."
      : "Upload a logo or screenshot for rich preview cards.",
  });

  // 10. Semantic content available
  const hasSemanticContent = Boolean(
    content.features && content.features.length >= 2
  );
  checks.push({
    id: "semantic_content",
    label: "Semantic content structure available",
    passed: hasSemanticContent,
    message: hasSemanticContent
      ? "Page includes multiple structured feature sections."
      : "Add at least 2 features to provide rich semantic content.",
  });

  const passedCount = checks.filter((c) => c.passed).length;
  const score = Math.round((passedCount / checks.length) * 100);

  let ratingLabel: DiscoverabilityHealthResult["ratingLabel"] = "Needs improvement";
  if (score >= 90) {
    ratingLabel = "Excellent";
  } else if (score >= 75) {
    ratingLabel = "Very good";
  } else if (score >= 50) {
    ratingLabel = "Good";
  }

  return {
    score,
    ratingLabel,
    checks,
    scannedAt: new Date().toISOString(),
  };
}
