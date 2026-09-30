import { createClient } from "@/lib/supabase/server";
import { BillingView } from "@/components/billing/billing-view";
import type { Plan, Profile, Subscription, Product } from "@/types/database";
import { FREE_PLAN } from "@/lib/plans";

export const dynamic = "force-dynamic";

/**
 * Billing page.
 *
 * Prices and features are read from the database, not hardcoded. There were
 * four competing sources of truth for pricing before: the `plans.price_cents`
 * column (never read), the marketing page, the billing view, and the Dodo
 * client. Changing a price required editing three components.
 */
export default async function BillingPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return <BillingView profile={null} currentPlan={FREE_PLAN} products={[]} subscription={null} siteCount={0} />;
  }

  const [{ data: profile }, { data: products }] = await Promise.all([
    supabase.from("profiles").select("*, plans(*)").eq("id", user.id).single(),
    supabase
      .from("products")
      .select("id, plan_id, billing_period, name, price_cents, is_active, sort_order")
      .eq("is_active", true)
      .order("sort_order"),
  ]);

  const currentPlan: Plan = (profile?.plans as Plan | undefined) ?? FREE_PLAN;

  // The entitlement-bearing subscription, not the most recent row. Ordering by
  // created_at returned an old cancelled row after an upgrade, so the renewal
  // date shown to the customer was wrong.
  const { data: subscription } = await supabase
    .from("subscriptions")
    .select("*")
    .eq("user_id", user.id)
    .in("status", ["active", "trialing", "past_due", "on_hold", "paused"])
    .order("current_period_end", { ascending: false, nullsFirst: false })
    .limit(1)
    .maybeSingle();

  const { count: siteCount } = await supabase
    .from("sites")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id);

  return (
    <BillingView
      profile={(profile as Profile) || null}
      currentPlan={currentPlan}
      products={(products as Product[]) || []}
      subscription={(subscription as Subscription) || null}
      siteCount={siteCount || 0}
    />
  );
}
