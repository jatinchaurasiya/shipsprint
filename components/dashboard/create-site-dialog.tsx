"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, X, Loader2, ArrowRight, Sparkles, Lock, Smartphone, Terminal, Cpu, Users, Briefcase, Landmark } from "lucide-react";
import Link from "next/link";
import { BUILTIN_TEMPLATES } from "@/lib/templates";

interface CreateSiteDialogProps {
  canCreate: boolean;
  currentCount: number;
  maxLimit: number;
  initialTemplateId?: string;
}

export function CreateSiteDialog({
  canCreate,
  currentCount,
  maxLimit,
  initialTemplateId,
}: CreateSiteDialogProps) {
  const [isOpen, setIsOpen] = useState(Boolean(initialTemplateId));
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>(initialTemplateId || "ios-swift");
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [isSlugCustomized, setIsSlugCustomized] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handleNameChange = (val: string) => {
    setName(val);
    if (!isSlugCustomized) {
      const generated = val
        .toLowerCase()
        .replace(/[^a-z0-9]/g, "-")
        .replace(/-+/g, "-")
        .replace(/^-|-$/g, "");
      setSlug(generated);
    }
  };

  const handleSlugChange = (val: string) => {
    setIsSlugCustomized(true);
    setSlug(
      val
        .toLowerCase()
        .replace(/[^a-z0-9-]/g, "")
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !slug.trim()) return;

    setError(null);
    setLoading(true);

    try {
      const res = await fetch("/api/sites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          slug: slug.trim(),
          template_id: selectedTemplateId || undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to create landing page");
        setLoading(false);
        return;
      }

      setIsOpen(false);
      router.push(`/dashboard/editor/${data.site.id}`);
      router.refresh();
    } catch (err) {
      setError((err instanceof Error ? err.message : undefined) || "An unexpected error occurred");
      setLoading(false);
    }
  };

  const getTemplateIcon = (category: string) => {
    switch (category) {
      case "productivity":
        return <Smartphone className="w-3.5 h-3.5 text-blue-500" />;
      case "developer":
        return <Terminal className="w-3.5 h-3.5 text-emerald-500" />;
      case "saas":
        return <Cpu className="w-3.5 h-3.5 text-purple-500" />;
      case "social":
        return <Users className="w-3.5 h-3.5 text-amber-500" />;
      case "finance":
        return <Landmark className="w-3.5 h-3.5 text-teal-500" />;
      default:
        return <Briefcase className="w-3.5 h-3.5 text-indigo-500" />;
    }
  };

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-zinc-900 dark:bg-zinc-100 hover:bg-zinc-800 dark:hover:bg-white text-white dark:text-zinc-900 text-xs sm:text-sm font-medium shadow-sm transition-colors active:scale-[0.98]"
      >
        <Plus className="w-4 h-4" />
        <span>Create Landing Page</span>
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative w-full max-w-xl max-h-[90vh] overflow-y-auto rounded-2xl bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 p-6 sm:p-7 shadow-2xl">
            {/* Close button */}
            <button
              onClick={() => setIsOpen(false)}
              className="absolute top-5 right-5 p-1 rounded-lg text-zinc-600 hover:text-zinc-700 dark:hover:text-zinc-200 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>

            {!canCreate ? (
              <div className="text-center py-4">
                <div className="w-12 h-12 rounded-2xl bg-amber-100 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 flex items-center justify-center mx-auto mb-4 border border-amber-200/60 dark:border-amber-900/40">
                  <Lock className="w-6 h-6" />
                </div>
                <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
                  Plan Limit Reached
                </h2>
                <p className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-400 mt-2 max-w-sm mx-auto">
                  You have created {currentCount} of {maxLimit} sites allowed on your current tier. Upgrade to Basic or Pro to publish more apps.
                </p>
                <div className="mt-6 flex items-center justify-center gap-3">
                  <button
                    type="button"
                    onClick={() => setIsOpen(false)}
                    className="px-4 py-2 rounded-xl border border-zinc-200 dark:border-zinc-800 text-xs font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-colors"
                  >
                    Close
                  </button>
                  <Link
                    href="/dashboard/billing"
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-600 text-white text-xs font-medium transition-colors shadow-sm"
                  >
                    <span>Upgrade Plan</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            ) : (
              <div>
                <div className="flex items-center gap-2.5 mb-1">
                  <Sparkles className="w-4 h-4 text-blue-500" />
                  <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
                    New Landing Page
                  </h2>
                </div>
                <p className="text-xs text-zinc-600 dark:text-zinc-400 mb-5">
                  Pick a starting template and customize your subdomain.
                </p>

                {error && (
                  <div className="mb-4 p-3 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200/60 dark:border-red-900/40 text-xs text-red-600 dark:text-red-400">
                    {error}
                  </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                  {/* Template Picker */}
                  <div>
                    <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                      Choose Starting Template
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-48 overflow-y-auto pr-1">
                      {BUILTIN_TEMPLATES.map((tmpl) => {
                        const isSelected = selectedTemplateId === tmpl.id;
                        return (
                          <button
                            key={tmpl.id}
                            type="button"
                            onClick={() => setSelectedTemplateId(tmpl.id)}
                            className={`flex flex-col text-left p-3 rounded-xl border text-xs transition-colors ${
                              isSelected
                                ? "border-blue-500 bg-blue-50/50 dark:bg-blue-950/30 text-zinc-900 dark:text-zinc-100 ring-2 ring-blue-500/20"
                                : "border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50 text-zinc-600 dark:text-zinc-400 hover:border-zinc-300 dark:hover:border-zinc-700"
                            }`}
                          >
                            <div className="flex items-center justify-between w-full mb-1">
                              <span className="font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
                                {getTemplateIcon(tmpl.category)}
                                {tmpl.name}
                              </span>
                              <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-zinc-200/60 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400">
                                {tmpl.category}
                              </span>
                            </div>
                            <span className="text-[11px] line-clamp-1 text-zinc-600 dark:text-zinc-400">
                              {tmpl.tagline}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
                      App / Product Name
                    </label>
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={(e) => handleNameChange(e.target.value)}
                      placeholder="e.g. ZenHabit or FocusTimer"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-sm text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
                      Subdomain URL
                    </label>
                    <div className="flex items-center rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-3.5 py-2 focus-within:ring-2 focus-within:ring-blue-500/20 focus-within:border-blue-500 transition-colors">
                      <input
                        type="text"
                        required
                        value={slug}
                        onChange={(e) => handleSlugChange(e.target.value)}
                        placeholder="zenhabit"
                        className="w-full bg-transparent text-sm text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 "
                      />
                      <span className="text-xs text-zinc-600 font-mono select-none">
                        .shipsprint.site
                      </span>
                    </div>
                    <p className="text-[11px] text-zinc-600 mt-1">
                      Your app will be published live at this URL.
                    </p>
                  </div>

                  <div className="pt-3 flex items-center justify-end gap-3">
                    <button
                      type="button"
                      onClick={() => setIsOpen(false)}
                      className="px-4 py-2 rounded-xl border border-zinc-200 dark:border-zinc-800 text-xs font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={loading || !name.trim() || !slug.trim()}
                      className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-zinc-900 dark:bg-zinc-100 hover:bg-zinc-800 dark:hover:bg-white text-white dark:text-zinc-900 text-xs font-medium transition-colors shadow-sm disabled:cursor-not-allowed disabled:opacity-55"
                    >
                      {loading ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <>
                          <span>Create Page & Open Editor</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
