"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import type { Site, Plan, AnalyticsEvent } from "@/types/database";
import {
  BarChart3,
  TrendingUp,
  MousePointerClick,
  Eye,
  Smartphone,
  Globe,
  Lock,
  ArrowUpRight,
  Sparkles,
  ChevronDown,
  Apple,
  Layers,
} from "lucide-react";

interface AnalyticsViewProps {
  sites: Site[];
  events: AnalyticsEvent[];
  plan: Plan;
}

export function AnalyticsView({ sites, events, plan }: AnalyticsViewProps) {
  const [selectedSiteId, setSelectedSiteId] = useState<string>("all");
  const isPro = plan.has_analytics_dashboard;

  // Filter events by selected site
  const filteredEvents = useMemo(() => {
    if (selectedSiteId === "all") return events;
    return events.filter((e) => e.site_id === selectedSiteId);
  }, [events, selectedSiteId]);

  // Aggregate metrics
  const metrics = useMemo(() => {
    let pageViews = 0;
    let buttonClicks = 0;
    let appStoreClicks = 0;
    let playStoreClicks = 0;
    const referrers: Record<string, number> = {};
    const devices: Record<string, number> = { mobile: 0, desktop: 0, tablet: 0 };
    const dailyMap: Record<string, { views: number; clicks: number }> = {};

    // Generate last 7 days keys
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      dailyMap[key] = { views: 0, clicks: 0 };
    }

    filteredEvents.forEach((ev) => {
      const dayKey = ev.created_at.slice(0, 10);

      if (ev.event_type === "page_view") {
        pageViews++;
        if (dailyMap[dayKey]) dailyMap[dayKey].views++;
      } else if (ev.event_type === "button_click") {
        buttonClicks++;
        if (dailyMap[dayKey]) dailyMap[dayKey].clicks++;

        const btn = ev.meta?.button_type || "";
        if (btn.includes("app_store") || btn.includes("ios") || btn.includes("apple")) {
          appStoreClicks++;
        } else if (btn.includes("play_store") || btn.includes("android") || btn.includes("google")) {
          playStoreClicks++;
        }
      }

      // Track device
      const dev = ev.meta?.device || "desktop";
      devices[dev] = (devices[dev] || 0) + 1;

      // Track referrer
      let ref = ev.meta?.referrer || "Direct";
      if (!ref || ref === "" || ref === "direct") {
        ref = "Direct";
      } else {
        try {
          const u = new URL(ref);
          ref = u.hostname.replace(/^www\./, "");
        } catch {
          // Keep string as is
        }
      }
      referrers[ref] = (referrers[ref] || 0) + 1;
    });

    const ctr = pageViews > 0 ? ((buttonClicks / pageViews) * 100).toFixed(1) : "0.0";

    const topReferrers = Object.entries(referrers)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);

    const timeline = Object.entries(dailyMap).map(([date, data]) => ({
      date,
      label: new Date(date).toLocaleDateString(undefined, { weekday: "short", month: "numeric", day: "numeric" }),
      views: data.views,
      clicks: data.clicks,
    }));

    return {
      pageViews,
      buttonClicks,
      appStoreClicks,
      playStoreClicks,
      ctr,
      devices,
      topReferrers,
      timeline,
    };
  }, [filteredEvents]);

  // Max views in timeline for bar scaling
  const maxDayViews = Math.max(1, ...metrics.timeline.map((d) => Math.max(d.views, d.clicks)));

  return (
    <div className="space-y-8">
      {/* Header & Site Filter */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-zinc-200/80 dark:border-zinc-800/80">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
              Analytics & Insights
            </h1>
            {!isPro && (
              <span className="px-2 py-0.5 rounded-full bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300 text-[11px] font-semibold">
                Pro Feature
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

          {/* Background Blurred Teaser Metrics */}
          <div className="mt-12 pt-8 border-t border-purple-100 dark:border-purple-950/60 opacity-40 blur-[2px] pointer-events-none grid grid-cols-2 sm:grid-cols-4 gap-4">
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
              <div className="text-xs text-zinc-500">Top Channel</div>
              <div className="text-2xl font-bold mt-1">twitter.com</div>
            </div>
          </div>
        </div>
      ) : sites.length === 0 ? (
        /* Empty Sites State */
        <div className="py-16 px-4 rounded-3xl border border-dashed border-zinc-300 dark:border-zinc-800 bg-white/40 dark:bg-zinc-950/40 text-center">
          <div className="w-14 h-14 rounded-2xl bg-zinc-100 dark:bg-zinc-900 text-zinc-500 flex items-center justify-center mx-auto mb-4 border border-zinc-200 dark:border-zinc-800 shadow-sm">
            <BarChart3 className="w-6 h-6 text-blue-500" />
          </div>
          <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
            No active apps to track
          </h2>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 max-w-sm mx-auto">
            Create and publish your first landing page to begin collecting analytics telemetry.
          </p>
          <div className="mt-6">
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 text-xs font-semibold"
            >
              Go to Dashboard
            </Link>
          </div>
        </div>
      ) : (
        /* Real Pro Analytics UI */
        <div className="space-y-8 animate-in fade-in duration-300">
          {/* Top KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {/* 1. Page Views */}
            <div className="p-5 rounded-2xl bg-white dark:bg-zinc-950 border border-zinc-200/80 dark:border-zinc-800/80 shadow-sm">
              <div className="flex items-center justify-between text-zinc-500 dark:text-zinc-400 mb-2">
                <span className="text-xs font-medium">Total Page Views</span>
                <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                  <Eye className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
                {metrics.pageViews.toLocaleString()}
              </div>
              <div className="text-[11px] text-zinc-400 mt-1">
                Unique visits across selected apps
              </div>
            </div>

            {/* 2. Store Clicks */}
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

            {/* Bars */}
            <div className="grid grid-cols-7 gap-3 sm:gap-6 items-end h-48 pt-6 border-b border-zinc-100 dark:border-zinc-900">
              {metrics.timeline.map((day) => {
                const viewHeight = Math.max(8, Math.round((day.views / maxDayViews) * 100));
                const clickHeight = Math.max(8, Math.round((day.clicks / maxDayViews) * 100));

                return (
                  <div key={day.date} className="flex flex-col items-center gap-2 h-full justify-end group">
                    <div className="w-full flex items-end justify-center gap-1 sm:gap-2 h-full">
                      {/* View Bar */}
                      <div
                        className="w-3 sm:w-5 bg-blue-500 rounded-t-md transition-all duration-300 group-hover:bg-blue-400 relative"
                        style={{ height: `${viewHeight}%` }}
                        title={`${day.views} views on ${day.label}`}
                      />
                      {/* Click Bar */}
                      <div
                        className="w-3 sm:w-5 bg-emerald-500 rounded-t-md transition-all duration-300 group-hover:bg-emerald-400 relative"
                        style={{ height: `${clickHeight}%` }}
                        title={`${day.clicks} clicks on ${day.label}`}
                      />
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
                          <span className="font-medium text-zinc-800 dark:text-zinc-200 flex items-center gap-1.5 truncate max-w-[200px]">
                            <Globe className="w-3 h-3 text-zinc-400 shrink-0" />
                            {source}
                          </span>
                          <span className="text-zinc-500 dark:text-zinc-400 font-mono">
                            {count} ({pct}%)
                          </span>
                        </div>
                        <div className="w-full h-1.5 bg-zinc-100 dark:bg-zinc-900 rounded-full overflow-hidden">
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

            {/* Device & Platform Breakdown */}
            <div className="p-6 rounded-2xl bg-white dark:bg-zinc-950 border border-zinc-200/80 dark:border-zinc-800/80 shadow-sm">
              <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50 mb-1">
                Device Distribution
              </h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-5">
                Visitor device categories
              </p>

              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="p-4 rounded-xl border border-zinc-100 dark:border-zinc-800/60 bg-zinc-50/50 dark:bg-zinc-900/40">
                  <Smartphone className="w-5 h-5 mx-auto text-blue-500 mb-2" />
                  <div className="text-base font-bold text-zinc-900 dark:text-zinc-100">
                    {metrics.devices.mobile || 0}
                  </div>
                  <div className="text-[11px] text-zinc-400 mt-0.5">Mobile</div>
                </div>

                <div className="p-4 rounded-xl border border-zinc-100 dark:border-zinc-800/60 bg-zinc-50/50 dark:bg-zinc-900/40">
                  <Layers className="w-5 h-5 mx-auto text-purple-500 mb-2" />
                  <div className="text-base font-bold text-zinc-900 dark:text-zinc-100">
                    {metrics.devices.desktop || 0}
                  </div>
                  <div className="text-[11px] text-zinc-400 mt-0.5">Desktop</div>
                </div>

                <div className="p-4 rounded-xl border border-zinc-100 dark:border-zinc-800/60 bg-zinc-50/50 dark:bg-zinc-900/40">
                  <Globe className="w-5 h-5 mx-auto text-emerald-500 mb-2" />
                  <div className="text-base font-bold text-zinc-900 dark:text-zinc-100">
                    {metrics.devices.tablet || 0}
                  </div>
                  <div className="text-[11px] text-zinc-400 mt-0.5">Tablet</div>
                </div>
              </div>

              {/* Store Button Split */}
              <div className="mt-6 pt-6 border-t border-zinc-100 dark:border-zinc-900 flex items-center justify-between text-xs">
                <span className="text-zinc-500">Store Button Preference:</span>
                <span className="font-semibold text-zinc-800 dark:text-zinc-200">
                  {metrics.appStoreClicks} App Store / {metrics.playStoreClicks} Google Play
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
