/* Hallmark · pre-emit critique: P5 H5 E5 S5 R5 V5 */
"use client";

import { useEffect, useRef } from "react";
import type { SiteContent, SitePage } from "@/types/database";
import { trackEvent } from "@/lib/track-client";
import { safeHref } from "@/lib/validation";
import Link from "next/link";
import { MarkdownViewer } from "@/components/renderer/markdown-viewer";
import { MadeWithShipSprintBadge } from "@/components/ui/made-with-shipsprint-badge";
import {
  ArrowLeft,
  Mail,
  ArrowUpRight,
  Calendar,
  Clock,
  User,
  Sparkles,
  Download,
} from "lucide-react";

interface PageRendererProps {
  content: SiteContent;
  page: SitePage;
  homeHref?: string;
  siteId?: string;
  /** The owner's plan — controls the "Made with ShipSprint" badge (H3). */
  plan?: import("@/types/database").Plan | null;
}

export function PageRenderer({
  content,
  page,
  homeHref = "/",
  siteId,
  plan,
}: PageRendererProps) {
  const brand = content?.brand || { name: "App" };
  const appName = brand.name || content?.hero?.app_name || "App";
  const contactEmail = content?.footer?.contact_email || "support@example.com";
  const isBlog = page.page_type === "blog";

  // Calculate reading time
  const wordCount = (page.content_markdown || "")
    .trim()
    .split(/\s+/).length;
  const readingTime =
    page.reading_time_minutes || Math.max(1, Math.ceil(wordCount / 200));

  // Date formatting
  const rawDate = page.published_date || page.updated_at || "";
  const displayDate = rawDate
    ? new Date(rawDate).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : "Recently published";

  const storeLinks = content?.store_links || {};
  const hasAppStore = Boolean(storeLinks.app_store_url);
  const hasPlayStore = Boolean(storeLinks.play_store_url);

  const pageViewFired = useRef(false);

  useEffect(() => {
    if (!siteId || pageViewFired.current) return;
    pageViewFired.current = true;

    trackEvent({
      siteId,
      eventType: "page_view",
      meta: {
        referrer: typeof document !== "undefined" ? document.referrer : "",
        path: typeof window !== "undefined" ? window.location.pathname : `/${page.slug}`,
      },
    });
  }, [siteId, page.slug]);

  const handleCtaClick = (buttonType: string, targetUrl?: string) => {
    if (!siteId) return;
    let targetHost = "";
    if (targetUrl) {
      try {
        targetHost = new URL(targetUrl).hostname.toLowerCase();
      } catch {
        targetHost = "";
      }
    }
    trackEvent({
      siteId,
      eventType: "button_click",
      meta: {
        button_type: buttonType,
        target_host: targetHost,
        target_url: targetUrl || "",
        path: typeof window !== "undefined" ? window.location.pathname : `/${page.slug}`,
      },
    });
  };

  return (
    <div className="min-h-screen bg-white font-sans text-zinc-950 antialiased selection:bg-zinc-950 selection:text-white dark:bg-zinc-950 dark:text-zinc-50 dark:selection:bg-zinc-50 dark:selection:text-zinc-950 flex flex-col justify-between">
      {/* Navigation Header */}
      <header className="sticky top-0 z-30 border-b border-zinc-200 bg-white/90 backdrop-blur-md dark:border-zinc-800 dark:bg-zinc-950/90">
        <div className="mx-auto flex h-16 w-full max-w-4xl items-center justify-between px-4 sm:px-6">
          <Link
            href={homeHref}
            className="flex items-center gap-2 text-xs font-semibold tracking-tight text-zinc-900 transition-opacity hover:opacity-80 dark:text-zinc-100"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Back to {appName}</span>
          </Link>

          <div className="flex items-center gap-2">
            <span className="rounded-full bg-zinc-100 px-2.5 py-1 text-[11px] font-medium text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
              {isBlog ? "Blog & Product Updates" : "Official Legal & Support"}
            </span>
          </div>
        </div>
      </header>

      {/* Main Page Article Container */}
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-12 sm:px-6 sm:py-16">
        {/* Blog Post Header */}
        {isBlog && (
          <header className="mb-10">
            <div className="mb-3 flex items-center gap-2">
              <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2.5 py-0.5 text-[11px] font-semibold text-blue-700 dark:bg-blue-950/60 dark:text-blue-300">
                <Sparkles className="h-3 w-3" />
                Product Article
              </span>
            </div>

            <h1 className="font-display text-3xl font-bold tracking-tight text-zinc-950 sm:text-4xl dark:text-zinc-50">
              {page.title}
            </h1>

            {page.excerpt && (
              <p className="mt-3 text-base text-zinc-600 dark:text-zinc-300 leading-relaxed">
                {page.excerpt}
              </p>
            )}

            <div className="mt-5 flex flex-wrap items-center gap-4 border-b border-zinc-100 pb-6 text-xs text-zinc-500 dark:border-zinc-800 dark:text-zinc-400">
              <div className="flex items-center gap-1.5 font-medium text-zinc-900 dark:text-zinc-100">
                <User className="h-3.5 w-3.5 text-zinc-400" />
                <span>{page.author || `${appName} Team`}</span>
              </div>
              <span>•</span>
              <div className="flex items-center gap-1">
                <Calendar className="h-3.5 w-3.5 text-zinc-400" />
                <span>{displayDate}</span>
              </div>
              <span>•</span>
              <div className="flex items-center gap-1">
                <Clock className="h-3.5 w-3.5 text-zinc-400" />
                <span>{readingTime} min read</span>
              </div>
            </div>

            {page.cover_image_url && (
              <div className="mt-6 overflow-hidden rounded-2xl border border-zinc-200 shadow-sm dark:border-zinc-800">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={page.cover_image_url}
                  alt={page.title}
                  className="w-full max-h-[420px] object-cover"
                />
              </div>
            )}
          </header>
        )}

        <article className="prose prose-zinc dark:prose-invert max-w-none">
          {/* Custom Markdown Parser / Renderer */}
          <MarkdownViewer markdown={page.content_markdown || ""} />
        </article>

        {/* Marketing App Install CTA for Blog Posts */}
        {isBlog && (hasAppStore || hasPlayStore || storeLinks.testflight_url) && (
          <div className="mt-14 rounded-2xl border border-zinc-200 bg-zinc-950 p-6 text-white shadow-md dark:border-zinc-800 dark:bg-zinc-900 flex flex-col sm:flex-row sm:items-center justify-between gap-5">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-blue-400">
                Experience {appName}
              </p>
              <h3 className="mt-1 text-base font-semibold text-white">
                Download {appName} on iOS and Android
              </h3>
              <p className="mt-1 text-xs text-zinc-400 max-w-md">
                Experience the features discussed in this article directly on your mobile device.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {storeLinks.app_store_url && (
                <a
                  href={safeHref(storeLinks.app_store_url)}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => handleCtaClick("app_store", storeLinks.app_store_url)}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-white px-3.5 py-2 text-xs font-semibold text-zinc-950 shadow-xs hover:bg-zinc-100 transition-colors"
                >
                  <Download className="h-3.5 w-3.5" />
                  <span>App Store</span>
                </a>
              )}
              {storeLinks.play_store_url && (
                <a
                  href={safeHref(storeLinks.play_store_url)}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => handleCtaClick("play_store", storeLinks.play_store_url)}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-white px-3.5 py-2 text-xs font-semibold text-zinc-950 shadow-xs hover:bg-zinc-100 transition-colors"
                >
                  <Download className="h-3.5 w-3.5" />
                  <span>Google Play</span>
                </a>
              )}
            </div>
          </div>
        )}

        {/* Quick Contact Footer Strip */}
        <div className="mt-12 rounded-2xl border border-zinc-200 bg-zinc-50 p-6 dark:border-zinc-800 dark:bg-zinc-900/60 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-zinc-950 text-white dark:bg-zinc-100 dark:text-zinc-950">
              <Mail className="h-5 w-5" />
            </div>
            <div>
              <div className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">
                Have questions or need assistance?
              </div>
              <div className="text-[11px] text-zinc-500">
                Direct developer contact for {appName}
              </div>
            </div>
          </div>
          <a
            href={`mailto:${contactEmail}`}
            className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-zinc-950 px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-950"
          >
            <span>Contact {contactEmail}</span>
            <ArrowUpRight className="h-3.5 w-3.5" />
          </a>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-zinc-200 bg-white py-8 text-center text-xs text-zinc-500 dark:border-zinc-800 dark:bg-zinc-950">
        <div className="mx-auto max-w-4xl px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p>© {new Date().getFullYear()} {appName}. All rights reserved.</p>
          <div className="flex flex-wrap items-center gap-4 text-xs">
            <Link href={homeHref} className="hover:underline">Home</Link>
            {((content?.pages || []).filter((p) => p.is_published !== false && p.slug !== "home").length > 0
              ? (content?.pages || []).filter((p) => p.is_published !== false && p.slug !== "home")
              : [
                  { id: "fallback-privacy", slug: "privacy", title: "Privacy" },
                  { id: "fallback-terms", slug: "terms", title: "Terms" },
                  { id: "fallback-support", slug: "support", title: "Support" },
                ]
            ).map((p) => (
              <Link
                key={p.id || p.slug}
                href={`${homeHref === "/" ? "" : homeHref}/${p.slug}`}
                className="hover:underline"
              >
                {p.title}
              </Link>
            ))}
          </div>
        </div>
      </footer>

      {/* Made with ShipSprint badge — Free plan only (H3). */}
      {plan?.has_branding !== false && (
        <MadeWithShipSprintBadge isPreview={false} />
      )}
    </div>
  );
}
