/* Hallmark · pre-emit critique: P5 H5 E4 S5 R5 V5 */
/* Renderer: Narrative Workflow (stages 1.0/2.0/3.0, thick numbered rules) · Nav N9 edge-aligned minimal · Footer Ft1 mast-headed · knobs differ from marketing Split Studio */
"use client";

import { useEffect, useState } from "react";
import type { SiteContent, Plan } from "@/types/database";
import { safeHref } from "@/lib/validation";
import { appOrigin } from "@/lib/redirect";
import { trackEvent } from "@/lib/track-client";
import { Check, Mail, Star } from "lucide-react";
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
    logo_wall,
    release,
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
    // Visual-only in the sample phase: validates + confirms inline.
    // TODO: POST /api/leads { site_id, email } once lead storage ships.
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailValue.trim())) {
      setEmailError("Enter a valid email address.");
      return;
    }
    setEmailError("");
    setEmailDone(true);
  };
  const phoneFeatures = features.filter((f) => f.image_url).slice(0, 3);

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
                  store_links.app_store_url ? "app_store_nav" : "play_store_nav",
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
          {!hasStoreLinks && !emailCapture.enabled && (
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              Store links have not been added yet.
            </p>
          )}
        </div>
        {/* Email capture — visual-only until lead storage ships */}
        {emailCapture.enabled &&
          (emailDone ? (
            <p role="status" className="mt-6 inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-medium text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
              {emailCapture.successMessage}
            </p>
          ) : (
            <form onSubmit={submitEmailCapture} className="mt-6 max-w-md" noValidate={false}>
              <div className="flex items-center gap-2 rounded-full border border-zinc-300 bg-white p-1.5 pl-4 dark:border-zinc-700 dark:bg-zinc-950">
                <Mail className="h-4 w-4 shrink-0 text-zinc-500" aria-hidden="true" />
                <label htmlFor="site-email-capture" className="sr-only">
                  Email address
                </label>
                <input
                  id="site-email-capture"
                  type="email"
                  required
                  value={emailValue}
                  onChange={(event) => setEmailValue(event.target.value)}
                  placeholder={emailCapture.placeholder}
                  className="min-h-0 w-full min-w-0 flex-1 bg-transparent text-sm text-zinc-950 outline-none placeholder:text-zinc-500 dark:text-zinc-50"
                />
                <button
                  type="submit"
                  className="inline-flex shrink-0 items-center justify-center whitespace-nowrap rounded-full bg-blue-600 px-5 py-2.5 text-[13px] font-semibold text-white transition-colors hover:bg-blue-700 active:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-55"
                >
                  {emailCapture.ctaLabel}
                </button>
              </div>
              <p className="helper-slot mt-1.5 min-h-[1lh] text-xs text-red-600 dark:text-red-400" role={emailError ? "alert" : undefined}>
                {emailError}
              </p>
            </form>
          ))}
      </section>

      {/* Logo wall — press/trust strip */}
      {logo_wall && logo_wall.logos.length > 0 && (
        <section aria-label={logo_wall.eyebrow || "Featured in"} className="border-y border-zinc-200 bg-zinc-50/60 dark:border-zinc-800 dark:bg-zinc-900/20">
          <div className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
            {logo_wall.eyebrow && (
              <p className="text-center text-[11px] font-semibold tracking-widest text-zinc-600 uppercase dark:text-zinc-400">
                {logo_wall.eyebrow}
              </p>
            )}
            <ul className="mt-5 flex flex-wrap items-center justify-center gap-x-10 gap-y-4">
              {logo_wall.logos.slice(0, 12).map((logo) => (
                <li key={logo.id} className="flex items-center gap-2.5 text-zinc-500 grayscale dark:text-zinc-400">
                  {logo.image_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={logo.image_url}
                      alt={logo.name}
                      loading="lazy"
                      className="h-6 w-auto object-contain opacity-70"
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
                    className={`min-w-0 overflow-hidden rounded-xl border border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900/40 ${flip ? "md:order-1" : ""}`}
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
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-zinc-200 bg-white text-blue-600 dark:border-zinc-700 dark:bg-zinc-950 dark:text-blue-400">
                          <IconComponent className="h-4 w-4" aria-hidden="true" />
                        </span>
                        <span className="text-sm leading-relaxed text-zinc-600 dark:text-zinc-300">
                          Stage {stage} — {feature.title}. Small, concrete, done in
                          the app itself.
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

      {/* Dark phone band — up to 3 feature phones with captions */}
      {phoneFeatures.length > 0 && (
        <section aria-label="App highlights" className="mt-14 bg-zinc-950 py-16 text-white sm:py-20 dark:bg-zinc-900">
          <div className="mx-auto w-full max-w-5xl px-4 sm:px-6 lg:px-8">
            <h2 className="mx-auto max-w-2xl text-center text-2xl font-semibold tracking-tight text-balance sm:text-4xl">
              Made for the moments that matter.
            </h2>
            <div className="mt-12 grid grid-cols-1 gap-8 sm:grid-cols-3">
              {phoneFeatures.map((feature) => {
                const PhoneIcon = getFeatureIcon(feature.icon);
                return (
                  <figure key={feature.id} className="min-w-0">
                    <div className="overflow-hidden rounded-[2rem] border border-zinc-800 bg-zinc-900 p-2">
                      <div className="overflow-hidden rounded-[1.6rem] bg-white">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={feature.image_url}
                          alt={`${feature.title} in ${appName}`}
                          loading="lazy"
                          className="aspect-[9/16] w-full object-cover"
                        />
                      </div>
                    </div>
                    <figcaption className="mt-4 text-center">
                      <p className="flex items-center justify-center gap-1.5 text-[15px] font-semibold">
                        <PhoneIcon className="h-4 w-4 text-blue-400" aria-hidden="true" />
                        {feature.title}
                      </p>
                      <p className="mx-auto mt-1 max-w-[40ch] text-[13px] leading-relaxed text-zinc-400">
                        {feature.description}
                      </p>
                    </figcaption>
                  </figure>
                );
              })}
            </div>
          </div>
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

      {/* Release panel — App Store listing with rating/version proof */}
      {release && (
        <section aria-label="App release" className="mx-auto w-full max-w-5xl px-4 py-14 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 items-center gap-8 rounded-3xl border border-zinc-200 bg-zinc-50 p-6 sm:p-10 md:grid-cols-2 dark:border-zinc-800 dark:bg-zinc-900/30">
            <div className="min-w-0">
              {release.eyebrow && (
                <p className="text-xs font-semibold tracking-widest text-blue-600 uppercase dark:text-blue-400">
                  {release.eyebrow}
                </p>
              )}
              <h2 className="section__title mt-2 text-2xl font-semibold tracking-tight text-balance sm:text-3xl">
                {release.title}
              </h2>
              <p className="mt-3 max-w-[52ch] text-sm leading-relaxed text-zinc-600 dark:text-zinc-300">
                {release.description}
              </p>
              <dl className="mt-6 flex flex-wrap items-center gap-x-8 gap-y-4">
                {release.rating && (
                  <div>
                    <dt className="sr-only">Average rating</dt>
                    <dd>
                      <span className="flex items-center gap-1" role="img" aria-label={`${release.rating} out of 5 stars${release.rating_count ? ` from ${release.rating_count}` : ""}`}>
                        {Array.from({ length: 5 }).map((_, i) => (
                          <Star key={i} className="h-3.5 w-3.5 fill-amber-400 text-amber-400" aria-hidden="true" />
                        ))}
                      </span>
                      <span className="mt-1 block text-xs font-semibold">
                        {release.rating}
                        {release.rating_count && <span className="font-normal text-zinc-600 dark:text-zinc-400"> · {release.rating_count}</span>}
                      </span>
                    </dd>
                  </div>
                )}
                {release.age_rating && (
                  <div>
                    <dt className="sr-only">Age rating</dt>
                    <dd className="text-center">
                      <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-zinc-300 text-xs font-bold dark:border-zinc-700">
                        {release.age_rating}
                      </span>
                      <span className="mt-1 block text-[11px] text-zinc-600 dark:text-zinc-400">Age</span>
                    </dd>
                  </div>
                )}
                {release.chart_rank && (
                  <div>
                    <dt className="sr-only">Chart position</dt>
                    <dd className="text-center">
                      <span className="text-lg font-semibold">{release.chart_rank}</span>
                      <span className="mt-0.5 block text-[11px] text-zinc-600 dark:text-zinc-400">Top chart</span>
                    </dd>
                  </div>
                )}
                {release.version && (
                  <div>
                    <dt className="sr-only">Version</dt>
                    <dd className="text-center">
                      <span className="font-mono text-sm font-semibold">v{release.version}</span>
                      <span className="mt-0.5 block text-[11px] text-zinc-600 dark:text-zinc-400">Latest</span>
                    </dd>
                  </div>
                )}
              </dl>
              {release.release_notes.length > 0 && (
                <ul className="mt-6 space-y-2 text-[13px] text-zinc-600 dark:text-zinc-300">
                  {release.release_notes.map((note, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-600" aria-hidden="true" />
                      <span>{note}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div className="min-w-0">
              {release.image_url ? (
                <figure className="overflow-hidden rounded-2xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={release.image_url}
                    alt={`${appName} app preview`}
                    loading="lazy"
                    className="aspect-[4/5] w-full object-cover"
                  />
                </figure>
              ) : (
                hasStoreLinks && (
                  <div className="flex flex-wrap items-center gap-3 leading-none">
                    {store_links.app_store_url && (
                      <a
                        href={safeHref(store_links.app_store_url)}
                        target={isPreview ? "_self" : "_blank"}
                        rel="noopener noreferrer"
                        onClick={() => handleCtaClick("app_store_release", store_links.app_store_url)}
                        className="inline-flex items-center justify-center whitespace-nowrap rounded-full bg-zinc-950 px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-zinc-800 active:bg-zinc-800 dark:bg-zinc-50 dark:text-zinc-950 dark:hover:bg-white"
                      >
                        Download on App Store
                      </a>
                    )}
                    {store_links.play_store_url && (
                      <a
                        href={safeHref(store_links.play_store_url)}
                        target={isPreview ? "_self" : "_blank"}
                        rel="noopener noreferrer"
                        onClick={() => handleCtaClick("play_store_release", store_links.play_store_url)}
                        className="inline-flex items-center justify-center whitespace-nowrap rounded-full border border-zinc-300 bg-white px-6 py-3 text-sm font-medium text-zinc-950 transition-colors hover:bg-zinc-50 active:bg-zinc-100 dark:border-zinc-700 dark:bg-transparent dark:text-zinc-50 dark:hover:bg-zinc-900"
                      >
                        Get it on Google Play
                      </a>
                    )}
                  </div>
                )
              )}
            </div>
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
                {footer.tagline || "A launch page built with ShipSprint."}
              </p>
            </div>
            {footer.columns && footer.columns.length > 0 ? (
              <div className="grid min-w-0 grid-cols-2 gap-8 sm:grid-cols-3">
                {footer.columns.slice(0, 4).map((column) => (
                  <div key={column.heading} className="min-w-0">
                    <p className="text-[11px] font-semibold tracking-widest text-zinc-600 uppercase dark:text-zinc-400">
                      {column.heading}
                    </p>
                    <ul className="mt-3 space-y-2.5 text-[13px] leading-none text-zinc-600 dark:text-zinc-400">
                      {column.links.map((link) => (
                        <li key={link.label}>
                          <a
                            href={resolveAppHref(link.url)}
                            className="whitespace-nowrap transition-colors hover:text-zinc-950 active:text-zinc-950 dark:hover:text-zinc-100"
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
            )}
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
