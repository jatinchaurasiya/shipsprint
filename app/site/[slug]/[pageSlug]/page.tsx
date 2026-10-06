/* Hallmark · pre-emit critique: P5 H5 E5 S5 R5 V5 */
import { notFound } from "next/navigation";
import { cache } from "react";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { resolvePublicSite } from "@/lib/site-lookup";
import { PageRenderer } from "@/components/renderer/page-renderer";
import type { Site, SitePage } from "@/types/database";
import {
  generatePrivacyPolicy,
  generateTermsOfService,
  generateSupportPage,
} from "@/lib/legal-pages";

interface SubpageProps {
  params: Promise<{ slug: string; pageSlug: string }>;
}

const getSiteBySlugOrDomain = cache(async (slugParam: string) => {
  return resolvePublicSite(slugParam, createAdminClient());
});

function resolvePage(site: Site, pageSlug: string): SitePage | null {
  const pages = site.content?.pages || [];
  const found = pages.find((p) => p.slug === pageSlug);
  if (found) return found;

  const appName = site.content?.brand?.name || site.content?.hero?.app_name || site.slug;
  const email = site.content?.footer?.contact_email || "support@example.com";

  // Automatic legal fallback compliance for standard App Store pages
  if (pageSlug === "privacy") {
    return {
      id: "fallback-privacy",
      slug: "privacy",
      title: "Privacy Policy",
      page_type: "privacy",
      is_system: true,
      content_markdown: generatePrivacyPolicy(appName, email),
      meta_title: `Privacy Policy - ${appName}`,
    };
  }
  if (pageSlug === "terms") {
    return {
      id: "fallback-terms",
      slug: "terms",
      title: "Terms of Service",
      page_type: "terms",
      is_system: true,
      content_markdown: generateTermsOfService(appName, email),
      meta_title: `Terms of Service - ${appName}`,
    };
  }
  if (pageSlug === "support") {
    return {
      id: "fallback-support",
      slug: "support",
      title: "Support & Help Center",
      page_type: "support",
      is_system: true,
      content_markdown: generateSupportPage(appName, email),
      meta_title: `Support - ${appName}`,
    };
  }

  return null;
}

export async function generateMetadata({
  params,
}: SubpageProps): Promise<Metadata> {
  const { slug, pageSlug } = await params;
  const resolved = await getSiteBySlugOrDomain(slug);
  if (!resolved) {
    return { title: "Page Not Found | ShipSprint", robots: { index: false } };
  }
  const page = resolvePage(resolved.site, pageSlug);
  if (!page) {
    return { title: "Page Not Found | ShipSprint", robots: { index: false } };
  }
  const appName = resolved.site.content?.brand?.name || resolved.site.slug;

  return {
    title: page.meta_title || `${page.title} - ${appName}`,
    description:
      page.meta_description ||
      `Official ${page.title} page for the ${appName} mobile application.`,
    robots: {
      index: resolved.site.status === "published",
      follow: resolved.site.status === "published",
    },
  };
}

export default async function PublicSubpage({ params }: SubpageProps) {
  const { slug, pageSlug } = await params;
  const resolved = await getSiteBySlugOrDomain(slug);

  if (!resolved) {
    notFound();
  }

  const site = resolved.site;

  // Security boundary: drafts require owner auth
  if (site.status !== "published") {
    const authSupabase = await createClient();
    const {
      data: { user },
    } = await authSupabase.auth.getUser();

    if (user?.id !== site.user_id) {
      notFound();
    }
  }

  const page = resolvePage(site, pageSlug);
  if (!page) {
    notFound();
  }

  const isCustomDomain = slug.startsWith("domain:");
  const homeHref = isCustomDomain ? "/" : `/site/${site.slug}`;

  return (
    <PageRenderer
      content={site.content}
      page={page}
      homeHref={homeHref}
    />
  );
}
