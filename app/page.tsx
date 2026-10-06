/* Hallmark · pre-emit critique: P5 H5 E4 S5 R5 V5 */
/* Marketing: Bento Grid · blue-panel hero + user PNG iPhone frame with measured live-screen overlay (explicit user overrides gates 2/47) · F1 knobs: tiles=5, spans=mosaic, border=hairline · H2 split diptych (ratio 7/5, divider hairline) · F5 annotated proof · T4 stat strip · N5 floating pill · Ft5 Statement (shared SiteFooter, giant wordmark + office) · studied-DNA (nexbit-temlis) */
import Image from "next/image";
import Link from "next/link";
import { ShipSprintLogo } from "@/components/brand/logo";
import { SiteFooter } from "@/components/brand/site-footer";
import { unstable_cache } from "next/cache";
import { fetchCatalogue, groupTiers } from "@/lib/catalogue";
import { fetchPlatformMetrics } from "@/lib/metrics";
import { FREE_PLAN, formatPrice, PLAN_FEATURES, planForDisplay } from "@/lib/plans";
import { yearlySavingPercent } from "@/types/billing";
import { ArrowRight, Check, Star } from "lucide-react";

/**
 * Prices come from the `products` table, not from literals in this file.
 * Cached for five minutes so the marketing page stays a static, cacheable
 * document rather than a per-request render.
 */
const getCatalogue = unstable_cache(fetchCatalogue, ["pricing-catalogue"], {
  revalidate: 300,
  tags: ["catalogue"],
});

const getMetrics = unstable_cache(fetchPlatformMetrics, ["platform-metrics"], {
  revalidate: 300,
  tags: ["platform-metrics"],
});

export default async function HomePage() {
  const [{ plans, products }, metrics] = await Promise.all([
    getCatalogue(),
    getMetrics(),
  ]);

  const freePlan = plans.find((p) => p.id === "free") ?? FREE_PLAN;

  const tiers = groupTiers(plans, products, planForDisplay).map((tier) => ({
    ...tier,
    savingPercent: yearlySavingPercent(
      tier.monthly.price_cents,
      tier.yearly.price_cents
    ),
  }));

  return (
    <div className="min-h-screen bg-white font-sans text-[#131313] antialiased selection:bg-[#131313] selection:text-white dark:bg-zinc-950 dark:text-zinc-50 dark:selection:bg-zinc-50 dark:selection:text-zinc-950">
      {/* N5 floating pill */}
      <div className="sticky top-0 z-[300] px-4 pt-4">
        <header className="mx-auto flex h-14 w-full max-w-3xl items-center justify-between gap-4 rounded-full border border-zinc-200 bg-white/90 py-2 pl-5 pr-2 shadow-[0_8px_24px_-12px_rgb(0,0,0,0.18)] backdrop-blur-md dark:border-zinc-800 dark:bg-zinc-900/90">
          <ShipSprintLogo href="/" size="sm" priority />
          <nav aria-label="Primary" className="hidden items-center gap-6 text-[13px] font-medium text-[#505050] sm:flex dark:text-zinc-300">
            <a href="#impacts" className="whitespace-nowrap transition-colors hover:text-[#131313] active:text-[#131313] dark:hover:text-white">
              Impacts
            </a>
            <a href="#features" className="whitespace-nowrap transition-colors hover:text-[#131313] active:text-[#131313] dark:hover:text-white">
              Features
            </a>
            <a href="#how" className="whitespace-nowrap transition-colors hover:text-[#131313] active:text-[#131313] dark:hover:text-white">
              How it works
            </a>
            <a href="#pricing" className="whitespace-nowrap transition-colors hover:text-[#131313] active:text-[#131313] dark:hover:text-white">
              Pricing
            </a>
          </nav>
          <div className="flex items-center gap-2 leading-none">
            <Link
              href="/login"
              className="whitespace-nowrap rounded-full px-3.5 py-2 text-[13px] font-medium text-[#505050] transition-colors hover:text-[#131313] active:text-[#131313] dark:text-zinc-300 dark:hover:text-white"
            >
              Sign in
            </Link>
            <Link
              href="/signup"
              className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full bg-[#131313] px-4 py-2 text-[13px] font-medium text-white transition-colors hover:bg-black active:bg-black active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-55 dark:bg-zinc-50 dark:text-zinc-950 dark:hover:bg-white"
            >
              <span>Get started</span>
              <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
            </Link>
          </div>
        </header>
      </div>

      {/* Hero — full-bleed blue panel mirroring the reference: white promise
          copy left, iPhone proof right. Explicit user overrides: monochrome
          blue wash (gate 2), CSS iPhone frame (gate 47). ShipSprint copy only. */}
      {/* Hero — full-bleed blue panel mirroring the reference: white promise
          copy left, iPhone proof right with transparent titanium frame and verified proof cards.
          Studied DNA: nexbit-temlis.webflow.io */}
      <section className="px-3 pt-4 sm:px-4">
        <div
          className="relative overflow-hidden rounded-[2rem] text-white sm:rounded-[2.5rem]"
          style={{
            background:
              "radial-gradient(ellipse at 82% 20%, rgba(56, 189, 248, 0.35) 0%, transparent 50%), radial-gradient(ellipse at 30% 80%, rgba(20, 100, 190, 0.4) 0%, transparent 55%), linear-gradient(135deg, #2488eb 0%, #1772e0 50%, #0d5bbd 100%)",
            boxShadow:
              "0 30px 60px -15px rgba(13, 86, 190, 0.35), inset 0 1px 1px rgba(255, 255, 255, 0.3)",
          }}
        >
          <div className="mx-auto grid w-full max-w-6xl grid-cols-1 items-center gap-10 px-6 pt-12 pb-14 sm:px-10 md:grid-cols-12 md:gap-8 md:pt-16 md:pb-20">
            <div className="md:col-span-6">
              <p className="inline-flex items-center whitespace-nowrap rounded-full border border-white/30 bg-white/10 px-3.5 py-1.5 text-[11px] font-semibold tracking-widest uppercase backdrop-blur-md">
                Built for indie app makers
              </p>
              <h1 className="hero__display mt-6 font-display text-[clamp(2.75rem,5.5vw+0.5rem,4.5rem)] leading-[1.02] font-semibold tracking-[-0.03em] text-balance">
                Launch your app page.
                <br />
                Without the code.
              </h1>
              <p className="mt-5 max-w-[50ch] text-base leading-relaxed text-white/90 sm:text-lg">
                Plan, pick, and publish your App Store landing page in one
                simple workspace. Stay on-brand, track every install, and never
                touch frontend code again.
              </p>
              <div className="mt-8 flex flex-wrap items-center gap-3.5 leading-none">
                <Link
                  href="/signup"
                  className="inline-flex items-center gap-2.5 rounded-full bg-white py-2 pr-2 pl-6 text-[13px] font-semibold tracking-wider whitespace-nowrap text-[#131313] uppercase transition-all hover:bg-zinc-100 active:bg-zinc-200 active:scale-[0.98] shadow-lg shadow-black/10"
                >
                  <span>Start building</span>
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#131313] text-white" aria-hidden="true">
                    <ArrowRight className="h-4 w-4" aria-hidden="true" />
                  </span>
                </Link>
                <Link
                  href="#features"
                  className="inline-flex items-center whitespace-nowrap rounded-full bg-black/25 px-6 py-3.5 text-[13px] font-semibold tracking-wider text-white uppercase backdrop-blur-md border border-white/20 transition-all hover:bg-black/35 active:scale-[0.98]"
                >
                  <span>See How It Works</span>
                </Link>
              </div>
              <p className="mt-8 flex flex-wrap items-center gap-2.5 leading-tight sm:flex-nowrap" role="img" aria-label="Starred by indie makers">
                <span className="flex items-center gap-1 shrink-0" aria-hidden="true">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star key={i} className="h-4 w-4 fill-yellow-300 text-yellow-300" aria-hidden="true" />
                  ))}
                </span>
                <span className="text-xs font-semibold tracking-wider uppercase text-white/95">
                  Built for App Store launches
                </span>
              </p>
            </div>

            {/* Double iPhone Mockup Stage (Cascading diptych using user-provided mockup) */}
            <div className="relative flex items-center justify-center md:col-span-6">
              <div className="relative flex w-full max-w-[380px] items-center justify-center py-2 sm:max-w-[430px]">
                {/* Back iPhone Mockup (Right) */}
                <div className="relative z-10 w-[180px] rotate-[-1.5deg] translate-x-7 translate-y-2.5 opacity-95 transition-transform duration-500 hover:translate-x-9 hover:rotate-0 sm:w-[205px] sm:translate-x-10 sm:translate-y-3 lg:w-[220px]">
                  <Image
                    src="/shipsprint-phone-mockup.png"
                    alt="ShipSprint mobile app landing page builder on iPhone"
                    width={458}
                    height={950}
                    className="h-auto w-full drop-shadow-[0_20px_40px_rgba(0,0,0,0.32)]"
                    priority
                  />
                </div>

                {/* Front iPhone Mockup (Left, overlapping foreground with -6deg tilt) */}
                <div className="absolute left-1 top-1 z-20 w-[190px] rotate-[-6deg] transition-transform duration-500 hover:scale-[1.02] hover:rotate-[-4deg] sm:left-3 sm:top-2 sm:w-[218px] lg:w-[235px]">
                  <Image
                    src="/shipsprint-phone-mockup.png"
                    alt="iPhone showcasing the mobile ShipSprint landing page with App Store and Google Play download buttons"
                    width={458}
                    height={950}
                    className="h-auto w-full drop-shadow-[0_28px_56px_rgba(0,0,0,0.48)]"
                    priority
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Logo wall — honest category strip, no fake logos */}
      <section aria-label="Made for" className="border-y border-zinc-200 bg-[#f7f7f7] dark:border-zinc-800 dark:bg-zinc-900/30">
        <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
          <p className="text-center text-xs font-semibold tracking-widest text-[#505050] uppercase dark:text-zinc-400">
            Made for indie apps shipping worldwide
          </p>
          <ul className="mt-4 flex flex-wrap items-center justify-center gap-x-8 gap-y-2 text-sm font-semibold text-[#262424] dark:text-zinc-300">
            {["Habit", "Fitness", "Finance", "Photo", "Meditation", "Music"].map((c) => (
              <li key={c} className="whitespace-nowrap">{c}</li>
            ))}
          </ul>
        </div>
      </section>

      {/* Impacts — F1 Bento mosaic (mirrors reference shape, ShipSprint copy) */}
      <section id="impacts" className="mx-auto w-full max-w-6xl scroll-mt-24 px-4 py-16 sm:px-6 md:py-24 lg:px-8">
        <div className="section__head block">
          <p className="inline-flex rounded-full border border-zinc-200 bg-white px-3 py-1 text-[11px] font-semibold tracking-widest whitespace-nowrap text-[#505050] uppercase dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300">
            Our impacts
          </p>
        </div>
        <div className="mt-4 grid grid-cols-1 gap-8 md:grid-cols-7">
          <h2 className="section__title font-display text-4xl font-semibold tracking-tight text-balance sm:text-5xl md:col-span-4">
            Real results.
            <br />
            Real impact.
          </h2>
          <p className="max-w-[52ch] self-end text-sm leading-relaxed text-[#505050] md:col-span-3 dark:text-zinc-300">
            See how indie makers turn visitors into installs. From faster
            launches to calmer workflows, ShipSprint helps you ship more —
            every single day.
          </p>
        </div>

        <div className="mt-10 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {/* Avatar trust tile */}
          <div className="flex min-w-0 flex-col justify-between rounded-3xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-950">
            <div className="flex items-center gap-3">
              <div className="flex -space-x-2" aria-hidden="true">
                {["ZH", "FF", "SA"].map((t) => (
                  <span key={t} className="flex h-9 w-9 items-center justify-center rounded-full border-2 border-white bg-[#f7f7f7] text-[11px] font-semibold text-[#262424] dark:border-zinc-950 dark:bg-zinc-800 dark:text-zinc-200">
                    {t}
                  </span>
                ))}
              </div>
              <p className="text-[11px] font-semibold tracking-widest whitespace-nowrap text-[#505050] uppercase dark:text-zinc-400">
                Trusted by indie makers
              </p>
            </div>
            <div className="mt-8">
              <p className="max-w-[52ch] text-[15px] leading-relaxed font-medium">
                Our platform helps you stay focused, meet launch day, and
                achieve more with every release.
              </p>
              <p className="mt-6 font-display text-5xl font-semibold tracking-tight">
                {metrics.publishedSites}
                <span className="text-[#505050] dark:text-zinc-500">+</span>
              </p>
              <p className="mt-2 text-[13px] text-[#505050] dark:text-zinc-400">
                Live app landing pages published worldwide
              </p>
            </div>
          </div>

          {/* Tall dark rating tile */}
          <div className="flex min-w-0 flex-col justify-between rounded-3xl bg-[#131313] p-6 text-white sm:row-span-2 dark:bg-zinc-900">
            <p className="max-w-[52ch] text-[15px] leading-relaxed font-medium text-zinc-100">
              Every page published, every install tracked — our numbers reflect
              real progress made by real makers like you.
            </p>
            <div className="mt-10">
              <p className="font-display text-5xl font-semibold tracking-tight">
                {metrics.makerRating.toFixed(1)}
                <span className="text-zinc-500">/5</span>
              </p>
              <div className="mt-3 flex items-center gap-1" role="img" aria-label={`Average indie maker rating: ${metrics.makerRating} out of 5 stars`}>
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star key={i} className="h-4 w-4 fill-yellow-400 text-yellow-400" aria-hidden="true" />
                ))}
              </div>
              <p className="mt-2 text-[13px] text-zinc-400">
                Average indie maker rating across launches
              </p>
            </div>
          </div>

          {/* Uptime tile */}
          <div className="flex min-w-0 flex-col justify-between rounded-3xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-950">
            <p className="max-w-[52ch] text-[15px] leading-relaxed font-medium">
              Our platform is built to deliver measurable results — from
              quicker launches to stronger install conversion.
            </p>
            <div className="mt-8">
              <p className="font-display text-5xl font-semibold tracking-tight">{metrics.uptimePercent}%</p>
              <p className="mt-2 text-[13px] text-[#505050] dark:text-zinc-400">
                Uptime SLA via Caddy edge &amp; automated TLS
              </p>
            </div>
          </div>

          {/* Speed chip tile */}
          <div className="flex min-w-0 items-center gap-3 rounded-3xl border border-zinc-200 bg-white p-6 sm:col-span-2 lg:col-span-1 dark:border-zinc-800 dark:bg-zinc-950">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-base font-semibold text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400" aria-hidden="true">
              ⚡
            </span>
            <div className="min-w-0">
              <p className="text-sm font-semibold whitespace-nowrap">&lt; {metrics.launchSpeedMinutes} min launch time</p>
              <p className="mt-0.5 text-[13px] text-[#505050] dark:text-zinc-400">
                From template selection to live custom domain
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Features — S2 centered head + F5 annotated rows */}
      <section id="features" className="mx-auto w-full max-w-6xl scroll-mt-24 px-4 py-16 sm:px-6 md:py-24 lg:px-8">
        <div className="mx-auto block max-w-2xl text-center">
          <p className="inline-flex rounded-full border border-zinc-200 bg-white px-3 py-1 text-[11px] font-semibold tracking-widest whitespace-nowrap text-[#505050] uppercase dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300">
            Our features
          </p>
          <h2 className="section__title mt-4 font-display text-4xl font-semibold tracking-tight text-balance sm:text-5xl">
            Features designed for your launch.
          </h2>
          <p className="mx-auto mt-4 max-w-[52ch] text-sm leading-relaxed text-[#505050] sm:text-base dark:text-zinc-300">
            Explore the features designed to turn visitors into installs — and
            keep every page on-brand.
          </p>
        </div>

        <div className="mt-14 space-y-6">
          {/* Row 1: proof left, text right */}
          <div className="grid grid-cols-1 items-center gap-8 rounded-3xl border border-zinc-200 bg-[#f7f7f7] p-6 sm:p-10 md:grid-cols-2 dark:border-zinc-800 dark:bg-zinc-900/30">
            <div className="min-w-0 rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-950" aria-hidden="true">
              <ul className="space-y-3">
                {[
                  { t: "App icon + screenshots", d: "Feb 19", pill: "Ready", hot: false },
                  { t: "Store badges + QR", d: "Feb 20", pill: "High priority", hot: true },
                  { t: "Ratings + reviews", d: "Feb 21", pill: "Normal", hot: false },
                ].map((r) => (
                  <li key={r.t} className="rounded-xl border border-zinc-200 bg-white p-3.5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
                    <div className="flex items-center justify-between gap-3">
                      <p className="flex min-w-0 items-center gap-2 text-[13px] font-medium">
                        <Check className="h-3.5 w-3.5 shrink-0 text-emerald-600" aria-hidden="true" />
                        <span className="truncate">{r.t}</span>
                      </p>
                      <span className="shrink-0 text-[11px] whitespace-nowrap text-[#505050] dark:text-zinc-500">{r.d}</span>
                    </div>
                    <p className="mt-1.5 inline-flex items-center gap-1.5 rounded-full bg-zinc-100 px-2 py-0.5 text-[11px] font-medium whitespace-nowrap text-[#505050] dark:bg-zinc-800 dark:text-zinc-300">
                      <span className={`h-1.5 w-1.5 rounded-full ${r.hot ? "bg-red-500" : "bg-zinc-400"}`} aria-hidden="true" />
                      {r.pill}
                    </p>
                  </li>
                ))}
              </ul>
            </div>
            <div className="min-w-0">
              <p className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600/10 text-lg font-semibold text-blue-600 dark:text-blue-400" aria-hidden="true">✓</p>
              <h3 className="mt-4 text-2xl font-semibold tracking-tight">Zero-drift page builder</h3>
              <p className="mt-2 max-w-[52ch] text-sm leading-relaxed text-[#505050] sm:text-[15px] dark:text-zinc-300">
                Create, prioritize, and publish sections with ease. The editor
                renders the same component visitors see — what you arrange is
                what ships.
              </p>
            </div>
          </div>

          {/* Row 2: text left, proof right */}
          <div className="grid grid-cols-1 items-center gap-8 rounded-3xl border border-zinc-200 bg-white p-6 sm:p-10 md:grid-cols-2 dark:border-zinc-800 dark:bg-zinc-950">
            <div className="min-w-0">
              <p className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-600/10 text-lg font-semibold text-emerald-600 dark:text-emerald-400" aria-hidden="true">▦</p>
              <h3 className="mt-4 text-2xl font-semibold tracking-tight">Store buttons that convert</h3>
              <p className="mt-2 max-w-[52ch] text-sm leading-relaxed text-[#505050] sm:text-[15px] dark:text-zinc-300">
                App Store and Google Play buttons with cookieless tap tracking.
                See which visits become installs — no banners, no cookies.
              </p>
            </div>
            <div className="min-w-0 rounded-2xl border border-zinc-200 bg-[#f7f7f7] p-5 dark:border-zinc-800 dark:bg-zinc-900/40" aria-hidden="true">
              <div className="flex items-center justify-between">
                <p className="text-[11px] font-semibold tracking-widest text-[#505050] uppercase dark:text-zinc-500">Weekly installs</p>
                <span className="inline-flex items-center rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-medium text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300">
                  +{metrics.conversionRate}% CTR
                </span>
              </div>
              <p className="mt-1 font-mono text-2xl font-semibold">{metrics.weeklyInstallsSample.toLocaleString()} installs</p>
              <div className="mt-3 flex h-16 items-end gap-1.5" aria-hidden="true">
                {[35, 55, 40, 70, 52, 85, 64].map((h, i) => (
                  <span key={i} className="w-full rounded-sm bg-blue-600 transition-all hover:bg-blue-500" style={{ height: `${h}%` }} />
                ))}
              </div>
              <div className="mt-2 flex items-center justify-between text-[11px] text-[#505050] dark:text-zinc-500">
                <span>Mon – Sun</span>
                <span>Cookieless store attribution</span>
              </div>
            </div>
          </div>

          {/* Row 3: proof left, text right */}
          <div className="grid grid-cols-1 items-center gap-8 rounded-3xl border border-zinc-200 bg-[#f7f7f7] p-6 sm:p-10 md:grid-cols-2 dark:border-zinc-800 dark:bg-zinc-900/30">
            <div className="min-w-0 rounded-2xl border border-zinc-200 bg-white p-5 md:order-1 dark:border-zinc-800 dark:bg-zinc-950" aria-hidden="true">
              <div className="flex items-center justify-between">
                <p className="text-[11px] font-semibold tracking-widest text-[#505050] uppercase dark:text-zinc-500">Launch Readiness</p>
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                  <Check className="h-3 w-3" aria-hidden="true" />
                  <span>Ready</span>
                </span>
              </div>
              <ul className="mt-3 space-y-2.5 text-[13px]">
                {[
                  ["Launch checklist", "12 / 12 items verified"],
                  ["Mobile Launch Suite", "Apple & Android ready"],
                  ["Automatic SSL/TLS", "Active (Let's Encrypt)"],
                ].map(([k, v]) => (
                  <li key={k} className="flex items-center justify-between gap-3 border-b border-zinc-100 pb-2.5 last:border-0 last:pb-0 dark:border-zinc-800">
                    <span className="font-medium">{k}</span>
                    <span className="font-mono text-xs font-semibold whitespace-nowrap text-blue-600 dark:text-blue-400">{v}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="min-w-0 md:order-2">
              <p className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/15 text-lg font-semibold text-amber-600 dark:text-amber-400" aria-hidden="true">◷</p>
              <h3 className="mt-4 text-2xl font-semibold tracking-tight">Domains, TLS &amp; reminders</h3>
              <p className="mt-2 max-w-[52ch] text-sm leading-relaxed text-[#505050] sm:text-[15px] dark:text-zinc-300">
                Connect a custom domain with automatic TLS, and never miss a
                launch step again. Status is read from the database — never
                claimed before it is true.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* How it works — 3 steps */}
      <section id="how" className="border-y border-zinc-200 bg-[#f7f7f7] dark:border-zinc-800 dark:bg-zinc-900/30">
        <div className="mx-auto w-full max-w-6xl scroll-mt-24 px-4 py-16 sm:px-6 md:py-24 lg:px-8">
          <div className="block max-w-2xl">
            <p className="inline-flex rounded-full border border-zinc-200 bg-white px-3 py-1 text-[11px] font-semibold tracking-widest whitespace-nowrap text-[#505050] uppercase dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300">
              How it works
            </p>
            <h2 className="section__title mt-4 font-display text-4xl font-semibold tracking-tight text-balance sm:text-5xl">
              Live in 3 simple steps.
            </h2>
          </div>
          <ol className="mt-10 grid grid-cols-1 gap-5 md:grid-cols-3">
            {[
              { n: "Step 1", t: "Pick a template", d: "Start from an App Store template made for your category. Every section is editable." },
              { n: "Step 2", t: "Make it yours", d: "Add your icon, screenshots, store links, and copy. Watch the live preview update instantly." },
              { n: "Step 3", t: "Publish & share", d: "Publish to your subdomain or custom domain with automatic TLS. Track installs from day one." },
            ].map((s) => (
              <li key={s.t} className="min-w-0 rounded-3xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-950">
                <p className="text-[11px] font-semibold tracking-widest text-blue-600 uppercase dark:text-blue-400">{s.n}</p>
                <h3 className="mt-2 text-xl font-semibold tracking-tight">{s.t}</h3>
                <p className="mt-2 text-sm leading-relaxed text-[#505050] dark:text-zinc-300">{s.d}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Pricing — comparison table, real DB prices */}
      <section id="pricing" className="mx-auto w-full max-w-6xl scroll-mt-24 px-4 py-16 sm:px-6 md:py-24 lg:px-8">
        <div className="section__head block max-w-2xl">
          <p className="inline-flex rounded-full border border-zinc-200 bg-white px-3 py-1 text-[11px] font-semibold tracking-widest whitespace-nowrap text-[#505050] uppercase dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300">
            Pricing
          </p>
          <h2 className="section__title mt-4 font-display text-4xl font-semibold tracking-tight text-balance sm:text-5xl">
            Simple pricing for makers.
          </h2>
          <p className="mt-3 max-w-[60ch] text-sm text-[#505050] sm:text-base dark:text-zinc-300">
            Start free. Upgrade when your portfolio grows. Prices below are
            read from the database — the same source checkout uses.
          </p>
        </div>

        <div className="mt-10 grid grid-cols-1 gap-5 md:grid-cols-3">
          <div className="flex min-w-0 flex-col justify-between rounded-3xl border border-zinc-200 bg-white p-7 dark:border-zinc-800 dark:bg-zinc-950">
            <div className="min-w-0">
              <p className="text-xs font-semibold tracking-wider text-[#505050] uppercase dark:text-zinc-400">
                Free
              </p>
              <p className="mt-2 flex items-baseline gap-1">
                <span className="font-display text-4xl font-semibold tracking-tight">$0</span>
                <span className="text-xs whitespace-nowrap text-[#505050]">/ forever</span>
              </p>
              <p className="mt-2 text-xs text-[#505050] dark:text-zinc-400">{freePlan.tagline}</p>
              <ul className="mt-6 space-y-3 text-[13px] text-[#262424] dark:text-zinc-200">
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
                      <span className={value ? "" : "text-[#505050] dark:text-zinc-400"}>
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
                className="inline-flex w-full items-center justify-center whitespace-nowrap rounded-full border border-zinc-300 bg-white px-4 py-2.5 text-[13px] font-medium text-[#131313] transition-colors hover:bg-zinc-50 active:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-55 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50 dark:hover:bg-zinc-800"
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
                    ? "relative flex min-w-0 flex-col justify-between rounded-3xl bg-[#131313] p-7 text-white"
                    : "flex min-w-0 flex-col justify-between rounded-3xl border border-zinc-200 bg-white p-7 dark:border-zinc-800 dark:bg-zinc-950"
                }
              >
                {isPro && (
                  <p className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-blue-600 px-3 py-0.5 text-[10px] font-semibold tracking-wide whitespace-nowrap text-white uppercase">
                    Most popular
                  </p>
                )}
                <div className="min-w-0">
                  <p className={`text-xs font-semibold tracking-wider uppercase ${isPro ? "text-blue-400" : "text-[#505050] dark:text-zinc-400"}`}>
                    {tier.plan.name}
                  </p>
                  <p className="mt-2 flex items-baseline gap-1">
                    <span className="font-display text-4xl font-semibold tracking-tight">
                      {formatPrice(tier.monthly.price_cents)}
                    </span>
                    <span className={`text-xs whitespace-nowrap ${isPro ? "text-zinc-400" : "text-[#505050]"}`}>/ month</span>
                  </p>
                  <p className={`mt-1 text-[11px] ${isPro ? "text-zinc-400" : "text-[#505050]"}`}>
                    or {formatPrice(tier.yearly.price_cents)}/year
                    {tier.savingPercent ? ` — save ${tier.savingPercent}%` : ""}
                  </p>
                  <p className={`mt-3 text-xs ${isPro ? "text-zinc-300" : "text-[#505050] dark:text-zinc-400"}`}>
                    {tier.plan.tagline}
                  </p>
                  <ul className={`mt-6 space-y-3 text-[13px] ${isPro ? "text-zinc-100" : "text-[#262424] dark:text-zinc-200"}`}>
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
                        ? "inline-flex w-full items-center justify-center whitespace-nowrap rounded-full bg-blue-600 px-4 py-2.5 text-[13px] font-medium text-white transition-colors hover:bg-blue-700 active:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-55"
                        : "inline-flex w-full items-center justify-center whitespace-nowrap rounded-full border border-zinc-300 bg-white px-4 py-2.5 text-[13px] font-medium text-[#131313] transition-colors hover:bg-zinc-50 active:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-55 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50 dark:hover:bg-zinc-800"
                    }
                  >
                    Get {tier.plan.name}
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Ft5 Statement — shared SiteFooter (giant wordmark + office) */}
      <SiteFooter />
    </div>
  );
}
