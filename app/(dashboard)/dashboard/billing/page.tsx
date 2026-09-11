import { createClient } from "@/lib/supabase/server";
import { BillingView } from "@/components/billing/billing-view";
import type { Plan, Profile, Subscription } from "@/types/database";

export const dynamic = "force-dynamic";

export default async function BillingPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Fetch profile & plan
  const { data: profile } = await supabase
    .from("profiles")
    .select("*, plans(*)")
    .eq("id", user?.id)
    .single();

  const currentPlan: Plan = profile?.plans || {
    id: "free",
    name: "Free",
    price_cents: 0,
    site_limit: 1,
    has_branding: true,
    has_custom_domain: false,
    has_analytics_dashboard: false,
  };

  // Fetch active subscription if exists
  const { data: subscription } = await supabase
    .from("subscriptions")
    .select("*")
    .eq("user_id", user?.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  // Fetch user's sites count
  const { count: siteCount } = await supabase
    .from("sites")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user?.id);

  return (
    <BillingView
      profile={(profile as Profile) || null}
      currentPlan={currentPlan}
      subscription={(subscription as Subscription) || null}
      siteCount={siteCount || 0}
    />
  );
}
