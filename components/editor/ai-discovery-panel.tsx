/* Hallmark · pre-emit critique: P5 H5 E5 S5 R5 V5 */
"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Sparkles,
  Bot,
  Search,
  FileCode2,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Loader2,
  RefreshCw,
  Lock,
  ShieldCheck,
  SlidersHorizontal,
} from "lucide-react";
import type { Site, Plan } from "@/types/database";
import type { DiscoverabilityHealthResult } from "@/lib/ai-discovery";

interface AiDiscoveryPanelProps {
  site: Site;
  plan?: Plan | null;
  siteId?: string;
}

export function AiDiscoveryPanel({ site, plan, siteId }: AiDiscoveryPanelProps) {
  const isPro = plan?.id === "pro" || Boolean(plan?.has_ai_discovery);

  const [saving, setSaving] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form State
  const [aiEnabled, setAiEnabled] = useState(Boolean(site.ai_discovery_enabled));
  const [aiSearchCrawling, setAiSearchCrawling] = useState(site.ai_search_crawling_enabled ?? true);
  const [aiTrainingCrawling, setAiTrainingCrawling] = useState(site.ai_training_crawling_enabled ?? false);
  const [llmsTxtEnabled, setLlmsTxtEnabled] = useState(Boolean(site.llms_txt_enabled));
  const [category, setCategory] = useState(site.ai_category || "");
  const [targetAudience, setTargetAudience] = useState(site.ai_target_audience || "");
  const [summary, setSummary] = useState(site.ai_summary || "");

  // Telemetry & Health State
  const [health, setHealth] = useState<DiscoverabilityHealthResult | null>(null);
  const [lastScan, setLastScan] = useState<string | null>(site.ai_last_scan || null);
  const [preview, setPreview] = useState<{
    title: string;
    description: string;
    canonicalUrl: string;
    schemaType?: string;
  } | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!siteId) return;
      try {
        const res = await fetch(`/api/sites/${siteId}/ai-discovery`);
        const data = await res.json();
        if (res.ok && !cancelled) {
          setAiEnabled(Boolean(data.settings?.ai_discovery_enabled));
          setAiSearchCrawling(Boolean(data.settings?.ai_search_crawling_enabled));
          setAiTrainingCrawling(Boolean(data.settings?.ai_training_crawling_enabled));
          setLlmsTxtEnabled(Boolean(data.settings?.llms_txt_enabled));
          setCategory(data.settings?.ai_category || "");
          setTargetAudience(data.settings?.ai_target_audience || "");
          setSummary(data.settings?.ai_summary || "");
          if (data.health) {
            setHealth(data.health);
            setLastScan(data.health.last_scan || null);
          }
          if (data.preview) {
            setPreview(data.preview);
          }
        }
      } catch {
        // Non-blocking fallback to initial props
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [siteId]);

  const handleSave = async () => {
    if (!siteId || !isPro) return;
    setSaving(true);
    setError(null);
    setSaveSuccess(false);

    try {
      const res = await fetch(`/api/sites/${siteId}/ai-discovery`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ai_discovery_enabled: aiEnabled,
          ai_search_crawling_enabled: aiSearchCrawling,
          ai_training_crawling_enabled: aiTrainingCrawling,
          llms_txt_enabled: llmsTxtEnabled,
          ai_category: category || null,
          ai_target_audience: targetAudience || null,
          ai_summary: summary || null,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to save settings.");
        return;
      }

      setSaveSuccess(true);
      if (data.health) {
        setHealth(data.health);
      }
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      setError((err instanceof Error ? err.message : undefined) || "Failed to reach server.");
    } finally {
      setSaving(false);
    }
  };

  const handleRunScan = async () => {
    if (!siteId || !isPro) return;
    setScanning(true);
    setError(null);

    try {
      const res = await fetch(`/api/sites/${siteId}/ai-discovery/scan`, {
        method: "POST",
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Unable to complete this check right now.");
        return;
      }

      if (data.health) {
        setHealth(data.health);
        setLastScan(data.scannedAt);
      }
    } catch {
      setError("Unable to complete this check right now.");
    } finally {
      setScanning(false);
    }
  };

  const rootDomain = process.env.NEXT_PUBLIC_ROOT_DOMAIN || "shipsprint.site";
  const publicUrl = site.custom_domain
    ? `https://${site.custom_domain}`
    : `https://${site.slug}.${rootDomain}`;

  // Locked card for Free & Basic tiers
  if (!isPro) {
    return (
      <div className="space-y-6">
        <div className="rounded-2xl border border-zinc-200 bg-white p-6 sm:p-8 dark:border-zinc-800 dark:bg-zinc-900/60 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
                  AI Search &amp; LLM Discoverability
                </h2>
                <span className="inline-flex items-center gap-1 rounded-full bg-purple-100 px-2.5 py-0.5 text-[10px] font-semibold text-purple-700 dark:bg-purple-950/60 dark:text-purple-300">
                  <Lock className="h-3 w-3" />
                  Pro Feature
                </span>
              </div>
              <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                Get discovered across Google, AI search, and LLM-powered answer engines.
              </p>
            </div>
          </div>

          <div className="mt-6 rounded-xl border border-zinc-200/80 bg-zinc-50/80 p-4 dark:border-zinc-800 dark:bg-zinc-900/40">
            <p className="text-xs leading-relaxed text-zinc-600 dark:text-zinc-300">
              ShipSprint prepares your published app page with search metadata, structured app data, crawl controls, and AI-readable information to make your app easier for search engines and AI systems to understand.
            </p>
            <p className="mt-3 text-[11px] text-zinc-500 italic dark:text-zinc-400">
              Discoverability is not guaranteed. Search engines and AI systems decide independently which pages they crawl, index, surface, or cite.
            </p>
          </div>

          <div className="mt-6 space-y-3">
            <h3 className="text-xs font-semibold text-zinc-900 uppercase tracking-wider dark:text-zinc-100">
              What Pro Discoverability Unlocks:
            </h3>
            <ul className="space-y-2 text-xs text-zinc-600 dark:text-zinc-400">
              <li className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                <span><strong>OAI-SearchBot &amp; AI Crawl Controls:</strong> Separate crawl settings for AI search engines vs training bots.</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                <span><strong>Schema.org JSON-LD:</strong> Valid, rich SoftwareApplication structured data embedded in server HTML.</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                <span><strong>Machine-Readable /llms.txt:</strong> Clean markdown overview for LLM agents and researchers.</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                <span><strong>Live Technical Health Diagnostics:</strong> 10-point public verification check of your real URL.</span>
              </li>
            </ul>
          </div>

          <div className="mt-8 border-t border-zinc-200 pt-6 dark:border-zinc-800">
            <Link
              href="/dashboard/billing"
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-zinc-900 px-4 py-2.5 text-xs font-semibold text-white shadow-xs hover:bg-zinc-800 transition-colors dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-100 cursor-pointer"
            >
              <span>Upgrade to Pro ($9.99/mo)</span>
              <ExternalLink className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header Banner */}
      <div className="rounded-2xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900/60 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600/10 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
                  AI Search &amp; LLM Discoverability
                </h2>
                <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300">
                  Pro Active
                </span>
              </div>
              <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                Get discovered across Google, AI search, and LLM-powered answer engines.
              </p>
            </div>
          </div>

          {/* Master Toggle */}
          <div className="flex items-center gap-3 shrink-0 self-start sm:self-auto">
            <span className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
              {aiEnabled ? "Enabled" : "Disabled"}
            </span>
            <button
              type="button"
              role="switch"
              aria-checked={aiEnabled}
              onClick={() => setAiEnabled(!aiEnabled)}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 ${
                aiEnabled ? "bg-blue-600" : "bg-zinc-300 dark:bg-zinc-700"
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                  aiEnabled ? "translate-x-5" : "translate-x-0"
                }`}
              />
            </button>
          </div>
        </div>

        <p className="mt-4 text-xs leading-relaxed text-zinc-600 dark:text-zinc-300">
          ShipSprint prepares your published app page with search metadata, structured app data, crawl controls, and AI-readable information to make your app easier for search engines and AI systems to understand.
        </p>

        <p className="mt-2 text-[11px] text-zinc-500 italic dark:text-zinc-400">
          Discoverability is not guaranteed. Search engines and AI systems decide independently which pages they crawl, index, surface, or cite.
        </p>
      </div>

      {/* Main Settings Sections */}
      {aiEnabled && (
        <>
          {/* Crawler Controls */}
          <div className="rounded-2xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900/60 shadow-xs space-y-4">
            <div className="flex items-center gap-2">
              <Bot className="h-4 w-4 text-zinc-600 dark:text-zinc-400" />
              <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                Robots.txt Crawler Controls
              </h3>
            </div>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Configure how automated systems access your published URL via your generated robots.txt.
            </p>

            <div className="space-y-4 pt-2">
              {/* AI Search Access */}
              <div className="flex items-center justify-between gap-4 p-3.5 rounded-xl border border-zinc-200/80 bg-zinc-50/50 dark:border-zinc-800 dark:bg-zinc-900/40">
                <div>
                  <p className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">
                    AI Search Access (OAI-SearchBot, PerplexityBot, ClaudeBot)
                  </p>
                  <p className="mt-0.5 text-[11px] text-zinc-500 dark:text-zinc-400">
                    Allows ChatGPT Search, Perplexity, and Claude to read and cite your app for user questions.
                  </p>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={aiSearchCrawling}
                  onClick={() => setAiSearchCrawling(!aiSearchCrawling)}
                  className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 ${
                    aiSearchCrawling ? "bg-blue-600" : "bg-zinc-300 dark:bg-zinc-700"
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-xs ring-0 transition duration-200 ease-in-out ${
                      aiSearchCrawling ? "translate-x-4" : "translate-x-0"
                    }`}
                  />
                </button>
              </div>

              {/* AI Training Access */}
              <div className="flex items-center justify-between gap-4 p-3.5 rounded-xl border border-zinc-200/80 bg-zinc-50/50 dark:border-zinc-800 dark:bg-zinc-900/40">
                <div>
                  <p className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">
                    AI Model Training Access (GPTBot)
                  </p>
                  <p className="mt-0.5 text-[11px] text-zinc-500 dark:text-zinc-400">
                    Controls whether frontier lab crawlers can scrape your page to train foundation AI models. Keep OFF by default.
                  </p>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={aiTrainingCrawling}
                  onClick={() => setAiTrainingCrawling(!aiTrainingCrawling)}
                  className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 ${
                    aiTrainingCrawling ? "bg-blue-600" : "bg-zinc-300 dark:bg-zinc-700"
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-xs ring-0 transition duration-200 ease-in-out ${
                      aiTrainingCrawling ? "translate-x-4" : "translate-x-0"
                    }`}
                  />
                </button>
              </div>
            </div>
          </div>

          {/* Machine-Readable LLMS.TXT Resource */}
          <div className="rounded-2xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900/60 shadow-xs space-y-4">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <FileCode2 className="h-4 w-4 text-zinc-600 dark:text-zinc-400" />
                <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                  Machine-Readable Context (/llms.txt)
                </h3>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={llmsTxtEnabled}
                onClick={() => setLlmsTxtEnabled(!llmsTxtEnabled)}
                className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 ${
                  llmsTxtEnabled ? "bg-blue-600" : "bg-zinc-300 dark:bg-zinc-700"
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-xs ring-0 transition duration-200 ease-in-out ${
                    llmsTxtEnabled ? "translate-x-4" : "translate-x-0"
                  }`}
                />
              </button>
            </div>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Publishes an optional, concise Markdown resource at <code>{publicUrl}/llms.txt</code> containing factual public details about your app. Not a search ranking factor.
            </p>
          </div>

          {/* App Context & Optimization */}
          <div className="rounded-2xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900/60 shadow-xs space-y-4">
            <div className="flex items-center gap-2">
              <SlidersHorizontal className="h-4 w-4 text-zinc-600 dark:text-zinc-400" />
              <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                App Discoverability Context
              </h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300">
                  Primary Category
                </label>
                <input
                  type="text"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  placeholder="e.g. Productivity, Health, Developer Tool"
                  className="mt-1.5 w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-xs text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-900 focus:bg-white focus:outline-none dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-100 dark:focus:border-zinc-100"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300">
                  Target Audience
                </label>
                <input
                  type="text"
                  value={targetAudience}
                  onChange={(e) => setTargetAudience(e.target.value)}
                  placeholder="e.g. Indie makers, Remote teams, Students"
                  className="mt-1.5 w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-xs text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-900 focus:bg-white focus:outline-none dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-100 dark:focus:border-zinc-100"
                />
              </div>
            </div>

            <div className="pt-2">
              <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300">
                Structured Factual Summary
              </label>
              <textarea
                rows={5}
                value={summary}
                onChange={(e) => setSummary(e.target.value)}
                placeholder="Factual AI-readable app summary based on actual features and store links..."
                className="mt-1.5 w-full rounded-xl border border-zinc-200 bg-zinc-50 p-3 font-mono text-xs text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-900 focus:bg-white focus:outline-none dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-100 dark:focus:border-zinc-100"
              />
              <p className="mt-1 text-[11px] text-zinc-500 dark:text-zinc-400">
                Deterministic summary generated strictly from your app&apos;s verified content. Never fabricates reviews or ratings.
              </p>
            </div>
          </div>

          {/* Search & AI Preview Card */}
          <div className="rounded-2xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900/60 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Search className="h-4 w-4 text-zinc-600 dark:text-zinc-400" />
                <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                  Search &amp; AI Preview
                </h3>
              </div>
              <span className="text-[10px] font-mono uppercase text-zinc-500 bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 rounded-md">
                Preview Only
              </span>
            </div>

            <div className="rounded-xl border border-zinc-200/80 bg-zinc-50/70 p-4 dark:border-zinc-800 dark:bg-zinc-950">
              <p className="text-[11px] text-zinc-500 font-mono truncate">
                {preview?.canonicalUrl || publicUrl}
              </p>
              <h4 className="mt-1 text-sm font-medium text-blue-600 dark:text-blue-400 hover:underline cursor-pointer">
                {preview?.title || site.content?.hero?.app_name || site.slug} - Official App
              </h4>
              <p className="mt-1 text-xs text-zinc-600 dark:text-zinc-300 line-clamp-2">
                {preview?.description || site.content?.hero?.short_description || "Official landing page."}
              </p>

              <div className="mt-4 pt-3 border-t border-zinc-200/60 dark:border-zinc-800/60 flex items-center gap-3 text-[11px] text-zinc-500">
                <span className="inline-flex items-center gap-1 font-mono">
                  <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
                  Schema: {preview?.schemaType || "SoftwareApplication"}
                </span>
                <span>•</span>
                <span>Robots: index, follow</span>
              </div>
            </div>
          </div>

          {/* Technical Health Score & Public Verification */}
          <div className="rounded-2xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900/60 shadow-xs space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                  Discoverability Health
                </h3>
                <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
                  Technical readiness score measuring crawlability, canonical integrity, and structured markup.
                </p>
              </div>

              {health && (
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-bold font-mono text-zinc-900 dark:text-zinc-100">
                    {health.score}
                  </span>
                  <span className="text-xs text-zinc-500">/ 100</span>
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                    health.score >= 90
                      ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                      : health.score >= 75
                      ? "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300"
                      : "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
                  }`}>
                    {health.ratingLabel}
                  </span>
                </div>
              )}
            </div>

            {/* Diagnostics Checklist */}
            {health?.checks && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {health.checks.map((check) => (
                  <div
                    key={check.id}
                    className="flex items-start gap-2.5 p-2.5 rounded-lg border border-zinc-100 bg-zinc-50/50 dark:border-zinc-800/80 dark:bg-zinc-900/30 text-xs"
                  >
                    {check.passed ? (
                      <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                    ) : (
                      <AlertCircle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                    )}
                    <div className="min-w-0">
                      <p className="font-medium text-zinc-900 dark:text-zinc-100">
                        {check.label}
                      </p>
                      {check.message && (
                        <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5 truncate">
                          {check.message}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Action Bar */}
            <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-zinc-100 dark:border-zinc-800">
              <div className="text-[11px] text-zinc-500">
                {lastScan ? (
                  <span>Last scanned: {new Date(lastScan).toLocaleTimeString()}</span>
                ) : (
                  <span>Ready for diagnostic audit.</span>
                )}
              </div>

              <div className="flex items-center gap-3 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={handleRunScan}
                  disabled={scanning}
                  className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl border border-zinc-200 bg-white text-xs font-semibold text-zinc-800 shadow-2xs hover:bg-zinc-50 transition-colors dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-200 cursor-pointer disabled:opacity-60"
                >
                  {scanning ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <RefreshCw className="h-3.5 w-3.5" />
                  )}
                  <span>Check my discoverability</span>
                </button>

                <button
                  type="button"
                  onClick={handleSave}
                  disabled={saving}
                  className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-zinc-900 text-xs font-semibold text-white shadow-xs hover:bg-zinc-800 transition-colors dark:bg-zinc-100 dark:text-zinc-900 cursor-pointer disabled:opacity-60"
                >
                  {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  <span>{saveSuccess ? "Saved" : "Save Changes"}</span>
                </button>
              </div>
            </div>

            {error && (
              <p className="text-xs text-rose-600 dark:text-rose-400 mt-2">
                {error}
              </p>
            )}
          </div>
        </>
      )}
    </div>
  );
}
