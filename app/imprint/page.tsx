import Link from "next/link";
import { ShipSprintLogo } from "@/components/brand/logo";
import { ArrowLeft, Building2 } from "lucide-react";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Imprint / Legal Notice — ShipSprint",
  description: "Provider identification and legal notice for ShipSprint.",
};

export default function ImprintPage() {
  return (
    <div className="min-h-screen bg-[#fafafa] dark:bg-[#09090b] text-zinc-900 dark:text-zinc-100 selection:bg-zinc-900 selection:text-white dark:selection:bg-zinc-100 dark:selection:text-zinc-900 font-sans">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b border-zinc-200/60 dark:border-zinc-800/60 bg-white/70 dark:bg-zinc-950/70 backdrop-blur-xl">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <ShipSprintLogo href="/" size="sm" priority />

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
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 dark:bg-blue-950/50 border border-blue-200 dark:border-blue-800 text-xs font-medium text-blue-600 dark:text-blue-400 mb-4">
            <Building2 className="w-3.5 h-3.5" />
            <span>Legal Identification</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-50">
            Imprint / Legal Notice
          </h1>
          <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
            Information pursuant to provider identification requirements
          </p>
        </div>

        <div className="prose prose-zinc dark:prose-invert max-w-none space-y-8 text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">
          <section className="space-y-3">
            <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">Service Provider</h2>
            <p className="leading-relaxed">
              <strong>ShipSprint Operations</strong><br />
              Digital Platform Services<br />
              Website: <a href="https://shipsprint.site" className="text-blue-600 dark:text-blue-400 hover:underline">https://shipsprint.site</a>
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">Contact Information</h2>
            <p className="leading-relaxed">
              General Support: <a href="mailto:support@shipsprint.site" className="text-blue-600 dark:text-blue-400 hover:underline">support@shipsprint.site</a><br />
              Legal & Privacy: <a href="mailto:legal@shipsprint.site" className="text-blue-600 dark:text-blue-400 hover:underline">legal@shipsprint.site</a>
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">Merchant of Record</h2>
            <p>
              Order processing, invoicing, billing, and tax collection for paid subscriptions on ShipSprint are conducted by our Merchant of Record,
              <strong> Dodo Payments Inc.</strong>
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">Online Dispute Resolution (ODR)</h2>
            <p>
              The European Commission provides a platform for online dispute resolution available at{" "}
              <a href="https://ec.europa.eu/consumers/odr" target="_blank" rel="noopener noreferrer" className="text-blue-600 dark:text-blue-400 hover:underline">
                https://ec.europa.eu/consumers/odr
              </a>. We are neither obligated nor willing to participate in dispute resolution proceedings before a consumer arbitration board.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">Notice on User Content</h2>
            <p>
              Individual landing pages hosted under customer subdomains or custom domains are created autonomously by our users. As a hosting service provider, ShipSprint is not responsible for third-party user content until we receive notice of infringement. If you believe any content hosted on ShipSprint infringes your legal rights, please contact our legal team at{" "}
              <a href="mailto:legal@shipsprint.site" className="text-blue-600 dark:text-blue-400 hover:underline">
                legal@shipsprint.site
              </a>.
            </p>
          </section>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-zinc-200/80 dark:border-zinc-800/80 py-8 px-4 sm:px-6 max-w-4xl mx-auto text-xs text-zinc-500 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>&copy; {new Date().getFullYear()} ShipSprint. All rights reserved.</div>
        <div className="flex gap-4">
          <Link href="/terms" className="hover:underline">Terms of Service</Link>
          <Link href="/privacy" className="hover:underline">Privacy Policy</Link>
        </div>
      </footer>
    </div>
  );
}
