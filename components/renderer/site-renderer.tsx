"use client";

import React, { useEffect } from "react";
import type { SiteContent, Plan } from "@/types/database";
import {
  Zap,
  Shield,
  Sparkles,
  Heart,
  Star,
  Flame,
  CheckCircle2,
  Lock,
  Layers,
  Smile,
  Mail,
  ExternalLink,
} from "lucide-react";

interface SiteRendererProps {
  content: SiteContent;
  plan?: Plan | null;
  isPreview?: boolean;
  siteId?: string;
}

// Icon mapper for user-selected feature icons
const iconMap: Record<string, React.ElementType> = {
  Zap,
  Shield,
  Sparkles,
  Heart,
  Star,
  Flame,
  CheckCircle2,
  Lock,
  Layers,
  Smile,
};

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
      app_store_url: "https://apps.apple.com",
      play_store_url: "https://play.google.com",
    },
    screenshots = [],
    footer = {
      brand_name: "App Name",
      legal_links: [],
      contact_email: "",
    },
  } = content || {};

  // Tracking beacon (active only on published public sites, never in preview)
  useEffect(() => {
    if (isPreview || !siteId) return;

    // Send page_view event
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

  return (
    <div className="min-h-screen bg-[#fafafa] dark:bg-[#08080a] text-zinc-900 dark:text-zinc-100 font-sans selection:bg-zinc-900 selection:text-white dark:selection:bg-zinc-100 dark:selection:text-zinc-900 overflow-x-hidden antialiased">
      {/* 1. Header Navigation */}
      <header className="sticky top-0 z-40 w-full border-b border-zinc-200/60 dark:border-zinc-800/60 bg-white/70 dark:bg-zinc-950/70 backdrop-blur-xl transition-all">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          {/* Brand Logo & Name */}
          <div className="flex items-center gap-3">
            {brand.logo_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={brand.logo_url}
                alt={brand.name || "App Icon"}
                className="w-8 h-8 rounded-xl object-cover shadow-sm border border-zinc-200/80 dark:border-zinc-800"
              />
            ) : (
              <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 text-white font-bold text-sm flex items-center justify-center shadow-sm">
                {(brand.name || "A").charAt(0).toUpperCase()}
              </div>
            )}
            <span className="font-semibold text-base tracking-tight text-zinc-900 dark:text-zinc-50">
              {brand.name || hero.app_name}
            </span>
          </div>

          {/* Nav Links */}
          <div className="flex items-center gap-4 sm:gap-6">
            {features.length > 0 && (
              <a
                href="#features"
                className="text-xs font-medium text-zinc-600 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-zinc-100 transition-colors hidden sm:inline"
              >
                Features
              </a>
            )}
            {screenshots.length > 0 && (
              <a
                href="#screenshots"
                className="text-xs font-medium text-zinc-600 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-zinc-100 transition-colors hidden sm:inline"
              >
                Preview
              </a>
            )}

            {/* Quick Download Button */}
            {(store_links.app_store_url || store_links.play_store_url) && (
              <a
                href={store_links.app_store_url || store_links.play_store_url}
                target={isPreview ? "_self" : "_blank"}
                rel="noopener noreferrer"
                onClick={() =>
                  handleCtaClick(
                    "nav_download",
                    store_links.app_store_url || store_links.play_store_url
                  )
                }
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-zinc-950 dark:bg-zinc-100 text-white dark:text-zinc-950 text-xs font-medium hover:bg-zinc-800 dark:hover:bg-white shadow-sm transition-all active:scale-[0.98]"
              >
                <span>Get App</span>
              </a>
            )}
          </div>
        </div>
      </header>

      {/* 2. Hero Section */}
      <section className="relative pt-16 pb-20 md:pt-24 md:pb-28 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto text-center">
        {/* Soft Background Ambient Lighting */}
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[550px] h-[350px] bg-gradient-to-tr from-blue-500/10 via-indigo-500/10 to-purple-500/10 blur-3xl pointer-events-none -z-10" />

        {/* Badge */}
        {hero.badge_text && (
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/80 dark:bg-zinc-900/80 border border-zinc-200/80 dark:border-zinc-800/80 shadow-sm text-xs font-medium text-zinc-800 dark:text-zinc-200 mb-6 backdrop-blur-md animate-in fade-in duration-300">
            <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
            <span>{hero.badge_text}</span>
          </div>
        )}

        {/* Header Title */}
        <h1 className="text-3xl sm:text-5xl md:text-6xl font-bold tracking-tight text-zinc-950 dark:text-zinc-50 max-w-3xl mx-auto leading-[1.12]">
          {hero.header}
        </h1>

        {/* Subtitle */}
        {hero.short_description && (
          <p className="mt-5 text-sm sm:text-base md:text-lg text-zinc-600 dark:text-zinc-400 max-w-xl mx-auto leading-relaxed">
            {hero.short_description}
          </p>
        )}

        {/* Store CTA Buttons */}
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3.5">
          {store_links.app_store_url && (
            <a
              href={store_links.app_store_url}
              target={isPreview ? "_self" : "_blank"}
              rel="noopener noreferrer"
              onClick={() =>
                handleCtaClick("app_store_hero", store_links.app_store_url)
              }
              className="inline-flex items-center gap-3 px-5 py-2.5 rounded-2xl bg-zinc-950 dark:bg-zinc-50 text-white dark:text-zinc-950 shadow-md hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-all active:scale-[0.98]"
            >
              <svg className="w-5 h-5 fill-current shrink-0" viewBox="0 0 24 24">
                <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M15.97 6.38c.62-.75 1.04-1.8 0.93-2.85-.9.04-1.99.6-2.64 1.35-.58.66-1.09 1.73-.95 2.76 1.01.08 2.04-.51 2.66-1.26z" />
              </svg>
              <div className="text-left leading-tight">
                <div className="text-[10px] uppercase font-medium tracking-wider opacity-80">
                  Download on the
                </div>
                <div className="text-xs font-semibold">App Store</div>
              </div>
            </a>
          )}

          {store_links.play_store_url && (
            <a
              href={store_links.play_store_url}
              target={isPreview ? "_self" : "_blank"}
              rel="noopener noreferrer"
              onClick={() =>
                handleCtaClick("play_store_hero", store_links.play_store_url)
              }
              className="inline-flex items-center gap-3 px-5 py-2.5 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white/90 dark:bg-zinc-900/90 text-zinc-900 dark:text-zinc-100 shadow-sm hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-all active:scale-[0.98]"
            >
              <svg className="w-5 h-5 fill-current shrink-0" viewBox="0 0 24 24">
                <path d="M3.609 1.814L13.792 12 3.61 22.186c-.198-.198-.31-.47-.31-.762V2.576c0-.292.112-.564.31-.762zm11.239 11.242l2.368-2.369-12.01-6.934 9.642 9.303zm0 1.888L5.207 24.247l12.01-6.934-2.369-2.369zm1.332-1.332l3.415 1.972c.983.568.983 1.496 0 2.064l-3.415 1.972-2.022-2.022 2.022-1.986z" />
              </svg>
              <div className="text-left leading-tight">
                <div className="text-[10px] uppercase font-medium tracking-wider opacity-70">
                  GET IT ON
                </div>
                <div className="text-xs font-semibold">Google Play</div>
              </div>
            </a>
          )}
        </div>

        {/* Primary Hero Showcase Mockup */}
        <div className="mt-14 max-w-sm mx-auto relative group">
          <div className="relative rounded-[40px] border-[6px] border-zinc-800/90 dark:border-zinc-700/80 bg-zinc-900 p-2 shadow-[0_20px_50px_rgba(0,0,0,0.15)] dark:shadow-[0_20px_50px_rgba(0,0,0,0.5)]">
            {/* Speaker & Dynamic Island slot */}
            <div className="w-24 h-4 bg-zinc-800 rounded-full mx-auto mb-2" />

            {/* Screen Content */}
            <div className="rounded-[32px] overflow-hidden bg-zinc-950 aspect-[9/18] relative flex flex-col justify-center items-center text-center p-6 border border-zinc-800/40">
              {screenshots.length > 0 ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={screenshots[0]}
                  alt="App Screenshot"
                  className="w-full h-full object-cover rounded-2xl"
                />
              ) : (
                <div className="space-y-4">
                  {brand.logo_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={brand.logo_url}
                      alt={brand.name}
                      className="w-16 h-16 rounded-2xl mx-auto object-cover shadow-lg border border-zinc-800"
                    />
                  ) : (
                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-500 text-white font-bold text-xl flex items-center justify-center mx-auto shadow-lg">
                      {(hero.app_name || "A").charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div className="text-base font-semibold text-white">
                    {hero.app_name}
                  </div>
                  <div className="text-xs text-zinc-400 max-w-[200px] leading-relaxed">
                    {hero.short_description || "Clean, Apple-inspired mobile design."}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* 3. Features Section */}
      {features.length > 0 && (
        <section
          id="features"
          className="py-20 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto border-t border-zinc-200/70 dark:border-zinc-800/70"
        >
          <div className="text-center max-w-xl mx-auto mb-14">
            <span className="text-xs font-semibold uppercase tracking-widest text-blue-600 dark:text-blue-400 mb-2 block">
              Features
            </span>
            <h2 className="text-2xl sm:text-4xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
              Designed with care & precision
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {features.map((feature, idx) => {
              const IconComponent = iconMap[feature.icon] || Sparkles;
              return (
                <div
                  key={feature.id || idx}
                  className="p-6 rounded-2xl bg-white dark:bg-zinc-950 border border-zinc-200/80 dark:border-zinc-800/80 shadow-sm hover:shadow-md transition-all"
                >
                  <div className="w-10 h-10 rounded-xl bg-zinc-100 dark:bg-zinc-900 border border-zinc-200/60 dark:border-zinc-800 flex items-center justify-center text-blue-600 dark:text-blue-400 mb-4">
                    <IconComponent className="w-5 h-5" />
                  </div>
                  <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-100 mb-2">
                    {feature.title}
                  </h3>
                  <p className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">
                    {feature.description}
                  </p>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* 4. Screenshots Showcase */}
      {screenshots.length > 1 && (
        <section
          id="screenshots"
          className="py-20 px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto border-t border-zinc-200/70 dark:border-zinc-800/70"
        >
          <div className="text-center max-w-xl mx-auto mb-14">
            <span className="text-xs font-semibold uppercase tracking-widest text-blue-600 dark:text-blue-400 mb-2 block">
              Screenshots
            </span>
            <h2 className="text-2xl sm:text-4xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
              Take a closer look
            </h2>
          </div>

          <div className="flex gap-6 overflow-x-auto pb-6 scrollbar-thin snap-x snap-mandatory">
            {screenshots.map((imgUrl, index) => (
              <div
                key={index}
                className="shrink-0 w-60 sm:w-72 rounded-3xl overflow-hidden border border-zinc-200 dark:border-zinc-800 bg-zinc-100 dark:bg-zinc-900 shadow-md snap-center"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={imgUrl}
                  alt={`Screenshot ${index + 1}`}
                  className="w-full h-auto object-cover"
                />
              </div>
            ))}
          </div>
        </section>
      )}

      {/* 5. Closing CTA Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto text-center border-t border-zinc-200/70 dark:border-zinc-800/70">
        <div className="p-8 sm:p-12 rounded-3xl bg-zinc-950 dark:bg-zinc-900 text-white border border-zinc-800 shadow-xl relative overflow-hidden">
          <div className="relative z-10">
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">
              Ready to get started?
            </h2>
            <p className="mt-2 text-xs sm:text-sm text-zinc-400 max-w-md mx-auto">
              Download {hero.app_name} today and experience the difference.
            </p>

            <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
              {store_links.app_store_url && (
                <a
                  href={store_links.app_store_url}
                  target={isPreview ? "_self" : "_blank"}
                  rel="noopener noreferrer"
                  onClick={() =>
                    handleCtaClick("app_store_footer", store_links.app_store_url)
                  }
                  className="px-5 py-2.5 rounded-xl bg-white text-zinc-950 text-xs font-semibold hover:bg-zinc-100 transition-colors shadow-sm"
                >
                  Download for iOS
                </a>
              )}
              {store_links.play_store_url && (
                <a
                  href={store_links.play_store_url}
                  target={isPreview ? "_self" : "_blank"}
                  rel="noopener noreferrer"
                  onClick={() =>
                    handleCtaClick("play_store_footer", store_links.play_store_url)
                  }
                  className="px-5 py-2.5 rounded-xl border border-zinc-700 bg-zinc-900 text-white text-xs font-semibold hover:bg-zinc-800 transition-colors shadow-sm"
                >
                  Download for Android
                </a>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* 6. Footer Section */}
      <footer className="border-t border-zinc-200/80 dark:border-zinc-800/80 py-12 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-zinc-500 dark:text-zinc-400">
          <div className="flex items-center gap-2">
            <span>&copy; {new Date().getFullYear()}</span>
            <span className="font-semibold text-zinc-900 dark:text-zinc-100">
              {footer.brand_name || hero.app_name}
            </span>
            <span>. All rights reserved.</span>
          </div>

          <div className="flex flex-wrap items-center gap-5">
            {footer.legal_links &&
              footer.legal_links.map((link, i) => (
                <a
                  key={i}
                  href={link.url || "#"}
                  className="hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors"
                >
                  {link.label}
                </a>
              ))}
            {footer.contact_email && (
              <a
                href={`mailto:${footer.contact_email}`}
                className="inline-flex items-center gap-1 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors"
              >
                <Mail className="w-3 h-3" />
                <span>Contact</span>
              </a>
            )}
          </div>
        </div>

        {/* Watermark Badge (Stage 7 specification enforced here in the shared renderer) */}
        {showWatermark && (
          <div className="mt-8 pt-6 border-t border-zinc-200/40 dark:border-zinc-800/40 flex justify-center">
            <a
              href="https://shipsprint.site"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-zinc-200 dark:border-zinc-800 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-sm text-[11px] font-medium text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 shadow-xs transition-colors"
            >
              <Sparkles className="w-3 h-3 text-blue-500" />
              <span>
                Powered by <span className="font-semibold text-zinc-800 dark:text-zinc-200">ShipSprint</span>
              </span>
            </a>
          </div>
        )}
      </footer>
    </div>
  );
}
