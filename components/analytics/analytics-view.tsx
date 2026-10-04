/* Hallmark · pre-emit critique: P5 H5 E5 S5 R5 V5 */
"use client";

import { useState, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import type {
  Site,
  Plan,
  AnalyticsDailyRow,
  AnalyticsSourceRow,
  AnalyticsCtaRow,
} from "@/types/database";
import type { AnalyticsPeriod } from "@/app/(dashboard)/dashboard/analytics/page";
import { resolveCtaStore } from "@/lib/analytics";
import {
  TrendingUp,
  MousePointerClick,
  Eye,
  Smartphone,
  Globe,
  Lock,
  ArrowUpRight,
  ChevronDown,
  Apple,
  Play,
  Laptop,
  Tablet,
} from "lucide-react";

interface AnalyticsViewProps {
  sites: Site[];
  dailySummary: AnalyticsDailyRow[];
  sources: AnalyticsSourceRow[];
  ctaBreakdown: AnalyticsCtaRow[];
  plan: Plan;
  initialPeriod?: AnalyticsPeriod;
}

export function AnalyticsView({
  sites,
  dailySummary,
  sources,
  ctaBreakdown,
  plan,
  initialPeriod = "30d",
}: AnalyticsViewProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [selectedSiteId, setSelectedSiteId] = useState<string>("all");
  const [hoveredDay, setHoveredDay] = useState<{
    date: string;
    label: string;
    views: number;
    clicks: number;
  } | null>(null);

  // Derive period directly from searchParams / initialPeriod for single source of truth
  const periodParam = searchParams?.get("period");
  const period: AnalyticsPeriod =
    periodParam === "7d" || periodParam === "90d"
      ? periodParam
      : initialPeriod;

  const isPro = plan.has_analytics_dashboard;

  const handlePeriodChange = (newPeriod: AnalyticsPeriod) => {
    const params = new URLSearchParams(searchParams?.toString() || "");
    params.set("period", newPeriod);
    router.push(`/dashboard/analytics?${params.toString()}`);
  };

  // Filter rows by selected site
  const filteredSummary = useMemo(() => {
    if (selectedSiteId === "all") return dailySummary;
    return dailySummary.filter((r) => r.site_id === selectedSiteId);
  }, [dailySummary, selectedSiteId]);

  const filteredSources = useMemo(() => {
    if (selectedSiteId === "all") return sources;
    return sources.filter((r) => r.site_id === selectedSiteId);
  }, [sources, selectedSiteId]);

  const filteredCta = useMemo(() => {
    if (selectedSiteId === "all") return ctaBreakdown;
    return ctaBreakdown.filter((r) => r.site_id === selectedSiteId);
  }, [ctaBreakdown, selectedSiteId]);

  // Aggregate metrics from SQL views with UTC timezone alignment
  const metrics = useMemo(() => {
    let pageViews = 0;
    let buttonClicks = 0;
    let mobile = 0;
    let tablet = 0;
    let desktop = 0;

    const numDays = period === "7d" ? 7 : period === "90d" ? 90 : 30;

    // Generate dailyMap in pure UTC to match database (created_at at time zone 'utc')::date
    const dailyMap: Record<string, { views: number; clicks: number }> = {};
    const now = new Date();
    const todayUTC = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())
    );
    for (let i = numDays - 1; i >= 0; i--) {
      const d = new Date(todayUTC.getTime() - i * 24 * 60 * 60 * 1000);
      const key = d.toISOString().slice(0, 10);
      dailyMap[key] = { views: 0, clicks: 0 };
    }

    filteredSummary.forEach((row) => {
      const dayKey = typeof row.day === "string" ? row.day.slice(0, 10) : "";
      if (dayKey && dailyMap[dayKey]) {
        const views = Number(row.page_views) || 0;
        const clicks = Number(row.button_clicks) || 0;
        dailyMap[dayKey].views += views;
        dailyMap[dayKey].clicks += clicks;
        pageViews += views;
        buttonClicks += clicks;
        mobile += Number(row.mobile) || 0;
        tablet += Number(row.tablet) || 0;
        desktop += Number(row.desktop) || 0;
      }
    });

    // Store button clicks: Apple App Store vs Google Play, as attributed by the view.
    let appStoreClicks = 0;
    let playStoreClicks = 0;
    let otherClicks = 0;

    filteredCta.forEach((cta) => {
      const dayKey = typeof cta.day === "string" ? cta.day.slice(0, 10) : "";
      if (dayKey && !dailyMap[dayKey]) return;

      const clicks = Number(cta.clicks) || 0;
      // The view resolves the store, falling back to the destination a legacy
      // `nav_download` click opened. Matching the button type here instead
      // filed every header download click under "Other Buttons" — see
      // lib/analytics.ts.
      const store = resolveCtaStore(cta);

      if (store === "apple") {
        appStoreClicks += clicks;
      } else if (store === "google") {
        playStoreClicks += clicks;
      } else {
        otherClicks += clicks;
      }
    });

    // Top Referrers with clean grouping
    const refMap: Record<string, number> = {};
    filteredSources.forEach((src) => {
      const dayKey = typeof src.day === "string" ? src.day.slice(0, 10) : "";
      if (dayKey && !dailyMap[dayKey]) return;

      const rawRef = (src.source || "").trim();
      const ref =
        rawRef.toLowerCase() === "direct" || !rawRef ? "Direct" : rawRef;
      refMap[ref] = (refMap[ref] || 0) + (Number(src.views) || 0);
    });

    const topReferrers = Object.entries(refMap)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);

    const ctr =
      pageViews > 0 ? ((buttonClicks / pageViews) * 100).toFixed(1) : "0.0";

    const timeline = Object.entries(dailyMap).map(([date, data]) => ({
      date,
      label: new Date(`${date}T00:00:00Z`).toLocaleDateString("en-US", {
        timeZone: "UTC",
        weekday: period === "7d" ? "short" : undefined,
        month: "numeric",
        day: "numeric",
      }),
      views: data.views,
      clicks: data.clicks,
    }));

    const maxDayViews = Math.max(
      1,
      ...timeline.map((d) => Math.max(d.views, d.clicks))
    );

    return {
      pageViews,
      buttonClicks,
      appStoreClicks,
      playStoreClicks,
      otherClicks,
      ctr,
      devices: { mobile, tablet, desktop },
      topReferrers,
      timeline,
      maxDayViews,
    };
  }, [filteredSummary, filteredSources, filteredCta, period]);

  const periodLabel =
    period === "7d" ? "Last 7 days" : period === "90d" ? "Last 90 days" : "Last 30 days";

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Page Header with datafa.st style controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
              Analytics Overview
            </h1>
            <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-800/60">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span>Live Telemetry</span>
            </div>
            {isPro && (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold whitespace-nowrap bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border border-purple-200/80 dark:border-purple-800">
                PRO ACTIVE
              </span>
            )}
          </div>
          <p className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-400 mt-1">
            Privacy-first, cookieless metrics and store conversion tracking.
          </p>
        </div>

        {/* Controls: Site Selector + Period Toggle */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Period Toggle Pills (datafa.st inspired) */}
          <div
            className="flex items-center rounded-xl p-1 bg-zinc-100 dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800"
            role="group"
            aria-label="Time period selection"
          >
            {(["7d", "30d", "90d"] as const).map((p) => {
              const active = period === p;
              return (
                <button
                  key={p}
                  type="button"
                  onClick={() => handlePeriodChange(p)}
                  disabled={!isPro}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold uppercase tracking-wider transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
                    active
                      ? "bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-50 shadow-sm"
                      : "text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
                  }`}
                >
                  {p === "7d" ? "7D" : p === "30d" ? "30D" : "90D"}
                </button>
              );
            })}
          </div>

          {/* Site Selector Dropdown */}
          {sites.length > 0 && (
            <div className="relative">
              <select
                value={selectedSiteId}
                onChange={(e) => setSelectedSiteId(e.target.value)}
                disabled={!isPro}
                aria-label="Select landing page"
                className="appearance-none pl-3.5 pr-9 py-2 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-xs font-medium text-zinc-800 dark:text-zinc-200 focus:ring-2 focus:ring-blue-500/20 shadow-sm cursor-pointer disabled:cursor-not-allowed disabled:opacity-55"
              >
                <option value="all">All Landing Pages ({sites.length})</option>
                {sites.map((site) => (
                  <option key={site.id} value={site.id}>
                    {site.content?.hero?.app_name || site.slug} ({site.slug})
                  </option>
                ))}
              </select>
              <ChevronDown
                className="w-3.5 h-3.5 text-zinc-500 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none"
                aria-hidden="true"
              />
            </div>
          )}
        </div>
      </div>

      {/* Pro Tier Lock Wall (If on Free/Basic) */}
      {!isPro ? (
        <div className="relative overflow-hidden rounded-3xl border border-purple-200/80 dark:border-purple-900/40 bg-gradient-to-b from-purple-50/40 via-white to-white dark:from-purple-950/20 dark:via-zinc-950 dark:to-zinc-950 p-8 sm:p-12 text-center">
          <div className="max-w-md mx-auto space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-purple-100 dark:bg-purple-900/50 text-purple-600 dark:text-purple-400 flex items-center justify-center mx-auto shadow-sm">
              <Lock className="w-6 h-6" aria-hidden="true" />
            </div>
            <h2 className="text-xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
              Unlock ShipSprint Analytics
            </h2>
            <p className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">
              Understand which marketing channels drive actual app downloads. Access real-time visitor counts, store link click-through rates (CTR), and referral attribution with ShipSprint Pro.
            </p>

            <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-3">
              <Link
                href="/dashboard/billing"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold shadow-md transition-colors active:scale-[0.98]"
              >
                <span>Upgrade to Pro ($9.99/mo)</span>
                <ArrowUpRight className="w-4 h-4" aria-hidden="true" />
              </Link>
            </div>
          </div>

          {/* Background Blurred Teaser Metrics with Explicit Sample Label */}
          <div className="mt-12 pt-8 border-t border-purple-100 dark:border-purple-950/60 text-left">
            <div className="flex items-center justify-center gap-2 mb-4">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-purple-100 dark:bg-purple-900/50 text-purple-700 dark:text-purple-300">
                Sample Metrics Preview (Demo Only)
              </span>
            </div>
            <div className="opacity-40 blur-[1px] pointer-events-none grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="p-4 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800">
                <div className="text-xs text-zinc-600">Total Views</div>
                <div className="text-2xl font-bold mt-1">4,289</div>
              </div>
              <div className="p-4 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800">
                <div className="text-xs text-zinc-600">Store Clicks</div>
                <div className="text-2xl font-bold mt-1">1,048</div>
              </div>
              <div className="p-4 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800">
                <div className="text-xs text-zinc-600">Conversion Rate</div>
                <div className="text-2xl font-bold mt-1">24.4%</div>
              </div>
              <div className="p-4 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800">
                <div className="text-xs text-zinc-600">Mobile Share</div>
                <div className="text-2xl font-bold mt-1">88.2%</div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-8">
          {/* Top Metric Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
            {/* 1. Page Views */}
            <div className="p-5 rounded-2xl bg-white dark:bg-zinc-950 border border-zinc-200/80 dark:border-zinc-800/80 shadow-sm">
              <div className="flex items-center justify-between text-zinc-600 dark:text-zinc-400 mb-2">
                <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">
                  Page Views
                </span>
                <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                  <Eye className="w-4 h-4" aria-hidden="true" />
                </div>
              </div>
              <div className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
                {metrics.pageViews.toLocaleString()}
              </div>
              <div className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-1">
                {periodLabel} total traffic
              </div>
            </div>

            {/* 2. Button Clicks */}
            <div className="p-5 rounded-2xl bg-white dark:bg-zinc-950 border border-zinc-200/80 dark:border-zinc-800/80 shadow-sm">
              <div className="flex items-center justify-between text-zinc-600 dark:text-zinc-400 mb-2">
                <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">
                  Store Downloads
                </span>
                <div className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                  <MousePointerClick className="w-4 h-4" aria-hidden="true" />
                </div>
              </div>
              <div className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
                {metrics.buttonClicks.toLocaleString()}
              </div>
              <div className="text-[11px] text-emerald-600 dark:text-emerald-400 mt-1 flex items-center gap-1 font-medium">
                <span>App Store &amp; Google Play clicks</span>
              </div>
            </div>

            {/* 3. CTR */}
            <div className="p-5 rounded-2xl bg-white dark:bg-zinc-950 border border-zinc-200/80 dark:border-zinc-800/80 shadow-sm">
              <div className="flex items-center justify-between text-zinc-600 dark:text-zinc-400 mb-2">
                <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">
                  Conversion (CTR)
                </span>
                <div className="w-8 h-8 rounded-xl bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400 flex items-center justify-center">
                  <TrendingUp className="w-4 h-4" aria-hidden="true" />
                </div>
              </div>
              <div className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
                {metrics.ctr}%
              </div>
              <div className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-1">
                Download clicks per visitor
              </div>
            </div>

            {/* 4. Active Sites */}
            <div className="p-5 rounded-2xl bg-white dark:bg-zinc-950 border border-zinc-200/80 dark:border-zinc-800/80 shadow-sm">
              <div className="flex items-center justify-between text-zinc-600 dark:text-zinc-400 mb-2">
                <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">
                  Tracked Apps
                </span>
                <div className="w-8 h-8 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                  <Smartphone className="w-4 h-4" aria-hidden="true" />
                </div>
              </div>
              <div className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
                {selectedSiteId === "all" ? sites.length : 1}
              </div>
              <div className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-1">
                {sites.filter((s) => s.status === "published").length} live in production
              </div>
            </div>
          </div>

          {/* Daily Traffic & Conversion Velocity Chart */}
          <div className="p-6 rounded-2xl bg-white dark:bg-zinc-950 border border-zinc-200/80 dark:border-zinc-800/80 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-6">
              <div>
                <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                  Daily Traffic &amp; Conversion Velocity
                </h2>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                  Page views compared to download button taps ({periodLabel})
                </p>
              </div>

              {/* Legend & Hover Details */}
              <div className="flex items-center gap-4 text-xs">
                {hoveredDay ? (
                  <div className="flex items-center gap-3 font-mono text-[11px] bg-zinc-100 dark:bg-zinc-900 px-3 py-1 rounded-lg">
                    <span className="font-semibold text-zinc-900 dark:text-zinc-100">
                      {hoveredDay.label}:
                    </span>
                    <span className="text-blue-600 dark:text-blue-400">
                      {hoveredDay.views} views
                    </span>
                    <span className="text-emerald-600 dark:text-emerald-400">
                      {hoveredDay.clicks} clicks
                    </span>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-sm bg-blue-600" aria-hidden="true" />
                      <span className="text-zinc-600 dark:text-zinc-400">Views</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500" aria-hidden="true" />
                      <span className="text-zinc-600 dark:text-zinc-400">Clicks</span>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Responsive Bar Grid */}
            <div className="flex items-end gap-1.5 sm:gap-2.5 h-48 pt-6 border-b border-zinc-100 dark:border-zinc-900 overflow-x-auto scrollbar-thin">
              {metrics.timeline.map((day, idx) => {
                const viewHeight =
                  day.views > 0
                    ? Math.max(8, Math.round((day.views / metrics.maxDayViews) * 100))
                    : 0;
                const clickHeight =
                  day.clicks > 0
                    ? Math.max(8, Math.round((day.clicks / metrics.maxDayViews) * 100))
                    : 0;

                const totalPoints = metrics.timeline.length;
                const showLabel =
                  period === "7d" ||
                  (period === "30d" && (idx % 5 === 0 || idx === totalPoints - 1)) ||
                  (period === "90d" && (idx % 14 === 0 || idx === totalPoints - 1));

                return (
                  <div
                    key={day.date}
                    onMouseEnter={() => setHoveredDay(day)}
                    onMouseLeave={() => setHoveredDay(null)}
                    className="flex-1 min-w-[20px] flex flex-col items-center gap-2 h-full justify-end group cursor-pointer"
                  >
                    <div className="w-full flex items-end justify-center gap-0.5 sm:gap-1.5 h-full">
                      {/* View Bar */}
                      {viewHeight > 0 ? (
                        <div
                          className="w-full max-w-[14px] bg-blue-600 rounded-t-sm transition-all duration-200 group-hover:bg-blue-500"
                          style={{ height: `${viewHeight}%` }}
                          title={`${day.views} views on ${day.label}`}
                        />
                      ) : (
                        <div className="w-full max-w-[14px] h-0.5 bg-zinc-200 dark:bg-zinc-800 rounded-full opacity-60" />
                      )}
                      {/* Click Bar */}
                      {clickHeight > 0 ? (
                        <div
                          className="w-full max-w-[14px] bg-emerald-500 rounded-t-sm transition-all duration-200 group-hover:bg-emerald-400"
                          style={{ height: `${clickHeight}%` }}
                          title={`${day.clicks} clicks on ${day.label}`}
                        />
                      ) : (
                        <div className="w-full max-w-[14px] h-0.5 bg-zinc-200 dark:bg-zinc-800 rounded-full opacity-60" />
                      )}
                    </div>
                    {/* Clean stride date label */}
                    <span className="text-[10px] text-zinc-500 font-mono text-center truncate w-full h-4">
                      {showLabel ? day.label : ""}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Breakdown Grid: Store Platform Split + Top Traffic Sources + Devices */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* 1. App Store vs. Google Play Split */}
            <div className="p-6 rounded-2xl bg-white dark:bg-zinc-950 border border-zinc-200/80 dark:border-zinc-800/80 shadow-sm flex flex-col justify-between">
              <div>
                <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50 mb-1">
                  Store Platform Split
                </h3>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-5">
                  App Store vs. Google Play download intent
                </p>

                {metrics.buttonClicks === 0 ? (
                  <div className="text-center py-8 text-xs text-zinc-500">
                    No store downloads recorded in this window.
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* iOS App Store */}
                    {(() => {
                      const pct = Math.round(
                        (metrics.appStoreClicks / metrics.buttonClicks) * 100
                      );
                      return (
                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-medium text-zinc-800 dark:text-zinc-200 flex items-center gap-1.5">
                              <Apple className="w-3.5 h-3.5 text-zinc-900 dark:text-zinc-100" />
                              Apple App Store
                            </span>
                            <span className="font-mono text-zinc-600 dark:text-zinc-400 text-[11px]">
                              {metrics.appStoreClicks} ({pct}%)
                            </span>
                          </div>
                          <div className="w-full h-2 rounded-full bg-zinc-100 dark:bg-zinc-900 overflow-hidden">
                            <div
                              className="h-full bg-zinc-900 dark:bg-zinc-100 rounded-full transition-all"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </div>
                      );
                    })()}

                    {/* Google Play */}
                    {(() => {
                      const pct = Math.round(
                        (metrics.playStoreClicks / metrics.buttonClicks) * 100
                      );
                      return (
                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-medium text-zinc-800 dark:text-zinc-200 flex items-center gap-1.5">
                              <Play className="w-3.5 h-3.5 text-emerald-600 fill-emerald-600" />
                              Google Play Store
                            </span>
                            <span className="font-mono text-zinc-600 dark:text-zinc-400 text-[11px]">
                              {metrics.playStoreClicks} ({pct}%)
                            </span>
                          </div>
                          <div className="w-full h-2 rounded-full bg-zinc-100 dark:bg-zinc-900 overflow-hidden">
                            <div
                              className="h-full bg-emerald-500 rounded-full transition-all"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </div>
                      );
                    })()}

                    {/* Other Buttons / Custom Links if any */}
                    {metrics.otherClicks > 0 && (() => {
                      const pct = Math.round(
                        (metrics.otherClicks / metrics.buttonClicks) * 100
                      );
                      return (
                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-medium text-zinc-600 dark:text-zinc-400 flex items-center gap-1.5">
                              Other Buttons
                            </span>
                            <span className="font-mono text-zinc-500 text-[11px]">
                              {metrics.otherClicks} ({pct}%)
                            </span>
                          </div>
                          <div className="w-full h-1.5 rounded-full bg-zinc-100 dark:bg-zinc-900 overflow-hidden">
                            <div
                              className="h-full bg-zinc-400 rounded-full transition-all"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                )}
              </div>
              <div className="mt-6 pt-3 border-t border-zinc-100 dark:border-zinc-900 text-[11px] text-zinc-500">
                100% Cookieless download link attribution
              </div>
            </div>

            {/* 2. Top Traffic Sources (Referrers) */}
            <div className="p-6 rounded-2xl bg-white dark:bg-zinc-950 border border-zinc-200/80 dark:border-zinc-800/80 shadow-sm flex flex-col justify-between">
              <div>
                <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50 mb-1">
                  Top Traffic Sources
                </h3>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-5">
                  Where your visitors are arriving from
                </p>

                {metrics.topReferrers.length === 0 ? (
                  <div className="text-center py-8 text-xs text-zinc-500">
                    No referral data recorded in this window.
                  </div>
                ) : (
                  <div className="space-y-3.5">
                    {metrics.topReferrers.map(([source, count]) => {
                      const pct =
                        metrics.pageViews > 0
                          ? Math.round((count / metrics.pageViews) * 100)
                          : 0;
                      return (
                        <div key={source} className="space-y-1.5">
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-medium text-zinc-800 dark:text-zinc-200 truncate flex items-center gap-1.5">
                              <Globe className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
                              {source}
                            </span>
                            <span className="font-mono text-zinc-600 dark:text-zinc-400 text-[11px]">
                              {count} ({pct}%)
                            </span>
                          </div>
                          <div className="w-full h-1.5 rounded-full bg-zinc-100 dark:bg-zinc-900 overflow-hidden">
                            <div
                              className="h-full bg-blue-600 rounded-full transition-all"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
              <div className="mt-6 pt-3 border-t border-zinc-100 dark:border-zinc-900 text-[11px] text-zinc-500">
                Filtered and aggregated across {periodLabel}
              </div>
            </div>

            {/* 3. Device Hardware Split (Scoped to Page Views) */}
            <div className="p-6 rounded-2xl bg-white dark:bg-zinc-950 border border-zinc-200/80 dark:border-zinc-800/80 shadow-sm flex flex-col justify-between">
              <div>
                <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50 mb-1">
                  Visitor Devices
                </h3>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-5">
                  Hardware categories per page visit
                </p>

                <div className="space-y-4">
                  {[
                    {
                      label: "Mobile",
                      count: metrics.devices.mobile,
                      color: "bg-blue-600",
                      icon: Smartphone,
                    },
                    {
                      label: "Desktop",
                      count: metrics.devices.desktop,
                      color: "bg-indigo-600",
                      icon: Laptop,
                    },
                    {
                      label: "Tablet",
                      count: metrics.devices.tablet,
                      color: "bg-purple-600",
                      icon: Tablet,
                    },
                  ].map((item) => {
                    const total =
                      metrics.devices.mobile +
                      metrics.devices.desktop +
                      metrics.devices.tablet;
                    const pct =
                      total > 0 ? Math.round((item.count / total) * 100) : 0;
                    const Icon = item.icon;
                    return (
                      <div key={item.label} className="space-y-1.5">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-medium text-zinc-800 dark:text-zinc-200 flex items-center gap-1.5">
                            <Icon className="w-3.5 h-3.5 text-zinc-500" />
                            {item.label}
                          </span>
                          <span className="font-mono text-zinc-600 dark:text-zinc-400 text-[11px]">
                            {item.count} ({pct}%)
                          </span>
                        </div>
                        <div className="w-full h-1.5 rounded-full bg-zinc-100 dark:bg-zinc-900 overflow-hidden">
                          <div
                            className={`h-full ${item.color} rounded-full transition-all`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
              <div className="mt-6 pt-3 border-t border-zinc-100 dark:border-zinc-900 text-[11px] text-zinc-500">
                Unique visits scoped to page loads
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
