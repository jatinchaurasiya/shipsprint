"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { EditorPanel } from "./editor-panel";
import { LivePreview } from "./live-preview";
import type { Site, SiteContent, Plan } from "@/types/database";
import {
  ArrowLeft,
  Save,
  Rocket,
  Loader2,
  CheckCircle2,
  ExternalLink,
  Globe,
} from "lucide-react";

interface EditorViewProps {
  site: Site;
  plan: Plan | null;
}

export function EditorView({ site, plan }: EditorViewProps) {
  const router = useRouter();
  const [content, setContent] = useState<SiteContent>(site.content);
  const [status, setStatus] = useState<string>(site.status);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const rootDomain = process.env.NEXT_PUBLIC_ROOT_DOMAIN || "shipsprint.site";
  const liveUrl = site.custom_domain
    ? `https://${site.custom_domain}`
    : `https://${site.slug}.${rootDomain}`;

  const handleSave = async (statusOverride?: string) => {
    setError(null);
    setSaveSuccess(false);

    if (statusOverride === "published") {
      setPublishing(true);
    } else {
      setSaving(true);
    }

    try {
      const payload: Record<string, any> = { content };
      if (statusOverride) {
        payload.status = statusOverride;
      }

      const res = await fetch(`/api/sites/${site.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to save landing page");
        return;
      }

      if (statusOverride) {
        setStatus(statusOverride);
      }

      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
      router.refresh();
    } catch (err: any) {
      setError(err?.message || "An unexpected error occurred.");
    } finally {
      setSaving(false);
      setPublishing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-[#fafafa] dark:bg-[#09090b] text-zinc-900 dark:text-zinc-100 overflow-hidden">
      {/* Top Header Navigation */}
      <header className="h-14 border-b border-zinc-200/80 dark:border-zinc-800/80 bg-white/80 dark:bg-zinc-950/80 backdrop-blur-xl px-4 flex items-center justify-between shrink-0">
        {/* Left: Back + Site Title */}
        <div className="flex items-center gap-4">
          <Link
            href="/dashboard"
            className="flex items-center gap-1.5 text-xs font-medium text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors p-1.5 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Back to Dashboard</span>
          </Link>

          <div className="h-4 w-[1px] bg-zinc-200 dark:border-zinc-800" />

          <div className="flex items-center gap-2">
            <span className="font-semibold text-xs sm:text-sm text-zinc-900 dark:text-zinc-100">
              {content.hero?.app_name || site.slug}
            </span>
            <span
              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium ${
                status === "published"
                  ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400 border border-emerald-200/60 dark:border-emerald-800/40"
                  : "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400"
              }`}
            >
              <span
                className={`w-1 h-1 rounded-full ${
                  status === "published" ? "bg-emerald-500" : "bg-zinc-400"
                }`}
              />
              <span>{status === "published" ? "Published" : "Draft"}</span>
            </span>
          </div>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-3">
          {error && (
            <span className="text-[11px] text-red-500 font-medium hidden md:inline truncate max-w-xs">
              {error}
            </span>
          )}

          {saveSuccess && (
            <span className="inline-flex items-center gap-1 text-[11px] text-emerald-600 dark:text-emerald-400 font-medium animate-in fade-in">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Saved</span>
            </span>
          )}

          {/* Live Link Button if Published */}
          {status === "published" && (
            <a
              href={liveUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-xs font-medium text-zinc-800 dark:text-zinc-200 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors shadow-xs"
            >
              <Globe className="w-3.5 h-3.5 text-zinc-400" />
              <span>Visit Live</span>
              <ExternalLink className="w-3 h-3 text-zinc-400" />
            </a>
          )}

          {/* Save Draft */}
          <button
            type="button"
            onClick={() => handleSave()}
            disabled={saving || publishing}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-xs font-medium text-zinc-800 dark:text-zinc-200 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors shadow-xs disabled:opacity-50"
          >
            {saving ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Save className="w-3.5 h-3.5" />
            )}
            <span>Save Draft</span>
          </button>

          {/* Publish Button */}
          <button
            type="button"
            onClick={() => handleSave("published")}
            disabled={saving || publishing}
            className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-zinc-900 dark:bg-zinc-100 hover:bg-zinc-800 dark:hover:bg-white text-white dark:text-zinc-900 text-xs font-medium shadow-sm transition-all active:scale-[0.98] disabled:opacity-50"
          >
            {publishing ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Rocket className="w-3.5 h-3.5" />
            )}
            <span>Publish Live</span>
          </button>
        </div>
      </header>

      {/* Main Workspace (Split Screen) */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Side: Editor Form Panel */}
        <div className="w-full md:w-[450px] lg:w-[500px] shrink-0 h-full overflow-hidden">
          <EditorPanel
            content={content}
            onChange={setContent}
            plan={plan}
            siteId={site.id}
            initialDomain={site.custom_domain}
          />
        </div>

        {/* Right Side: Live Zero-Drift Preview */}
        <div className="hidden md:flex flex-1 h-full overflow-hidden">
          <LivePreview content={content} plan={plan} />
        </div>
      </div>
    </div>
  );
}
