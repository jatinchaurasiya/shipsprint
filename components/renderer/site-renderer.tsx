/* Hallmark · pre-emit critique: P5 H5 E5 S5 R5 V5 */
"use client";

import React, { useEffect, useState } from "react";
import type { SiteContent, Plan } from "@/types/database";
import { safeHref } from "@/lib/validation";
import { trackEvent } from "@/lib/track-client";
import { Check, Mail, Star, Plus, Minus } from "lucide-react";
import { getFeatureIcon } from "@/lib/icons";
import { IphoneMockup, type MockupFallbackKind } from "@/components/ui/iphone-mockup";
import { getHallmarkThemeTokens } from "@/lib/theme-tokens";
import { AppStoreBadge, GooglePlayBadge, TestFlightBadge } from "@/components/ui/store-badges";

interface SiteRendererProps {
  content: SiteContent;
  plan?: Plan | null;
  isPreview?: boolean;
  siteId?: string;
  theme?: string;
  slug?: string;
  viewport?: "desktop" | "tablet" | "mobile";
}

const STAGE_LABELS = ["1.0", "2.0", "3.0", "4.0", "5.0", "6.0"];

function mapThemeToFallback(theme?: string): MockupFallbackKind {
  switch (theme) {
    case "minimal":
      return "generic";
    case "midnight":

      return "audio";
    case "brutal":
      return "discipline";
    case "garden":
      return "botanical";
    case "atelier":
      return "luxury";
    case "newsprint":
      return "broadsheet";
    case "terminal":
      return "terminal";
    case "manifesto":
      return "manifesto";
    case "almanac":
      return "astronomy";
    case "sport":
      return "sport";
    case "studio":
      return "studio";
    case "riso":
      return "print";
    case "bloom":
      return "wellness";
    case "coral":
      return "finance";
    case "cobalt":
      return "developer";
    case "aurora":
      return "cinema";
    case "editorial":
      return "podcast";
    case "carnival":
      return "party";
    case "lumen":
      return "ai";
    case "hum":
      return "curiosity";
    default:
      return "generic";
  }
}

export function SiteRenderer({
  content,
  plan,
  isPreview = false,
  siteId,
  theme,
  slug: _slug,
  viewport = "desktop",
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
    logo_wall,
    release,
    store_links = {
      availability: "both",
      app_store_url: "",
      play_store_url: "",
    },
    pages = [],
    trust,
    showcase,
    stats,
    testimonials,
    pricing,
    faq,
    footer = {
      brand_name: "App Name",
      legal_links: [],
      contact_email: "",
    },
  } = content || {};

  const tokens = getHallmarkThemeTokens(theme);
  const isMobileView = viewport === "mobile";
  const isTabletView = viewport === "tablet";
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0);

  const emailCapture = {
    enabled: hero.email_capture_enabled ?? false,
    placeholder: hero.email_placeholder || "Your email address",
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

  const fallbackKind = mapThemeToFallback(theme);


  const availability = store_links.availability || "both";
  const hasAppStore =
    (availability === "both" || availability === "app_store_only") &&
    Boolean(store_links.app_store_url);
  const hasPlayStore =
    (availability === "both" || availability === "play_store_only") &&
    Boolean(store_links.play_store_url);
  const hasTestFlight =
    availability === "testflight" && Boolean(store_links.testflight_url);

  const hasAnyStore = hasAppStore || hasPlayStore || hasTestFlight;

  const primaryCtaHref = safeHref(
    hasAppStore
      ? store_links.app_store_url
      : hasPlayStore
      ? store_links.play_store_url
      : store_links.testflight_url
  );

  const primaryCtaLabel =
    availability === "app_store_only"
      ? "Download on App Store"
      : availability === "play_store_only"
      ? "Get on Google Play"
      : availability === "testflight"
      ? "Join TestFlight Beta"
      : "Get the app";

  const resolveSubpageHref = (pageSlug: string) => {
    if (isPreview) return "#";
    return `/${pageSlug}`;
  };

  useEffect(() => {
    if (isPreview || !siteId) return;
    trackEvent({
      siteId,
      eventType: "page_view",
      meta: {
        referrer: document.referrer || "Direct",
        path: window.location.pathname,
        screen: `${window.innerWidth}x${window.innerHeight}`,
      },
    });
  }, [isPreview, siteId]);

  const handleCtaClick = (buttonType: string, targetUrl?: string) => {
    if (isPreview || !siteId) return;
    trackEvent({
      siteId,
      eventType: "button_click",
      meta: {
        button_type: buttonType,
        target_url: targetUrl || "",
        referrer: document.referrer || "Direct",
        path: window.location.pathname,
      },
    });
  };

  const showWatermark = plan?.has_branding ?? true;
  const appName = brand.name || hero.app_name || "App Name";

  // System and custom navigation pages
  const navPages =
    pages.length > 0
      ? pages.filter((p) => p.page_type !== "home" && p.show_in_nav !== false)
      : [
          { id: "def-privacy", slug: "privacy", title: "Privacy" },
          { id: "def-terms", slug: "terms", title: "Terms" },
          { id: "def-support", slug: "support", title: "Support" },
        ];

  const footerPages =
    pages.length > 0
      ? pages.filter((p) => p.page_type !== "home" && p.show_in_footer !== false)
      : [
          { id: "def-privacy", slug: "privacy", title: "Privacy Policy" },
          { id: "def-terms", slug: "terms", title: "Terms of Service" },
          { id: "def-support", slug: "support", title: "Support & Help" },
        ];

  const fontClass =
    tokens.fontCategory === "serif"
      ? "font-serif"
      : tokens.fontCategory === "mono"
      ? "font-mono"
      : "font-sans";

  return (
    <div
      data-theme={tokens.id}
      style={{
        backgroundColor: tokens.paper,
        color: tokens.ink,
      }}
      className={`min-h-screen ${fontClass} antialiased selection:bg-zinc-900 selection:text-white dark:selection:bg-zinc-100 dark:selection:text-zinc-950 transition-colors duration-200`}
    >
      {/* Navigation Header */}
      <header
        style={{
          backgroundColor: tokens.paper,
          borderColor: tokens.border,
        }}
        className="sticky top-0 z-[200] border-b backdrop-blur-md"
      >
        <div className="mx-auto flex h-16 w-full max-w-5xl items-center justify-between px-4 leading-none sm:px-6 lg:px-8">
          <div className="flex min-w-0 items-center gap-3">
            {/* App Icon or Brand Logo */}
            {brand.app_icon_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={brand.app_icon_url}
                alt={`${appName} Icon`}
                className="h-8 w-8 rounded-[22%] object-cover shadow-xs ring-1 ring-black/10 dark:ring-white/10"
              />
            ) : brand.logo_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={brand.logo_url}
                alt=""
                aria-hidden="true"
                style={{ borderColor: tokens.border }}
                className="h-7 w-7 rounded-lg border object-cover"
              />
            ) : (
              <span
                aria-hidden="true"
                style={{
                  backgroundColor: tokens.accent,
                  color: tokens.accentInk,
                }}
                className={`flex h-7 w-7 items-center justify-center ${tokens.buttonRadius} text-sm font-semibold`}
              >
                {appName.charAt(0).toUpperCase()}
              </span>
            )}
            <span style={{ color: tokens.ink }} className="truncate text-[15px] font-semibold tracking-tight">{appName}</span>
          </div>

          {/* Navigation Links */}
          <nav aria-label="Main Navigation" className={`${isMobileView ? "hidden" : "hidden md:flex"} items-center gap-7 text-[13px] font-medium`}>
            {navPages.map((page) => (
              <a
                key={page.id}
                href={resolveSubpageHref(page.slug)}
                style={{ color: tokens.inkMuted }}
                className="transition-colors hover:opacity-100 active:opacity-100 opacity-80"
              >
                {page.title}
              </a>
            ))}
          </nav>

          {/* Header Action Button */}
          {hasAnyStore && (
            <a
              href={primaryCtaHref}
              target={isPreview ? "_self" : "_blank"}
              rel="noopener noreferrer"
              onClick={() =>
                handleCtaClick(
                  hasAppStore ? "app_store_nav" : hasPlayStore ? "play_store_nav" : "testflight_nav",
                  hasAppStore
                    ? store_links.app_store_url
                    : hasPlayStore
                    ? store_links.play_store_url
                    : store_links.testflight_url
                )
              }
              style={{
                backgroundColor: tokens.accent,
                color: tokens.accentInk,
              }}
              className={`inline-flex shrink-0 items-center whitespace-nowrap ${tokens.buttonRadius} px-4 py-2 text-[13px] font-semibold transition-all hover:opacity-90 active:scale-[0.98] shadow-xs`}
            >
              {primaryCtaLabel}
            </a>
          )}
        </div>
      </header>

      {/* Hero Section: Diptych with Copy & Photorealistic Hardware iPhone Mockup */}
      <section className="mx-auto w-full max-w-5xl px-4 pt-12 pb-16 sm:px-6 md:pt-16 md:pb-20 lg:px-8">
        <div
          className={
            isMobileView
              ? "flex flex-col items-center text-center gap-10"
              : isTabletView
                ? "flex flex-col items-center text-center gap-12"
                : "flex flex-col lg:flex-row items-center justify-between gap-12 lg:gap-14"
          }
        >
          {/* Left Column: Headline, Copy, Store Badges, Email Form */}
          <div className={isMobileView || isTabletView ? "w-full max-w-xl text-center" : "flex-1 min-w-0 max-w-2xl"}>
            {hero.badge_text && (
              <p
                style={{
                  backgroundColor: tokens.accentSubtle,
                  borderColor: tokens.border,
                  color: tokens.accent,
                }}
                className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold whitespace-nowrap ${
                  isMobileView || isTabletView ? "mx-auto" : ""
                }`}
              >
                <span
                  style={{ backgroundColor: tokens.accent }}
                  className="h-1.5 w-1.5 rounded-full"
                  aria-hidden="true"
                />
                <span>{hero.badge_text}</span>
              </p>
            )}
            <h1
              style={{ color: tokens.ink }}
              className="hero__display mt-5 text-[clamp(2.25rem,4.5vw+0.5rem,3.75rem)] leading-[1.04] font-semibold tracking-[-0.025em] text-balance overflow-wrap-anywhere"
            >
              {hero.header}
            </h1>
            {hero.short_description && (
              <p
                style={{ color: tokens.inkMuted }}
                className={`mt-5 max-w-[55ch] text-base leading-relaxed sm:text-lg ${
                  isMobileView || isTabletView ? "mx-auto" : ""
                }`}
              >
                {hero.short_description}
              </p>
            )}

            {/* Official Store Badges / Download Options */}
            <div className={`mt-8 ${isMobileView ? "text-center" : "text-left"}`}>
              <div
                className={`flex flex-wrap items-center gap-3.5 leading-none ${
                  isMobileView ? "justify-center" : "justify-start"
                }`}
              >
                {/* Apple App Store Official Badge Button */}
                {hasAppStore && store_links.app_store_url && (
                  <AppStoreBadge
                    href={store_links.app_store_url}
                    isPreview={isPreview}
                    onClick={() => handleCtaClick("app_store_hero", store_links.app_store_url)}
                  />
                )}

                {/* Google Play Official Badge Button */}
                {hasPlayStore && store_links.play_store_url && (
                  <GooglePlayBadge
                    href={store_links.play_store_url}
                    isPreview={isPreview}
                    onClick={() => handleCtaClick("play_store_hero", store_links.play_store_url)}
                  />
                )}

                {/* Apple TestFlight Public Beta Button */}
                {hasTestFlight && store_links.testflight_url && (
                  <TestFlightBadge
                    href={store_links.testflight_url}
                    isPreview={isPreview}
                    onClick={() => handleCtaClick("testflight_hero", store_links.testflight_url)}
                  />
                )}

                {!hasAnyStore && !emailCapture.enabled && (
                  <p style={{ color: tokens.inkMuted }} className="text-xs">
                    Store links have not been added yet. Add them in the editor.
                  </p>
                )}
              </div>
            </div>

            {/* Email capture option */}
            {emailCapture.enabled && (
              <div className="mt-8">
                {emailDone ? (
                  <p role="status" className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-4 py-2 text-sm font-medium text-emerald-600 dark:text-emerald-400">
                    <Check className="h-4 w-4" />
                    {emailCapture.successMessage}
                  </p>
                ) : (
                  <form onSubmit={submitEmailCapture} className="max-w-md">
                    <div
                      style={{
                        backgroundColor: tokens.paperSecondary,
                        borderColor: tokens.border,
                      }}
                      className={`flex items-center gap-2 border p-1.5 pl-4 ${tokens.buttonRadius}`}
                    >
                      <Mail style={{ color: tokens.inkMuted }} className="h-4 w-4 shrink-0" aria-hidden="true" />
                      <input
                        type="email"
                        required
                        value={emailValue}
                        onChange={(e) => setEmailValue(e.target.value)}
                        placeholder={emailCapture.placeholder}
                        style={{ color: tokens.ink }}
                        className="min-h-0 w-full min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:opacity-50"
                      />
                      <button
                        type="submit"
                        style={{
                          backgroundColor: tokens.accent,
                          color: tokens.accentInk,
                        }}
                        className={`inline-flex shrink-0 items-center justify-center whitespace-nowrap ${tokens.buttonRadius} px-5 py-2.5 text-[13px] font-semibold transition-opacity hover:opacity-90 active:scale-[0.98]`}
                      >
                        {emailCapture.ctaLabel}
                      </button>
                    </div>
                    {emailError && (
                      <p className="mt-1.5 text-xs text-red-600 dark:text-red-400">
                        {emailError}
                      </p>
                    )}
                  </form>
                )}
              </div>
            )}
          </div>

          {/* Right Column: Photorealistic iPhone Hardware Mockup with Ambient Glow & Floating Cards */}
          <div className="shrink-0 flex items-center justify-center relative">
            {/* Enormous Soft Purple Glow */}
            <div
              aria-hidden="true"
              className="absolute -inset-10 sm:-inset-16 rounded-full bg-gradient-to-tr from-[#6D5DFB]/25 via-[#9D8BFF]/25 to-transparent blur-3xl -z-10 pointer-events-none"
            />

            <IphoneMockup
              imageUrl={hero.device_screenshot_url}
              appName={appName}
              fallbackKind={fallbackKind}
              className={isMobileView ? "w-[270px]" : "w-[280px] sm:w-[300px] md:w-[316px]"}
            />
          </div>
        </div>
      </section>

      {/* Trust Section */}
      {trust && (
        <section aria-label="Social Proof & Trust" className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
          <div
            style={{
              backgroundColor: tokens.paperSecondary,
              borderColor: tokens.border,
            }}
            className="flex flex-col sm:flex-row items-center justify-between gap-6 rounded-2xl border p-6 shadow-xs"
          >
            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 text-center sm:text-left">
              <div className="flex items-center gap-1 text-amber-400">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star key={i} className="h-4 w-4 fill-amber-400 text-amber-400" aria-hidden="true" />
                ))}
              </div>
              <div>
                <div className="flex items-center justify-center sm:justify-start gap-2">
                  <span style={{ color: tokens.ink }} className="text-base font-bold">{trust.rating}</span>
                  <span style={{ color: tokens.inkMuted }} className="text-xs">· Trusted by {trust.review_count_text}</span>
                </div>
                <p style={{ color: tokens.inkMuted }} className="text-xs italic mt-0.5">
                  &ldquo;{trust.featured_quote}&rdquo;
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2.5">
              {hasAppStore && store_links.app_store_url && (
                <AppStoreBadge
                  href={store_links.app_store_url}
                  isPreview={isPreview}
                  className="scale-90"
                />
              )}
              {hasPlayStore && store_links.play_store_url && (
                <GooglePlayBadge
                  href={store_links.play_store_url}
                  isPreview={isPreview}
                  className="scale-90"
                />
              )}
            </div>
          </div>
        </section>
      )}


      {/* Logo wall — press/trust strip */}
      {logo_wall && logo_wall.logos.length > 0 && (
        <section
          aria-label={logo_wall.eyebrow || "Featured in"}
          style={{
            backgroundColor: tokens.paperSecondary,
            borderColor: tokens.border,
          }}
          className="border-y py-8"
        >
          <div className="mx-auto w-full max-w-5xl px-4 sm:px-6 lg:px-8">
            {logo_wall.eyebrow && (
              <p
                style={{ color: tokens.inkMuted }}
                className="text-center text-[11px] font-semibold tracking-widest uppercase"
              >
                {logo_wall.eyebrow}
              </p>
            )}
            <ul className="mt-5 flex flex-wrap items-center justify-center gap-x-10 gap-y-4">
              {logo_wall.logos.slice(0, 12).map((logo) => (
                <li
                  key={logo.id}
                  style={{ color: tokens.inkMuted }}
                  className="flex items-center gap-2.5 grayscale opacity-75 hover:opacity-100 transition-opacity"
                >
                  {logo.image_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={logo.image_url}
                      alt={logo.name}
                      loading="lazy"
                      className="h-6 w-auto object-contain"
                    />
                  ) : (
                    <span className="text-sm font-semibold whitespace-nowrap">{logo.name}</span>
                  )}
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}

      {/* Features breakdown */}
      {features.length > 0 && (
        <section id="features" aria-label="Key Features" className="mx-auto w-full max-w-5xl px-4 py-16 sm:px-6 lg:px-8">
          <div
            style={{ borderColor: tokens.borderStrong }}
            className="border-t-2 pt-4"
          >
            <p
              style={{ color: tokens.inkMuted }}
              className="text-xs font-semibold tracking-widest uppercase"
            >
              Features
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
                      style={{ borderColor: tokens.border }}
                      className={`grid grid-cols-1 gap-6 border-t py-10 ${
                        isMobileView ? "" : "md:grid-cols-2 md:gap-12"
                      }`}
                    >
                      <div className={flip && !isMobileView ? "md:order-2" : ""}>
                        <p
                          style={{ color: tokens.accent }}
                          className="font-mono text-xs font-semibold"
                        >
                          {stage}
                        </p>
                        <h2
                          style={{ color: tokens.ink }}
                          className="section__title mt-2 max-w-md text-2xl font-semibold tracking-tight text-balance"
                        >
                          {feature.title}
                        </h2>
                        <p
                          style={{ color: tokens.inkMuted }}
                          className="mt-3 max-w-[60ch] text-sm leading-relaxed"
                        >
                          {feature.description}
                        </p>
                      </div>
                      <div
                        style={{
                          backgroundColor: tokens.paperSecondary,
                          borderColor: tokens.border,
                        }}
                        className={`min-w-0 overflow-hidden ${tokens.buttonRadius} border ${
                          flip && !isMobileView ? "md:order-1" : ""
                        }`}
                      >
                        {feature.image_url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={feature.image_url}
                            alt=""
                            aria-hidden="true"
                            loading="lazy"
                            className="aspect-[16/10] w-full object-cover"
                          />
                        ) : (
                          <div aria-hidden="true" className="flex items-start gap-3 p-5">
                            <span
                              style={{
                                backgroundColor: tokens.accentSubtle,
                                borderColor: tokens.border,
                                color: tokens.accent,
                              }}
                              className={`flex h-9 w-9 shrink-0 items-center justify-center ${tokens.buttonRadius} border`}
                            >
                              <IconComponent className="h-4 w-4" aria-hidden="true" />
                            </span>
                            <span style={{ color: tokens.inkMuted }} className="text-sm leading-relaxed">
                              {feature.title} — crafted natively for mobile.
                            </span>
                          </div>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ol>
        </section>
      )}

      {/* Product Showcase: 3 alternating sections */}
      {showcase && showcase.length > 0 && (
        <section id="showcase" aria-label="Product Showcase" className="mx-auto w-full max-w-5xl px-4 py-16 sm:px-6 lg:px-8 space-y-24">
          <div className="text-center max-w-2xl mx-auto mb-4">
            <p style={{ color: tokens.accent }} className="text-xs font-bold uppercase tracking-wider">
              Deep Dive
            </p>
            <h2 style={{ color: tokens.ink }} className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl lg:text-4xl text-balance">
              Engineered for seamless daily flow.
            </h2>
          </div>
          {showcase.map((item, idx) => {
            const isReverse = item.align === "right";
            return (
              <div
                key={item.id || idx}
                className={`grid grid-cols-1 items-center gap-12 ${
                  isMobileView ? "" : "md:grid-cols-2"
                } ${isReverse && !isMobileView ? "md:grid-flow-dense" : ""}`}
              >
                <div className={isReverse && !isMobileView ? "md:col-start-2" : ""}>
                  <p style={{ color: tokens.accent }} className="font-mono text-xs font-bold uppercase tracking-wider">
                    0{idx + 1} · Feature Focus
                  </p>
                  <h3 style={{ color: tokens.ink }} className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl text-balance">
                    {item.title}
                  </h3>
                  <p style={{ color: tokens.inkMuted }} className="mt-4 text-base leading-relaxed max-w-[50ch]">
                    {item.description}
                  </p>
                </div>
                <div className={`flex justify-center ${isReverse && !isMobileView ? "md:col-start-1" : ""}`}>
                  <IphoneMockup
                    imageUrl={item.image_url || hero.device_screenshot_url}
                    appName={appName}
                    fallbackKind={fallbackKind}
                    className="w-[260px] sm:w-[280px]"
                  />
                </div>
              </div>
            );
          })}
        </section>
      )}

      {/* Stats Section */}
      {stats && stats.length > 0 && (
        <section aria-label="Metrics & Impact" className="mx-auto w-full max-w-5xl px-4 py-12 sm:px-6 lg:px-8">
          <div
            style={{
              backgroundColor: tokens.paperSecondary,
              borderColor: tokens.border,
            }}
            className="grid grid-cols-2 gap-6 sm:grid-cols-4 rounded-2xl border p-8 shadow-xs text-center"
          >
            {stats.map((s) => (
              <div key={s.id} className="space-y-1">
                <p style={{ color: tokens.accent }} className="text-3xl sm:text-4xl font-extrabold tracking-tight">
                  {s.value}
                </p>
                <p style={{ color: tokens.inkMuted }} className="text-xs font-semibold uppercase tracking-wider">
                  {s.label}
                </p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Testimonials Section */}
      {testimonials && testimonials.length > 0 && (
        <section id="testimonials" aria-label="User Reviews" className="mx-auto w-full max-w-5xl px-4 py-16 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <p style={{ color: tokens.accent }} className="text-xs font-bold uppercase tracking-wider">
              Reviews
            </p>
            <h2 style={{ color: tokens.ink }} className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl lg:text-4xl text-balance">
              Loved by creators worldwide.
            </h2>
          </div>

          {(() => {
            const main = testimonials.find((t) => t.is_main) || testimonials[0];
            const others = testimonials.filter((t) => t !== main);
            return (
              <div className="space-y-8">
                {main && (
                  <div
                    style={{
                      backgroundColor: tokens.paperSecondary,
                      borderColor: tokens.borderStrong,
                    }}
                    className="rounded-2xl border p-8 sm:p-12 text-center max-w-3xl mx-auto shadow-sm"
                  >
                    <div className="flex items-center justify-center gap-1 text-amber-400 mb-4">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star key={i} className="h-5 w-5 fill-amber-400 text-amber-400" aria-hidden="true" />
                      ))}
                    </div>
                    <blockquote style={{ color: tokens.ink }} className="text-xl sm:text-2xl font-medium leading-relaxed">
                      &ldquo;{main.quote}&rdquo;
                    </blockquote>
                    <div className="mt-6">
                      <p style={{ color: tokens.ink }} className="font-bold text-base">{main.name}</p>
                      <p style={{ color: tokens.inkMuted }} className="text-xs">{main.role}</p>
                    </div>
                  </div>
                )}

                {others.length > 0 && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 max-w-3xl mx-auto">
                    {others.map((t) => (
                      <div
                        key={t.id}
                        style={{
                          backgroundColor: tokens.paperSecondary,
                          borderColor: tokens.border,
                        }}
                        className="rounded-2xl border p-6 shadow-xs"
                      >
                        <div className="flex items-center gap-1 text-amber-400 mb-3">
                          {Array.from({ length: 5 }).map((_, i) => (
                            <Star key={i} className="h-3.5 w-3.5 fill-amber-400 text-amber-400" aria-hidden="true" />
                          ))}
                        </div>
                        <p style={{ color: tokens.ink }} className="text-sm leading-relaxed">
                          &ldquo;{t.quote}&rdquo;
                        </p>
                        <div className="mt-4 pt-3 border-t flex items-center justify-between" style={{ borderColor: tokens.border }}>
                          <div>
                            <p style={{ color: tokens.ink }} className="font-semibold text-xs">{t.name}</p>
                            <p style={{ color: tokens.inkMuted }} className="text-[11px]">{t.role}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })()}
        </section>
      )}

      {/* Pricing Section */}
      {pricing && pricing.length > 0 && (
        <section id="pricing" aria-label="Pricing Plans" className="mx-auto w-full max-w-5xl px-4 py-16 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <p style={{ color: tokens.accent }} className="text-xs font-bold uppercase tracking-wider">
              Transparent Pricing
            </p>
            <h2 style={{ color: tokens.ink }} className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl lg:text-4xl text-balance">
              Simple plans for every ambition.
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-stretch">
            {pricing.map((tier) => {
              const isPopular = tier.is_popular;
              return (
                <div
                  key={tier.id}
                  style={{
                    backgroundColor: tokens.paperSecondary,
                    borderColor: isPopular ? tokens.accent : tokens.border,
                  }}
                  className={`relative flex flex-col justify-between rounded-2xl border p-8 shadow-xs transition-all ${
                    isPopular
                      ? "ring-2 ring-[#5B5BF7] shadow-lg md:-translate-y-2"
                      : ""
                  }`}
                >
                  {isPopular && (
                    <span
                      style={{
                        backgroundColor: tokens.accent,
                        color: tokens.accentInk,
                      }}
                      className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full px-3 py-1 text-[11px] font-bold tracking-wide uppercase shadow-xs whitespace-nowrap"
                    >
                      Most Popular
                    </span>
                  )}
                  <div>
                    <h3 style={{ color: tokens.ink }} className="text-lg font-bold">
                      {tier.name}
                    </h3>
                    {tier.description && (
                      <p style={{ color: tokens.inkMuted }} className="text-xs mt-1">
                        {tier.description}
                      </p>
                    )}
                    <div className="mt-5 flex items-baseline gap-1">
                      <span style={{ color: tokens.ink }} className="text-3xl sm:text-4xl font-extrabold tracking-tight">
                        {tier.price}
                      </span>
                      <span style={{ color: tokens.inkMuted }} className="text-xs font-medium">
                        {tier.period}
                      </span>
                    </div>
                    <ul className="mt-6 space-y-2.5 text-xs" style={{ color: tokens.inkMuted }}>
                      {tier.features.map((feat, i) => (
                        <li key={i} className="flex items-start gap-2">
                          <Check style={{ color: tokens.accent }} className="h-4 w-4 shrink-0 stroke-[2.5]" />
                          <span>{feat}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="mt-8">
                    <a
                      href="#download"
                      style={{
                        backgroundColor: isPopular ? tokens.accent : "transparent",
                        color: isPopular ? tokens.accentInk : tokens.ink,
                        borderColor: isPopular ? "transparent" : tokens.borderStrong,
                      }}
                      className={`inline-flex w-full items-center justify-center font-semibold text-xs px-4 py-2.5 ${tokens.buttonRadius} border transition-opacity hover:opacity-90 active:scale-[0.98] shadow-xs`}
                    >
                      {tier.cta_label}
                    </a>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* FAQ Section */}
      {faq && faq.length > 0 && (
        <section id="faq" aria-label="Frequently Asked Questions" className="mx-auto w-full max-w-3xl px-4 py-16 sm:px-6 lg:px-8">
          <div className="text-center mb-10">
            <p style={{ color: tokens.accent }} className="text-xs font-bold uppercase tracking-wider">
              Answers
            </p>
            <h2 style={{ color: tokens.ink }} className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl text-balance">
              Frequently asked questions.
            </h2>
          </div>
          <div className="space-y-3">
            {faq.map((item, idx) => {
              const isOpen = openFaqIndex === idx;
              return (
                <div
                  key={item.id || idx}
                  style={{
                    backgroundColor: tokens.paperSecondary,
                    borderColor: tokens.border,
                  }}
                  className="rounded-2xl border overflow-hidden shadow-xs transition-colors"
                >
                  <button
                    type="button"
                    onClick={() => setOpenFaqIndex(isOpen ? null : idx)}
                    className="flex w-full items-center justify-between p-5 text-left transition-colors hover:bg-black/[0.02]"
                  >
                    <span style={{ color: tokens.ink }} className="text-sm font-semibold pr-4">
                      {item.question}
                    </span>
                    <span style={{ color: tokens.accent }} className="shrink-0">
                      {isOpen ? (
                        <Minus className="h-4 w-4 stroke-[2.5]" />
                      ) : (
                        <Plus className="h-4 w-4 stroke-[2.5]" />
                      )}
                    </span>
                  </button>
                  {isOpen && (
                    <div className="px-5 pb-5 pt-1 text-xs leading-relaxed border-t" style={{ borderColor: tokens.border, color: tokens.inkMuted }}>
                      {item.answer}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Release Panel: App Store listing with rating/version proof */}
      {release && (
        <section aria-label="App release" className="mx-auto w-full max-w-5xl px-4 py-14 sm:px-6 lg:px-8">
          <div
            style={{
              backgroundColor: tokens.paperSecondary,
              borderColor: tokens.border,
            }}
            className={`grid grid-cols-1 items-center gap-8 ${tokens.buttonRadius} border p-6 sm:p-10 ${
              isMobileView ? "" : "md:grid-cols-2"
            } shadow-xs`}
          >
            <div className="min-w-0">
              {release.eyebrow && (
                <p
                  style={{ color: tokens.accent }}
                  className="text-xs font-semibold tracking-widest uppercase"
                >
                  {release.eyebrow}
                </p>
              )}
              <h2
                style={{ color: tokens.ink }}
                className="section__title mt-2 text-2xl font-semibold tracking-tight text-balance sm:text-3xl"
              >
                {release.title}
              </h2>
              <p
                style={{ color: tokens.inkMuted }}
                className="mt-3 max-w-[52ch] text-sm leading-relaxed"
              >
                {release.description}
              </p>
              <dl className="mt-6 flex flex-wrap items-center gap-x-8 gap-y-4">
                {release.rating && (
                  <div>
                    <dt className="sr-only">Average rating</dt>
                    <dd>
                      <span className="flex items-center gap-1" role="img" aria-label={`${release.rating} out of 5 stars`}>
                        {Array.from({ length: 5 }).map((_, i) => (
                          <Star key={i} className="h-3.5 w-3.5 fill-amber-400 text-amber-400" aria-hidden="true" />
                        ))}
                      </span>
                      <span style={{ color: tokens.ink }} className="mt-1 block text-xs font-semibold">
                        {release.rating}
                        {release.rating_count && <span style={{ color: tokens.inkMuted }} className="font-normal"> · {release.rating_count}</span>}
                      </span>
                    </dd>
                  </div>
                )}
                {release.age_rating && (
                  <div>
                    <dt className="sr-only">Age rating</dt>
                    <dd className="text-center">
                      <span
                        style={{ borderColor: tokens.border, color: tokens.ink }}
                        className={`inline-flex h-9 w-9 items-center justify-center ${tokens.buttonRadius} border text-xs font-bold`}
                      >
                        {release.age_rating}
                      </span>
                      <span style={{ color: tokens.inkMuted }} className="mt-1 block text-[11px]">Age</span>
                    </dd>
                  </div>
                )}
                {release.chart_rank && (
                  <div>
                    <dt className="sr-only">Chart position</dt>
                    <dd className="text-center">
                      <span style={{ color: tokens.ink }} className="text-lg font-semibold">{release.chart_rank}</span>
                      <span style={{ color: tokens.inkMuted }} className="mt-0.5 block text-[11px]">Top chart</span>
                    </dd>
                  </div>
                )}
                {release.version && (
                  <div>
                    <dt className="sr-only">Version</dt>
                    <dd className="text-center">
                      <span style={{ color: tokens.ink }} className="font-mono text-sm font-semibold">v{release.version}</span>
                      <span style={{ color: tokens.inkMuted }} className="mt-0.5 block text-[11px]">Latest</span>
                    </dd>
                  </div>
                )}
              </dl>
              {release.release_notes && release.release_notes.length > 0 && (
                <ul style={{ color: tokens.inkMuted }} className="mt-6 space-y-2 text-[13px]">
                  {release.release_notes.map((note, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <Check style={{ color: tokens.accent }} className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                      <span>{note}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="min-w-0 flex justify-center">
              {release.image_url ? (
                <figure
                  style={{
                    backgroundColor: tokens.paper,
                    borderColor: tokens.border,
                  }}
                  className={`overflow-hidden ${tokens.buttonRadius} border`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={release.image_url}
                    alt={`${appName} preview`}
                    loading="lazy"
                    className="aspect-[4/5] w-full object-cover"
                  />
                </figure>
              ) : (
                <IphoneMockup
                  imageUrl={hero.device_screenshot_url}
                  appName={appName}
                  fallbackKind={fallbackKind}
                />
              )}
            </div>
          </div>
        </section>
      )}

      {/* Final Download Call to Action */}
      <section id="download" className="mx-auto w-full max-w-5xl px-4 pb-20 sm:px-6 lg:px-8">
        <div
          style={{
            backgroundColor: tokens.paperSecondary,
            borderColor: tokens.borderStrong,
          }}
          className={`${tokens.buttonRadius} border p-8 sm:p-14 shadow-md text-center flex flex-col items-center relative overflow-hidden`}
        >
          {/* Subtle Ambient Radial Glow */}
          <div
            aria-hidden="true"
            className="absolute -top-24 left-1/2 -translate-x-1/2 w-96 h-96 rounded-full bg-gradient-to-b from-[#6D5DFB]/15 via-[#9D8BFF]/10 to-transparent blur-3xl -z-10 pointer-events-none"
          />
          <h2
            style={{ color: tokens.ink }}
            className="max-w-2xl text-2xl font-bold tracking-tight text-balance sm:text-4xl"
          >
            {`Get started with ${appName} today.`}
          </h2>
          <p style={{ color: tokens.inkMuted }} className="mt-3 text-sm sm:text-base max-w-md">
            Download now and transform your everyday routine with clarity.
          </p>
          <div className="mt-7 flex flex-wrap items-center justify-center gap-3.5 leading-none">
            {hasAppStore && store_links.app_store_url && (
              <AppStoreBadge
                href={store_links.app_store_url}
                isPreview={isPreview}
                onClick={() => handleCtaClick("app_store_footer", store_links.app_store_url)}
              />
            )}
            {hasPlayStore && store_links.play_store_url && (
              <GooglePlayBadge
                href={store_links.play_store_url}
                isPreview={isPreview}
                onClick={() => handleCtaClick("play_store_footer", store_links.play_store_url)}
              />
            )}
            {hasTestFlight && store_links.testflight_url && (
              <TestFlightBadge
                href={store_links.testflight_url}
                isPreview={isPreview}
                onClick={() => handleCtaClick("testflight_footer", store_links.testflight_url)}
              />
            )}
          </div>
          {/* Single iPhone below final CTA */}
          <div className="mt-12 -mb-28 flex justify-center">
            <IphoneMockup
              imageUrl={hero.device_screenshot_url}
              appName={appName}
              fallbackKind={fallbackKind}
              className="w-[240px] sm:w-[270px]"
            />
          </div>
        </div>
      </section>

      {/* Footer with App Store Compliance & Multi-column Links */}
      <footer
        style={{ borderColor: tokens.border }}
        className="border-t pt-14 pb-10"
      >
        <div className="mx-auto w-full max-w-5xl px-4 sm:px-6 lg:px-8">
          {footer.columns && footer.columns.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-8 pb-12">
              {footer.columns.map((col, i) => (
                <div key={i} className="space-y-3">
                  <p style={{ color: tokens.ink }} className="text-xs font-bold uppercase tracking-wider">
                    {col.heading}
                  </p>
                  <ul className="space-y-2 text-xs">
                    {col.links.map((link, j) => (
                      <li key={j}>
                        <a
                          href={link.url}
                          style={{ color: tokens.inkMuted }}
                          className="transition-colors hover:opacity-100 opacity-80"
                        >
                          {link.label}
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between pb-8">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  {brand.app_icon_url && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={brand.app_icon_url}
                      alt=""
                      className="h-6 w-6 rounded-[22%] object-cover ring-1 ring-black/10"
                    />
                  )}
                  <p style={{ color: tokens.ink }} className="text-lg font-semibold tracking-tight">{footer.brand_name || appName}</p>
                </div>
                <p style={{ color: tokens.inkMuted }} className="mt-1 max-w-[52ch] text-[13px]">
                  {footer.tagline || `Official application website for ${appName}.`}
                </p>
              </div>

              {/* Legal & Compliance Nav Links */}
              <nav aria-label="Legal" className="flex flex-wrap items-center gap-5 text-[13px] leading-none">
                {footerPages.map((page) => (
                  <a
                    key={page.id}
                    href={resolveSubpageHref(page.slug)}
                    style={{ color: tokens.inkMuted }}
                    className="whitespace-nowrap transition-colors hover:opacity-100 opacity-80"
                  >
                    {page.title}
                  </a>
                ))}
                {footer.contact_email && (
                  <a
                    href={`mailto:${footer.contact_email}`}
                    style={{ color: tokens.inkMuted }}
                    className="inline-flex items-center gap-1.5 whitespace-nowrap transition-colors hover:opacity-100 opacity-80"
                  >
                    <Mail className="h-3.5 w-3.5" aria-hidden="true" />
                    <span>Contact</span>
                  </a>
                )}
              </nav>
            </div>
          )}

          <div
            style={{ borderColor: tokens.border }}
            className="flex flex-col gap-3 border-t pt-6 text-xs sm:flex-row sm:items-center sm:justify-between"
          >
            <p style={{ color: tokens.inkMuted }}>© 2026 {footer.brand_name || appName}. All rights reserved.</p>
            {showWatermark && (
              <a
                href="https://shipsprint.site"
                target="_blank"
                rel="noopener noreferrer"
                style={{ borderColor: tokens.border, color: tokens.inkMuted }}
                className="inline-flex w-fit items-center whitespace-nowrap rounded-full border px-3 py-1 text-[11px] font-medium transition-colors hover:opacity-100 opacity-80"
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
