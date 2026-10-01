import { createClient } from "@/lib/supabase/server";
import { AnalyticsView } from "@/components/analytics/analytics-view";
import type { Site, Plan, AnalyticsDailyRow, AnalyticsSourceRow, AnalyticsCtaRow } from "@/types/database";

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

  let dailySummary: AnalyticsDailyRow[] = [];
  let sources: AnalyticsSourceRow[] = [];
  let ctaBreakdown: AnalyticsCtaRow[] = [];

  // Query SQL views using the user's authenticated client (security_invoker)
  if (siteIds.length > 0 && plan.has_analytics_dashboard) {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const thirtyDaysStr = thirtyDaysAgo.toISOString().slice(0, 10);

    const [summaryRes, sourcesRes, ctaRes] = await Promise.all([
      supabase
        .from("site_analytics_summary")
        .select("*")
        .in("site_id", siteIds)
        .gte("day", thirtyDaysStr)
        .order("day", { ascending: true }),
      supabase
        .from("site_analytics_sources")
        .select("*")
        .in("site_id", siteIds)
        .gte("day", thirtyDaysStr)
        .order("views", { ascending: false })
        .limit(50),
      supabase
        .from("site_analytics_cta")
        .select("*")
        .in("site_id", siteIds),
    ]);

    dailySummary = (summaryRes.data as AnalyticsDailyRow[]) || [];
    sources = (sourcesRes.data as AnalyticsSourceRow[]) || [];
    ctaBreakdown = (ctaRes.data as AnalyticsCtaRow[]) || [];
  }

  return (
    <AnalyticsView
      sites={siteList}
      dailySummary={dailySummary}
      sources={sources}
      ctaBreakdown={ctaBreakdown}
      plan={plan}
    />
  );
}
