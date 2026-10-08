/* Hallmark · pre-emit critique: P5 H5 E5 S5 R5 V5 */
"use client";

import React, { useState } from "react";
import type { SiteContent, Plan, FeatureItem, HowItWorksStep, BentoImpacts } from "@/types/database";
import { trackEvent } from "@/lib/track-client";
import { ArrowRight, Check, Star, Signal, Wifi, Battery } from "lucide-react";
import { getFeatureIcon } from "@/lib/icons";
import { AppStoreBadge, GooglePlayBadge, TestFlightBadge } from "@/components/ui/store-badges";
import { normalizeImageUrl } from "@/lib/storage/image-url";

interface SiteRendererProps {
  content: SiteContent;
  plan?: Plan | null;
  isPreview?: boolean;
  siteId?: string;
  theme?: string;
  slug?: string;
  viewport?: "desktop" | "tablet" | "mobile";
  basePath?: string;
}

interface AppleIPhoneMockupProps {
  src?: string | null;
  alt: string;
  appName?: string;
  className?: string;
  placeholderText?: string;
}

function AppleIPhoneMockup({
  src,
  alt,
  appName = "App",
  className = "",
  placeholderText = "Upload Screenshot",
}: AppleIPhoneMockupProps) {
  const normalizedSrc = normalizeImageUrl(src);

  // If the user explicitly provided an image that already is a full phone graphic (e.g. shipsprint-phone-mockup.png)
  const isPreBakedPhoneGraphic =
    normalizedSrc &&
    (normalizedSrc.includes("shipsprint-phone-mockup") ||
      normalizedSrc.endsWith("-mockup.png") ||
      normalizedSrc.endsWith("-mockup.svg"));

  if (isPreBakedPhoneGraphic) {
    return (
      <div className={`relative select-none ${className}`}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={normalizedSrc}
          alt={alt}
          className="h-auto w-full drop-shadow-[0_28px_56px_rgba(0,0,0,0.48)] select-none pointer-events-none"
        />
      </div>
    );
  }

  return (
    <div className={`relative select-none ${className}`}>
      {/* Outer Titanium Chassis Frame (Apple Natural Titanium with Specular Highlights) */}
      <div className="relative aspect-[9/19.5] w-full rounded-[36px] xs:rounded-[42px] sm:rounded-[46px] bg-gradient-to-b from-[#56575e] via-[#2f3036] to-[#141518] p-[3.5px] xs:p-[4px] sm:p-[4.5px] shadow-[0_32px_64px_-16px_rgba(0,0,0,0.7),0_0_0_1px_rgba(255,255,255,0.22),inset_0_1px_1.5px_rgba(255,255,255,0.5)] ring-1 ring-black/70">
        {/* Hardware Side Buttons */}
        <div className="pointer-events-none absolute -left-[2.5px] top-[18%] h-[5%] w-[2.5px] rounded-l-xs bg-[#6a6b72] shadow-xs" />
        <div className="pointer-events-none absolute -left-[2.5px] top-[26%] h-[8%] w-[2.5px] rounded-l-xs bg-[#6a6b72] shadow-xs" />
        <div className="pointer-events-none absolute -left-[2.5px] top-[36%] h-[8%] w-[2.5px] rounded-l-xs bg-[#6a6b72] shadow-xs" />
        <div className="pointer-events-none absolute -right-[2.5px] top-[25%] h-[12%] w-[2.5px] rounded-r-xs bg-[#6a6b72] shadow-xs" />

        {/* OLED True Black Display Bezel Ring */}
        <div className="relative h-full w-full rounded-[32px] xs:rounded-[38px] sm:rounded-[42px] bg-black p-[3.5px] xs:p-[4px] sm:p-[4.5px] ring-1 ring-black/90">
          {/* Active Screen Display Area */}
          <div className="relative h-full w-full overflow-hidden rounded-[28px] xs:rounded-[34px] sm:rounded-[38px] bg-black ring-1 ring-white/5">
            {/* iOS Status Bar with Dynamic Island */}
            <div className="pointer-events-none absolute inset-x-0 top-0 z-30 flex h-7 xs:h-8 sm:h-9 items-center justify-between px-3.5 xs:px-4 sm:px-5 pt-0.5 text-white">
              <span className="tracking-tight text-white/95 font-medium text-[9px] xs:text-[10px] sm:text-[11px]">
                9:41
              </span>

              {/* Dynamic Island Pill with Camera & Sensor Elements */}
              <div className="absolute left-1/2 top-1.5 xs:top-2 h-[15px] xs:h-[18px] sm:h-[20px] w-[62px] xs:w-[76px] sm:w-[88px] -translate-x-1/2 rounded-full bg-black ring-1 ring-white/10 flex items-center justify-between px-2 shadow-inner">
                <div className="flex items-center gap-1">
                  <div className="h-2 w-2 rounded-full bg-[#0c1220] ring-1 ring-white/20 flex items-center justify-center">
                    <div className="h-0.5 w-0.5 rounded-full bg-blue-500/60" />
                  </div>
                </div>
                <div className="h-1.5 w-1.5 rounded-full bg-[#0b0c10] ring-1 ring-white/10" />
              </div>

              {/* Hardware Status Icons */}
              <div className="flex items-center gap-1 text-white/90 scale-75 xs:scale-85 sm:scale-95 origin-right">
                <Signal className="h-2.5 w-2.5 xs:h-3 xs:w-3 stroke-[2.5]" />
                <Wifi className="h-2.5 w-2.5 xs:h-3 xs:w-3 stroke-[2.5]" />
                <div className="flex items-center">
                  <Battery className="h-3 w-3 xs:h-3.5 xs:w-3.5 stroke-[2.5]" />
                </div>
              </div>
            </div>

            {/* Screen Content: User Image OR Sleek App Placeholder */}
            <div className="relative h-full w-full overflow-hidden bg-black text-white">
              {normalizedSrc ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={normalizedSrc}
                  alt={alt}
                  className="h-full w-full object-cover object-top select-none pointer-events-none"
                  loading="eager"
                />
              ) : (
                <div className="flex h-full w-full flex-col items-center justify-center bg-gradient-to-b from-zinc-900 via-zinc-950 to-black px-4 text-center">
                  <div className="mx-auto flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center rounded-2xl bg-white/[0.08] ring-1 ring-white/10 mb-2.5 shadow-inner">
                    <svg
                      className="h-4 w-4 sm:h-5 sm:w-5 text-white/40"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.5"
                    >
                      <rect x="3" y="3" width="18" height="18" rx="3" />
                      <circle cx="8.5" cy="8.5" r="1.5" />
                      <path d="m21 15-5-5L5 21" />
                    </svg>
                  </div>
                  <p className="text-[9px] sm:text-[10px] font-medium text-white/40 truncate max-w-full px-2">
                    {placeholderText || appName}
                  </p>
                </div>
              )}
            </div>

            {/* Apple Home Indicator Bar */}
            <div className="pointer-events-none absolute bottom-1.5 xs:bottom-2 left-1/2 -translate-x-1/2 z-30 h-[3px] w-[30%] max-w-[90px] rounded-full bg-white/40 shadow-xs" />

            {/* Subtle Screen Glass Sheen */}
            <div className="pointer-events-none absolute inset-0 z-25 bg-gradient-to-tr from-transparent via-white/[0.03] to-white/[0.06] opacity-60" />
          </div>
        </div>
      </div>
    </div>
  );
}

export function SiteRenderer({
  content,
  plan: _plan,
  isPreview = false,
  siteId,
  theme: _theme,
  slug: _slug,
  viewport = "desktop",
  basePath,
}: SiteRendererProps) {
  const {
    brand = { name: "App Name", logo_url: "" },
    hero = {
      app_name: "App Name",
      badge_text: "Built for indie app makers",
      header: "Launch your app page. Without the code.",
      short_description:
        "Plan, prioritize, and publish your App Store landing page in one simple workspace. Stay on-brand, track every install, and never touch frontend code again.",
    },
    impacts,
    features = [],
    how_it_works,
    store_links = {
      availability: "both",
      app_store_url: "",
      play_store_url: "",
      testflight_url: "",
    },
    pages = [],
    footer = {
      brand_name: "App Name",
      legal_links: [],
      contact_email: "",
    },
  } = content || {};

  const appName = hero.app_name || brand.name || "App Name";
  const isMobileView = viewport === "mobile";
  const isTabletView = viewport === "tablet";

  // Email capture state (if configured)
  const emailCapture = {
    enabled: hero.email_capture_enabled ?? false,
    placeholder: hero.email_placeholder || "Enter your email for early access",
    ctaLabel: hero.email_cta_label || "Get Early Access",
    successMessage:
      hero.email_success_message || "You're on the list. We'll be in touch.",
  };
  const [emailValue, setEmailValue] = useState("");
  const [emailDone, setEmailDone] = useState(false);
  const [emailError, setEmailError] = useState("");

  const submitEmailCapture = (event: React.FormEvent) => {
    event.preventDefault();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailValue.trim())) {
      setEmailError("Enter a valid email address.");
      return;
    }
    setEmailError("");
    setEmailDone(true);
  };

  const availability = store_links.availability || "both";

  const handleCtaClick = (ctaType: string, targetUrl?: string) => {
    if (isPreview || !siteId) return;
    trackEvent({
      siteId,
      eventType: "button_click",
      meta: {
        cta_type: ctaType,
        target_url: targetUrl || "",
        path: typeof window !== "undefined" ? window.location.pathname : "/",
      },
    });
  };

  const resolveSubpageHref = (pageSlug: string) => {
    if (isPreview) return `#${pageSlug}`;
    const clean = pageSlug.startsWith("/") ? pageSlug.slice(1) : pageSlug;
    if (basePath) {
      return `${basePath}/${clean}`;
    }
    return `/${clean}`;
  };

  const navPages = (pages || []).filter(
    (p) =>
      p.is_published !== false &&
      p.show_in_nav === true &&
      !["home", "privacy", "terms", "support", "imprint"].includes(p.slug)
  );

  // Impacts fallbacks
  const impactsData: BentoImpacts = {
    eyebrow: impacts?.eyebrow || "Our impacts",
    title: impacts?.title || "Real results. Real impact.",
    description:
      impacts?.description ||
      `See how indie makers turn visitors into installs. From faster launches to calmer workflows, ${appName} helps you ship more — every single day.`,
    trust_avatars: impacts?.trust_avatars || ["ZH", "FF", "SA"],
    trust_headline: impacts?.trust_headline || "Trusted by indie makers",
    metric_stat: impacts?.metric_stat || "1,200+",
    metric_label: impacts?.metric_label || "Live app landing pages published worldwide",
    rating_score: impacts?.rating_score ?? 4.9,
    rating_reviews_label:
      impacts?.rating_reviews_label || "Average indie maker rating across launches",
    sla_stat: impacts?.sla_stat || "99.9%",
    sla_label: impacts?.sla_label || "Uptime SLA via Caddy edge & automated TLS",
    speed_stat: impacts?.speed_stat || "< 2 min",
    speed_label: impacts?.speed_label || "From setup to live custom domain",
  };

  // How it works steps fallback
  const stepsData: HowItWorksStep[] = how_it_works && how_it_works.length > 0
    ? how_it_works
    : [
        {
          step: "Step 1",
          title: "Craft your identity",
          description:
            "Add your icon, screenshots, store links, and copy. Watch the live preview update instantly with zero drift.",
        },
        {
          step: "Step 2",
          title: "Showcase verified proof",
          description:
            "Highlight core capabilities, checklist milestones, and verified ratings to build immediate trust with visitors.",
        },
        {
          step: "Step 3",
          title: "Publish & track installs",
          description:
            "Publish to your subdomain or custom domain with automated TLS. Track cookieless store taps from day one.",
        },
      ];

  const categories = brand.categories && brand.categories.length > 0
    ? brand.categories
    : ["Habit", "Focus", "Productivity", "Health", "Design", "Life"];

  return (
    <div className="min-h-screen bg-white font-sans text-[#131313] antialiased selection:bg-[#131313] selection:text-white dark:bg-zinc-950 dark:text-zinc-50 dark:selection:bg-zinc-50 dark:selection:text-zinc-950">
      {/* N5 Floating Pill Header */}
      <div className="sticky top-0 z-[300] px-4 pt-4">
        <header className="mx-auto flex h-14 w-full max-w-3xl items-center justify-between gap-4 rounded-full border border-zinc-200 bg-white/90 py-2 pl-5 pr-2 shadow-[0_8px_24px_-12px_rgb(0,0,0,0.18)] backdrop-blur-md dark:border-zinc-800 dark:bg-zinc-900/90">
          {/* Brand Logo / Name */}
          <div className="flex items-center gap-2.5 min-w-0">
            {brand.logo_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={normalizeImageUrl(brand.logo_url)}
                alt={appName}
                className="h-7 w-auto object-contain max-w-[120px]"
              />
            ) : brand.app_icon_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={normalizeImageUrl(brand.app_icon_url)}
                alt={appName}
                className="h-7 w-7 rounded-lg object-cover shadow-xs"
              />
            ) : (
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#131313] text-xs font-bold text-white shadow-xs dark:bg-white dark:text-[#131313]">
                {appName.charAt(0).toUpperCase()}
              </span>
            )}
            <span className="truncate text-[15px] font-semibold tracking-tight text-[#131313] dark:text-white">
              {appName}
            </span>
          </div>

          {/* Navigation Anchor Links */}
          <nav
            aria-label="Primary"
            className={`${isMobileView ? "hidden" : "hidden sm:flex"} items-center gap-6 text-[13px] font-medium text-[#505050] dark:text-zinc-300`}
          >
            <a
              href="#impacts"
              className="whitespace-nowrap transition-colors hover:text-[#131313] active:text-[#131313] dark:hover:text-white"
            >
              Impacts
            </a>
            <a
              href="#features"
              className="whitespace-nowrap transition-colors hover:text-[#131313] active:text-[#131313] dark:hover:text-white"
            >
              Features
            </a>
            <a
              href="#how"
              className="whitespace-nowrap transition-colors hover:text-[#131313] active:text-[#131313] dark:hover:text-white"
            >
              How it works
            </a>
            {navPages.map((page) => (
              <a
                key={page.id}
                href={resolveSubpageHref(page.slug)}
                className="whitespace-nowrap transition-colors hover:text-[#131313] active:text-[#131313] dark:hover:text-white"
              >
                {page.title}
              </a>
            ))}
          </nav>

          {/* Action Button */}
          <div className="flex items-center gap-2 leading-none shrink-0">
            <a
              href="#download"
              onClick={() => handleCtaClick("nav_download")}
              className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full bg-[#131313] px-4 py-2 text-[13px] font-medium text-white transition-colors hover:bg-black active:bg-black active:scale-[0.98] dark:bg-zinc-50 dark:text-zinc-950 dark:hover:bg-white"
            >
              <span>Get App</span>
              <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
            </a>
          </div>
        </header>
      </div>

      {/* Main Semantic Page Content */}
      <main id="main-content">
        {/* Hero — Full-Bleed Royal Blue Radial Chamber */}
        <section aria-label="Hero" className="px-3 pt-4 sm:px-4">
        <div
          className="relative overflow-hidden rounded-[2rem] text-white sm:rounded-[2.5rem]"
          style={{
            background:
              "radial-gradient(ellipse at 82% 20%, rgba(56, 189, 248, 0.35) 0%, transparent 50%), radial-gradient(ellipse at 30% 80%, rgba(20, 100, 190, 0.4) 0%, transparent 55%), linear-gradient(135deg, #2488eb 0%, #1772e0 50%, #0d5bbd 100%)",
            boxShadow:
              "0 30px 60px -15px rgba(13, 86, 190, 0.35), inset 0 1px 1px rgba(255, 255, 255, 0.3)",
          }}
        >
          <div
            className={`mx-auto grid w-full max-w-6xl grid-cols-1 items-center gap-10 px-6 pt-12 pb-14 sm:px-10 ${
              isMobileView ? "" : "md:grid-cols-12 md:gap-8 md:pt-16 md:pb-20"
            }`}
          >
            {/* Left Column: Eyebrow, Headline, Description, CTAs, Star Proof */}
            <div className={isMobileView ? "text-center" : "md:col-span-6"}>
              {hero.badge_text && (
                <p className="inline-flex items-center whitespace-nowrap rounded-full border border-white/30 bg-white/10 px-3.5 py-1.5 text-[11px] font-semibold tracking-widest uppercase backdrop-blur-md">
                  {hero.badge_text}
                </p>
              )}

              <h1 className={`hero__display mt-6 font-display ${isMobileView ? "text-3xl sm:text-4xl" : "text-[clamp(2.5rem,5vw+0.5rem,4.25rem)]"} leading-[1.06] font-semibold tracking-[-0.03em] text-balance`}>
                {hero.header}
              </h1>

              {hero.short_description && (
                <p className="mt-5 max-w-[50ch] text-base leading-relaxed text-white/90 sm:text-lg">
                  {hero.short_description}
                </p>
              )}

              {/* Official Store Download Buttons (Exact User Design Specification) */}
              <div
                className={`mt-8 flex flex-wrap items-center gap-3 ${
                  isMobileView ? "justify-center" : "justify-center sm:justify-start"
                }`}
              >
                {(availability === "both" || availability === "app_store_only") && (
                  <AppStoreBadge
                    href={store_links.app_store_url || "#download"}
                    isPreview={isPreview}
                    onClick={() => handleCtaClick("hero_app_store", store_links.app_store_url)}
                  />
                )}

                {(availability === "both" || availability === "play_store_only") && (
                  <GooglePlayBadge
                    href={store_links.play_store_url || "#download"}
                    isPreview={isPreview}
                    onClick={() => handleCtaClick("hero_play_store", store_links.play_store_url)}
                  />
                )}

                {availability === "testflight" && (
                  <TestFlightBadge
                    href={store_links.testflight_url || "#download"}
                    isPreview={isPreview}
                    onClick={() => handleCtaClick("hero_testflight", store_links.testflight_url)}
                  />
                )}
              </div>

              {/* Star Rating Proof */}
              <p
                className={`mt-8 flex flex-wrap items-center gap-2.5 leading-tight sm:flex-nowrap ${
                  isMobileView ? "justify-center" : "justify-start"
                }`}
                role="img"
                aria-label={`Rated ${hero.rating_stars || 5} stars`}
              >
                <span className="flex items-center gap-1 shrink-0" aria-hidden="true">
                  {Array.from({ length: hero.rating_stars || 5 }).map((_, i) => (
                    <Star
                      key={i}
                      className="h-4 w-4 fill-yellow-300 text-yellow-300"
                      aria-hidden="true"
                    />
                  ))}
                </span>
                <span className="text-xs font-semibold tracking-wider uppercase text-white/95">
                  {hero.rating_text || "Built for App Store launches"}
                </span>
              </p>

              {/* Optional Email Capture */}
              {emailCapture.enabled && (
                <div className="mt-6 max-w-md">
                  {emailDone ? (
                    <p className="rounded-xl bg-white/20 px-4 py-2 text-sm text-white backdrop-blur-sm">
                      {emailCapture.successMessage}
                    </p>
                  ) : (
                    <form onSubmit={submitEmailCapture} className="flex gap-2">
                      <input
                        type="email"
                        value={emailValue}
                        onChange={(e) => setEmailValue(e.target.value)}
                        placeholder={emailCapture.placeholder}
                        className="flex-1 rounded-full border border-white/30 bg-white/10 px-4 py-2.5 text-xs text-white placeholder-white/70 backdrop-blur-sm outline-hidden focus:border-white"
                      />
                      <button
                        type="submit"
                        className="rounded-full bg-white px-4 py-2.5 text-xs font-semibold text-[#131313] hover:bg-zinc-100"
                      >
                        {emailCapture.ctaLabel}
                      </button>
                    </form>
                  )}
                  {emailError && (
                    <p className="mt-1 text-xs text-red-200">{emailError}</p>
                  )}
                </div>
              )}
            </div>

            {/* Right Column: Cascading Diptych Mockups */}
            <div
              className={`relative flex items-center justify-center ${
                isMobileView ? "mt-4" : "md:col-span-6"
              }`}
            >
              <div className="relative flex w-full max-w-[340px] xs:max-w-[380px] items-center justify-center py-2 sm:max-w-[430px]">
                {/* Back iPhone Mockup (Right) */}
                <div className="relative z-10 w-[145px] xs:w-[170px] sm:w-[205px] lg:w-[220px] rotate-[-1.5deg] translate-x-4 xs:translate-x-6 sm:translate-x-10 translate-y-2 sm:translate-y-3 opacity-95 transition-transform duration-500 hover:translate-x-9 hover:rotate-0">
                  <AppleIPhoneMockup
                    src={hero.device_screenshot_url_secondary || hero.device_screenshot_url}
                    alt={`${appName} preview`}
                    appName={appName}
                    placeholderText="Secondary Screen"
                  />
                </div>

                {/* Front iPhone Mockup (Left, overlapping foreground with -6deg tilt) */}
                <div className="absolute left-1 top-1 z-20 w-[150px] xs:w-[180px] sm:w-[218px] lg:w-[235px] rotate-[-6deg] transition-transform duration-500 hover:scale-[1.02] hover:rotate-[-4deg] sm:left-3 sm:top-2">
                  <AppleIPhoneMockup
                    src={hero.device_screenshot_url}
                    alt={`${appName} showcase`}
                    appName={appName}
                    placeholderText="Upload Screenshot"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Category Proof Strip */}
      <section
        aria-label="Made for"
        className="border-y border-zinc-200 bg-[#f7f7f7] dark:border-zinc-800 dark:bg-zinc-900/30"
      >
        <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
          <p className="text-center text-xs font-semibold tracking-widest text-[#505050] uppercase dark:text-zinc-400">
            Made for indie apps shipping worldwide
          </p>
          <ul className="mt-4 flex flex-wrap items-center justify-center gap-x-8 gap-y-2 text-sm font-semibold text-[#262424] dark:text-zinc-300">
            {categories.map((c) => (
              <li key={c} className="whitespace-nowrap">
                {c}
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Impacts — 4-Tile Bento Mosaic Grid */}
      <section
        id="impacts"
        className="mx-auto w-full max-w-6xl scroll-mt-24 px-4 py-16 sm:px-6 md:py-24 lg:px-8"
      >
        <div className="section__head block">
          <p className="inline-flex rounded-full border border-zinc-200 bg-white px-3 py-1 text-[11px] font-semibold tracking-widest whitespace-nowrap text-[#505050] uppercase dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300">
            {impactsData.eyebrow}
          </p>
        </div>
        <div className={`mt-4 grid grid-cols-1 ${isMobileView ? "gap-4" : "gap-8 md:grid-cols-7"}`}>
          <h2 className={`section__title font-display ${isMobileView ? "text-3xl" : "text-4xl sm:text-5xl md:col-span-4"} font-semibold tracking-tight text-balance`}>
            {impactsData.title}
          </h2>
          <p className={`max-w-[52ch] text-sm leading-relaxed text-[#505050] dark:text-zinc-300 ${isMobileView ? "mt-2" : "self-end md:col-span-3"}`}>
            {impactsData.description}
          </p>
        </div>

        <div
          className={`mt-10 grid grid-cols-1 gap-5 ${
            isMobileView ? "grid-cols-1" : isTabletView ? "sm:grid-cols-2" : "sm:grid-cols-2 lg:grid-cols-3"
          }`}
        >
          {/* Avatar trust tile */}
          <div className="flex min-w-0 flex-col justify-between rounded-3xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-950">
            <div className="flex items-center gap-3">
              <div className="flex -space-x-2" aria-hidden="true">
                {(impactsData.trust_avatars || []).map((t) => (
                  <span
                    key={t}
                    className="flex h-9 w-9 items-center justify-center rounded-full border-2 border-white bg-[#f7f7f7] text-[11px] font-semibold text-[#262424] dark:border-zinc-950 dark:bg-zinc-800 dark:text-zinc-200"
                  >
                    {t}
                  </span>
                ))}
              </div>
              <p className="text-[11px] font-semibold tracking-widest whitespace-nowrap text-[#505050] uppercase dark:text-zinc-400">
                {impactsData.trust_headline}
              </p>
            </div>
            <div className="mt-8">
              <p className="max-w-[52ch] text-[15px] leading-relaxed font-medium">
                Our platform helps you stay focused, meet launch day, and achieve more with every release.
              </p>
              <p className="mt-6 font-display text-5xl font-semibold tracking-tight">
                {impactsData.metric_stat}
                <span className="text-[#505050] dark:text-zinc-500">+</span>
              </p>
              <p className="mt-2 text-[13px] text-[#505050] dark:text-zinc-400">
                {impactsData.metric_label}
              </p>
            </div>
          </div>

          {/* Tall dark rating tile */}
          <div className="flex min-w-0 flex-col justify-between rounded-3xl bg-[#131313] p-6 text-white sm:row-span-2 dark:bg-zinc-900">
            <p className="max-w-[52ch] text-[15px] leading-relaxed font-medium text-zinc-100">
              Every page published, every install tracked — our numbers reflect real progress made by real makers like you.
            </p>
            <div className="mt-10">
              <p className="font-display text-5xl font-semibold tracking-tight">
                {(impactsData.rating_score || 4.9).toFixed(1)}
                <span className="text-zinc-500">/5</span>
              </p>
              <div
                className="mt-3 flex items-center gap-1"
                role="img"
                aria-label={`Average maker rating: ${impactsData.rating_score} out of 5 stars`}
              >
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star
                    key={i}
                    className="h-4 w-4 fill-yellow-400 text-yellow-400"
                    aria-hidden="true"
                  />
                ))}
              </div>
              <p className="mt-2 text-[13px] text-zinc-400">
                {impactsData.rating_reviews_label}
              </p>
            </div>
          </div>

          {/* Uptime SLA tile */}
          <div className="flex min-w-0 flex-col justify-between rounded-3xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-950">
            <p className="max-w-[52ch] text-[15px] leading-relaxed font-medium">
              Our platform is built to deliver measurable results — from quicker launches to stronger install conversion.
            </p>
            <div className="mt-8">
              <p className="font-display text-5xl font-semibold tracking-tight">
                {impactsData.sla_stat}
              </p>
              <p className="mt-2 text-[13px] text-[#505050] dark:text-zinc-400">
                {impactsData.sla_label}
              </p>
            </div>
          </div>

          {/* Speed chip tile */}
          <div className="flex min-w-0 items-center gap-3 rounded-3xl border border-zinc-200 bg-white p-6 sm:col-span-2 lg:col-span-1 dark:border-zinc-800 dark:bg-zinc-950">
            <span
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-base font-semibold text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400"
              aria-hidden="true"
            >
              ⚡
            </span>
            <div className="min-w-0">
              <p className="text-sm font-semibold whitespace-nowrap">
                {impactsData.speed_stat} launch time
              </p>
              <p className="mt-0.5 text-[13px] text-[#505050] dark:text-zinc-400">
                {impactsData.speed_label}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Features — 3 Annotated Proof Rows */}
      {features.length > 0 && (
        <section
          id="features"
          className="mx-auto w-full max-w-6xl scroll-mt-24 px-4 py-16 sm:px-6 md:py-24 lg:px-8"
        >
          <div className="mx-auto block max-w-2xl text-center">
            <p className="inline-flex rounded-full border border-zinc-200 bg-white px-3 py-1 text-[11px] font-semibold tracking-widest whitespace-nowrap text-[#505050] uppercase dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300">
              Our features
            </p>
            <h2 className="section__title mt-4 font-display text-4xl font-semibold tracking-tight text-balance sm:text-5xl">
              Features designed for your launch.
            </h2>
            <p className="mx-auto mt-4 max-w-[52ch] text-sm leading-relaxed text-[#505050] sm:text-base dark:text-zinc-300">
              Explore the features designed to turn visitors into installs — and keep every page on-brand.
            </p>
          </div>

          <div className="mt-14 space-y-6">
            {features.map((feature: FeatureItem, idx) => {
              const IconComponent = getFeatureIcon(feature.icon);
              const isEven = idx % 2 === 0;
              const proofType = feature.proof_type || (idx === 0 ? "checklist" : idx === 1 ? "chart" : "readiness");

              return (
                <article
                  key={feature.id || idx}
                  aria-labelledby={`feature-title-${idx}`}
                  className={`grid grid-cols-1 items-center gap-8 rounded-3xl border border-zinc-200 p-6 sm:p-10 ${
                    isEven ? "bg-[#f7f7f7] dark:bg-zinc-900/30" : "bg-white dark:bg-zinc-950"
                  } ${isMobileView ? "" : "md:grid-cols-2"} dark:border-zinc-800`}
                >
                  {/* Proof Graphic Column */}
                  <div
                    className={`min-w-0 ${
                      !isEven && !isMobileView ? "md:order-2" : ""
                    }`}
                  >
                    {proofType === "checklist" && (
                      <div
                        className="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-950"
                        aria-hidden="true"
                      >
                        <ul className="space-y-3">
                          {(
                            feature.proof_meta?.checklist_items || [
                              { label: "App icon + screenshots", date: "Feb 19", status: "Ready", urgent: false },
                              { label: "Store badges + QR", date: "Feb 20", status: "High priority", urgent: true },
                              { label: "Ratings + reviews", date: "Feb 21", status: "Normal", urgent: false },
                            ]
                          ).map((item, i) => (
                            <li
                              key={i}
                              className="rounded-xl border border-zinc-200 bg-white p-3.5 shadow-xs dark:border-zinc-800 dark:bg-zinc-900"
                            >
                              <div className="flex items-center justify-between gap-3">
                                <p className="flex min-w-0 items-center gap-2 text-[13px] font-medium">
                                  <Check className="h-3.5 w-3.5 shrink-0 text-emerald-600" aria-hidden="true" />
                                  <span className="truncate">{item.label}</span>
                                </p>
                                {item.date && (
                                  <span className="shrink-0 text-[11px] whitespace-nowrap text-[#505050] dark:text-zinc-500">
                                    {item.date}
                                  </span>
                                )}
                              </div>
                              <p className="mt-1.5 inline-flex items-center gap-1.5 rounded-full bg-zinc-100 px-2 py-0.5 text-[11px] font-medium whitespace-nowrap text-[#505050] dark:bg-zinc-800 dark:text-zinc-300">
                                <span
                                  className={`h-1.5 w-1.5 rounded-full ${
                                    item.urgent ? "bg-red-500" : "bg-zinc-400"
                                  }`}
                                  aria-hidden="true"
                                />
                                {item.status}
                              </p>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {proofType === "chart" && (
                      <div
                        className="rounded-2xl border border-zinc-200 bg-[#f7f7f7] p-5 dark:border-zinc-800 dark:bg-zinc-900/40"
                        aria-hidden="true"
                      >
                        <div className="flex items-center justify-between">
                          <p className="text-[11px] font-semibold tracking-widest text-[#505050] uppercase dark:text-zinc-500">
                            {feature.proof_meta?.chart_stat?.label || "Weekly installs"}
                          </p>
                          <span className="inline-flex items-center rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-medium text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300">
                            {feature.proof_meta?.chart_stat?.ctr || "+24.8% CTR"}
                          </span>
                        </div>
                        <p className="mt-1 font-mono text-2xl font-semibold">
                          {feature.proof_meta?.chart_stat?.value || "14,820 installs"}
                        </p>
                        <div className="mt-3 flex h-16 items-end gap-1.5" aria-hidden="true">
                          {(
                            feature.proof_meta?.chart_stat?.bars || [35, 55, 40, 70, 52, 85, 64]
                          ).map((h, i) => (
                            <span
                              key={i}
                              className="w-full rounded-xs bg-blue-600 transition-all hover:bg-blue-500"
                              style={{ height: `${h}%` }}
                            />
                          ))}
                        </div>
                        <div className="mt-2 flex items-center justify-between text-[11px] text-[#505050] dark:text-zinc-500">
                          <span>Mon – Sun</span>
                          <span>Cookieless store attribution</span>
                        </div>
                      </div>
                    )}

                    {proofType === "readiness" && (
                      <div
                        className="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-950"
                        aria-hidden="true"
                      >
                        <div className="flex items-center justify-between">
                          <p className="text-[11px] font-semibold tracking-widest text-[#505050] uppercase dark:text-zinc-500">
                            Launch Readiness
                          </p>
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                            <Check className="h-3 w-3" aria-hidden="true" />
                            <span>Ready</span>
                          </span>
                        </div>
                        <ul className="mt-3 space-y-2.5 text-[13px]">
                          {(
                            feature.proof_meta?.readiness_items || [
                              { key: "Launch checklist", value: "12 / 12 items verified" },
                              { key: "Mobile Launch Suite", value: "Apple & Android ready" },
                              { key: "Automatic SSL/TLS", value: "Active (Let's Encrypt)" },
                            ]
                          ).map((item, i) => (
                            <li
                              key={i}
                              className="flex items-center justify-between gap-2 border-b border-zinc-100 pb-2.5 last:border-0 last:pb-0 dark:border-zinc-800"
                            >
                              <span className="font-medium truncate text-xs sm:text-[13px]">{item.key}</span>
                              <span className="font-mono text-[11px] sm:text-xs font-semibold whitespace-nowrap text-blue-600 dark:text-blue-400 shrink-0">
                                {item.value}
                              </span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {proofType === "image" && feature.image_url && (
                      <div className="overflow-hidden rounded-2xl border border-zinc-200 dark:border-zinc-800">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={normalizeImageUrl(feature.image_url)}
                          alt={feature.title}
                          className="h-full w-full object-cover"
                        />
                      </div>
                    )}
                  </div>

                  {/* Feature Text Column */}
                  <div
                    className={`min-w-0 ${
                      !isEven && !isMobileView ? "md:order-1" : ""
                    }`}
                  >
                    <p
                      className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600/10 text-lg font-semibold text-blue-600 dark:text-blue-400"
                      aria-hidden="true"
                    >
                      <IconComponent className="h-5 w-5" />
                    </p>
                    <h3
                      id={`feature-title-${idx}`}
                      className="mt-4 text-2xl font-semibold tracking-tight"
                    >
                      {feature.title}
                    </h3>
                    <p className="mt-2 max-w-[52ch] text-sm leading-relaxed text-[#505050] sm:text-[15px] dark:text-zinc-300">
                      {feature.description}
                    </p>
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      )}

      {/* How It Works — 3 Steps Grid */}
      <section
        id="how"
        className="border-y border-zinc-200 bg-[#f7f7f7] dark:border-zinc-800 dark:bg-zinc-900/30"
      >
        <div className="mx-auto w-full max-w-6xl scroll-mt-24 px-4 py-16 sm:px-6 md:py-24 lg:px-8">
          <div className="block max-w-2xl">
            <p className="inline-flex rounded-full border border-zinc-200 bg-white px-3 py-1 text-[11px] font-semibold tracking-widest whitespace-nowrap text-[#505050] uppercase dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300">
              How it works
            </p>
            <h2 className="section__title mt-4 font-display text-4xl font-semibold tracking-tight text-balance sm:text-5xl">
              Live in 3 simple steps.
            </h2>
          </div>
          <ol
            className={`mt-10 grid grid-cols-1 gap-5 ${
              isMobileView ? "grid-cols-1" : "md:grid-cols-3"
            }`}
          >
            {stepsData.map((s) => (
              <li
                key={s.step}
                className="min-w-0 rounded-3xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-950"
              >
                <p className="text-[11px] font-semibold tracking-widest text-blue-600 uppercase dark:text-blue-400">
                  {s.step}
                </p>
                <h3 className="mt-2 text-xl font-semibold tracking-tight">
                  {s.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-[#505050] dark:text-zinc-300">
                  {s.description}
                </p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Official Store Badges / Download Station */}
      <section
        id="download"
        className="mx-auto w-full max-w-6xl scroll-mt-24 px-4 py-16 sm:px-6 md:py-24 lg:px-8 text-center"
      >
        <div className="mx-auto max-w-2xl">
          <p className="inline-flex rounded-full border border-zinc-200 bg-white px-3 py-1 text-[11px] font-semibold tracking-widest whitespace-nowrap text-[#505050] uppercase dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300">
            Get the app
          </p>
          <h2 className={`mt-4 font-display ${isMobileView ? "text-3xl" : "text-4xl sm:text-5xl"} font-semibold tracking-tight text-balance`}>
            Start using {appName} today.
          </h2>
          <p className="mt-4 text-sm leading-relaxed text-[#505050] sm:text-base dark:text-zinc-300">
            Available natively on iOS and Android. Download now to elevate your daily routine.
          </p>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-3 leading-none">
            {(availability === "both" || availability === "app_store_only") && (
              <AppStoreBadge
                href={store_links.app_store_url || "#"}
                isPreview={isPreview}
                onClick={() => handleCtaClick("app_store_download", store_links.app_store_url)}
              />
            )}
            {(availability === "both" || availability === "play_store_only") && (
              <GooglePlayBadge
                href={store_links.play_store_url || "#"}
                isPreview={isPreview}
                onClick={() => handleCtaClick("play_store_download", store_links.play_store_url)}
              />
            )}
            {availability === "testflight" && (
              <TestFlightBadge
                href={store_links.testflight_url || "#"}
                isPreview={isPreview}
                onClick={() => handleCtaClick("testflight_download", store_links.testflight_url)}
              />
            )}
          </div>
        </div>
      </section>
      </main>

      {/* Statement Footer */}
      <footer role="contentinfo" className="bg-[#131313] text-white">
        <div className={`mx-auto w-full max-w-6xl px-4 ${isMobileView ? "pt-10 pb-8" : "pt-14 pb-8 sm:px-6 md:pt-20 lg:px-8"}`}>
          <div className={`grid grid-cols-1 ${isMobileView ? "gap-8" : "gap-10 md:grid-cols-7"}`}>
            {/* Giant Wordmark & Tagline */}
            <div className={`min-w-0 ${isMobileView ? "w-full" : "md:col-span-4"}`}>
              <span className={`font-display ${isMobileView ? "text-4xl sm:text-5xl" : "text-[clamp(2.5rem,8vw,5.5rem)]"} leading-none font-bold tracking-tight text-white block`}>
                {appName}
              </span>
              <p className="mt-5 max-w-[52ch] text-[15px] leading-relaxed text-zinc-300">
                {footer.tagline || `The official mobile companion for ${appName}. Built natively for iOS & Android.`}
              </p>
            </div>

            {/* Office / Contact */}
            <div className={`min-w-0 ${isMobileView ? "w-full pt-4 border-t border-zinc-800" : "md:col-span-3"}`}>
              <p className="text-[11px] font-semibold tracking-widest text-zinc-400 uppercase">
                Contact &amp; Support
              </p>
              <ul className="mt-4 space-y-2.5 text-sm">
                {footer.contact_email && (
                  <li>
                    <a
                      href={`mailto:${footer.contact_email}`}
                      className="whitespace-nowrap transition-colors hover:text-white active:text-white"
                    >
                      {footer.contact_email}
                    </a>
                  </li>
                )}
                <li>
                  <a
                    href="#download"
                    className="whitespace-nowrap text-zinc-400 transition-colors hover:text-white active:text-white"
                  >
                    Download App
                  </a>
                </li>
              </ul>
            </div>
          </div>

          {/* Legal Bar */}
          <div className={`mt-10 flex flex-col items-start gap-4 border-t border-zinc-800 pt-6 ${isMobileView ? "" : "sm:flex-row sm:items-center sm:justify-between"}`}>
            <p className="text-xs text-zinc-400">
              © {new Date().getFullYear()} {footer.brand_name || appName}. All rights reserved.
            </p>
            <nav aria-label="Legal" className="flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-zinc-400">
              {pages.map((page) => (
                <a
                  key={page.id}
                  href={resolveSubpageHref(page.slug)}
                  className="transition-colors hover:text-white"
                >
                  {page.title}
                </a>
              ))}
            </nav>
          </div>
        </div>
      </footer>
    </div>
  );
}
