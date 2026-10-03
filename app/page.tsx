/* Hallmark · pre-emit critique: P5 H5 E4 S5 R5 V5 */
/* Marketing: Split Studio · H2 split diptych (ratio 7/5, divider hairline) · F3 tabular spec + alternating proof rows · N5 floating pill · Ft2 inline single line */
import Link from "next/link";
import { ShipSprintLogo } from "@/components/brand/logo";
import { unstable_cache } from "next/cache";
import { fetchCatalogue, groupTiers } from "@/lib/catalogue";
import { FREE_PLAN, formatPrice, PLAN_FEATURES, planForDisplay } from "@/lib/plans";
import { yearlySavingPercent } from "@/types/billing";
import { ArrowRight, ArrowUpRight, Check } from "lucide-react";

/**
 * Prices come from the `products` table, not from literals in this file.
 * Cached for five minutes so the marketing page stays a static, cacheable
 * document rather than a per-request render.
 */
const getCatalogue = unstable_cache(fetchCatalogue, ["pricing-catalogue"], {
  revalidate: 300,
  tags: ["catalogue"],
});

export default async function HomePage() {
  const { plans, products } = await getCatalogue();

  const freePlan = plans.find((p) => p.id === "free") ?? FREE_PLAN;

  const tiers = groupTiers(plans, products, planForDisplay).map((tier) => ({
    ...tier,
    savingPercent: yearlySavingPercent(
      tier.monthly.price_cents,
      tier.yearly.price_cents
    ),
  }));

  return (
    <div className="min-h-screen bg-white text-zinc-950 antialiased selection:bg-zinc-950 selection:text-white dark:bg-zinc-950 dark:text-zinc-50 dark:selection:bg-zinc-50 dark:selection:text-zinc-950">
      {/* N5 floating pill — detached, content-sized, blur backdrop */}
      <div className="sticky top-0 z-[300] px-4 pt-4">
        <header className="mx-auto flex h-14 w-full max-w-3xl items-center justify-between gap-4 rounded-full border border-zinc-200 bg-white/90 py-2 pl-5 pr-2 shadow-[0_8px_24px_-12px_rgb(0,0,0,0.18)] backdrop-blur-md dark:border-zinc-800 dark:bg-zinc-900/90">
          <ShipSprintLogo href="/" size="sm" priority />
          <nav aria-label="Primary" className="hidden items-center gap-6 text-[13px] font-medium text-zinc-600 sm:flex dark:text-zinc-300">
            <a href="#how" className="whitespace-nowrap transition-colors hover:text-zinc-950 active:text-zinc-950 dark:hover:text-white">
              How it works
            </a>
            <Link href="/templates" className="whitespace-nowrap transition-colors hover:text-zinc-950 active:text-zinc-950 dark:hover:text-white">
              Templates
            </Link>
            <a href="#pricing" className="whitespace-nowrap transition-colors hover:text-zinc-950 active:text-zinc-950 dark:hover:text-white">
              Pricing
            </a>
          </nav>
          <div className="flex items-center gap-2 leading-none">
            <Link
              href="/login"
              className="whitespace-nowrap rounded-full px-3.5 py-2 text-[13px] font-medium text-zinc-600 transition-colors hover:text-zinc-950 active:text-zinc-950 dark:text-zinc-300 dark:hover:text-white"
            >
              Sign in
            </Link>
            <Link
              href="/signup"
              className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full bg-zinc-950 px-4 py-2 text-[13px] font-medium text-white transition-colors hover:bg-zinc-800 active:bg-zinc-800 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-55 dark:bg-zinc-50 dark:text-zinc-950 dark:hover:bg-white"
            >
              <span>Get started</span>
              <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
            </Link>
          </div>
        </header>
      </div>

      {/* H2 split diptych hero — title left, lede/proof right. Off-axis by construction. */}
      <section className="mx-auto grid w-full max-w-6xl grid-cols-1 gap-10 px-4 pt-16 pb-20 sm:px-6 md:grid-cols-7 md:pt-24 md:pb-28 lg:px-8">
        <div className="md:col-span-4">
          <p className="mb-4 inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-white px-3 py-1 text-xs font-medium text-zinc-600 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300">
            <span className="h-1.5 w-1.5 rounded-full bg-blue-600" aria-hidden="true" />
            <span>For indie iOS &amp; Android developers</span>
          </p>
          <h1 className="hero__display max-w-xl text-[clamp(2.5rem,5vw+0.5rem,4.25rem)] leading-[1.02] font-semibold tracking-[-0.03em] text-balance">
            Launch a landing page for your app in 3 minutes.
          </h1>
          <div className="mt-6 flex flex-wrap items-center gap-3 leading-none">
            <Link
              href="/signup"
              className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full bg-zinc-950 px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-zinc-800 active:bg-zinc-800 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-55 dark:bg-zinc-50 dark:text-zinc-950 dark:hover:bg-white"
            >
              <span>Start building for free</span>
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
            <a
              href="#pricing"
              className="inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-full border border-zinc-300 bg-white px-6 py-3 text-sm font-medium text-zinc-900 transition-colors hover:border-zinc-400 hover:bg-zinc-50 active:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100 dark:hover:bg-zinc-900"
            >
              <span>View plans</span>
              <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
            </a>
          </div>
          <p className="mt-4 text-[13px] text-zinc-600 dark:text-zinc-400">
            Free subdomain included. No credit card. Cancel anytime.
          </p>
        </div>
        <div className="md:col-span-3">
          <p className="max-w-[52ch] text-base leading-relaxed text-zinc-600 sm:text-lg dark:text-zinc-300">
            The landing-page builder tailored for indie apps. Zero setup,
            Apple-grade design, instant store buttons, and a live preview that
            matches the published page pixel-for-pixel.
          </p>
          <dl className="mt-8 grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-zinc-200 bg-zinc-200 text-left dark:border-zinc-800 dark:bg-zinc-800">
            <div className="bg-white p-4 dark:bg-zinc-950">
              <dt className="text-xs font-medium text-zinc-600 dark:text-zinc-400">Setup</dt>
              <dd className="mt-1 text-sm font-semibold">3 minutes</dd>
            </div>
            <div className="bg-white p-4 dark:bg-zinc-950">
              <dt className="text-xs font-medium text-zinc-600 dark:text-zinc-400">Preview drift</dt>
              <dd className="mt-1 text-sm font-semibold">Zero — same component</dd>
            </div>
          </dl>
        </div>
      </section>

      {/* Live proof — single figure, hairline frame. No fake chrome, no nesting. */}
      <section className="mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8">
        <figure className="overflow-hidden rounded-2xl border border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900/40">
          <div className="grid grid-cols-1 gap-0 md:grid-cols-2">
            <div className="p-6 sm:p-10">
              <p className="text-xs font-semibold tracking-wider text-blue-600 uppercase dark:text-blue-400">
                Live example
              </p>
              <h2 className="section__title mt-2 max-w-md text-2xl font-semibold tracking-tight text-balance sm:text-3xl">
                ZenHabit — Daily Mindfulness
              </h2>
              <p className="mt-3 max-w-[52ch] text-sm leading-relaxed text-zinc-600 dark:text-zinc-300">
                Gentle nudges, intuitive progress rings, and private cloud sync
                designed to make healthy routines stick without anxiety.
              </p>
              <p className="mt-3 font-mono text-xs text-zinc-600 dark:text-zinc-400">
                zenhabit.shipsprint.site
              </p>
              <div className="mt-6 flex flex-wrap items-center gap-3 leading-none">
                <span className="inline-flex items-center whitespace-nowrap rounded-full bg-zinc-950 px-4 py-2.5 text-xs font-medium text-white dark:bg-zinc-50 dark:text-zinc-950">
                  Download on App Store
                </span>
                <span className="inline-flex items-center whitespace-nowrap rounded-full border border-zinc-300 px-4 py-2.5 text-xs font-medium text-zinc-900 dark:border-zinc-700 dark:text-zinc-100">
                  Get it on Google Play
                </span>
              </div>
            </div>
            <div className="border-t border-zinc-200 bg-white p-6 sm:p-10 dark:border-zinc-800 dark:bg-zinc-950">
              <p className="text-xs font-semibold tracking-wider text-zinc-600 uppercase dark:text-zinc-400">
                What the visitor sees
              </p>
              <ul className="mt-4 space-y-3 text-sm text-zinc-800 dark:text-zinc-200">
                <li className="flex items-start gap-2.5">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-blue-600" aria-hidden="true" />
                  <span>Store buttons with instant, cookieless click tracking</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-blue-600" aria-hidden="true" />
                  <span>Custom domain with automatic TLS on paid plans</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-blue-600" aria-hidden="true" />
                  <span>Published page renders from the same component as the editor</span>
                </li>
              </ul>
            </div>
          </div>
        </figure>
      </section>

      {/* Split Studio proof modules — alternating text/proof, hairline dividers */}
      <section id="how" className="mx-auto w-full max-w-6xl px-4 py-20 sm:px-6 md:py-28 lg:px-8">
        <div className="section__head block max-w-2xl">
          <p className="text-xs font-semibold tracking-widest text-blue-600 uppercase dark:text-blue-400">
            Why ShipSprint
          </p>
          <h2 className="section__title mt-2 text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
            Engineered for mobile apps, not generic websites
          </h2>
        </div>

        <div className="mt-12 space-y-0 border-t border-zinc-200 dark:border-zinc-800">
          <div className="grid grid-cols-1 gap-6 border-b border-zinc-200 py-10 md:grid-cols-2 md:gap-12 dark:border-zinc-800">
            <div>
              <h3 className="text-lg font-semibold tracking-tight">Zero-drift live editor</h3>
              <p className="mt-2 max-w-[60ch] text-sm leading-relaxed text-zinc-600 dark:text-zinc-300">
                What you see in the editor is what visitors see live. The same
                React component powers both environments — no screenshot
                approximations, no drift between draft and publish.
              </p>
            </div>
            <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-5 text-sm text-zinc-600 dark:border-zinc-800 dark:bg-zinc-900/40 dark:text-zinc-300">
              Edit once, publish everywhere. Draft and live share one render path,
              covered by visual-regression tests.
            </div>
          </div>
          <div className="grid grid-cols-1 gap-6 border-b border-zinc-200 py-10 md:grid-cols-2 md:gap-12 dark:border-zinc-800">
            <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-5 text-sm text-zinc-600 md:order-1 dark:border-zinc-800 dark:bg-zinc-900/40 dark:text-zinc-300">
              Connect your domain, verify DNS, and TLS issues automatically.
              Status is read from the database — never claimed before it is true.
            </div>
            <div className="md:order-2">
              <h3 className="text-lg font-semibold tracking-tight">Custom domains &amp; auto-TLS</h3>
              <p className="mt-2 max-w-[60ch] text-sm leading-relaxed text-zinc-600 dark:text-zinc-300">
                Paid plans add custom domains with verifiable DNS checks and
                on-demand certificates. Free plans get a subdomain instantly.
              </p>
            </div>
          </div>
          <div className="grid grid-cols-1 gap-6 border-b border-zinc-200 py-10 md:grid-cols-2 md:gap-12 dark:border-zinc-800">
            <div>
              <h3 className="text-lg font-semibold tracking-tight">Cookieless conversion tracking</h3>
              <p className="mt-2 max-w-[60ch] text-sm leading-relaxed text-zinc-600 dark:text-zinc-300">
                A lightweight beacon counts store-button taps per published site.
                No cookies, no banners, rate-limited and bot-filtered so numbers
                stay trustworthy.
              </p>
            </div>
            <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-5 text-sm text-zinc-600 dark:border-zinc-800 dark:bg-zinc-900/40 dark:text-zinc-300">
              Aggregated server-side. Raw events roll up daily and expire after
              90 days.
            </div>
          </div>
        </div>
      </section>

      {/* Pricing — comparison table, real DB prices, no icon tiles */}
      <section id="pricing" className="border-t border-zinc-200 bg-zinc-50/60 dark:border-zinc-800 dark:bg-zinc-900/20">
        <div className="mx-auto w-full max-w-6xl px-4 py-20 sm:px-6 md:py-28 lg:px-8">
          <div className="section__head block max-w-2xl">
            <p className="text-xs font-semibold tracking-widest text-blue-600 uppercase dark:text-blue-400">
              Pricing
            </p>
            <h2 className="section__title mt-2 text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
              Simple pricing for makers
            </h2>
            <p className="mt-3 max-w-[60ch] text-sm text-zinc-600 dark:text-zinc-300">
              Start free. Upgrade when your portfolio grows. Prices below are
              read from the database — the same source checkout uses.
            </p>
          </div>

          <div className="mt-10 grid grid-cols-1 gap-6 md:grid-cols-3">
            <div className="flex min-w-0 flex-col justify-between rounded-2xl border border-zinc-200 bg-white p-7 dark:border-zinc-800 dark:bg-zinc-950">
              <div className="min-w-0">
                <p className="text-xs font-semibold tracking-wider text-zinc-600 uppercase dark:text-zinc-400">
                  Free
                </p>
                <p className="mt-2 flex items-baseline gap-1">
                  <span className="text-4xl font-semibold tracking-tight">$0</span>
                  <span className="text-xs whitespace-nowrap text-zinc-600">/ forever</span>
                </p>
                <p className="mt-2 text-xs text-zinc-600 dark:text-zinc-400">{freePlan.tagline}</p>
                <ul className="mt-6 space-y-3 text-[13px] text-zinc-800 dark:text-zinc-200">
                  {PLAN_FEATURES.map((feature) => {
                    const value = feature.get(freePlan);
                    return (
                      <li key={feature.label} className="flex items-center gap-2.5">
                        {value ? (
                          <Check className="h-4 w-4 shrink-0 text-blue-600" aria-hidden="true" />
                        ) : (
                          <span className="w-4 shrink-0 text-center" aria-hidden="true">
                            –
                          </span>
                        )}
                        <span className={value ? "" : "text-zinc-600 dark:text-zinc-400"}>
                          {typeof value === "number" ? `${feature.label} (${value})` : feature.label}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              </div>
              <div className="mt-8">
                <Link
                  href="/signup"
                  className="inline-flex w-full items-center justify-center whitespace-nowrap rounded-full border border-zinc-300 bg-white px-4 py-2.5 text-[13px] font-medium text-zinc-950 transition-colors hover:bg-zinc-50 active:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-55 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50 dark:hover:bg-zinc-800"
                >
                  Get started free
                </Link>
              </div>
            </div>

            {tiers.map((tier) => {
              const isPro = tier.plan.id === "pro";
              return (
                <div
                  key={tier.plan.id}
                  className={
                    isPro
                      ? "relative flex min-w-0 flex-col justify-between rounded-2xl border-2 border-blue-600 bg-zinc-950 p-7 text-white"
                      : "flex min-w-0 flex-col justify-between rounded-2xl border border-zinc-200 bg-white p-7 dark:border-zinc-800 dark:bg-zinc-950"
                  }
                >
                  {isPro && (
                    <p className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-blue-600 px-3 py-0.5 text-[10px] font-semibold tracking-wide whitespace-nowrap text-white uppercase">
                      Most popular
                    </p>
                  )}
                  <div className="min-w-0">
                    <p className={`text-xs font-semibold tracking-wider uppercase ${isPro ? "text-blue-400" : "text-zinc-600 dark:text-zinc-400"}`}>
                      {tier.plan.name}
                    </p>
                    <p className="mt-2 flex items-baseline gap-1">
                      <span className={`text-4xl font-semibold tracking-tight ${isPro ? "text-white" : ""}`}>
                        {formatPrice(tier.monthly.price_cents)}
                      </span>
                      <span className="text-xs whitespace-nowrap text-zinc-600">/ month</span>
                    </p>
                    <p className={`mt-1 text-[11px] ${isPro ? "text-zinc-400" : "text-zinc-600"}`}>
                      or {formatPrice(tier.yearly.price_cents)}/year
                      {tier.savingPercent ? ` — save ${tier.savingPercent}%` : ""}
                    </p>
                    <p className={`mt-3 text-xs ${isPro ? "text-zinc-300" : "text-zinc-600 dark:text-zinc-400"}`}>
                      {tier.plan.tagline}
                    </p>
                    <ul className={`mt-6 space-y-3 text-[13px] ${isPro ? "text-zinc-100" : "text-zinc-800 dark:text-zinc-200"}`}>
                      {PLAN_FEATURES.map((feature) => {
                        const value = feature.get(tier.plan);
                        return (
                          <li key={feature.label} className="flex items-center gap-2.5">
                            {value ? (
                              <Check className={`h-4 w-4 shrink-0 ${isPro ? "text-blue-400" : "text-blue-600"}`} aria-hidden="true" />
                            ) : (
                              <span className="w-4 shrink-0 text-center" aria-hidden="true">
                                –
                              </span>
                            )}
                            <span className={value ? "" : "text-zinc-500 dark:text-zinc-400"}>
                              {typeof value === "number" ? `${feature.label} (${value})` : feature.label}
                            </span>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                  <div className="mt-8">
                    <Link
                      href={`/signup?plan=${tier.yearly.id}`}
                      className={
                        isPro
                          ? "inline-flex w-full items-center justify-center whitespace-nowrap rounded-full bg-blue-600 px-4 py-2.5 text-[13px] font-medium text-white transition-colors hover:bg-blue-600 active:bg-blue-600 disabled:cursor-not-allowed disabled:opacity-55"
                          : "inline-flex w-full items-center justify-center whitespace-nowrap rounded-full border border-zinc-300 bg-white px-4 py-2.5 text-[13px] font-medium text-zinc-950 transition-colors hover:bg-zinc-50 active:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-55 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50 dark:hover:bg-zinc-800"
                      }
                    >
                      Get {tier.plan.name}
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Ft2 inline single line */}
      <footer className="border-t border-zinc-200 dark:border-zinc-800">
        <div className="mx-auto flex w-full max-w-6xl flex-col items-start justify-between gap-4 px-4 py-8 text-[13px] text-zinc-600 sm:flex-row sm:items-center sm:px-6 lg:px-8 dark:text-zinc-400">
          <p className="inline-flex min-w-0 items-center gap-3 leading-none">
            <ShipSprintLogo href="/" size="sm" />
            <span className="hidden sm:inline">The landing-page platform for indie apps.</span>
          </p>
          <nav aria-label="Footer" className="flex flex-wrap items-center gap-5 leading-none">
            <Link href="/templates" className="whitespace-nowrap transition-colors hover:text-zinc-950 active:text-zinc-950 dark:hover:text-zinc-100">
              Templates
            </Link>
            <Link href="/terms" className="whitespace-nowrap transition-colors hover:text-zinc-950 active:text-zinc-950 dark:hover:text-zinc-100">
              Terms
            </Link>
            <Link href="/privacy" className="whitespace-nowrap transition-colors hover:text-zinc-950 active:text-zinc-950 dark:hover:text-zinc-100">
              Privacy
            </Link>
            <Link href="/imprint" className="whitespace-nowrap transition-colors hover:text-zinc-950 active:text-zinc-950 dark:hover:text-zinc-100">
              Imprint
            </Link>
            <Link href="/login" className="whitespace-nowrap transition-colors hover:text-zinc-950 active:text-zinc-950 dark:hover:text-zinc-100">
              Sign in
            </Link>
            <span className="whitespace-nowrap">© {new Date().getFullYear()} ShipSprint</span>
          </nav>
        </div>
      </footer>
    </div>
  );
}
