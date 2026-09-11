import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { AnalyticsView } from "@/components/analytics/analytics-view";
import type { Site, Plan, Profile, AnalyticsEvent } from "@/types/database";

export const dynamic = "force-dynamic";

export default async function AnalyticsPage() {
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

  const plan: Plan = profile?.plans || {
    id: "free",
    name: "Free",
    price_cents: 0,
    site_limit: 1,
    has_branding: true,
    has_custom_domain: false,
    has_analytics_dashboard: false,
  };

  // Fetch user's sites
  const { data: sites } = await supabase
    .from("sites")
    .select("*")
    .eq("user_id", user?.id)
    .order("created_at", { ascending: false });

  const siteList: Site[] = (sites as Site[]) || [];
  const siteIds = siteList.map((s) => s.id);

  // Fetch events for these sites if pro, or limited sample if not
  let events: AnalyticsEvent[] = [];

  if (siteIds.length > 0 && plan.has_analytics_dashboard) {
    const adminSupabase = createAdminClient();
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const { data: eventRecords } = await adminSupabase
      .from("analytics_events")
      .select("*")
      .in("site_id", siteIds)
      .gte("created_at", thirtyDaysAgo.toISOString())
      .order("created_at", { ascending: false })
      .limit(1000);

    events = (eventRecords as AnalyticsEvent[]) || [];
  }

  return (
    <AnalyticsView
      sites={siteList}
      events={events}
      plan={plan}
    />
  );
}
