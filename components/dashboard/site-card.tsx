"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { Site } from "@/types/database";
import {
  Edit3,
  ExternalLink,
  Globe,
  Trash2,
  Copy,
  Check,
  Loader2,
  AlertTriangle,
} from "lucide-react";

interface SiteCardProps {
  site: Site;
  rootDomain: string;
}

export function SiteCard({ site, rootDomain }: SiteCardProps) {
  const router = useRouter();
  const [copied, setCopied] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);

  const isPublished = site.status === "published";
  const appName = site.content?.hero?.app_name || site.slug;

  // Build live URL: direct path /site/[slug] works everywhere, while subdomain works with configured DNS
  const directUrl = `/site/${site.slug}`;
  const displayDomain = site.custom_domain
    ? site.custom_domain
    : `${site.slug}.${rootDomain}`;

  const handleCopy = () => {
    const fullUrl = site.custom_domain
      ? `https://${site.custom_domain}`
      : `${window.location.origin}/site/${site.slug}`;

    navigator.clipboard.writeText(fullUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/sites/${site.id}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const data = await res.json();
        alert(data.error || "Failed to delete site.");
        setIsDeleting(false);
        setShowConfirmDelete(false);
        return;
      }

      router.refresh();
    } catch (err: any) {
      alert(err?.message || "Failed to delete site.");
      setIsDeleting(false);
      setShowConfirmDelete(false);
    }
  };

  return (
    <>
      <div className="group relative flex flex-col justify-between p-6 rounded-2xl bg-white dark:bg-zinc-950 border border-zinc-200/80 dark:border-zinc-800/80 shadow-[0_4px_20px_rgb(0,0,0,0.02)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.06)] dark:hover:shadow-[0_8px_30px_rgb(0,0,0,0.2)] transition-all hover:border-zinc-300 dark:hover:border-zinc-700">
        {/* Header */}
        <div>
          <div className="flex items-start justify-between gap-3 mb-4">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-tr from-zinc-100 to-zinc-200 dark:from-zinc-900 dark:to-zinc-800 border border-zinc-200 dark:border-zinc-700/60 flex items-center justify-center font-bold text-base text-zinc-800 dark:text-zinc-200 uppercase shadow-inner overflow-hidden">
              {site.content?.brand?.logo_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={site.content.brand.logo_url}
                  alt={appName}
                  className="w-full h-full object-cover rounded-xl"
                />
              ) : (
                appName.slice(0, 2)
              )}
            </div>

            {/* Status Badge & Actions */}
            <div className="flex items-center gap-2">
              <span
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium ${
                  isPublished
                    ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400 border border-emerald-200/60 dark:border-emerald-800/40"
                    : "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-700"
                }`}
              >
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    isPublished ? "bg-emerald-500 animate-pulse" : "bg-zinc-400"
                  }`}
                />
                {isPublished ? "Published" : "Draft"}
              </span>

              {/* Delete Trigger */}
              <button
                type="button"
                onClick={() => setShowConfirmDelete(true)}
                className="p-1 text-zinc-400 hover:text-red-600 transition-colors rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800"
                title="Delete landing page"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-50 tracking-tight">
            {appName}
          </h3>

          <div className="flex items-center gap-1.5 text-xs text-zinc-500 dark:text-zinc-400 mt-1 font-mono truncate">
            <Globe className="w-3 h-3 shrink-0 text-zinc-400" />
            <span className="truncate">{displayDomain}</span>
          </div>

          {site.custom_domain && (
            <div className="flex items-center gap-1.5 text-xs text-purple-600 dark:text-purple-400 mt-1 font-mono truncate">
              <span className="w-1.5 h-1.5 rounded-full bg-purple-500 shrink-0" />
              <span className="truncate">{site.custom_domain}</span>
            </div>
          )}
        </div>

        {/* Card Actions */}
        <div className="pt-6 mt-6 border-t border-zinc-100 dark:border-zinc-900 flex items-center justify-between gap-2">
          <Link
            href={`/dashboard/editor/${site.id}`}
            className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-zinc-900 dark:bg-zinc-100 hover:bg-zinc-800 dark:hover:bg-white text-white dark:text-zinc-900 text-xs font-medium transition-colors shadow-sm"
          >
            <Edit3 className="w-3.5 h-3.5" />
            <span>Edit Page</span>
          </Link>

          {/* Copy URL button */}
          <button
            type="button"
            onClick={handleCopy}
            title={copied ? "Copied!" : "Copy page URL"}
            className="p-2 rounded-xl border border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-colors"
          >
            {copied ? (
              <Check className="w-4 h-4 text-emerald-500" />
            ) : (
              <Copy className="w-4 h-4" />
            )}
          </button>

          {/* Live Link */}
          <a
            href={directUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="p-2 rounded-xl border border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-colors"
            title="Open landing page"
          >
            <ExternalLink className="w-4 h-4" />
          </a>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showConfirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-sm rounded-2xl bg-white dark:bg-zinc-900 p-6 border border-zinc-200 dark:border-zinc-800 shadow-xl space-y-4">
            <div className="w-10 h-10 rounded-xl bg-red-100 dark:bg-red-950/50 text-red-600 dark:text-red-400 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5" />
            </div>

            <div>
              <h4 className="text-sm font-bold text-zinc-900 dark:text-zinc-50">
                Delete &quot;{appName}&quot;?
              </h4>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                This will permanently delete this landing page and all associated analytics data. This action cannot be undone.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowConfirmDelete(false)}
                disabled={isDeleting}
                className="px-3 py-1.5 rounded-lg text-xs font-medium text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={isDeleting}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-500 text-white text-xs font-semibold shadow-sm transition-all"
              >
                {isDeleting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>Delete</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
