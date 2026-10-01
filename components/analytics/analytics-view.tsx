"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import type { Site, Plan, AnalyticsDailyRow, AnalyticsSourceRow, AnalyticsCtaRow } from "@/types/database";
import {
  TrendingUp,
  MousePointerClick,
  Eye,
  Smartphone,
  Globe,
  Lock,
  ArrowUpRight,
  ChevronDown,
} from "lucide-react";

interface AnalyticsViewProps {
  sites: Site[];
  dailySummary: AnalyticsDailyRow[];
  sources: AnalyticsSourceRow[];
  ctaBreakdown: AnalyticsCtaRow[];
  plan: Plan;
}

export function AnalyticsView({
  sites,
  dailySummary,
  sources,
  ctaBreakdown,
  plan,
}: AnalyticsViewProps) {
  const [selectedSiteId, setSelectedSiteId] = useState<string>("all");
  const isPro = plan.has_analytics_dashboard;

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

  // Aggregate metrics from SQL views
  const metrics = useMemo(() => {
    let pageViews = 0;
    let buttonClicks = 0;
    let mobile = 0;
    let tablet = 0;
    let desktop = 0;

    // Daily map for the last 7 days
    const dailyMap: Record<string, { views: number; clicks: number }> = {};
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      dailyMap[key] = { views: 0, clicks: 0 };
    }

    filteredSummary.forEach((row) => {
      const views = Number(row.page_views) || 0;
      const clicks = Number(row.button_clicks) || 0;
      pageViews += views;
      buttonClicks += clicks;
      mobile += Number(row.mobile) || 0;
      tablet += Number(row.tablet) || 0;
      desktop += Number(row.desktop) || 0;

      const dayKey = typeof row.day === "string" ? row.day.slice(0, 10) : "";
      if (dayKey && dailyMap[dayKey]) {
        dailyMap[dayKey].views += views;
        dailyMap[dayKey].clicks += clicks;
      }
    });

    // Store button clicks from CTA view
    let appStoreClicks = 0;
    let playStoreClicks = 0;
    filteredCta.forEach((cta) => {
      const btn = (cta.button_type || "").toLowerCase();
      const clicks = Number(cta.clicks) || 0;
      if (btn.includes("app_store") || btn.includes("ios") || btn.includes("apple")) {
        appStoreClicks += clicks;
      } else if (btn.includes("play_store") || btn.includes("android") || btn.includes("google")) {
        playStoreClicks += clicks;
      }
    });

    // Top Referrers
    const refMap: Record<string, number> = {};
    filteredSources.forEach((src) => {
      const ref = src.source || "Direct";
      refMap[ref] = (refMap[ref] || 0) + (Number(src.views) || 0);
    });

    const topReferrers = Object.entries(refMap)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);

    const ctr = pageViews > 0 ? ((buttonClicks / pageViews) * 100).toFixed(1) : "0.0";

    const timeline = Object.entries(dailyMap).map(([date, data]) => ({
      date,
      label: new Date(date).toLocaleDateString(undefined, {
        weekday: "short",
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
      ctr,
      devices: { mobile, tablet, desktop },
      topReferrers,
      timeline,
      maxDayViews,
    };
  }, [filteredSummary, filteredSources, filteredCta]);

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
              Analytics Overview
            </h1>
            {isPro && (
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border border-purple-200/80 dark:border-purple-800">
                PRO ACTIVE
              </span>
            )}
          </div>
          <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 mt-1">
            Track visitors, store downloads, and user engagement across your apps.
          </p>
        </div>

        {/* Site Selector */}
        {sites.length > 0 && (
          <div className="flex items-center gap-3">
            <div className="relative">
              <select
                value={selectedSiteId}
                onChange={(e) => setSelectedSiteId(e.target.value)}
                disabled={!isPro}
                className="appearance-none pl-3.5 pr-9 py-2 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-xs font-medium text-zinc-800 dark:text-zinc-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 shadow-sm cursor-pointer disabled:opacity-50"
              >
                <option value="all">All Landing Pages ({sites.length})</option>
                {sites.map((site) => (
                  <option key={site.id} value={site.id}>
                    {site.content?.hero?.app_name || site.slug} ({site.slug})
                  </option>
                ))}
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-zinc-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>
        )}
      </div>

      {/* Pro Tier Lock Wall (If on Free/Basic) */}
      {!isPro ? (
        <div className="relative overflow-hidden rounded-3xl border border-purple-200/80 dark:border-purple-900/40 bg-gradient-to-b from-purple-50/40 via-white to-white dark:from-purple-950/20 dark:via-zinc-950 dark:to-zinc-950 p-8 sm:p-12 text-center">
          <div className="max-w-md mx-auto space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-purple-100 dark:bg-purple-900/50 text-purple-600 dark:text-purple-400 flex items-center justify-center mx-auto shadow-sm">
              <Lock className="w-6 h-6" />
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
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold shadow-md transition-all active:scale-[0.98]"
              >
                <span>Upgrade to Pro ($9.99/mo)</span>
                <ArrowUpRight className="w-4 h-4" />
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
                <div className="text-xs text-zinc-500">Total Views</div>
                <div className="text-2xl font-bold mt-1">4,289</div>
              </div>
              <div className="p-4 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800">
                <div className="text-xs text-zinc-500">Store Clicks</div>
                <div className="text-2xl font-bold mt-1">1,048</div>
              </div>
              <div className="p-4 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800">
                <div className="text-xs text-zinc-500">Conversion Rate</div>
                <div className="text-2xl font-bold mt-1">24.4%</div>
              </div>
              <div className="p-4 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800">
                <div className="text-xs text-zinc-500">Mobile Share</div>
                <div className="text-2xl font-bold mt-1">88.2%</div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-8">
          {/* Metric Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
            {/* 1. Page Views */}
            <div className="p-5 rounded-2xl bg-white dark:bg-zinc-950 border border-zinc-200/80 dark:border-zinc-800/80 shadow-sm">
              <div className="flex items-center justify-between text-zinc-500 dark:text-zinc-400 mb-2">
                <span className="text-xs font-medium">Page Views</span>
                <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                  <Eye className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
                {metrics.pageViews.toLocaleString()}
              </div>
              <div className="text-[11px] text-zinc-400 mt-1">
                Last 30 days telemetry
              </div>
            </div>

            {/* 2. Button Clicks */}
            <div className="p-5 rounded-2xl bg-white dark:bg-zinc-950 border border-zinc-200/80 dark:border-zinc-800/80 shadow-sm">
              <div className="flex items-center justify-between text-zinc-500 dark:text-zinc-400 mb-2">
                <span className="text-xs font-medium">Store Button Clicks</span>
                <div className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                  <MousePointerClick className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
                {metrics.buttonClicks.toLocaleString()}
              </div>
              <div className="text-[11px] text-emerald-600 dark:text-emerald-400 mt-1 flex items-center gap-1 font-medium">
                <span>App Store & Google Play clicks</span>
              </div>
            </div>

            {/* 3. CTR */}
            <div className="p-5 rounded-2xl bg-white dark:bg-zinc-950 border border-zinc-200/80 dark:border-zinc-800/80 shadow-sm">
              <div className="flex items-center justify-between text-zinc-500 dark:text-zinc-400 mb-2">
                <span className="text-xs font-medium">Click-Through Rate (CTR)</span>
                <div className="w-8 h-8 rounded-xl bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400 flex items-center justify-center">
                  <TrendingUp className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
                {metrics.ctr}%
              </div>
              <div className="text-[11px] text-zinc-400 mt-1">
                Ratio of visitors clicking download
              </div>
            </div>

            {/* 4. Active Sites */}
            <div className="p-5 rounded-2xl bg-white dark:bg-zinc-950 border border-zinc-200/80 dark:border-zinc-800/80 shadow-sm">
              <div className="flex items-center justify-between text-zinc-500 dark:text-zinc-400 mb-2">
                <span className="text-xs font-medium">Tracked Apps</span>
                <div className="w-8 h-8 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                  <Smartphone className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
                {selectedSiteId === "all" ? sites.length : 1}
              </div>
              <div className="text-[11px] text-zinc-400 mt-1">
                {sites.filter((s) => s.status === "published").length} live in production
              </div>
            </div>
          </div>

          {/* 7-Day Traffic Timeline Chart */}
          <div className="p-6 rounded-2xl bg-white dark:bg-zinc-950 border border-zinc-200/80 dark:border-zinc-800/80 shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                  Daily Visitor & Click Activity (Last 7 Days)
                </h3>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                  Page views compared to download button taps
                </p>
              </div>

              <div className="flex items-center gap-4 text-xs">
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-sm bg-blue-500" />
                  <span className="text-zinc-600 dark:text-zinc-400">Views</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500" />
                  <span className="text-zinc-600 dark:text-zinc-400">Clicks</span>
                </div>
              </div>
            </div>

            {/* Bars: Fix zero-traffic render so 0 views renders 0 height */}
            <div className="grid grid-cols-7 gap-3 sm:gap-6 items-end h-48 pt-6 border-b border-zinc-100 dark:border-zinc-900">
              {metrics.timeline.map((day) => {
                const viewHeight =
                  day.views > 0
                    ? Math.max(8, Math.round((day.views / metrics.maxDayViews) * 100))
                    : 0;
                const clickHeight =
                  day.clicks > 0
                    ? Math.max(8, Math.round((day.clicks / metrics.maxDayViews) * 100))
                    : 0;

                return (
                  <div key={day.date} className="flex flex-col items-center gap-2 h-full justify-end group">
                    <div className="w-full flex items-end justify-center gap-1 sm:gap-2 h-full">
                      {/* View Bar */}
                      {viewHeight > 0 ? (
                        <div
                          className="w-3 sm:w-5 bg-blue-500 rounded-t-md transition-all duration-300 group-hover:bg-blue-400 relative"
                          style={{ height: `${viewHeight}%` }}
                          title={`${day.views} views on ${day.label}`}
                        />
                      ) : (
                        <div className="w-3 sm:w-5 h-1 bg-zinc-200 dark:bg-zinc-800 rounded-full opacity-40" />
                      )}
                      {/* Click Bar */}
                      {clickHeight > 0 ? (
                        <div
                          className="w-3 sm:w-5 bg-emerald-500 rounded-t-md transition-all duration-300 group-hover:bg-emerald-400 relative"
                          style={{ height: `${clickHeight}%` }}
                          title={`${day.clicks} clicks on ${day.label}`}
                        />
                      ) : (
                        <div className="w-3 sm:w-5 h-1 bg-zinc-200 dark:bg-zinc-800 rounded-full opacity-40" />
                      )}
                    </div>
                    <span className="text-[10px] text-zinc-400 font-mono text-center">
                      {day.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Breakdown: Store Split & Top Referrers */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Top Referrers */}
            <div className="p-6 rounded-2xl bg-white dark:bg-zinc-950 border border-zinc-200/80 dark:border-zinc-800/80 shadow-sm">
              <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50 mb-1">
                Top Traffic Sources
              </h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-5">
                Where your visitors are arriving from
              </p>

              {metrics.topReferrers.length === 0 ? (
                <div className="text-center py-8 text-xs text-zinc-400">
                  No referral data recorded yet.
                </div>
              ) : (
                <div className="space-y-3">
                  {metrics.topReferrers.map(([source, count]) => {
                    const pct = metrics.pageViews > 0 ? Math.round((count / metrics.pageViews) * 100) : 0;
                    return (
                      <div key={source} className="space-y-1">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-medium text-zinc-800 dark:text-zinc-200 truncate flex items-center gap-1.5">
                            <Globe className="w-3 h-3 text-zinc-400 shrink-0" />
                            {source}
                          </span>
                          <span className="font-mono text-zinc-500 text-[11px]">
                            {count} ({pct}%)
                          </span>
                        </div>
                        <div className="w-full h-1.5 rounded-full bg-zinc-100 dark:bg-zinc-900 overflow-hidden">
                          <div
                            className="h-full bg-blue-500 rounded-full"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Device & Platform Split */}
            <div className="p-6 rounded-2xl bg-white dark:bg-zinc-950 border border-zinc-200/80 dark:border-zinc-800/80 shadow-sm">
              <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50 mb-1">
                Visitor Devices
              </h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-5">
                Device hardware categories detected
              </p>

              <div className="space-y-4">
                {[
                  { label: "Mobile", count: metrics.devices.mobile, color: "bg-blue-500" },
                  { label: "Desktop", count: metrics.devices.desktop, color: "bg-indigo-500" },
                  { label: "Tablet", count: metrics.devices.tablet, color: "bg-purple-500" },
                ].map((item) => {
                  const total = metrics.devices.mobile + metrics.devices.desktop + metrics.devices.tablet;
                  const pct = total > 0 ? Math.round((item.count / total) * 100) : 0;
                  return (
                    <div key={item.label} className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-medium text-zinc-800 dark:text-zinc-200">
                          {item.label}
                        </span>
                        <span className="font-mono text-zinc-500 text-[11px]">
                          {item.count} ({pct}%)
                        </span>
                      </div>
                      <div className="w-full h-1.5 rounded-full bg-zinc-100 dark:bg-zinc-900 overflow-hidden">
                        <div
                          className={`h-full ${item.color} rounded-full`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
