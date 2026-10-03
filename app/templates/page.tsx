import Link from "next/link";
import { ShipSprintLogo } from "@/components/brand/logo";
import { ArrowRight, Sparkles } from "lucide-react";
import { TemplateGallery } from "@/components/templates/template-gallery";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Landing Page Templates for Indie Apps & Makers — ShipSprint",
  description:
    "Explore high-converting, production-ready landing page templates for mobile apps, SaaS, AI tools, and waitlists. Zero configuration, custom domains, and live analytics.",
  openGraph: {
    title: "Landing Page Templates — ShipSprint",
    description:
      "Explore high-converting, production-ready landing page templates for mobile apps, SaaS, AI tools, and waitlists.",
  },
};

export default function TemplatesPage() {
  return (
    <div className="min-h-screen bg-white font-sans text-zinc-950 antialiased selection:bg-zinc-950 selection:text-white dark:bg-zinc-950 dark:text-zinc-50 dark:selection:bg-zinc-50 dark:selection:text-zinc-950">
      {/* N5 floating pill — same system as marketing */}
      <div className="sticky top-0 z-[300] px-4 pt-4">
        <header className="mx-auto flex h-14 w-full max-w-3xl items-center justify-between gap-4 rounded-full border border-zinc-200 bg-white/90 py-2 pl-5 pr-2 shadow-[0_8px_24px_-12px_rgb(0,0,0,0.18)] backdrop-blur-md dark:border-zinc-800 dark:bg-zinc-900/90">
          <ShipSprintLogo href="/" size="sm" priority />
          <nav aria-label="Primary" className="hidden items-center gap-6 text-[13px] font-medium text-zinc-600 sm:flex dark:text-zinc-300">
            <Link href="/" className="whitespace-nowrap transition-colors hover:text-zinc-950 active:text-zinc-950 dark:hover:text-white">
              Home
            </Link>
            <Link href="/templates" aria-current="page" className="whitespace-nowrap font-semibold text-zinc-950 dark:text-white">
              Templates
            </Link>
            <Link href="/#pricing" className="whitespace-nowrap transition-colors hover:text-zinc-950 active:text-zinc-950 dark:hover:text-white">
              Pricing
            </Link>
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

      {/* Catalogue head — left-aligned, eyebrow stacked above heading (gate 54) */}
      <section className="mx-auto w-full max-w-5xl px-4 pt-14 pb-10 sm:px-6 lg:px-8">
        <p className="inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-white px-3 py-1 text-xs font-medium whitespace-nowrap text-zinc-600 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300">
          <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
          <span>Curated for conversion &amp; speed</span>
        </p>
        <h1 className="hero__display mt-4 max-w-2xl text-4xl font-semibold tracking-tight text-balance sm:text-5xl">
          Landing page templates crafted for indie makers
        </h1>
        <p className="mt-4 max-w-[60ch] text-sm leading-relaxed text-zinc-600 sm:text-base dark:text-zinc-300">
          Skip days of coding design systems. Pick a starting point, customize
          your copy, and deploy to your custom domain in under 3 minutes.
          Badge numbers in previews are samples — replace them with your own.
        </p>
      </section>

      {/* Gallery Section */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-24">
        <TemplateGallery />
      </main>

      {/* Bottom CTA — single button */}
      <section className="border-t border-zinc-200 py-16 dark:border-zinc-800">
        <div className="mx-auto max-w-3xl px-4 sm:px-6">
          <h2 className="max-w-xl text-2xl font-semibold tracking-tight text-balance sm:text-3xl">
            Have an app ready to launch?
          </h2>
          <p className="mt-3 max-w-[60ch] text-sm text-zinc-600 dark:text-zinc-300">
            Create your account and publish your first landing page free, with
            automatic SSL and cookieless analytics.
          </p>
          <div className="pt-5">
            <Link
              href="/signup"
              className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full bg-blue-600 px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-blue-700 active:bg-blue-700 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-55"
            >
              <span>Start building for free</span>
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
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
            <Link href="/templates" aria-current="page" className="whitespace-nowrap font-medium text-zinc-950 dark:text-zinc-100">
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
