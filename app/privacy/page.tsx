import Link from "next/link";
import { ArrowLeft, Sparkles, ShieldCheck } from "lucide-react";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy — ShipSprint",
  description: "Privacy policy describing how ShipSprint handles, stores, and protects user data and visitor analytics.",
};

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-[#fafafa] dark:bg-[#09090b] text-zinc-900 dark:text-zinc-100 selection:bg-zinc-900 selection:text-white dark:selection:bg-zinc-100 dark:selection:text-zinc-900 font-sans">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b border-zinc-200/60 dark:border-zinc-800/60 bg-white/70 dark:bg-zinc-950/70 backdrop-blur-xl">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link
            href="/"
            className="flex items-center gap-2 font-semibold text-sm tracking-tight text-zinc-900 dark:text-zinc-50"
          >
            <div className="w-7 h-7 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center shadow-sm text-white">
              <Sparkles className="w-3.5 h-3.5" />
            </div>
            <span>ShipSprint</span>
          </Link>

          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs font-medium text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Home</span>
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-12 sm:py-16">
        <div className="mb-10">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 text-xs font-medium text-emerald-600 dark:text-emerald-400 mb-4">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Privacy-First Architecture</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-50">
            Privacy Policy
          </h1>
          <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
            Effective Date: October 1, 2026 · Last Updated: October 1, 2026
          </p>
        </div>

        <div className="prose prose-zinc dark:prose-invert max-w-none space-y-8 text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">
          <section className="space-y-3">
            <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">1. Overview</h2>
            <p>
              ShipSprint (&ldquo;we&rdquo;, &ldquo;our&rdquo;, or &ldquo;us&rdquo;) respects your privacy and is committed to protecting
              it. This Privacy Policy explains what information we collect when you use <strong>shipsprint.site</strong>, how we use it,
              and how we safeguard customer and visitor data.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">2. Cookieless, Privacy-Preserving Analytics</h2>
            <p>
              Unlike traditional tracking tools, ShipSprint operates a <strong>cookieless, privacy-first analytics engine</strong> for
              landing pages created on our platform:
            </p>
            <ul className="list-disc pl-5 space-y-1.5">
              <li><strong>No Third-Party Cookies:</strong> We do not place tracking cookies or persistent device identifiers on your site visitors.</li>
              <li><strong>Salted Anonymized Hashing:</strong> Daily unique visitor counts are estimated using a one-way cryptographic SHA-256 hash combined with a daily rotating salt and IP snippet. The original IP address is never stored.</li>
              <li><strong>GDPR & CCPA Compliant by Default:</strong> Because no personal data is stored across sessions, your visitors are not tracked across the web.</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">3. Information We Collect from Account Holders</h2>
            <p>When you register for an account on ShipSprint, we collect:</p>
            <ul className="list-disc pl-5 space-y-1.5">
              <li><strong>Account Credentials:</strong> Email address and authentication tokens via Supabase Auth or Google OAuth.</li>
              <li><strong>Landing Page Content:</strong> App titles, copy, URLs, screenshots, app store links, and custom domain names.</li>
              <li><strong>Billing Information:</strong> Payment processing is handled securely by our Merchant of Record, Dodo Payments. We do not receive or store your raw credit card numbers.</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">4. Third-Party Infrastructure Sub-processors</h2>
            <p>We work with trusted industry-leading infrastructure providers to deliver our service:</p>
            <ul className="list-disc pl-5 space-y-1.5">
              <li><strong>Supabase:</strong> Encrypted PostgreSQL database and authentication services with Row Level Security (RLS).</li>
              <li><strong>Cloudflare R2:</strong> Secure global object storage for user-uploaded screenshots and app icons.</li>
              <li><strong>Dodo Payments:</strong> Merchant of record for automated recurring subscription billing and tax compliance.</li>
              <li><strong>AWS (Amazon Web Services):</strong> Host infrastructure and compute nodes.</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">5. Data Retention & Deletion</h2>
            <p>
              We retain account data for as long as your account remains active. You may delete your sites at any time directly through
              the dashboard. You may request full account deletion and purging of all associated records by contacting{" "}
              <a href="mailto:privacy@shipsprint.site" className="text-blue-600 dark:text-blue-400 hover:underline">
                privacy@shipsprint.site
              </a>.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">6. Your Rights (GDPR & CCPA)</h2>
            <p>
              Depending on your location, you have rights to access, correct, export, or erase the personal data we hold about you. You
              also have the right to object to or restrict certain processing activities.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">7. Changes to this Policy</h2>
            <p>
              We may update this Privacy Policy from time to time. Any material changes will be announced on our website or via email
              notification prior to becoming effective.
            </p>
          </section>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-zinc-200/80 dark:border-zinc-800/80 py-8 px-4 sm:px-6 max-w-4xl mx-auto text-xs text-zinc-500 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>&copy; {new Date().getFullYear()} ShipSprint. All rights reserved.</div>
        <div className="flex gap-4">
          <Link href="/terms" className="hover:underline">Terms of Service</Link>
          <Link href="/imprint" className="hover:underline">Imprint</Link>
        </div>
      </footer>
    </div>
  );
}
