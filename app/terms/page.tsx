import Link from "next/link";
import { ShipSprintLogo } from "@/components/brand/logo";
import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Service — ShipSprint",
  description: "Terms and conditions governing the use of the ShipSprint landing page platform.",
};

export default function TermsPage() {
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
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-50">
            Terms of Service
          </h1>
          <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
            Effective Date: October 1, 2026 · Last Updated: October 1, 2026
          </p>
        </div>

        <div className="prose prose-zinc dark:prose-invert max-w-none space-y-8 text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">
          <section className="space-y-3">
            <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">1. Acceptance of Terms</h2>
            <p>
              By accessing, browsing, or using the ShipSprint website, platform, and services (collectively, the &ldquo;Service&rdquo;),
              operated at <strong>shipsprint.site</strong>, you agree to be bound by these Terms of Service (&ldquo;Terms&rdquo;) and our
              Privacy Policy. If you do not agree to these Terms, you may not use the Service.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">2. Service Description</h2>
            <p>
              ShipSprint provides indie developers and teams with high-performance landing page generation, hosting, custom domain
              management, and cookieless privacy-first analytics for mobile applications, web apps, and digital products.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">3. Accounts & Security</h2>
            <p>
              You must provide accurate, current, and complete registration information when creating an account. You are solely
              responsible for maintaining the confidentiality of your account credentials and for all activities that occur under your
              account. Notify us immediately of any unauthorized use or security breach.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">4. Plans, Billing & Subscriptions</h2>
            <p>
              ShipSprint offers free and paid subscription tiers (e.g., Basic and Pro plans).
            </p>
            <ul className="list-disc pl-5 space-y-1.5">
              <li><strong>Free Tier:</strong> Includes 1 active published landing page on a shipsprint.site subdomain.</li>
              <li><strong>Paid Subscriptions:</strong> Billed in advance on a recurring monthly or yearly basis through our merchant of record, Dodo Payments.</li>
              <li><strong>Cancellations:</strong> You may cancel your subscription at any time via your Billing settings or customer portal. Cancellation takes effect at the end of the current billing cycle.</li>
              <li><strong>Refunds:</strong> Payments are non-refundable except where required by applicable consumer law or as explicitly approved by our support team.</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">5. Content Ownership & Acceptable Use</h2>
            <p>
              You retain full ownership and intellectual property rights in the content, images, trademarks, and text you upload or
              publish through ShipSprint (&ldquo;User Content&rdquo;).
            </p>
            <p>You agree not to publish or distribute content that:</p>
            <ul className="list-disc pl-5 space-y-1.5">
              <li>Violates any applicable local, state, national, or international law.</li>
              <li>Contains malware, phishing links, deceptive impersonation, or malicious scripts.</li>
              <li>Infringes upon any third-party intellectual property or privacy rights.</li>
              <li>Distributes spam, sexually explicit material involving minors, or hate speech.</li>
            </ul>
            <p>We reserve the right to suspend or remove sites that violate these guidelines without prior notice.</p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">6. Custom Domains & TLS Certificates</h2>
            <p>
              ShipSprint provisions automated SSL/TLS certificates for authorized subdomains and custom domains. You are responsible for
              maintaining valid DNS records pointing to ShipSprint servers. We are not liable for downtime caused by upstream registrar
              or DNS misconfigurations outside our network.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">7. Disclaimer of Warranties</h2>
            <p>
              THE SERVICE IS PROVIDED ON AN &ldquo;AS IS&rdquo; AND &ldquo;AS AVAILABLE&rdquo; BASIS WITHOUT WARRANTIES OF ANY KIND,
              WHETHER EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE,
              OR NON-INFRINGEMENT.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">8. Limitation of Liability</h2>
            <p>
              TO THE MAXIMUM EXTENT PERMITTED BY LAW, IN NO EVENT SHALL SHIPSPRINT OR ITS AFFILIATES BE LIABLE FOR ANY INDIRECT,
              INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, OR LOSS OF PROFITS, DATA, OR USE, ARISING OUT OF OR IN CONNECTION
              WITH YOUR USE OF THE SERVICE.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">9. Contact & Inquiries</h2>
            <p>
              If you have any questions about these Terms, please contact us at{" "}
              <a href="mailto:support@shipsprint.site" className="text-blue-600 dark:text-blue-400 hover:underline">
                support@shipsprint.site
              </a>.
            </p>
          </section>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-zinc-200/80 dark:border-zinc-800/80 py-8 px-4 sm:px-6 max-w-4xl mx-auto text-xs text-zinc-500 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>&copy; {new Date().getFullYear()} ShipSprint. All rights reserved.</div>
        <div className="flex gap-4">
          <Link href="/privacy" className="hover:underline">Privacy Policy</Link>
          <Link href="/imprint" className="hover:underline">Imprint</Link>
        </div>
      </footer>
    </div>
  );
}
