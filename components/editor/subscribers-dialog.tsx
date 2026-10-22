/* Hallmark · pre-emit critique: P5 H5 E5 S5 R5 V5 */
"use client";

import { useState, useEffect, useMemo } from "react";
import type { SiteSubscriber } from "@/types/database";
import {
  Users,
  Download,
  Copy,
  Check,
  Trash2,
  X,
  Search,
  Loader2,
  Mail,
  AlertCircle,
} from "lucide-react";

interface SubscribersDialogProps {
  siteId: string;
  siteSlug: string;
  isOpen: boolean;
  onClose: () => void;
  onCountChange?: (count: number) => void;
}

export function SubscribersDialog({
  siteId,
  siteSlug,
  isOpen,
  onClose,
  onCountChange,
}: SubscribersDialogProps) {
  const [subscribers, setSubscribers] = useState<SiteSubscriber[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [copiedAll, setCopiedAll] = useState(false);
  const [copiedEmail, setCopiedEmail] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen || !siteId) return;
    let cancelled = false;

    async function load() {
      try {
        const res = await fetch(`/api/sites/${siteId}/subscribers`);
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error || "Failed to load subscribers.");
        }
        const data = await res.json();
        if (!cancelled) {
          const list = (data.subscribers as SiteSubscriber[]) || [];
          setSubscribers(list);
          onCountChange?.(list.length);
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : "Failed to load subscribers."
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [isOpen, siteId, onCountChange]);

  // Keyboard accessibility: ESC key to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  const filtered = useMemo(() => {
    if (!search.trim()) return subscribers;
    const q = search.trim().toLowerCase();
    return subscribers.filter((s) => s.email.toLowerCase().includes(q));
  }, [subscribers, search]);

  const handleCopyAll = () => {
    if (subscribers.length === 0) return;
    const allEmails = subscribers.map((s) => s.email).join(", ");
    navigator.clipboard.writeText(allEmails);
    setCopiedAll(true);
    setTimeout(() => setCopiedAll(false), 2000);
  };

  const handleCopySingle = (email: string) => {
    navigator.clipboard.writeText(email);
    setCopiedEmail(email);
    setTimeout(() => setCopiedEmail(null), 2000);
  };

  const handleDelete = async (subscriberId: string) => {
    setDeletingId(subscriberId);
    try {
      const res = await fetch(
        `/api/sites/${siteId}/subscribers?subscriber_id=${subscriberId}`,
        { method: "DELETE" }
      );
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to remove subscriber.");
      }
      const updated = subscribers.filter((s) => s.id !== subscriberId);
      setSubscribers(updated);
      onCountChange?.(updated.length);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to remove subscriber.");
    } finally {
      setDeletingId(null);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="subscribers-modal-title"
      className="fixed inset-0 z-[500] flex items-center justify-center p-4 bg-zinc-950/60 backdrop-blur-xs animate-in fade-in duration-150"
    >
      <div
        className="w-full max-w-2xl max-h-[85vh] flex flex-col rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-200 dark:border-zinc-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400">
              <Users className="h-5 w-5" />
            </div>
            <div>
              <h2
                id="subscribers-modal-title"
                className="text-base font-semibold text-zinc-950 dark:text-zinc-50"
              >
                Collected Leads & Waitlist
              </h2>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                {subscribers.length} total subscriber{subscribers.length === 1 ? "" : "s"} for{" "}
                <span className="font-medium text-zinc-900 dark:text-zinc-200">
                  {siteSlug}
                </span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {subscribers.length > 0 && (
              <>
                <button
                  type="button"
                  onClick={handleCopyAll}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-xs font-medium text-zinc-700 shadow-2xs hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700 transition-colors"
                >
                  {copiedAll ? (
                    <>
                      <Check className="h-3.5 w-3.5 text-emerald-600" />
                      <span>Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="h-3.5 w-3.5 text-zinc-500" />
                      <span>Copy All</span>
                    </>
                  )}
                </button>

                <a
                  href={`/api/sites/${siteId}/subscribers?format=csv`}
                  download
                  className="inline-flex items-center gap-1.5 rounded-lg bg-zinc-950 px-3 py-1.5 text-xs font-medium text-white shadow-xs hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-950 dark:hover:bg-white transition-colors"
                >
                  <Download className="h-3.5 w-3.5" />
                  <span>Export CSV</span>
                </a>
              </>
            )}

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Filter bar (if subscribers exist) */}
        {subscribers.length > 0 && (
          <div className="px-6 py-3 border-b border-zinc-100 dark:border-zinc-800/60 bg-zinc-50/50 dark:bg-zinc-900/40">
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-zinc-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search subscribers by email..."
                className="w-full rounded-lg border border-zinc-200 bg-white py-1.5 pl-8 pr-3 text-xs text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-900 focus:outline-hidden dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-100 dark:focus:border-zinc-100"
              />
            </div>
          </div>
        )}

        {/* Content list */}
        <div className="flex-1 overflow-y-auto p-6 min-h-[220px]">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12 text-zinc-400">
              <Loader2 className="h-6 w-6 animate-spin mb-2" />
              <p className="text-xs">Loading subscribers...</p>
            </div>
          ) : error ? (
            <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 p-4 text-xs text-red-700 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          ) : subscribers.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-zinc-100 dark:bg-zinc-800 text-zinc-400 mb-3">
                <Mail className="h-6 w-6" />
              </div>
              <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                No subscribers yet
              </h3>
              <p className="mt-1 text-xs text-zinc-500 max-w-sm">
                When visitors submit the early access or newsletter form on your published landing page, their email addresses will be collected securely right here.
              </p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-8 text-center text-xs text-zinc-500">
              No subscribers match &ldquo;{search}&rdquo;
            </div>
          ) : (
            <div className="divide-y divide-zinc-100 dark:divide-zinc-800 border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden">
              {filtered.map((s) => (
                <div
                  key={s.id}
                  className="flex items-center justify-between px-4 py-3 bg-white dark:bg-zinc-900 hover:bg-zinc-50/70 dark:hover:bg-zinc-800/40 transition-colors"
                >
                  <div className="min-w-0 pr-3">
                    <p className="text-xs font-medium text-zinc-900 dark:text-zinc-100 truncate">
                      {s.email}
                    </p>
                    <p className="text-[11px] text-zinc-400 mt-0.5">
                      Subscribed on{" "}
                      {new Date(s.created_at).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleCopySingle(s.email)}
                      title="Copy email"
                      className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                    >
                      {copiedEmail === s.email ? (
                        <Check className="h-3.5 w-3.5 text-emerald-600" />
                      ) : (
                        <Copy className="h-3.5 w-3.5" />
                      )}
                    </button>

                    <button
                      type="button"
                      disabled={deletingId === s.id}
                      onClick={() => handleDelete(s.id)}
                      title="Remove lead"
                      className="p-1.5 rounded-lg text-zinc-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors disabled:opacity-40"
                    >
                      {deletingId === s.id ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Trash2 className="h-3.5 w-3.5" />
                      )}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-3 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50/60 dark:bg-zinc-900/60 text-xs text-zinc-500">
          <span>
            Showing {filtered.length} of {subscribers.length} lead{subscribers.length === 1 ? "" : "s"}
          </span>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
