/* Hallmark · pre-emit critique: P5 H5 E4 S5 R5 V5 */
/* Renderer: Narrative Workflow (stages 1.0/2.0/3.0, thick numbered rules) · Nav N9 edge-aligned minimal · Footer Ft1 mast-headed · knobs differ from marketing Split Studio */
"use client";

import { useEffect } from "react";
import type { SiteContent, Plan } from "@/types/database";
import { safeHref } from "@/lib/validation";
import { appOrigin } from "@/lib/redirect";
import { Mail } from "lucide-react";
import { getFeatureIcon } from "@/lib/icons";

interface SiteRendererProps {
  content: SiteContent;
  plan?: Plan | null;
  isPreview?: boolean;
  siteId?: string;
}

const STAGE_LABELS = ["1.0", "2.0", "3.0", "4.0", "5.0", "6.0"];

export function SiteRenderer({
  content,
  plan,
  isPreview = false,
  siteId,
}: SiteRendererProps) {
  const {
    brand = { name: "App Name", logo_url: "" },
    hero = {
      app_name: "App Name",
      badge_text: "Now Available on iOS & Android",
      header: "The simplest way to achieve your daily goals.",
      short_description:
        "Engineered with craft and attention to detail. Designed to elevate your daily routine.",
    },
    features = [],
    store_links = {
      app_store_url: "",
      play_store_url: "",
    },
    screenshots = [],
    footer = {
      brand_name: "App Name",
      legal_links: [],
      contact_email: "",
    },
  } = content || {};

  const primaryCtaHref = safeHref(
    store_links.app_store_url || store_links.play_store_url
  );
  const hasStoreLinks = Boolean(
    store_links.app_store_url || store_links.play_store_url
  );

  const resolveAppHref = (url: string) =>
    url.startsWith("/") ? `${appOrigin()}${url}` : safeHref(url);

  useEffect(() => {
    if (isPreview || !siteId) return;
    try {
      fetch("/api/track", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          site_id: siteId,
          event_type: "page_view",
          meta: {
            referrer: document.referrer || "direct",
            path: window.location.pathname,
            screen: `${window.innerWidth}x${window.innerHeight}`,
          },
        }),
        keepalive: true,
      }).catch(() => {});
    } catch {}
  }, [isPreview, siteId]);

  const handleCtaClick = (buttonType: string, targetUrl?: string) => {
    if (isPreview || !siteId) return;
    try {
      fetch("/api/track", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          site_id: siteId,
          event_type: "button_click",
          meta: {
            button_type: buttonType,
            target_url: targetUrl || "",
          },
        }),
        keepalive: true,
      }).catch(() => {});
    } catch {}
  };

  const showWatermark = plan?.has_branding ?? true;
  const appName = brand.name || hero.app_name || "App Name";

  return (
    <div className="min-h-screen bg-white font-sans text-zinc-950 antialiased selection:bg-zinc-950 selection:text-white dark:bg-zinc-950 dark:text-zinc-50 dark:selection:bg-zinc-50 dark:selection:text-zinc-950">
      {/* N9 edge-aligned minimal — wordmark left, single CTA right, silence between */}
      <header className="sticky top-0 z-[300] border-b border-zinc-200 bg-white/90 backdrop-blur-md dark:border-zinc-800 dark:bg-zinc-950/90">
        <div className="mx-auto flex h-16 w-full max-w-5xl items-center justify-between px-4 leading-none sm:px-6 lg:px-8">
          <p className="flex min-w-0 items-center gap-2.5">
            {brand.logo_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={brand.logo_url}
                alt=""
                aria-hidden="true"
                className="h-7 w-7 rounded-lg border border-zinc-200 object-cover dark:border-zinc-800"
              />
            ) : (
              <span aria-hidden="true" className="flex h-7 w-7 items-center justify-center rounded-lg bg-zinc-950 text-sm font-semibold text-white dark:bg-zinc-50 dark:text-zinc-950">
                {appName.charAt(0).toUpperCase()}
              </span>
            )}
            <span className="truncate text-[15px] font-semibold tracking-tight">{appName}</span>
          </p>
          {hasStoreLinks && (
            <a
              href={primaryCtaHref}
              target={isPreview ? "_self" : "_blank"}
              rel="noopener noreferrer"
              onClick={() =>
                handleCtaClick(
                  "nav_download",
                  store_links.app_store_url || store_links.play_store_url
                )
              }
              className="inline-flex shrink-0 items-center whitespace-nowrap rounded-full bg-zinc-950 px-4 py-2 text-[13px] font-medium text-white transition-colors hover:bg-zinc-800 active:bg-zinc-800 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-55 dark:bg-zinc-50 dark:text-zinc-950 dark:hover:bg-white"
            >
              Get the app
            </a>
          )}
        </div>
      </header>

      {/* Stage 0 — the promise. Left-aligned, never centred. */}
      <section className="mx-auto w-full max-w-5xl px-4 pt-14 pb-16 sm:px-6 md:pt-20 md:pb-20 lg:px-8">
        {hero.badge_text && (
          <p className="inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-white px-3 py-1 text-xs font-medium whitespace-nowrap text-zinc-600 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300">
            <span className="h-1.5 w-1.5 rounded-full bg-blue-600" aria-hidden="true" />
            <span>{hero.badge_text}</span>
          </p>
        )}
        <h1 className="hero__display mt-5 max-w-2xl text-[clamp(2.25rem,4.5vw+0.5rem,3.75rem)] leading-[1.04] font-semibold tracking-[-0.025em] text-balance">
          {hero.header}
        </h1>
        {hero.short_description && (
          <p className="mt-5 max-w-[60ch] text-base leading-relaxed text-zinc-600 sm:text-lg dark:text-zinc-300">
            {hero.short_description}
          </p>
        )}
        <div className="mt-8 flex flex-wrap items-center gap-3 leading-none">
          {store_links.app_store_url && (
            <a
              href={safeHref(store_links.app_store_url)}
              target={isPreview ? "_self" : "_blank"}
              rel="noopener noreferrer"
              onClick={() => handleCtaClick("app_store_hero", store_links.app_store_url)}
              className="inline-flex items-center justify-center whitespace-nowrap rounded-full bg-zinc-950 px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-zinc-800 active:bg-zinc-800 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-55 dark:bg-zinc-50 dark:text-zinc-950 dark:hover:bg-white"
            >
              Download on App Store
            </a>
          )}
          {store_links.play_store_url && (
            <a
              href={safeHref(store_links.play_store_url)}
              target={isPreview ? "_self" : "_blank"}
              rel="noopener noreferrer"
              onClick={() => handleCtaClick("play_store_hero", store_links.play_store_url)}
              className="inline-flex items-center justify-center whitespace-nowrap rounded-full border border-zinc-300 bg-white px-6 py-3 text-sm font-medium text-zinc-950 transition-colors hover:bg-zinc-50 active:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50 dark:hover:bg-zinc-900"
            >
              Get it on Google Play
            </a>
          )}
          {!hasStoreLinks && (
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              Store links have not been added yet.
            </p>
          )}
        </div>
      </section>

      {/* Stages 1.0+ — one rule per stage, alternating proof side */}
      {features.length > 0 && (
        <section aria-label="How it works" className="mx-auto w-full max-w-5xl px-4 sm:px-6 lg:px-8">
          <div className="border-t-2 border-zinc-950 pt-4 dark:border-zinc-50">
            <p className="text-xs font-semibold tracking-widest text-zinc-600 uppercase dark:text-zinc-400">
              How it works
            </p>
          </div>
          <ol className="mt-2">
            {features.map((feature, idx) => {
              const IconComponent = getFeatureIcon(feature.icon);
              const stage = STAGE_LABELS[idx] ?? `${idx + 1}.0`;
              const flip = idx % 2 === 1;
              return (
                <li
                  key={feature.id || idx}
                  className="grid grid-cols-1 gap-6 border-t border-zinc-200 py-10 md:grid-cols-2 md:gap-12 dark:border-zinc-800"
                >
                  <div className={flip ? "md:order-2" : ""}>
                    <p className="font-mono text-xs font-medium text-blue-600 dark:text-blue-400">
                      {stage}
                    </p>
                    <h2 className="section__title mt-2 max-w-md text-2xl font-semibold tracking-tight text-balance">
                      {feature.title}
                    </h2>
                    <p className="mt-3 max-w-[60ch] text-sm leading-relaxed text-zinc-600 dark:text-zinc-300">
                      {feature.description}
                    </p>
                  </div>
                  <div
                    aria-hidden="true"
                    className={`flex items-start gap-3 rounded-xl border border-zinc-200 bg-zinc-50 p-5 dark:border-zinc-800 dark:bg-zinc-900/40 ${flip ? "md:order-1" : ""}`}
                  >
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-zinc-200 bg-white text-blue-600 dark:border-zinc-700 dark:bg-zinc-950 dark:text-blue-400">
                      <IconComponent className="h-4 w-4" aria-hidden="true" />
                    </span>
                    <span className="text-sm leading-relaxed text-zinc-600 dark:text-zinc-300">
                      Stage {stage} — {feature.title}. Small, concrete, done in
                      the app itself.
                    </span>
                  </div>
                </li>
              );
            })}
          </ol>
        </section>
      )}

      {/* Screenshots — figures with hairline frames, no phone chrome */}
      {screenshots.length > 0 && (
        <section aria-label="Screenshots" className="mx-auto w-full max-w-5xl px-4 py-14 sm:px-6 lg:px-8">
          <div className="border-t-2 border-zinc-950 pt-4 dark:border-zinc-50">
            <p className="text-xs font-semibold tracking-widest text-zinc-600 uppercase dark:text-zinc-400">
              Inside the app
            </p>
          </div>
          <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2">
            {screenshots.slice(0, 4).map((imgUrl, index) => (
              <figure
                key={index}
                className="min-w-0 overflow-hidden rounded-xl border border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900/40"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={imgUrl}
                  alt={`${appName} screenshot ${index + 1}`}
                  loading={index === 0 ? undefined : "lazy"}
                  className="aspect-[4/3] w-full object-cover"
                />
              </figure>
            ))}
          </div>
        </section>
      )}

      {/* Closing — single CTA, then Ft1 mast-headed footer */}
      <section className="mx-auto w-full max-w-5xl px-4 pb-16 sm:px-6 lg:px-8">
        <div className="rounded-2xl bg-zinc-950 p-8 text-white sm:p-12 dark:bg-zinc-900">
          <h2 className="max-w-xl text-2xl font-semibold tracking-tight text-balance sm:text-3xl">
            Start at stage 1.0 — download {appName} today.
          </h2>
          <div className="mt-6 flex flex-wrap items-center gap-3 leading-none">
            {store_links.app_store_url && (
              <a
                href={safeHref(store_links.app_store_url)}
                target={isPreview ? "_self" : "_blank"}
                rel="noopener noreferrer"
                onClick={() => handleCtaClick("app_store_footer", store_links.app_store_url)}
                className="inline-flex items-center justify-center whitespace-nowrap rounded-full bg-white px-5 py-2.5 text-[13px] font-semibold text-zinc-950 transition-colors hover:bg-zinc-100 active:bg-zinc-200"
              >
                Download for iOS
              </a>
            )}
            {store_links.play_store_url && (
              <a
                href={safeHref(store_links.play_store_url)}
                target={isPreview ? "_self" : "_blank"}
                rel="noopener noreferrer"
                onClick={() => handleCtaClick("play_store_footer", store_links.play_store_url)}
                className="inline-flex items-center justify-center whitespace-nowrap rounded-full border border-zinc-700 px-5 py-2.5 text-[13px] font-semibold text-white transition-colors hover:bg-zinc-800 active:bg-zinc-800"
              >
                Download for Android
              </a>
            )}
          </div>
        </div>
      </section>

      {/* Ft1 mast-headed */}
      <footer className="border-t border-zinc-200 dark:border-zinc-800">
        <div className="mx-auto w-full max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <p className="text-lg font-semibold tracking-tight">{footer.brand_name || appName}</p>
              <p className="mt-1 max-w-[52ch] text-[13px] text-zinc-600 dark:text-zinc-400">
                A launch page built with ShipSprint.
              </p>
            </div>
            <nav aria-label="Legal" className="flex flex-wrap items-center gap-5 text-[13px] leading-none text-zinc-600 dark:text-zinc-400">
              {footer.legal_links?.map((link, i) => (
                <a
                  key={i}
                  href={resolveAppHref(link.url)}
                  className="whitespace-nowrap transition-colors hover:text-zinc-950 active:text-zinc-950 dark:hover:text-zinc-100"
                >
                  {link.label}
                </a>
              ))}
              {footer.contact_email && (
                <a
                  href={`mailto:${footer.contact_email}`}
                  className="inline-flex items-center gap-1.5 whitespace-nowrap transition-colors hover:text-zinc-950 active:text-zinc-950 dark:hover:text-zinc-100"
                >
                  <Mail className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>Contact</span>
                </a>
              )}
            </nav>
          </div>
          <div className="mt-8 flex flex-col gap-3 border-t border-zinc-200 pt-6 text-xs text-zinc-600 sm:flex-row sm:items-center sm:justify-between dark:border-zinc-800 dark:text-zinc-500">
            <p>© {new Date().getFullYear()} {footer.brand_name || appName}. All rights reserved.</p>
            {showWatermark && (
              <a
                href="https://shipsprint.site"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex w-fit items-center whitespace-nowrap rounded-full border border-zinc-200 px-3 py-1 text-[11px] font-medium transition-colors hover:text-zinc-950 dark:border-zinc-800 dark:hover:text-zinc-100"
              >
                Powered by ShipSprint
              </a>
            )}
          </div>
        </div>
      </footer>
    </div>
  );
}
