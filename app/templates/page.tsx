import Link from "next/link";
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
    <div className="min-h-screen bg-[#fafafa] dark:bg-[#09090b] text-zinc-900 dark:text-zinc-100 selection:bg-zinc-900 selection:text-white dark:selection:bg-zinc-100 dark:selection:text-zinc-900 font-sans">
      {/* Top Navbar */}
      <header className="sticky top-0 z-40 w-full border-b border-zinc-200/60 dark:border-zinc-800/60 bg-white/70 dark:bg-zinc-950/70 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link
            href="/"
            className="flex items-center gap-2.5 font-semibold text-base tracking-tight text-zinc-900 dark:text-zinc-50"
          >
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center shadow-sm text-white">
              <Sparkles className="w-4 h-4" />
            </div>
            <span className="font-semibold text-base">ShipSprint</span>
          </Link>

          <nav className="hidden md:flex items-center gap-8 text-xs font-medium text-zinc-600 dark:text-zinc-400">
            <Link href="/" className="hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors">
              Home
            </Link>
            <Link href="/templates" className="text-zinc-900 dark:text-zinc-100 font-semibold">
              Templates
            </Link>
            <Link href="/#pricing" className="hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors">
              Pricing
            </Link>
          </nav>

          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="px-3.5 py-1.5 rounded-xl text-xs font-medium text-zinc-700 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800/60 transition-colors"
            >
              Sign In
            </Link>
            <Link
              href="/signup"
              className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-zinc-900 dark:bg-zinc-100 hover:bg-zinc-800 dark:hover:bg-white text-white dark:text-zinc-900 text-xs font-medium shadow-sm transition-all active:scale-[0.98]"
            >
              <span>Get Started</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative pt-16 pb-12 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto text-center">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-50 dark:bg-blue-950/50 border border-blue-200/80 dark:border-blue-900/50 text-blue-600 dark:text-blue-400 text-xs font-medium mb-6">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Curated for Conversion & Speed</span>
        </div>

        <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-50 leading-[1.1]">
          Landing Page Templates <br className="hidden sm:inline" />
          Crafted for Indie Makers
        </h1>

        <p className="mt-4 text-sm sm:text-base text-zinc-600 dark:text-zinc-400 max-w-2xl mx-auto leading-relaxed">
          Skip days of coding design systems. Pick a battle-tested template, customize your copy and badges, and deploy to your custom domain in under 3 minutes.
        </p>
      </section>

      {/* Gallery Section */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-24">
        <TemplateGallery />
      </main>

      {/* Bottom CTA */}
      <section className="border-t border-zinc-200/80 dark:border-zinc-800/80 py-16 px-4 bg-zinc-100/50 dark:bg-zinc-900/30">
        <div className="max-w-3xl mx-auto text-center space-y-4">
          <h2 className="text-2xl sm:text-3xl font-bold text-zinc-900 dark:text-zinc-100">
            Have a custom mobile app ready to launch?
          </h2>
          <p className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-400 max-w-lg mx-auto">
            Create your account today and publish your first landing page 100% free with automated SSL and cookieless analytics.
          </p>
          <div className="pt-2">
            <Link
              href="/signup"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs sm:text-sm font-semibold shadow-lg shadow-blue-600/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              <span>Start Building for Free</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-zinc-200/80 dark:border-zinc-800/80 py-12 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-6 text-xs text-zinc-500 dark:text-zinc-400">
          <div className="flex items-center gap-2">
            <Sparkles className="w-3.5 h-3.5 text-blue-500" />
            <span className="font-medium text-zinc-800 dark:text-zinc-200">ShipSprint</span>
            <span>— The Landing Page Platform for Indie Makers</span>
          </div>
          <div className="flex flex-wrap items-center gap-6">
            <Link href="/templates" className="hover:text-zinc-800 dark:hover:text-zinc-200 transition-colors">
              Templates
            </Link>
            <Link href="/terms" className="hover:text-zinc-800 dark:hover:text-zinc-200 transition-colors">
              Terms
            </Link>
            <Link href="/privacy" className="hover:text-zinc-800 dark:hover:text-zinc-200 transition-colors">
              Privacy
            </Link>
            <Link href="/imprint" className="hover:text-zinc-800 dark:hover:text-zinc-200 transition-colors">
              Imprint
            </Link>
            <Link href="/login" className="hover:text-zinc-800 dark:hover:text-zinc-200 transition-colors">
              Sign In
            </Link>
            <span>&copy; {new Date().getFullYear()} ShipSprint</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
