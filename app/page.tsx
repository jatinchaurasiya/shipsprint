import Link from "next/link";
import {
  Sparkles,
  ArrowRight,
  Shield,
  Zap,
  Globe,
  Smartphone,
  BarChart3,
  Check,
  ChevronRight,
} from "lucide-react";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-[#fafafa] dark:bg-[#09090b] text-zinc-900 dark:text-zinc-100 selection:bg-zinc-900 selection:text-white dark:selection:bg-zinc-100 dark:selection:text-zinc-900">
      {/* Top Navbar */}
      <header className="sticky top-0 z-50 w-full border-b border-zinc-200/60 dark:border-zinc-800/60 bg-white/70 dark:bg-zinc-950/70 backdrop-blur-xl">
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
            <a href="#features" className="hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors">
              Features
            </a>
            <a href="#preview" className="hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors">
              Live Preview
            </a>
            <a href="#pricing" className="hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors">
              Pricing
            </a>
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
      <section className="relative overflow-hidden pt-20 pb-24 md:pt-28 md:pb-32 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto text-center">
        {/* Ambient Glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[350px] bg-gradient-to-tr from-blue-500/10 via-indigo-500/10 to-purple-500/10 blur-3xl pointer-events-none -z-10" />

        {/* Badge */}
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 shadow-sm text-xs font-medium text-zinc-800 dark:text-zinc-200 mb-8">
          <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
          <span>Built for Indie iOS & Android Developers</span>
        </div>

        {/* Main Title */}
        <h1 className="text-4xl sm:text-6xl md:text-7xl font-bold tracking-tight text-zinc-950 dark:text-zinc-50 max-w-4xl mx-auto leading-[1.1]">
          Launch a landing page for your app in{" "}
          <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-600 via-indigo-500 to-purple-600">
            3 minutes.
          </span>
        </h1>

        <p className="mt-6 text-base sm:text-lg text-zinc-600 dark:text-zinc-400 max-w-2xl mx-auto leading-relaxed">
          The no-code landing page builder tailored specifically for indie apps.
          Zero setup, Apple-grade design, instant store buttons, and real-time live preview.
        </p>

        {/* CTA Buttons */}
        <div className="mt-9 flex flex-col sm:flex-row items-center justify-center gap-3.5">
          <Link
            href="/signup"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-2xl bg-zinc-950 dark:bg-zinc-50 text-white dark:text-zinc-950 text-sm font-medium shadow-md hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-all active:scale-[0.98]"
          >
            <span>Start Building for Free</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
          <a
            href="#pricing"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white/80 dark:bg-zinc-900/60 text-zinc-800 dark:text-zinc-200 text-sm font-medium hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors shadow-sm"
          >
            <span>View Plans & Pricing</span>
          </a>
        </div>

        {/* Live Mockup Teaser */}
        <div id="preview" className="mt-16 md:mt-24 max-w-5xl mx-auto relative rounded-3xl border border-zinc-200/80 dark:border-zinc-800/80 bg-white/70 dark:bg-zinc-950/70 p-3 sm:p-4 shadow-2xl backdrop-blur-xl">
          <div className="rounded-2xl border border-zinc-200/60 dark:border-zinc-800/60 bg-gradient-to-b from-zinc-50 to-white dark:from-zinc-900/80 dark:to-zinc-950 p-6 sm:p-12 text-left">
            <div className="flex items-center justify-between border-b border-zinc-200/60 dark:border-zinc-800/60 pb-5 mb-8">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-purple-500 to-indigo-600 flex items-center justify-center text-white font-bold shadow-sm">
                  Z
                </div>
                <div>
                  <div className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                    ZenHabit — Daily Mindfulness
                  </div>
                  <div className="text-xs text-zinc-500 dark:text-zinc-400 font-mono">
                    zenhabit.shipsprint.site
                  </div>
                </div>
              </div>
              <span className="px-2.5 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200/60 dark:border-emerald-800/40 text-[11px] font-medium text-emerald-700 dark:text-emerald-400">
                Live Preview
              </span>
            </div>

            <div className="max-w-2xl">
              <span className="inline-block px-3 py-1 rounded-full bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 text-xs font-medium mb-3">
                Featured on App Store
              </span>
              <h2 className="text-2xl sm:text-4xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
                Build habits that quietly transform your life.
              </h2>
              <p className="mt-3 text-xs sm:text-sm text-zinc-600 dark:text-zinc-400">
                Gentle nudges, intuitive progress rings, and private cloud sync designed to make healthy routines stick without anxiety.
              </p>

              <div className="mt-6 flex flex-wrap items-center gap-3">
                <div className="px-4 py-2.5 rounded-xl bg-black text-white text-xs font-medium inline-flex items-center gap-2 shadow-sm">
                  <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                    <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M15.97 6.38c.62-.75 1.04-1.8 0.93-2.85-.9.04-1.99.6-2.64 1.35-.58.66-1.09 1.73-.95 2.76 1.01.08 2.04-.51 2.66-1.26z" />
                  </svg>
                  <span>Download on App Store</span>
                </div>
                <div className="px-4 py-2.5 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-zinc-900 text-white text-xs font-medium inline-flex items-center gap-2 shadow-sm">
                  <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                    <path d="M3.609 1.814L13.792 12 3.61 22.186c-.198-.198-.31-.47-.31-.762V2.576c0-.292.112-.564.31-.762zm11.239 11.242l2.368-2.369-12.01-6.934 9.642 9.303zm0 1.888L5.207 24.247l12.01-6.934-2.369-2.369zm1.332-1.332l3.415 1.972c.983.568.983 1.496 0 2.064l-3.415 1.972-2.022-2.022 2.022-1.986z" />
                  </svg>
                  <span>Get it on Google Play</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section id="features" className="py-20 md:py-28 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto border-t border-zinc-200/80 dark:border-zinc-800/80">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-blue-600 dark:text-blue-400 mb-2">
            Why ShipSprint
          </h2>
          <p className="text-3xl sm:text-4xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
            Engineered specifically for mobile apps
          </p>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-3">
            Everything you need to convert visitors into active app installs without writing frontend code.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="p-7 rounded-2xl bg-white dark:bg-zinc-950 border border-zinc-200/80 dark:border-zinc-800/80 shadow-sm">
            <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 flex items-center justify-center mb-5">
              <Zap className="w-5 h-5" />
            </div>
            <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-50 mb-2">
              Zero-Drift Live Editor
            </h3>
            <p className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">
              What you see in the editor is 100% identical to what visitors see live. The same React component powers both environments.
            </p>
          </div>

          <div className="p-7 rounded-2xl bg-white dark:bg-zinc-950 border border-zinc-200/80 dark:border-zinc-800/80 shadow-sm">
            <div className="w-10 h-10 rounded-xl bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400 flex items-center justify-center mb-5">
              <Globe className="w-5 h-5" />
            </div>
            <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-50 mb-2">
              Custom Domains & Auto-TLS
            </h3>
            <p className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">
              Connect your own custom domain in seconds. Automatic Let&apos;s Encrypt TLS certificates issued on-demand with zero hassle.
            </p>
          </div>

          <div className="p-7 rounded-2xl bg-white dark:bg-zinc-950 border border-zinc-200/80 dark:border-zinc-800/80 shadow-sm">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-5">
              <BarChart3 className="w-5 h-5" />
            </div>
            <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-50 mb-2">
              Cookieless Conversion Tracking
            </h3>
            <p className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">
              Lightweight beacon tracks App Store and Play Store button clicks. Respects visitor privacy with zero tracking banners required.
            </p>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-20 md:py-28 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto border-t border-zinc-200/80 dark:border-zinc-800/80">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-blue-600 dark:text-blue-400 mb-2">
            Pricing
          </h2>
          <p className="text-3xl sm:text-4xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
            Simple, honest pricing for makers
          </p>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-3">
            Start for free and upgrade as your indie app portfolio grows.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto items-stretch">
          {/* Free Tier */}
          <div className="flex flex-col justify-between p-7 rounded-2xl bg-white dark:bg-zinc-950 border border-zinc-200/80 dark:border-zinc-800/80 shadow-sm">
            <div>
              <div className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-2">
                Free
              </div>
              <div className="flex items-baseline gap-1 mb-4">
                <span className="text-4xl font-bold text-zinc-950 dark:text-zinc-50">$0</span>
                <span className="text-xs text-zinc-400">/ forever</span>
              </div>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-6">
                Perfect for launching your very first app prototype.
              </p>

              <ul className="space-y-3 text-xs text-zinc-700 dark:text-zinc-300">
                <li className="flex items-center gap-2.5">
                  <Check className="w-4 h-4 text-blue-500 shrink-0" />
                  <span>1 Published Landing Page</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <Check className="w-4 h-4 text-blue-500 shrink-0" />
                  <span>Subdomain (slug.shipsprint.site)</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <Check className="w-4 h-4 text-blue-500 shrink-0" />
                  <span>High-speed global CDN</span>
                </li>
                <li className="flex items-center gap-2.5 text-zinc-400">
                  <span>ShipSprint watermark included</span>
                </li>
              </ul>
            </div>

            <div className="mt-8">
              <Link
                href="/signup"
                className="w-full inline-flex items-center justify-center px-4 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:bg-zinc-50 dark:hover:bg-zinc-800/80 text-xs font-medium text-zinc-900 dark:text-zinc-100 transition-colors shadow-sm"
              >
                Get Started Free
              </Link>
            </div>
          </div>

          {/* Basic Tier */}
          <div className="flex flex-col justify-between p-7 rounded-2xl bg-white dark:bg-zinc-950 border border-zinc-200/80 dark:border-zinc-800/80 shadow-sm">
            <div>
              <div className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-2">
                Basic
              </div>
              <div className="flex items-baseline gap-1 mb-4">
                <span className="text-4xl font-bold text-zinc-950 dark:text-zinc-50">$4.99</span>
                <span className="text-xs text-zinc-400">/ month</span>
              </div>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-6">
                Great for indie developers with a growing catalog.
              </p>

              <ul className="space-y-3 text-xs text-zinc-700 dark:text-zinc-300">
                <li className="flex items-center gap-2.5">
                  <Check className="w-4 h-4 text-blue-500 shrink-0" />
                  <span>Up to 3 Published Sites</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <Check className="w-4 h-4 text-blue-500 shrink-0" />
                  <span className="font-medium">No Watermark Badge</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <Check className="w-4 h-4 text-blue-500 shrink-0" />
                  <span>Subdomain (slug.shipsprint.site)</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <Check className="w-4 h-4 text-blue-500 shrink-0" />
                  <span>Unlimited bandwidth</span>
                </li>
              </ul>
            </div>

            <div className="mt-8">
              <Link
                href="/signup"
                className="w-full inline-flex items-center justify-center px-4 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:bg-zinc-50 dark:hover:bg-zinc-800/80 text-xs font-medium text-zinc-900 dark:text-zinc-100 transition-colors shadow-sm"
              >
                Choose Basic
              </Link>
            </div>
          </div>

          {/* Pro Tier (Featured) */}
          <div className="relative flex flex-col justify-between p-7 rounded-2xl bg-zinc-950 dark:bg-zinc-900 text-white border-2 border-blue-500 shadow-xl">
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full bg-blue-500 text-[10px] font-semibold tracking-wide uppercase text-white shadow-sm">
              Most Popular
            </div>

            <div>
              <div className="text-xs font-semibold text-blue-400 uppercase tracking-wider mb-2">
                Pro Tier
              </div>
              <div className="flex items-baseline gap-1 mb-4">
                <span className="text-4xl font-bold text-white">$9.99</span>
                <span className="text-xs text-zinc-400">/ month</span>
              </div>
              <p className="text-xs text-zinc-400 mb-6">
                Complete custom domain freedom with deep analytics.
              </p>

              <ul className="space-y-3 text-xs text-zinc-200">
                <li className="flex items-center gap-2.5">
                  <Check className="w-4 h-4 text-blue-400 shrink-0" />
                  <span>Up to 10 Published Sites</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <Check className="w-4 h-4 text-blue-400 shrink-0" />
                  <span className="font-semibold text-white">Custom Domains (auto-SSL)</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <Check className="w-4 h-4 text-blue-400 shrink-0" />
                  <span className="font-semibold text-white">Full Analytics Dashboard</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <Check className="w-4 h-4 text-blue-400 shrink-0" />
                  <span>No Watermark Badge</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <Check className="w-4 h-4 text-blue-400 shrink-0" />
                  <span>Priority Support</span>
                </li>
              </ul>
            </div>

            <div className="mt-8">
              <Link
                href="/signup"
                className="w-full inline-flex items-center justify-center px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium transition-colors shadow-sm"
              >
                Get Started with Pro
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-zinc-200/80 dark:border-zinc-800/80 py-12 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-zinc-500 dark:text-zinc-400">
          <div className="flex items-center gap-2">
            <Sparkles className="w-3.5 h-3.5 text-blue-500" />
            <span className="font-medium text-zinc-800 dark:text-zinc-200">ShipSprint</span>
            <span>— The Landing Page Builder for Indie Mobile Apps</span>
          </div>
          <div className="flex items-center gap-6">
            <Link href="/login" className="hover:text-zinc-800 dark:hover:text-zinc-200 transition-colors">
              Sign In
            </Link>
            <Link href="/signup" className="hover:text-zinc-800 dark:hover:text-zinc-200 transition-colors">
              Sign Up
            </Link>
            <span>&copy; {new Date().getFullYear()} ShipSprint</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
