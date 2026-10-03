"use client";

import { useState } from "react";
import Link from "next/link";
import { BUILTIN_TEMPLATES } from "@/lib/templates";
import { SiteRenderer } from "@/components/renderer/site-renderer";
import type { Template } from "@/types/database";
import {
  Sparkles,
  ArrowRight,
  Eye,
  X,
  Smartphone,
  Tablet,
  Monitor,
  Check,
  Zap,
} from "lucide-react";

const CATEGORIES = [
  { id: "all", label: "All Templates" },
  { id: "productivity", label: "Mobile Apps" },
  { id: "developer", label: "Developer & SaaS" },
  { id: "saas", label: "AI & Agents" },
  { id: "social", label: "Waitlist & Stealth" },
  { id: "general", label: "Portfolios" },
];

export interface TemplateGalleryProps {
  /**
   * Signed-in viewers get a direct route into the create flow
   * (`/dashboard?template=<id>`, which auto-opens the create dialog with the
   * template preselected). Anonymous visitors keep the signup funnel
   * (`/signup?template=<id>`), which carries the choice through account
   * creation. The public /templates page omits the prop so it stays statically
   * prerendered; a signed-in visitor who reaches it and clicks through is
   * rescued by the proxy's authed-/signup redirect instead.
   */
  authenticated?: boolean;
}

export function TemplateGallery({ authenticated = false }: TemplateGalleryProps) {
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [previewTemplate, setPreviewTemplate] = useState<Template | null>(null);
  const [viewport, setViewport] = useState<"desktop" | "tablet" | "mobile">("desktop");

  const templateHref = (id: string) => {
    const query = `?template=${encodeURIComponent(id)}`;
    return authenticated ? `/dashboard${query}` : `/signup${query}`;
  };

  const filteredTemplates =
    selectedCategory === "all"
      ? BUILTIN_TEMPLATES
      : BUILTIN_TEMPLATES.filter((t) => t.category === selectedCategory);

  return (
    <div>
      {/* Category Pills */}
      <div className="flex items-center justify-center gap-2 flex-wrap mb-12">
        {CATEGORIES.map((cat) => {
          const isActive = selectedCategory === cat.id;
          return (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-4 py-2 rounded-xl text-xs font-medium transition-colors ${
                isActive
                  ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 shadow-sm"
                  : "bg-white/80 dark:bg-zinc-900/80 text-zinc-600 dark:text-zinc-400 border border-zinc-200/80 dark:border-zinc-800/80 hover:border-zinc-300 dark:hover:border-zinc-700"
              }`}
            >
              {cat.label}
            </button>
          );
        })}
      </div>

      {/* Templates Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {filteredTemplates.map((tmpl) => (
          <div
            key={tmpl.id}
            className="group flex flex-col rounded-2xl border border-zinc-200/80 dark:border-zinc-800/80 bg-white/70 dark:bg-zinc-900/70 backdrop-blur-xl overflow-hidden transition-colors hover:border-zinc-300 dark:hover:border-zinc-700"
          >
            {/* Thumbnail Preview Area */}
            <div className="relative aspect-[16/10] bg-zinc-100 dark:bg-zinc-800/50 overflow-hidden border-b border-zinc-100 dark:border-zinc-800">
              {tmpl.preview_image_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={tmpl.preview_image_url}
                  alt={tmpl.name}
                  className="w-full h-full object-cover object-top transition-transform duration-500"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-zinc-600">
                  <Sparkles className="w-8 h-8" />
                </div>
              )}

              {/* Hover Overlay */}
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={() => setPreviewTemplate(tmpl)}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white text-zinc-900 text-xs font-semibold shadow-lg hover:bg-zinc-100 transition-colors"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>Live Preview</span>
                </button>
                <Link
                  href={templateHref(tmpl.id)}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-blue-600 text-white text-xs font-semibold shadow-lg hover:bg-blue-600 transition-colors"
                >
                  <span>Use Template</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>

              {/* Category Badge */}
              <div className="absolute top-3 left-3">
                <span className="px-2.5 py-1 rounded-full text-[10px] uppercase font-bold tracking-wider bg-white/90 dark:bg-zinc-900/90 text-zinc-800 dark:text-zinc-200 backdrop-blur shadow-sm">
                  {tmpl.category}
                </span>
              </div>
            </div>

            {/* Template Info */}
            <div className="p-5 flex-1 flex flex-col justify-between">
              <div>
                <h3 className="font-bold text-base text-zinc-900 dark:text-zinc-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                  {tmpl.name}
                </h3>
                <p className="mt-1 text-xs text-zinc-600 dark:text-zinc-400 line-clamp-2 leading-relaxed">
                  {tmpl.tagline}
                </p>

                {/* Features highlights */}
                <div className="mt-4 space-y-1.5">
                  {tmpl.content.features.slice(0, 3).map((f) => (
                    <div key={f.id} className="flex items-center gap-2 text-xs text-zinc-600 dark:text-zinc-400">
                      <Check className="w-3 h-3 text-emerald-500 shrink-0" />
                      <span className="truncate">{f.title}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Bottom Actions */}
              <div className="mt-6 pt-4 border-t border-zinc-100 dark:border-zinc-800/80 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setPreviewTemplate(tmpl)}
                  className="text-xs font-medium text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 flex items-center gap-1 transition-colors"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>Preview</span>
                </button>

                <Link
                  href={templateHref(tmpl.id)}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline"
                >
                  <span>Build with this</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Live Preview Modal (Zero Drift Guarantee) */}
      {previewTemplate && (
        <div className="fixed inset-0 z-50 flex flex-col bg-zinc-950/90 backdrop-blur-md animate-in fade-in duration-200">
          {/* Modal Header */}
          <header className="h-16 px-4 sm:px-6 bg-zinc-900 border-b border-zinc-800 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-7 h-7 rounded-lg bg-blue-600/20 text-blue-400 flex items-center justify-center font-bold text-xs">
                <Zap className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-zinc-100 flex items-center gap-2">
                  <span>{previewTemplate.name}</span>
                  <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-zinc-800 text-zinc-600">
                    {previewTemplate.category}
                  </span>
                </h3>
              </div>
            </div>

            {/* Viewport Switcher */}
            <div className="hidden sm:flex items-center gap-1 bg-zinc-800/80 p-1 rounded-xl border border-zinc-700/60">
              <button
                type="button"
                onClick={() => setViewport("desktop")}
                className={`p-1.5 rounded-lg text-xs font-medium transition-colors ${
                  viewport === "desktop"
                    ? "bg-zinc-700 text-zinc-100"
                    : "text-zinc-600 hover:text-zinc-200"
                }`}
                title="Desktop View"
              >
                <Monitor className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setViewport("tablet")}
                className={`p-1.5 rounded-lg text-xs font-medium transition-colors ${
                  viewport === "tablet"
                    ? "bg-zinc-700 text-zinc-100"
                    : "text-zinc-600 hover:text-zinc-200"
                }`}
                title="Tablet View"
              >
                <Tablet className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setViewport("mobile")}
                className={`p-1.5 rounded-lg text-xs font-medium transition-colors ${
                  viewport === "mobile"
                    ? "bg-zinc-700 text-zinc-100"
                    : "text-zinc-600 hover:text-zinc-200"
                }`}
                title="Mobile View"
              >
                <Smartphone className="w-4 h-4" />
              </button>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-3">
              <Link
                href={templateHref(previewTemplate.id)}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-600 text-white text-xs font-semibold transition-colors shadow-sm"
              >
                <span>Use Template</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
              <button
                type="button"
                onClick={() => setPreviewTemplate(null)}
                className="p-2 rounded-xl text-zinc-600 hover:text-zinc-200 hover:bg-zinc-800 transition-colors"
                title="Close Preview"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </header>

          {/* Modal Preview Body */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-8 flex justify-center bg-zinc-950">
            <div
                className={`transition-colors duration-300 rounded-2xl overflow-hidden shadow-2xl bg-white dark:bg-zinc-950 border border-zinc-800 ${
                viewport === "desktop"
                  ? "w-full max-w-6xl"
                  : viewport === "tablet"
                    ? "w-full max-w-[768px]"
                    : "w-full max-w-[390px]"
              }`}
            >
              {/* Zero-drift guarantee: uses identical site renderer */}
              <SiteRenderer content={previewTemplate.content} isPreview={true} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
