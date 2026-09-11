import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { SiteRenderer } from "@/components/renderer/site-renderer";
import type { Site, Plan } from "@/types/database";
import Link from "next/link";
import { Eye, ArrowLeft, Globe, AlertCircle } from "lucide-react";

interface SitePageProps {
  params: Promise<{ slug: string }>;
}

/**
 * Resolve site record by either custom domain or subdomain slug.
 */
async function getSiteBySlugOrDomain(slugParam: string) {
  const supabase = createAdminClient();

  const isCustom = slugParam.startsWith("custom:");
  const lookupValue = isCustom ? slugParam.replace(/^custom:/, "") : slugParam;

  const query = supabase
    .from("sites")
    .select(`
      *,
      profiles (
        id,
        plan_id,
        plans (
          id,
          name,
          has_branding,
          has_custom_domain,
          has_analytics_dashboard
        )
      )
    `);

  if (isCustom) {
    query.eq("custom_domain", lookupValue);
  } else {
    query.eq("slug", lookupValue.toLowerCase());
  }

  const { data, error } = await query.maybeSingle();

  if (error || !data) {
    return null;
  }

  return data as Site & {
    profiles: {
      id: string;
      plan_id: string;
      plans: Plan;
    };
  };
}

/**
 * Dynamic SEO & OpenGraph tags generated from the site's live content
 */
export async function generateMetadata({
  params,
}: SitePageProps): Promise<Metadata> {
  const { slug } = await params;
  const site = await getSiteBySlugOrDomain(slug);

  if (!site) {
    return {
      title: "Landing Page Not Found | ShipSprint",
      description: "The requested landing page does not exist or has been removed.",
    };
  }

  const appName = site.content?.hero?.app_name || site.content?.brand?.name || site.slug;
  const title = `${appName} - Official App`;
  const description =
    site.content?.hero?.short_description ||
    site.content?.hero?.header ||
    `Download ${appName} on iOS and Android.`;
  const logoUrl = site.content?.brand?.logo_url;
  const heroScreenshot = site.content?.screenshots?.[0];
  const ogImage = heroScreenshot || logoUrl;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: "website",
      images: ogImage ? [{ url: ogImage, alt: appName }] : [],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: ogImage ? [ogImage] : [],
    },
    icons: logoUrl ? [{ rel: "icon", url: logoUrl }] : undefined,
  };
}

export default async function PublicSitePage({ params }: SitePageProps) {
  const { slug } = await params;
  const site = await getSiteBySlugOrDomain(slug);

  if (!site) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-[#fafafa] dark:bg-[#09090b] text-zinc-900 dark:text-zinc-100 text-center">
        <div className="w-16 h-16 rounded-2xl bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 flex items-center justify-center text-zinc-400 mb-6 shadow-sm">
          <Globe className="w-8 h-8" />
        </div>
        <h1 className="text-2xl font-bold tracking-tight mb-2">
          Page Not Found
        </h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400 max-w-md mb-8">
          The landing page you are looking for does not exist, or the address was entered incorrectly.
        </p>
        <Link
          href="/"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-zinc-900 dark:bg-zinc-100 hover:bg-zinc-800 dark:hover:bg-white text-white dark:text-zinc-900 text-xs font-semibold shadow-sm transition-all"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to ShipSprint</span>
        </Link>
      </div>
    );
  }

  // Check if site is published or accessed by the logged in author
  const isPublished = site.status === "published";
  let isOwner = false;

  if (!isPublished) {
    const authSupabase = await createClient();
    const {
      data: { user },
    } = await authSupabase.auth.getUser();

    isOwner = user?.id === site.user_id;

    if (!isOwner) {
      return (
        <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-[#fafafa] dark:bg-[#09090b] text-zinc-900 dark:text-zinc-100 text-center">
          <div className="w-16 h-16 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 flex items-center justify-center text-amber-600 dark:text-amber-400 mb-6 shadow-sm">
            <AlertCircle className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight mb-2">
            Page Not Published Yet
          </h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 max-w-md mb-8">
            This landing page is currently in draft mode and has not been launched by its creator.
          </p>
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-zinc-900 dark:bg-zinc-100 hover:bg-zinc-800 dark:hover:bg-white text-white dark:text-zinc-900 text-xs font-semibold shadow-sm transition-all"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Go to ShipSprint</span>
          </Link>
        </div>
      );
    }
  }

  const ownerPlan: Plan = site.profiles?.plans || {
    id: "free",
    name: "Free",
    price_cents: 0,
    site_limit: 1,
    has_branding: true,
    has_custom_domain: false,
    has_analytics_dashboard: false,
  };

  return (
    <div className="relative min-h-screen">
      {/* Draft Mode Banner for Site Owner */}
      {!isPublished && isOwner && (
        <div className="sticky top-0 z-50 bg-amber-500 text-zinc-950 px-4 py-2.5 shadow-md flex items-center justify-between text-xs font-medium">
          <div className="flex items-center gap-2 max-w-7xl mx-auto w-full justify-between">
            <div className="flex items-center gap-2">
              <Eye className="w-4 h-4 shrink-0" />
              <span>
                <strong>Draft Preview:</strong> This page is only visible to you. Public visitors cannot see it until you publish.
              </span>
            </div>
            <Link
              href={`/dashboard/editor/${site.id}`}
              className="px-3 py-1 bg-zinc-950 text-white rounded-lg text-xs font-semibold hover:bg-zinc-800 transition-colors shrink-0"
            >
              Open in Editor
            </Link>
          </div>
        </div>
      )}

      {/* Main Landing Page Content */}
      <SiteRenderer
        content={site.content}
        plan={ownerPlan}
        isPreview={false}
        siteId={site.id}
      />
    </div>
  );
}
