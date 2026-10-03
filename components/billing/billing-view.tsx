"use client";

import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import type { Plan, Profile, Subscription, Product } from "@/types/database";
import { planRank } from "@/types/billing";
import { formatPrice, PLAN_FEATURES, planForDisplay } from "@/lib/plans";
import {
  Check,
  Sparkles,
  CreditCard,
  ArrowRight,
  ExternalLink,
  Loader2,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";

interface BillingViewProps {
  profile: Profile | null;
  currentPlan: Plan;
  /** Price and SKU catalogue. Empty means the products table is not seeded. */
  products: Product[];
  subscription: Subscription | null;
  siteCount: number;
}

type Period = "monthly" | "yearly";

export function BillingView({
  profile,
  currentPlan,
  products,
  subscription,
  siteCount,
}: BillingViewProps) {
  const searchParams = useSearchParams();

  // The return URL carries ?checkout=returned, not ?success=true. The previous
  // code read `success=true` from the query string, so visiting
  // /dashboard/billing?success=true&plan=pro displayed a confirmation for a
  // purchase that never happened. The real confirmation is the webhook.
  const cancelled = searchParams.get("checkout") === "cancelled";
  const returned = searchParams.get("checkout") === "returned";

  const [period, setPeriod] = useState<Period>("monthly");
  const [loadingProduct, setLoadingProduct] = useState<string | null>(null);
  const [portalLoading, setPortalLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Carried through signup from the marketing pricing table, so choosing "Pro"
  // on the landing page resumes at checkout instead of making the user choose
  // again.
  const [pendingUpgrade] = useState<string | null>(
    searchParams.get("upgrade")
  );
  // A ref rather than state: this is a one-shot guard, and mutating it does
  // not need to schedule a re-render.
  const autoUpgradeStarted = useRef(false);

  const paidProducts = products.filter((p) => p.price_cents > 0);
  const visible = paidProducts.filter((p) => p.billing_period === period);

  /**
   * A yearly saving is computed from the two real prices rather than a
   * hardcoded badge, so it stays correct when a price changes.
   */
  function savingPercent(planId: string): number | null {
    const monthly = paidProducts.find(
      (p) => p.plan_id === planId && p.billing_period === "monthly"
    );
    const yearly = paidProducts.find(
      (p) => p.plan_id === planId && p.billing_period === "yearly"
    );
    if (!monthly || !yearly) return null;
    const fullYear = monthly.price_cents * 12;
    if (fullYear <= yearly.price_cents) return null;
    return Math.round(((fullYear - yearly.price_cents) / fullYear) * 100);
  }

  const handleCheckout = async (productId: string) => {
    setError(null);
    setLoadingProduct(productId);

    try {
      const res = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ product_id: productId }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Could not start checkout.");
        setLoadingProduct(null);
        return;
      }
      if (data.url) {
        window.location.assign(data.url);
      } else {
        setError("Checkout did not return a payment link.");
        setLoadingProduct(null);
      }
    } catch (err) {
      setError(
        (err instanceof Error ? err.message : undefined) ||
          "An unexpected error occurred."
      );
      setLoadingProduct(null);
    }
  };

  // Resume the checkout the visitor started on the pricing page. Guarded so a
  // re-render never opens a second checkout session.
  useEffect(() => {
    if (autoUpgradeStarted.current || !pendingUpgrade) return;
    if (!products.some((p) => p.id === pendingUpgrade)) return;
    autoUpgradeStarted.current = true;
    // Deferred so the effect body itself does not schedule a state update.
    const timer = setTimeout(() => void handleCheckout(pendingUpgrade), 0);
    return () => clearTimeout(timer);
  }, [pendingUpgrade, products]);

  const handleOpenPortal = async () => {
    setError(null);
    setPortalLoading(true);

    try {
      const res = await fetch("/api/billing/portal", { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Could not open the billing portal.");
        setPortalLoading(false);
        return;
      }
      if (data.url) {
        window.location.assign(data.url);
      } else {
        setError("The billing portal did not return a link.");
        setPortalLoading(false);
      }
    } catch (err) {
      setError(
        (err instanceof Error ? err.message : undefined) ||
          "An unexpected error occurred."
      );
      setPortalLoading(false);
    }
  };

  const subscriptionTone =
    subscription?.status === "active" || subscription?.status === "trialing"
      ? "emerald"
      : subscription?.status === "past_due"
        ? "amber"
        : subscription
          ? "red"
          : "zinc";

  const statusLabel = !subscription
    ? "No active subscription"
    : subscription.status === "active"
      ? subscription.product_id?.endsWith("_yearly")
        ? "Active — annual"
        : "Active — monthly"
      : subscription.status === "trialing"
        ? "Trial"
        : subscription.status === "past_due"
          ? "Payment past due"
          : subscription.status === "cancelled"
            ? "Cancels at period end"
            : subscription.status;

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-zinc-200/80 dark:border-zinc-800/80">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
            Plans &amp; Billing
          </h1>
          <p className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-400 mt-1">
            Manage your subscription, quotas, and unlock custom domains &amp;
            analytics.
          </p>
        </div>

        {profile?.dodo_customer_id && (
          <button
            onClick={handleOpenPortal}
            disabled={portalLoading}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:bg-zinc-50 dark:hover:bg-zinc-800 text-zinc-800 dark:text-zinc-200 text-xs font-semibold shadow-sm transition-colors"
          >
            {portalLoading ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <CreditCard className="w-3.5 h-3.5 text-zinc-600" />
            )}
            <span>Manage Subscription &amp; Invoices</span>
            <ExternalLink className="w-3 h-3 text-zinc-600" />
          </button>
        )}
      </div>

      {returned && (
        <div
          role="status"
          aria-live="polite"
          className="p-4 rounded-2xl bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800/60 text-blue-800 dark:text-blue-300 text-xs font-medium"
        >
          <span className="inline-flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            Payment received. Your plan updates as soon as the payment provider
            confirms it, usually within a few seconds. Reload this page to see
            the new status.
          </span>
        </div>
      )}

      {cancelled && (
        <div
          role="status"
          aria-live="polite"
          className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 text-amber-800 dark:text-amber-300 text-xs font-medium"
        >
          Checkout was cancelled. You have not been charged.
        </div>
      )}

      {error && (
        <div
          role="alert"
          className="p-4 rounded-2xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800/60 text-red-700 dark:text-red-300 text-xs font-medium"
        >
          {error}
        </div>
      )}

      {/* Current plan */}
      <div className="p-6 rounded-3xl bg-white dark:bg-zinc-950 border border-zinc-200/80 dark:border-zinc-800/80 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-2xl bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 flex items-center justify-center text-zinc-800 dark:text-zinc-200 shadow-sm shrink-0">
            <Sparkles className="w-6 h-6 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-50">
                {currentPlan.name} Plan
              </h2>
              <span
                className={`px-2.5 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider ${
                  subscriptionTone === "emerald"
                    ? "bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300"
                    : subscriptionTone === "amber"
                      ? "bg-amber-50 dark:bg-amber-950 text-amber-700 dark:text-amber-300"
                      : subscriptionTone === "red"
                        ? "bg-red-50 dark:bg-red-950 text-red-700 dark:text-red-300"
                        : "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300"
                }`}
              >
                {statusLabel}
              </span>
            </div>
            <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-1 max-w-lg">
              {currentPlan.tagline}
            </p>

            {subscription?.current_period_end && (
              <p className="text-[11px] text-zinc-600 mt-2 font-mono">
                {subscription.status === "cancelled"
                  ? "Access until"
                  : "Renews on"}{" "}
                {new Date(subscription.current_period_end).toLocaleDateString(
                  undefined,
                  { year: "numeric", month: "long", day: "numeric" }
                )}
              </p>
            )}

            {subscription?.status === "past_due" && (
              <p className="text-[11px] text-amber-600 dark:text-amber-400 mt-1">
                A payment failed. Update your card to avoid losing access.
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-6 border-t md:border-t-0 md:border-l border-zinc-100 dark:border-zinc-900 pt-4 md:pt-0 md:pl-6 shrink-0">
          <div>
            <div className="text-xs text-zinc-600">Site Quota</div>
            <div className="text-xl font-bold text-zinc-900 dark:text-zinc-100 mt-0.5">
              {siteCount} / {currentPlan.site_limit}
            </div>
          </div>
          <div>
            <div className="text-xs text-zinc-600">Custom Domains</div>
            <div className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 mt-1">
              {currentPlan.has_custom_domain ? (
                <span className="text-emerald-600 dark:text-emerald-400">Enabled</span>
              ) : (
                <span className="text-zinc-600">Paid plans</span>
              )}
            </div>
          </div>
          <div>
            <div className="text-xs text-zinc-600">Analytics</div>
            <div className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 mt-1">
              {currentPlan.has_analytics_dashboard ? (
                <span className="text-emerald-600 dark:text-emerald-400">Enabled</span>
              ) : (
                <span className="text-zinc-600">Pro only</span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Pricing */}
      <div>
        <div className="text-center max-w-xl mx-auto mb-6">
          <h3 className="text-xl font-bold text-zinc-900 dark:text-zinc-50">
            Transparent, Maker-Friendly Pricing
          </h3>
          <p className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-400 mt-1.5">
            Prices are charged and taxed through Dodo Payments as merchant of
            record.
          </p>
        </div>

        {/* Period toggle */}
        <div
          role="tablist"
          aria-label="Billing period"
          className="flex justify-center mb-8"
        >
          <div className="inline-flex p-1 rounded-xl bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800">
            {(["monthly", "yearly"] as const).map((option) => {
              const isActive = period === option;
              const save = option === "yearly" ? null : null;
              return (
                <button
                  key={option}
                  role="tab"
                  aria-selected={isActive}
                  onClick={() => setPeriod(option)}
                  className={`px-4 py-1.5 rounded-lg text-xs font-semibold capitalize transition-colors ${
                    isActive
                      ? "bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 shadow-sm"
                      : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200"
                  }`}
                >
                  {option}
                  {save ? ` save ${save}%` : ""}
                </button>
              );
            })}
          </div>
        </div>

        {visible.length === 0 ? (
          <div className="p-8 rounded-2xl border border-amber-200 dark:border-amber-800/60 bg-amber-50 dark:bg-amber-950/20 text-center">
            <AlertCircle className="w-6 h-6 text-amber-600 dark:text-amber-400 mx-auto mb-3" />
            <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
              Pricing is not configured yet
            </p>
            <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-1">
              No active products were found. Run the seed block in{" "}
              <code className="font-mono">supabase/schema.sql</code> to populate
              the catalogue.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
            {visible.map((product) => {
              const isCurrentTier = planRank(product.plan_id) <= planRank(currentPlan.id);
              const isCurrentProduct =
                subscription?.product_id === product.id &&
                subscription?.status !== "expired" &&
                subscription?.status !== "cancelled";
              const isPopular = product.plan_id === "pro";
              const save = savingPercent(product.plan_id);

              return (
                <div
                  key={product.id}
                  className={`relative rounded-3xl p-7 flex flex-col justify-between transition-colors ${
                    isPopular
                      ? "bg-gradient-to-b from-purple-50/50 via-white to-white dark:from-purple-950/20 dark:via-zinc-950 dark:to-zinc-950 border-2 border-purple-500/80 shadow-[0_8px_30px_rgba(168,85,247,0.12)]"
                      : "bg-white dark:bg-zinc-950 border border-zinc-200/80 dark:border-zinc-800/80 shadow-sm"
                  }`}
                >
                  {isPopular && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-purple-600 text-white text-[10px] font-bold uppercase tracking-wider shadow-md">
                      Most Popular
                    </div>
                  )}

                  <div>
                    <div className="flex items-center justify-between mb-2 gap-2">
                      <h4 className="text-base font-bold text-zinc-900 dark:text-zinc-50">
                        {product.plan_id === "pro" ? "Pro" : "Basic"}
                      </h4>
                      {isCurrentProduct && (
                        <span className="px-2 py-0.5 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 text-[11px] font-medium">
                          Current
                        </span>
                      )}
                    </div>

                    <div className="flex items-baseline gap-1 mb-1">
                      <span className="text-3xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-50">
                        {formatPrice(product.price_cents)}
                      </span>
                      <span className="text-xs text-zinc-600 dark:text-zinc-400">
                        /{product.billing_period === "yearly" ? "year" : "month"}
                      </span>
                    </div>

                    {period === "yearly" && save && (
                      <p className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 mb-4">
                        Save {save}% versus monthly
                      </p>
                    )}

                    <ul className="space-y-3 mt-4 mb-6">
                      {PLAN_FEATURES.map((feature) => {
                        const enabled = feature.get(planForDisplay(product.plan_id));
                        return (
                          <li
                            key={feature.label}
                            className="flex items-start gap-2.5 text-xs text-zinc-700 dark:text-zinc-300"
                          >
                            {enabled ? (
                              <Check className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                            ) : (
                              <span className="w-4 h-4 shrink-0 mt-0.5 text-center text-zinc-300">
                                &ndash;
                              </span>
                            )}
                            <span className={enabled ? "" : "text-zinc-600"}>
                              {typeof enabled === "number"
                                ? `${feature.label} (${enabled})`
                                : feature.label}
                            </span>
                          </li>
                        );
                      })}
                    </ul>
                  </div>

                  <div>
                    {isCurrentProduct ? (
                      <button
                        disabled
                        className="w-full py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 text-zinc-600 text-xs font-semibold cursor-not-allowed"
                      >
                        Current Plan
                      </button>
                    ) : isCurrentTier ? (
                      <button
                        disabled
                        className="w-full py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 text-zinc-600 text-xs font-semibold cursor-not-allowed"
                      >
                        Included in your plan
                      </button>
                    ) : (
                      <button
                        onClick={() => handleCheckout(product.id)}
                        disabled={loadingProduct === product.id}
                        className={`w-full inline-flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-semibold shadow-md transition-colors active:scale-[0.98] ${
                          isPopular
                            ? "bg-purple-600 hover:bg-purple-500 text-white"
                            : "bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-100 dark:hover:bg-white text-white dark:text-zinc-900"
                        }`}
                      >
                        {loadingProduct === product.id ? (
                          <>
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            <span>Preparing checkout…</span>
                          </>
                        ) : (
                          <>
                            <span>
                              {isCurrentTier ? "Switch to " : "Upgrade to "}
                              {product.plan_id === "pro" ? "Pro" : "Basic"}
                            </span>
                            <ArrowRight className="w-3.5 h-3.5" />
                          </>
                        )}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {currentPlan.id === "free" && (
          <p className="text-center text-[11px] text-zinc-600 mt-6">
            Cancel or change plan any time from the billing portal. There is no
            cancellation fee.
          </p>
        )}
      </div>
    </div>
  );
}
