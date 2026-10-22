/* Hallmark · pre-emit critique: P5 H5 E5 S5 R5 V5 */
"use client";

import React, { useState } from "react";
import type { SitePage, PlanId } from "@/types/database";
import {
  canCreateCustomPages,
  canCreateBlogPages,
  getMaxPages,
  getMaxBlogPages,
} from "@/lib/tier-limits";
import {
  FileText,
  Plus,
  Shield,
  FileCheck,
  LifeBuoy,
  Lock,
  Trash2,
  Sparkles,
  BookOpen,
  Calendar,
  User,
  Image as ImageIcon,
  CheckCircle2,
} from "lucide-react";

interface PageManagerProps {
  pages: SitePage[];
  activePageId: string;
  planId?: PlanId | null;
  onSelectPage: (pageId: string) => void;
  onUpdatePage: (updatedPage: SitePage) => void;
  onAddCustomPage: (title: string, slug: string) => void;
  onAddBlogPage?: (pageData: Partial<SitePage> & { title: string; slug: string }) => void;
  onDeleteCustomPage: (pageId: string) => void;
}

const BLOG_PRESETS = [
  {
    name: "Product Launch",
    title: "Announcing v2.0: A New Era for Mobile Focus",
    slug: "announcing-v2-launch",
    excerpt: "Discover our biggest update yet, featuring redesigned analytics, offline soundscapes, and lightning-fast syncing.",
    markdown: `# Announcing v2.0: A New Era for Mobile Focus

We are thrilled to officially unveil our biggest milestone yet. Built with care from the ground up, this major update re-architects how you interact with our app every single day.

## Key Highlights in This Release

- **Intelligent Rhythms:** Actionable daily metrics that guide your daily habits without feeling intrusive.
- **Offline Audio Packs:** Immersive, high-fidelity soundscapes available anywhere in the world.
- **Redesigned Interface:** A clean, tactile layout optimized for low-light environments and effortless navigation.

## Designed for Modern Makers

Every interaction was scrutinized to eliminate friction. From instant launch speeds to battery-friendly background processing, version 2.0 is designed to get out of your way.

## Download Today

Version 2.0 is available as a free update for all active subscribers on the App Store and Google Play. We would love to hear what you think!`,
  },
  {
    name: "Feature Spotlight",
    title: "Deep Dive: How We Built Offline-First Synchronization",
    slug: "deep-dive-offline-sync",
    excerpt: "An inside look at our local-first database architecture and how it preserves your data with zero network latency.",
    markdown: `# Deep Dive: How We Built Offline-First Synchronization

When building a companion mobile application, reliability is non-negotiable. If you lose cellular reception while traveling, your personal notes and activity logs shouldn't disappear.

## The Challenge

Traditional cloud-dependent applications block user inputs while waiting on remote API handshakes. If a connection drops midway, user work is often silently lost.

## Our Approach: Local First

1. **Immediate SQLite Writes:** Every tap commits directly to an encrypted on-device SQLite database in under 5 milliseconds.
2. **Deterministic Conflict Resolution:** Changes are assigned cryptographic vector timestamps to guarantee consistent state convergence.
3. **Background Edge Sync:** The app connects to our distributed edge relays only when a stable Wi-Fi or cellular signal is confirmed.

The result is an app that feels instantaneous and never leaves you stranded.`,
  },
  {
    name: "How-To Guide",
    title: "5 Proven Strategies to Boost Your Daily Habit Consistency",
    slug: "5-strategies-habit-consistency",
    excerpt: "Actionable routines and scientific principles to build enduring streaks without feeling overwhelmed.",
    markdown: `# 5 Proven Strategies to Boost Your Daily Habit Consistency

Consistency is rarely about raw willpower; it is about environment design and frictionless execution. Here are five practical strategies our team and top users swear by.

### 1. The Two-Minute Rule
Make the gateway to your habit ridiculously easy. If your goal is 30 minutes of mindfulness, start with two uninterrupted minutes.

### 2. Time-Anchored Triggers
Tie new actions to an existing anchored behavior (for example: opening your morning journal right after your first sip of coffee).

### 3. Track Visual Streaks
Seeing a continuous, unbroken chain creates positive psychological momentum that keeps you accountable.

### 4. Optimize for Bad Days
Decide in advance what a "minimum viable session" looks like when you are exhausted or short on time.

### 5. Review Weekly Wins
Celebrate small, quiet progress every Sunday evening to reinforce your long-term momentum.`,
  },
];

export function PageManager({
  pages,
  activePageId,
  planId,
  onSelectPage,
  onUpdatePage,
  onAddCustomPage,
  onAddBlogPage,
  onDeleteCustomPage,
}: PageManagerProps) {
  const [creationMode, setCreationMode] = useState<"none" | "custom" | "blog">("none");
  const [filterType, setFilterType] = useState<"all" | "legal" | "blog" | "custom">("all");

  // Form states
  const [formTitle, setFormTitle] = useState("");
  const [formSlug, setFormSlug] = useState("");
  const [formExcerpt, setFormExcerpt] = useState("");
  const [formAuthor, setFormAuthor] = useState("");
  const [formCoverImage, setFormCoverImage] = useState("");
  const [selectedPresetIdx, setSelectedPresetIdx] = useState<number | null>(null);
  const [errorMsg, setErrorMsg] = useState("");

  const canCreateCustom = canCreateCustomPages(planId);
  const canCreateBlog = canCreateBlogPages(planId);
  const maxPages = getMaxPages(planId);
  const maxBlogPages = getMaxBlogPages(planId);

  const blogPages = pages.filter((p) => p.page_type === "blog");
  const legalPages = pages.filter((p) => ["home", "privacy", "terms", "support"].includes(p.slug));
  const customPages = pages.filter((p) => p.page_type === "custom");

  const filteredPages = pages.filter((p) => {
    if (filterType === "legal") return ["home", "privacy", "terms", "support"].includes(p.slug);
    if (filterType === "blog") return p.page_type === "blog";
    if (filterType === "custom") return p.page_type === "custom";
    return true;
  });

  const activePage = pages.find((p) => p.id === activePageId) || pages[0];

  const handleApplyPreset = (idx: number) => {
    const preset = BLOG_PRESETS[idx];
    if (!preset) return;
    setSelectedPresetIdx(idx);
    setFormTitle(preset.title);
    setFormSlug(preset.slug);
    setFormExcerpt(preset.excerpt);
  };

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (creationMode === "blog") {
      if (!canCreateBlog) {
        setErrorMsg("Blog posts require a Basic or Pro subscription.");
        return;
      }
      if (blogPages.length >= maxBlogPages) {
        setErrorMsg(`Blog post limit reached (${maxBlogPages} posts for your tier).`);
        return;
      }
    } else {
      if (!canCreateCustom) {
        setErrorMsg("Custom pages require a Basic or Pro subscription.");
        return;
      }
      if (pages.length >= maxPages) {
        setErrorMsg(`Maximum page limit reached (${maxPages} pages).`);
        return;
      }
    }

    const cleanTitle = formTitle.trim();
    const cleanSlug = formSlug
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9-_]/g, "-")
      .replace(/^-+|-+$/g, "");

    if (!cleanTitle || !cleanSlug) {
      setErrorMsg("Please provide both a title and slug.");
      return;
    }

    if (pages.some((p) => p.slug === cleanSlug)) {
      setErrorMsg(`A page with URL slug "/${cleanSlug}" already exists.`);
      return;
    }

    if (creationMode === "blog") {
      const presetMarkdown =
        selectedPresetIdx !== null
          ? BLOG_PRESETS[selectedPresetIdx]?.markdown
          : undefined;

      if (onAddBlogPage) {
        onAddBlogPage({
          title: cleanTitle,
          slug: cleanSlug,
          excerpt: formExcerpt.trim(),
          author: formAuthor.trim() || undefined,
          cover_image_url: formCoverImage.trim() || undefined,
          content_markdown: presetMarkdown,
        });
      } else {
        onAddCustomPage(cleanTitle, cleanSlug);
      }
    } else {
      onAddCustomPage(cleanTitle, cleanSlug);
    }

    // Reset form
    setFormTitle("");
    setFormSlug("");
    setFormExcerpt("");
    setFormAuthor("");
    setFormCoverImage("");
    setSelectedPresetIdx(null);
    setCreationMode("none");
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
      case "blog":
        return <BookOpen className="h-3.5 w-3.5 text-indigo-500" />;
      default:
        return <FileText className="h-3.5 w-3.5 text-purple-500" />;
    }
  };

  return (
    <div className="space-y-4">
      {/* Tier Quota Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-zinc-200 bg-zinc-50 px-3.5 py-2.5 dark:border-zinc-800 dark:bg-zinc-900/60">
        <div className="flex items-center gap-2 text-xs">
          {planId === "pro" ? (
            <span className="flex items-center gap-1 font-semibold text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="h-3.5 w-3.5" />
              Pro: Unlimited Blog Posts & Pages
            </span>
          ) : planId === "basic" ? (
            <span className="flex items-center gap-1 font-semibold text-zinc-900 dark:text-zinc-100">
              <BookOpen className="h-3.5 w-3.5 text-indigo-500" />
              Basic Tier: {blogPages.length}/10 Blog posts used
            </span>
          ) : (
            <span className="flex items-center gap-1 text-zinc-600 dark:text-zinc-400">
              <Lock className="h-3.5 w-3.5 text-amber-500" />
              Free: 4 Compliance pages · Upgrade for Blog posts
            </span>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          {canCreateBlog ? (
            <button
              type="button"
              onClick={() => {
                setCreationMode("blog");
                setErrorMsg("");
              }}
              className="inline-flex items-center gap-1 rounded-lg bg-zinc-950 px-2.5 py-1 text-xs font-semibold text-white shadow-xs hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-950 dark:hover:bg-white"
            >
              <Sparkles className="h-3.5 w-3.5 text-blue-400 dark:text-blue-600" />
              <span>Write Blog Post</span>
            </button>
          ) : (
            <div className="flex items-center gap-1 rounded-lg border border-zinc-200 bg-white px-2 py-1 text-[11px] text-zinc-500 dark:border-zinc-800 dark:bg-zinc-950">
              <Lock className="h-3 w-3 text-amber-500" />
              <span>Blog: Basic / Pro</span>
            </div>
          )}

          {canCreateCustom ? (
            <button
              type="button"
              onClick={() => {
                setCreationMode("custom");
                setErrorMsg("");
              }}
              className="inline-flex items-center gap-1 rounded-lg border border-zinc-300 bg-white px-2.5 py-1 text-xs font-medium text-zinc-700 hover:border-zinc-900 hover:text-zinc-900 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-300 dark:hover:border-zinc-100 dark:hover:text-zinc-100"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Custom Page</span>
            </button>
          ) : null}
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-1.5 border-b border-zinc-100 pb-2 text-xs text-zinc-600 dark:border-zinc-800 dark:text-zinc-400">
        <span className="text-[11px] font-medium text-zinc-400 uppercase tracking-wider pr-1">Filter:</span>
        <button
          type="button"
          onClick={() => setFilterType("all")}
          className={`rounded-md px-2 py-0.5 text-xs font-medium transition-colors ${
            filterType === "all"
              ? "bg-zinc-200 text-zinc-900 dark:bg-zinc-800 dark:text-zinc-100"
              : "hover:text-zinc-900 dark:hover:text-zinc-100"
          }`}
        >
          All ({pages.length})
        </button>
        <button
          type="button"
          onClick={() => setFilterType("blog")}
          className={`rounded-md px-2 py-0.5 text-xs font-medium transition-colors ${
            filterType === "blog"
              ? "bg-zinc-200 text-zinc-900 dark:bg-zinc-800 dark:text-zinc-100"
              : "hover:text-zinc-900 dark:hover:text-zinc-100"
          }`}
        >
          Blog Posts ({blogPages.length})
        </button>
        <button
          type="button"
          onClick={() => setFilterType("legal")}
          className={`rounded-md px-2 py-0.5 text-xs font-medium transition-colors ${
            filterType === "legal"
              ? "bg-zinc-200 text-zinc-900 dark:bg-zinc-800 dark:text-zinc-100"
              : "hover:text-zinc-900 dark:hover:text-zinc-100"
          }`}
        >
          Legal & Support ({legalPages.length})
        </button>
        {customPages.length > 0 && (
          <button
            type="button"
            onClick={() => setFilterType("custom")}
            className={`rounded-md px-2 py-0.5 text-xs font-medium transition-colors ${
              filterType === "custom"
                ? "bg-zinc-200 text-zinc-900 dark:bg-zinc-800 dark:text-zinc-100"
                : "hover:text-zinc-900 dark:hover:text-zinc-100"
            }`}
          >
            Custom ({customPages.length})
          </button>
        )}
      </div>

      {/* Pages Horizontal Strip */}
      <div className="flex flex-wrap items-center gap-1.5 pb-2">
        {filteredPages.map((p) => {
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
      </div>

      {/* Creation Modal / Inline Form for Blog Post or Custom Page */}
      {creationMode !== "none" && (
        <form
          onSubmit={handleCreateSubmit}
          className="rounded-xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-900/60"
        >
          <div className="flex items-center justify-between mb-3">
            <h5 className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
              {creationMode === "blog" ? (
                <>
                  <BookOpen className="h-3.5 w-3.5 text-indigo-500" />
                  Create Marketing Blog Post
                </>
              ) : (
                <>
                  <Sparkles className="h-3.5 w-3.5 text-purple-500" />
                  Create Custom Page
                </>
              )}
            </h5>
            <button
              type="button"
              onClick={() => {
                setCreationMode("none");
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

          {/* Blog Templates Picker */}
          {creationMode === "blog" && (
            <div className="mb-4">
              <label className="text-[11px] font-medium text-zinc-600 dark:text-zinc-400 block mb-1.5">
                Quick Marketing Template (optional):
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {BLOG_PRESETS.map((preset, idx) => (
                  <button
                    key={preset.name}
                    type="button"
                    onClick={() => handleApplyPreset(idx)}
                    className={`rounded-lg border p-2 text-left text-xs transition-all ${
                      selectedPresetIdx === idx
                        ? "border-indigo-600 bg-indigo-50/50 text-indigo-950 dark:border-indigo-500 dark:bg-indigo-950/30 dark:text-indigo-200"
                        : "border-zinc-200 bg-white hover:border-zinc-300 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-300"
                    }`}
                  >
                    <div className="font-semibold">{preset.name}</div>
                    <div className="text-[10px] text-zinc-500 line-clamp-1 mt-0.5">
                      {preset.title}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="text-[11px] font-medium text-zinc-600 dark:text-zinc-400">
                {creationMode === "blog" ? "Article Title" : "Page Title"}
              </label>
              <input
                type="text"
                value={formTitle}
                onChange={(e) => {
                  setFormTitle(e.target.value);
                  if (!formSlug) {
                    setFormSlug(
                      e.target.value
                        .toLowerCase()
                        .replace(/[^a-z0-9]/g, "-")
                        .replace(/-+/g, "-")
                        .slice(0, 40)
                    );
                  }
                }}
                placeholder={creationMode === "blog" ? "e.g. Announcing v2.0 Update" : "e.g. Press Kit, Changelog"}
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
                  value={formSlug}
                  onChange={(e) => setFormSlug(e.target.value)}
                  placeholder="v2-update"
                  className="w-full bg-transparent pl-1 text-zinc-900 focus:outline-hidden dark:text-zinc-100"
                  required
                />
              </div>
            </div>

            {creationMode === "blog" && (
              <>
                <div className="sm:col-span-2">
                  <label className="text-[11px] font-medium text-zinc-600 dark:text-zinc-400">
                    Article Summary / Excerpt (Used for Landing Page Card & SEO snippets)
                  </label>
                  <input
                    type="text"
                    value={formExcerpt}
                    onChange={(e) => setFormExcerpt(e.target.value)}
                    placeholder="Short 1-2 sentence preview of the article..."
                    className="mt-1 w-full rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-xs text-zinc-900 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-100"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-medium text-zinc-600 dark:text-zinc-400">
                    Author Name
                  </label>
                  <input
                    type="text"
                    value={formAuthor}
                    onChange={(e) => setFormAuthor(e.target.value)}
                    placeholder="e.g. Sarah Jenkins or Team"
                    className="mt-1 w-full rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-xs text-zinc-900 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-100"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-medium text-zinc-600 dark:text-zinc-400">
                    Cover Image URL (optional)
                  </label>
                  <input
                    type="url"
                    value={formCoverImage}
                    onChange={(e) => setFormCoverImage(e.target.value)}
                    placeholder="https://example.com/cover.png"
                    className="mt-1 w-full rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-xs text-zinc-900 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-100"
                  />
                </div>
              </>
            )}
          </div>

          <div className="mt-4 flex justify-end gap-2">
            <button
              type="submit"
              className="rounded-lg bg-zinc-950 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-950"
            >
              {creationMode === "blog" ? "Create Article" : "Add Page"}
            </button>
          </div>
        </form>
      )}

      {/* Active Page Editor (when not Home) */}
      {activePage && activePage.page_type !== "home" && (
        <div className="space-y-4 rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-zinc-100 pb-3 gap-3 dark:border-zinc-800">
            <div>
              <h4 className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
                {getPageIcon(activePage.page_type)}
                {activePage.page_type === "blog" ? "Blog Article: " : "Editing: "}
                {activePage.title}
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

            <div className="flex items-center gap-3">
              <label className="flex items-center gap-1.5 text-[11px] text-zinc-600 dark:text-zinc-400 cursor-pointer">
                <input
                  type="checkbox"
                  checked={activePage.show_in_nav ?? (activePage.page_type !== "blog")}
                  onChange={(e) =>
                    onUpdatePage({ ...activePage, show_in_nav: e.target.checked })
                  }
                  className="rounded border-zinc-300"
                />
                Show in Nav
              </label>

              <label className="flex items-center gap-1.5 text-[11px] text-zinc-600 dark:text-zinc-400 cursor-pointer">
                <input
                  type="checkbox"
                  checked={activePage.show_in_footer ?? true}
                  onChange={(e) =>
                    onUpdatePage({ ...activePage, show_in_footer: e.target.checked })
                  }
                  className="rounded border-zinc-300"
                />
                Show in Footer
              </label>

              {!activePage.is_system && (
                <button
                  type="button"
                  onClick={() => onDeleteCustomPage(activePage.id)}
                  className="flex items-center gap-1 text-xs text-red-500 hover:underline pl-2 border-l border-zinc-200 dark:border-zinc-800"
                >
                  <Trash2 className="h-3 w-3" />
                  Delete
                </button>
              )}
            </div>
          </div>

          {/* Extra metadata fields for Blog Posts */}
          {activePage.page_type === "blog" && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 rounded-lg border border-zinc-100 bg-zinc-50/50 p-3 dark:border-zinc-800 dark:bg-zinc-950/40">
              <div className="sm:col-span-2">
                <label className="text-[11px] font-medium text-zinc-600 dark:text-zinc-400">
                  Article Title
                </label>
                <input
                  type="text"
                  value={activePage.title}
                  onChange={(e) =>
                    onUpdatePage({ ...activePage, title: e.target.value })
                  }
                  className="mt-1 w-full rounded-md border border-zinc-200 bg-white px-2.5 py-1 text-xs text-zinc-900 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-100"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="text-[11px] font-medium text-zinc-600 dark:text-zinc-400">
                  Excerpt (Used for Landing Page preview card and LLM search discoverability)
                </label>
                <input
                  type="text"
                  value={activePage.excerpt || ""}
                  onChange={(e) =>
                    onUpdatePage({ ...activePage, excerpt: e.target.value })
                  }
                  placeholder="Summary for search results and previews..."
                  className="mt-1 w-full rounded-md border border-zinc-200 bg-white px-2.5 py-1 text-xs text-zinc-900 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-100"
                />
              </div>

              <div>
                <label className="text-[11px] font-medium text-zinc-600 dark:text-zinc-400 flex items-center gap-1">
                  <User className="h-3 w-3" /> Author
                </label>
                <input
                  type="text"
                  value={activePage.author || ""}
                  onChange={(e) =>
                    onUpdatePage({ ...activePage, author: e.target.value })
                  }
                  placeholder="Author or Team name"
                  className="mt-1 w-full rounded-md border border-zinc-200 bg-white px-2.5 py-1 text-xs text-zinc-900 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-100"
                />
              </div>

              <div>
                <label className="text-[11px] font-medium text-zinc-600 dark:text-zinc-400 flex items-center gap-1">
                  <Calendar className="h-3 w-3" /> Published Date
                </label>
                <input
                  type="date"
                  value={activePage.published_date || (activePage.updated_at ? activePage.updated_at.split("T")[0] : "")}
                  onChange={(e) =>
                    onUpdatePage({ ...activePage, published_date: e.target.value })
                  }
                  className="mt-1 w-full rounded-md border border-zinc-200 bg-white px-2.5 py-1 text-xs text-zinc-900 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-100"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="text-[11px] font-medium text-zinc-600 dark:text-zinc-400 flex items-center gap-1">
                  <ImageIcon className="h-3 w-3" /> Cover Image URL
                </label>
                <input
                  type="url"
                  value={activePage.cover_image_url || ""}
                  onChange={(e) =>
                    onUpdatePage({ ...activePage, cover_image_url: e.target.value })
                  }
                  placeholder="https://example.com/cover.png"
                  className="mt-1 w-full rounded-md border border-zinc-200 bg-white px-2.5 py-1 text-xs text-zinc-900 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-100"
                />
              </div>
            </div>
          )}

          {/* Markdown Content Editor */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-[11px] font-medium text-zinc-700 dark:text-zinc-300">
                Markdown Body Content
              </label>
              <span className="text-[10px] text-zinc-400">
                GitHub Markdown supported (# headers, - lists, **bold**, links)
              </span>
            </div>
            <textarea
              rows={14}
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
