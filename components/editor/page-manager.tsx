/* Hallmark · pre-emit critique: P5 H5 E5 S5 R5 V5 */
"use client";

import React, { useState } from "react";
import type { SitePage, PlanId } from "@/types/database";
import { canCreateCustomPages, getMaxPages } from "@/lib/tier-limits";
import {
  FileText,
  Plus,
  Shield,
  FileCheck,
  LifeBuoy,
  Lock,
  Trash2,
  Sparkles,
} from "lucide-react";

interface PageManagerProps {
  pages: SitePage[];
  activePageId: string;
  planId?: PlanId | null;
  onSelectPage: (pageId: string) => void;
  onUpdatePage: (updatedPage: SitePage) => void;
  onAddCustomPage: (title: string, slug: string) => void;
  onDeleteCustomPage: (pageId: string) => void;
}

export function PageManager({
  pages,
  activePageId,
  planId,
  onSelectPage,
  onUpdatePage,
  onAddCustomPage,
  onDeleteCustomPage,
}: PageManagerProps) {
  const [isCreatingCustom, setIsCreatingCustom] = useState(false);
  const [customTitle, setCustomTitle] = useState("");
  const [customSlug, setCustomSlug] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  const isPro = canCreateCustomPages(planId);
  const maxPages = getMaxPages(planId);
  const activePage = pages.find((p) => p.id === activePageId) || pages[0];

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isPro) {
      setErrorMsg("Custom pages require a Pro subscription. Free accounts are limited to the 4 essential App Store compliance pages.");
      return;
    }
    if (pages.length >= maxPages) {
      setErrorMsg(`Maximum page limit reached (${maxPages} pages).`);
      return;
    }
    const cleanTitle = customTitle.trim();
    const cleanSlug = customSlug
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9-_]/g, "-")
      .replace(/^-+|-+$/g, "");

    if (!cleanTitle || !cleanSlug) {
      setErrorMsg("Please provide both a title and slug.");
      return;
    }

    if (pages.some((p) => p.slug === cleanSlug)) {
      setErrorMsg("A page with this URL slug already exists.");
      return;
    }

    onAddCustomPage(cleanTitle, cleanSlug);
    setCustomTitle("");
    setCustomSlug("");
    setIsCreatingCustom(false);
    setErrorMsg("");
  };

  const getPageIcon = (type: SitePage["page_type"]) => {
    switch (type) {
      case "home":
        return <FileText className="h-3.5 w-3.5" />;
      case "privacy":
        return <Shield className="h-3.5 w-3.5 text-blue-500" />;
      case "terms":
        return <FileCheck className="h-3.5 w-3.5 text-emerald-500" />;
      case "support":
        return <LifeBuoy className="h-3.5 w-3.5 text-amber-500" />;
      default:
        return <FileText className="h-3.5 w-3.5 text-purple-500" />;
    }
  };

  return (
    <div className="space-y-4">
      {/* Page List Strip / Tabs */}
      <div className="flex flex-wrap items-center gap-1.5 border-b border-zinc-200 pb-3 dark:border-zinc-800">
        {pages.map((p) => {
          const isSelected = p.id === activePage?.id;
          return (
            <button
              key={p.id}
              type="button"
              onClick={() => onSelectPage(p.id)}
              className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-all ${
                isSelected
                  ? "bg-zinc-950 text-white shadow-xs dark:bg-zinc-100 dark:text-zinc-950"
                  : "bg-zinc-100 text-zinc-700 hover:bg-zinc-200 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800"
              }`}
            >
              {getPageIcon(p.page_type)}
              <span>{p.title}</span>
              {p.page_type !== "home" && (
                <span className="text-[10px] opacity-60">/{p.slug}</span>
              )}
            </button>
          );
        })}

        {/* Add Page Button or Pro Lock */}
        {isPro ? (
          <button
            type="button"
            onClick={() => setIsCreatingCustom(true)}
            className="flex items-center gap-1 rounded-lg border border-dashed border-zinc-300 px-2.5 py-1.5 text-xs font-medium text-zinc-600 hover:border-zinc-900 hover:text-zinc-900 dark:border-zinc-700 dark:text-zinc-400 dark:hover:border-zinc-200 dark:hover:text-zinc-100"
          >
            <Plus className="h-3.5 w-3.5" />
            Add Page
          </button>
        ) : (
          <div className="flex items-center gap-1 rounded-lg border border-zinc-200 bg-zinc-50 px-2 py-1 text-[11px] text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400">
            <Lock className="h-3 w-3 text-amber-500" />
            <span>Pro: Custom Pages</span>
          </div>
        )}
      </div>

      {/* Creation Modal / Inline Form */}
      {isCreatingCustom && (
        <form
          onSubmit={handleCreate}
          className="rounded-xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-900/60"
        >
          <div className="flex items-center justify-between mb-3">
            <h5 className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5 text-purple-500" />
              Create Custom Page
            </h5>
            <button
              type="button"
              onClick={() => {
                setIsCreatingCustom(false);
                setErrorMsg("");
              }}
              className="text-xs text-zinc-400 hover:text-zinc-600"
            >
              Cancel
            </button>
          </div>

          {errorMsg && (
            <div className="mb-3 rounded-lg bg-red-50 p-2 text-xs text-red-600 dark:bg-red-950/40 dark:text-red-400">
              {errorMsg}
            </div>
          )}

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="text-[11px] font-medium text-zinc-600 dark:text-zinc-400">
                Page Title
              </label>
              <input
                type="text"
                value={customTitle}
                onChange={(e) => {
                  setCustomTitle(e.target.value);
                  if (!customSlug) {
                    setCustomSlug(
                      e.target.value
                        .toLowerCase()
                        .replace(/[^a-z0-9]/g, "-")
                        .slice(0, 30)
                    );
                  }
                }}
                placeholder="e.g. Press Kit, Changelog"
                className="mt-1 w-full rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-xs text-zinc-900 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-100"
                required
              />
            </div>
            <div>
              <label className="text-[11px] font-medium text-zinc-600 dark:text-zinc-400">
                URL Slug
              </label>
              <div className="mt-1 flex items-center rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-xs text-zinc-500 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-400">
                <span>/</span>
                <input
                  type="text"
                  value={customSlug}
                  onChange={(e) => setCustomSlug(e.target.value)}
                  placeholder="press, changelog"
                  className="w-full bg-transparent pl-1 text-zinc-900 focus:outline-hidden dark:text-zinc-100"
                  required
                />
              </div>
            </div>
          </div>

          <div className="mt-3 flex justify-end gap-2">
            <button
              type="submit"
              className="rounded-lg bg-zinc-950 px-3 py-1.5 text-xs font-semibold text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-950"
            >
              Add Page
            </button>
          </div>
        </form>
      )}

      {/* Active Page Editor (when not Home) */}
      {activePage && activePage.page_type !== "home" && (
        <div className="space-y-4 rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
          <div className="flex items-center justify-between border-b border-zinc-100 pb-3 dark:border-zinc-800">
            <div>
              <h4 className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
                {getPageIcon(activePage.page_type)}
                Editing: {activePage.title}
                {activePage.is_system && (
                  <span className="rounded bg-zinc-100 px-1.5 py-0.5 text-[10px] text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400 font-normal">
                    App Store Mandate
                  </span>
                )}
              </h4>
              <p className="mt-0.5 text-[11px] text-zinc-500">
                Public URL: <span className="font-mono">/{activePage.slug}</span>
              </p>
            </div>

            <div className="flex items-center gap-2">
              <label className="flex items-center gap-1.5 text-[11px] text-zinc-600 dark:text-zinc-400 cursor-pointer">
                <input
                  type="checkbox"
                  checked={activePage.show_in_nav ?? true}
                  onChange={(e) =>
                    onUpdatePage({ ...activePage, show_in_nav: e.target.checked })
                  }
                  className="rounded border-zinc-300"
                />
                Show in Nav
              </label>

              {!activePage.is_system && (
                <button
                  type="button"
                  onClick={() => onDeleteCustomPage(activePage.id)}
                  className="flex items-center gap-1 text-xs text-red-500 hover:underline pl-2"
                >
                  <Trash2 className="h-3 w-3" />
                  Delete
                </button>
              )}
            </div>
          </div>

          {/* Markdown Content Editor */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-[11px] font-medium text-zinc-700 dark:text-zinc-300">
                Markdown Content
              </label>
              <span className="text-[10px] text-zinc-400">
                Standard GitHub Markdown supported
              </span>
            </div>
            <textarea
              rows={12}
              value={activePage.content_markdown || ""}
              onChange={(e) =>
                onUpdatePage({
                  ...activePage,
                  content_markdown: e.target.value,
                  updated_at: new Date().toISOString(),
                })
              }
              className="w-full rounded-lg border border-zinc-200 bg-zinc-50 font-mono text-xs leading-relaxed text-zinc-900 p-3 focus:border-zinc-950 focus:bg-white focus:outline-hidden dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-100"
            />
          </div>
        </div>
      )}
    </div>
  );
}
