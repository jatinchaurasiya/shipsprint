/* Hallmark · pre-emit critique: P5 H5 E4 S5 R5 V5 */
/* Marketing: Bento Grid · F1 knobs: tiles=5, spans=mosaic, border=hairline · H2 split diptych (ratio 7/5, divider hairline) · F5 annotated proof · T4 stat strip · N5 floating pill · Ft2 inline single line · studied-DNA (nexbit-temlis) */
import Link from "next/link";
import { ShipSprintLogo } from "@/components/brand/logo";
import { unstable_cache } from "next/cache";
import { fetchCatalogue, groupTiers } from "@/lib/catalogue";
import { FREE_PLAN, formatPrice, PLAN_FEATURES, planForDisplay } from "@/lib/plans";
import { yearlySavingPercent } from "@/types/billing";
import { ArrowRight, ArrowUpRight, Check, Star } from "lucide-react";

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

      {/* Hero — H2 split diptych 7/5: promise left, phone proof right */}
      <section className="mx-auto grid w-full max-w-6xl grid-cols-1 gap-10 px-4 pt-14 pb-16 sm:px-6 md:grid-cols-7 md:pt-20 md:pb-20 lg:px-8">
        <div className="md:col-span-4">
          <p className="inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-white px-3 py-1 text-xs font-medium whitespace-nowrap text-[#505050] dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300">
            <span className="h-1.5 w-1.5 rounded-full bg-blue-600" aria-hidden="true" />
            <span>Built for indie iOS &amp; Android developers</span>
          </p>
          <h1 className="hero__display mt-5 font-display text-[clamp(2.5rem,5vw+0.5rem,4.25rem)] leading-[1.02] font-semibold tracking-[-0.03em] text-balance">
            Launch a landing page for your app in 3 minutes.
          </h1>
          <p className="mt-5 max-w-[52ch] text-base leading-relaxed text-[#505050] sm:text-lg dark:text-zinc-300">
            Pick an App Store template, make it yours, and publish to your
            domain. Store buttons, screenshots, and analytics — live from the
            same component visitors see.
          </p>
          <div className="mt-7 flex flex-wrap items-center gap-3 leading-none">
            <Link
              href="/signup"
              className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full bg-[#131313] px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-black active:bg-black active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-55 dark:bg-zinc-50 dark:text-zinc-950 dark:hover:bg-white"
            >
              <span>Start building for free</span>
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
            <Link
              href="/templates"
              className="inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-full border border-zinc-300 bg-white px-6 py-3 text-sm font-medium text-[#131313] transition-colors hover:border-zinc-400 hover:bg-zinc-50 active:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100 dark:hover:bg-zinc-900"
            >
              <span>Browse templates</span>
              <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </div>
          <p className="mt-4 text-[13px] text-[#505050] dark:text-zinc-400">
            Free subdomain included. No credit card. Cancel anytime.
          </p>
        </div>
        <div className="md:col-span-3">
          <figure className="overflow-hidden rounded-3xl border border-zinc-200 bg-[#f7f7f7] dark:border-zinc-800 dark:bg-zinc-900/40">
            <figcaption className="border-b border-zinc-200 px-5 py-2.5 text-center font-mono text-[11px] text-[#505050] dark:border-zinc-800 dark:text-zinc-400">
              zenhabit.shipsprint.site — live page
            </figcaption>
            <div className="p-5 sm:p-7">
              <p className="inline-flex items-center gap-1.5 rounded-full bg-blue-600/10 px-2.5 py-1 text-[11px] font-medium whitespace-nowrap text-blue-600 dark:text-blue-400">
                Featured on the App Store
              </p>
              <p className="mt-3 text-xl font-semibold tracking-tight text-balance">
                ZenHabit — Daily Mindfulness
              </p>
              <p className="mt-2 max-w-[52ch] text-sm leading-relaxed text-[#505050] dark:text-zinc-300">
                Gentle nudges, progress rings, and private cloud sync that make
                healthy routines stick without anxiety.
              </p>
              <div className="mt-5 flex flex-wrap items-center gap-2.5 leading-none">
                <span className="inline-flex items-center whitespace-nowrap rounded-full bg-[#131313] px-4 py-2.5 text-xs font-medium text-white dark:bg-zinc-50 dark:text-zinc-950">
                  Download on App Store
                </span>
                <span className="inline-flex items-center whitespace-nowrap rounded-full border border-zinc-300 px-4 py-2.5 text-xs font-medium text-[#131313] dark:border-zinc-700 dark:text-zinc-100">
                  Get it on Google Play
                </span>
              </div>
              <dl className="mt-6 grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-zinc-200 bg-zinc-200 text-left dark:border-zinc-800 dark:bg-zinc-800">
                <div className="bg-white p-3.5 dark:bg-zinc-950">
                  <dt className="text-[11px] font-medium text-[#505050] dark:text-zinc-400">Setup</dt>
                  <dd className="mt-0.5 text-sm font-semibold">3 minutes</dd>
                </div>
                <div className="bg-white p-3.5 dark:bg-zinc-950">
                  <dt className="text-[11px] font-medium text-[#505050] dark:text-zinc-400">Preview drift</dt>
                  <dd className="mt-0.5 text-sm font-semibold">Zero</dd>
                </div>
              </dl>
            </div>
          </figure>
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
                —<span className="text-[#505050] dark:text-zinc-500">+</span>
              </p>
              <p className="mt-2 text-[13px] text-[#505050] dark:text-zinc-400">
                Published sites — metric to confirm
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
                —<span className="text-zinc-500">/5</span>
              </p>
              <div className="mt-3 flex items-center gap-1" role="img" aria-label="Average user rating — metric to confirm">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star key={i} className="h-4 w-4 text-zinc-600" aria-hidden="true" />
                ))}
              </div>
              <p className="mt-2 text-[13px] text-zinc-400">
                Average user rating — metric to confirm
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
              <p className="font-display text-5xl font-semibold tracking-tight">—%</p>
              <p className="mt-2 text-[13px] text-[#505050] dark:text-zinc-400">
                Uptime for reliable performance — metric to confirm
              </p>
            </div>
          </div>

          {/* Speed chip tile */}
          <div className="flex min-w-0 items-center gap-3 rounded-3xl border border-zinc-200 bg-white p-6 sm:col-span-2 lg:col-span-1 dark:border-zinc-800 dark:bg-zinc-950">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-base font-semibold text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400" aria-hidden="true">
              ×
            </span>
            <div className="min-w-0">
              <p className="text-sm font-semibold whitespace-nowrap">—× faster launch</p>
              <p className="mt-0.5 text-[13px] text-[#505050] dark:text-zinc-400">
                Setup time vs. hand-coding — metric to confirm
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
              <p className="text-[11px] font-semibold tracking-widest text-[#505050] uppercase dark:text-zinc-500">This week</p>
              <p className="mt-1 font-mono text-2xl font-semibold">— installs</p>
              <div className="mt-3 flex h-16 items-end gap-1.5" aria-hidden="true">
                {[35, 55, 40, 70, 52, 85, 64].map((h, i) => (
                  <span key={i} className="w-full rounded-sm bg-blue-600/70" style={{ height: `${h}%` }} />
                ))}
              </div>
              <p className="mt-2 text-[11px] text-[#505050] dark:text-zinc-500">Sample chart — live data after publish</p>
            </div>
          </div>

          {/* Row 3: proof left, text right */}
          <div className="grid grid-cols-1 items-center gap-8 rounded-3xl border border-zinc-200 bg-[#f7f7f7] p-6 sm:p-10 md:grid-cols-2 dark:border-zinc-800 dark:bg-zinc-900/30">
            <div className="min-w-0 rounded-2xl border border-zinc-200 bg-white p-5 md:order-1 dark:border-zinc-800 dark:bg-zinc-950" aria-hidden="true">
              <p className="text-[11px] font-semibold tracking-widest text-[#505050] uppercase dark:text-zinc-500">Goals</p>
              <ul className="mt-3 space-y-2.5 text-[13px]">
                {[
                  ["Launch checklist", "—/12"],
                  ["Pages published", "—/10"],
                  ["Custom domains", "—/5"],
                ].map(([k, v]) => (
                  <li key={k} className="flex items-center justify-between gap-3 border-b border-zinc-100 pb-2.5 last:border-0 last:pb-0 dark:border-zinc-800">
                    <span className="font-medium">{k}</span>
                    <span className="font-mono whitespace-nowrap text-[#505050] dark:text-zinc-400">{v}</span>
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

      {/* Ft2 inline single line */}
      <footer className="border-t border-zinc-200 dark:border-zinc-800">
        <div className="mx-auto flex w-full max-w-6xl flex-col items-start justify-between gap-4 px-4 py-8 text-[13px] text-[#505050] sm:flex-row sm:items-center sm:px-6 lg:px-8 dark:text-zinc-400">
          <p className="inline-flex min-w-0 items-center gap-3 leading-none">
            <ShipSprintLogo href="/" size="sm" />
            <span className="hidden sm:inline">The landing-page platform for indie apps.</span>
          </p>
          <nav aria-label="Footer" className="flex flex-wrap items-center gap-5 leading-none">
            <Link href="/templates" className="whitespace-nowrap transition-colors hover:text-[#131313] active:text-[#131313] dark:hover:text-zinc-100">
              Templates
            </Link>
            <Link href="/terms" className="whitespace-nowrap transition-colors hover:text-[#131313] active:text-[#131313] dark:hover:text-zinc-100">
              Terms
            </Link>
            <Link href="/privacy" className="whitespace-nowrap transition-colors hover:text-[#131313] active:text-[#131313] dark:hover:text-zinc-100">
              Privacy
            </Link>
            <Link href="/imprint" className="whitespace-nowrap transition-colors hover:text-[#131313] active:text-[#131313] dark:hover:text-zinc-100">
              Imprint
            </Link>
            <Link href="/login" className="whitespace-nowrap transition-colors hover:text-[#131313] active:text-[#131313] dark:hover:text-zinc-100">
              Sign in
            </Link>
            <span className="whitespace-nowrap">© {new Date().getFullYear()} ShipSprint</span>
          </nav>
        </div>
      </footer>
    </div>
  );
}
