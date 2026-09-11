"use client";

import React, { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { Plan, Profile, Subscription } from "@/types/database";
import {
  Check,
  Zap,
  Sparkles,
  CreditCard,
  Shield,
  ArrowRight,
  ExternalLink,
  Loader2,
  CheckCircle2,
  Lock,
} from "lucide-react";

interface BillingViewProps {
  profile: Profile | null;
  currentPlan: Plan;
  subscription: Subscription | null;
  siteCount: number;
}

export function BillingView({
  profile,
  currentPlan,
  subscription,
  siteCount,
}: BillingViewProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const success = searchParams.get("success") === "true";
  const upgradedPlan = searchParams.get("plan");

  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);
  const [portalLoading, setPortalLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleUpgrade = async (planId: "basic" | "pro") => {
    setError(null);
    setLoadingPlan(planId);

    try {
      const res = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan_id: planId }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to start checkout");
        setLoadingPlan(null);
        return;
      }

      if (data.url) {
        window.location.href = data.url;
      }
    } catch (err: any) {
      setError(err?.message || "An unexpected error occurred.");
      setLoadingPlan(null);
    }
  };

  const handleOpenPortal = async () => {
    setError(null);
    setPortalLoading(true);

    try {
      const res = await fetch("/api/billing/portal", {
        method: "POST",
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to load customer portal.");
        setPortalLoading(false);
        return;
      }

      if (data.url) {
        window.location.href = data.url;
      }
    } catch (err: any) {
      setError(err?.message || "An unexpected error occurred.");
      setPortalLoading(false);
    }
  };

  const plansList = [
    {
      id: "free",
      name: "Free",
      price: "$0",
      period: "forever",
      description: "Everything you need to launch a landing page for your first indie app.",
      limit: 1,
      features: [
        "1 Active Landing Page",
        "Subdomain on shipsprint.site",
        "Mobile-first Apple grade layout",
        "Standard app store buttons",
        "Cloudflare CDN edge delivery",
        "Built with ShipSprint watermark badge",
      ],
      isPopular: false,
    },
    {
      id: "basic",
      name: "Basic",
      price: "$4.99",
      period: "per month",
      description: "Remove platform branding and publish multiple app landing pages.",
      limit: 3,
      features: [
        "Up to 3 Active Landing Pages",
        "Remove ShipSprint branding badge",
        "Subdomain on shipsprint.site",
        "Full high-res screenshot carousel",
        "Custom app color accent themes",
        "Fast customer support",
      ],
      isPopular: false,
    },
    {
      id: "pro",
      name: "Pro",
      price: "$9.99",
      period: "per month",
      description: "The complete toolkit for serious indie makers scaling their app portfolio.",
      limit: 10,
      features: [
        "Up to 10 Active Landing Pages",
        "Connect Custom Domains (e.g. yourapp.com)",
        "Automatic Zero-Touch Let's Encrypt TLS",
        "Real-Time Analytics & CTR Dashboard",
        "Traffic source referral breakdown",
        "Device and OS distribution insights",
        "Remove ShipSprint branding badge",
        "Priority 24/7 maker support",
      ],
      isPopular: true,
    },
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-zinc-200/80 dark:border-zinc-800/80">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
            Plans & Billing
          </h1>
          <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 mt-1">
            Manage your subscription, quotas, and unlock custom domains & analytics.
          </p>
        </div>

        {profile?.dodo_customer_id && (
          <button
            onClick={handleOpenPortal}
            disabled={portalLoading}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:bg-zinc-50 dark:hover:bg-zinc-800 text-zinc-800 dark:text-zinc-200 text-xs font-semibold shadow-sm transition-all"
          >
            {portalLoading ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <CreditCard className="w-3.5 h-3.5 text-zinc-500" />
            )}
            <span>Manage Subscription & Invoices</span>
            <ExternalLink className="w-3 h-3 text-zinc-400" />
          </button>
        )}
      </div>

      {/* Success Notification */}
      {success && (
        <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 flex items-center gap-3 text-emerald-800 dark:text-emerald-300 text-xs font-medium animate-in fade-in duration-200">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
          <span>
            <strong>Success!</strong> Your account has been upgraded to the{" "}
            <span className="capitalize">{upgradedPlan || currentPlan.name}</span> plan. All unlocked features are active immediately.
          </span>
        </div>
      )}

      {/* Error Notification */}
      {error && (
        <div className="p-4 rounded-2xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800/60 text-red-700 dark:text-red-300 text-xs font-medium">
          {error}
        </div>
      )}

      {/* Current Plan Overview Card */}
      <div className="p-6 rounded-3xl bg-white dark:bg-zinc-950 border border-zinc-200/80 dark:border-zinc-800/80 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-2xl bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 flex items-center justify-center text-zinc-800 dark:text-zinc-200 shadow-sm shrink-0">
            <Sparkles className="w-6 h-6 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-50">
                {currentPlan.name} Plan
              </h2>
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 text-[10px] font-semibold uppercase tracking-wider">
                {subscription?.status === "active" ? "Active Subscription" : "Current"}
              </span>
            </div>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 max-w-lg">
              {currentPlan.id === "pro"
                ? "You have full access to custom domains, live analytics telemetry, and 10 landing page slots."
                : currentPlan.id === "basic"
                ? "You have branding removed and 3 landing page slots."
                : "Free tier allows 1 landing page with ShipSprint badge. Upgrade to connect custom domains and view analytics."}
            </p>

            {subscription?.current_period_end && (
              <p className="text-[11px] text-zinc-400 mt-2 font-mono">
                Renews on: {new Date(subscription.current_period_end).toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" })}
              </p>
            )}
          </div>
        </div>

        {/* Quota overview */}
        <div className="flex items-center gap-6 border-t md:border-t-0 md:border-l border-zinc-100 dark:border-zinc-900 pt-4 md:pt-0 md:pl-6 shrink-0">
          <div>
            <div className="text-xs text-zinc-500">Site Quota</div>
            <div className="text-xl font-bold text-zinc-900 dark:text-zinc-100 mt-0.5">
              {siteCount} / {currentPlan.site_limit}
            </div>
          </div>
          <div>
            <div className="text-xs text-zinc-500">Custom Domains</div>
            <div className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 mt-1 flex items-center gap-1">
              {currentPlan.has_custom_domain ? (
                <span className="text-emerald-600 dark:text-emerald-400">Enabled</span>
              ) : (
                <span className="text-zinc-400">Pro Only</span>
              )}
            </div>
          </div>
          <div>
            <div className="text-xs text-zinc-500">Analytics</div>
            <div className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 mt-1 flex items-center gap-1">
              {currentPlan.has_analytics_dashboard ? (
                <span className="text-emerald-600 dark:text-emerald-400">Enabled</span>
              ) : (
                <span className="text-zinc-400">Pro Only</span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Pricing Comparison Cards */}
      <div>
        <div className="text-center max-w-xl mx-auto mb-10">
          <h3 className="text-xl font-bold text-zinc-900 dark:text-zinc-50">
            Transparent, Maker-Friendly Pricing
          </h3>
          <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 mt-1.5">
            Switch plans anytime. Powered by Dodo Payments merchant of record.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {plansList.map((plan) => {
            const isCurrent = currentPlan.id === plan.id;
            const isUpgradable = !isCurrent && plan.id !== "free";

            return (
              <div
                key={plan.id}
                className={`relative rounded-3xl p-7 flex flex-col justify-between transition-all ${
                  plan.isPopular
                    ? "bg-gradient-to-b from-purple-50/50 via-white to-white dark:from-purple-950/20 dark:via-zinc-950 dark:to-zinc-950 border-2 border-purple-500/80 shadow-[0_8px_30px_rgba(168,85,247,0.12)]"
                    : "bg-white dark:bg-zinc-950 border border-zinc-200/80 dark:border-zinc-800/80 shadow-sm"
                }`}
              >
                {/* Popular Pill */}
                {plan.isPopular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-purple-600 text-white text-[10px] font-bold uppercase tracking-wider shadow-md">
                    Most Popular
                  </div>
                )}

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-base font-bold text-zinc-900 dark:text-zinc-50">
                      {plan.name}
                    </h4>
                    {isCurrent && (
                      <span className="px-2 py-0.5 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 text-[11px] font-medium">
                        Current Plan
                      </span>
                    )}
                  </div>

                  <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-6 min-h-[32px]">
                    {plan.description}
                  </p>

                  <div className="flex items-baseline gap-1 mb-6 pb-6 border-b border-zinc-100 dark:border-zinc-900">
                    <span className="text-3xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-50">
                      {plan.price}
                    </span>
                    <span className="text-xs text-zinc-500 dark:text-zinc-400">
                      /{plan.period}
                    </span>
                  </div>

                  {/* Feature list */}
                  <ul className="space-y-3 mb-8">
                    {plan.features.map((feature, idx) => (
                      <li key={idx} className="flex items-start gap-2.5 text-xs text-zinc-700 dark:text-zinc-300">
                        <Check className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Card Button */}
                <div>
                  {isCurrent ? (
                    <button
                      disabled
                      className="w-full py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 text-zinc-400 text-xs font-semibold cursor-not-allowed text-center"
                    >
                      Current Plan
                    </button>
                  ) : isUpgradable ? (
                    <button
                      onClick={() => handleUpgrade(plan.id as "basic" | "pro")}
                      disabled={loadingPlan === plan.id}
                      className={`w-full inline-flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-semibold shadow-md transition-all active:scale-[0.98] ${
                        plan.isPopular
                          ? "bg-purple-600 hover:bg-purple-500 text-white"
                          : "bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-100 dark:hover:bg-white text-white dark:text-zinc-900"
                      }`}
                    >
                      {loadingPlan === plan.id ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          <span>Preparing Checkout...</span>
                        </>
                      ) : (
                        <>
                          <span>Upgrade to {plan.name}</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </>
                      )}
                    </button>
                  ) : (
                    <button
                      disabled
                      className="w-full py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 text-zinc-400 text-xs font-semibold cursor-not-allowed text-center"
                    >
                      Default Plan
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
