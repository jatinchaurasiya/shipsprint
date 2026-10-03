"use client";

import { useEffect } from "react";

/**
 * Segment-level error boundary. Every dashboard page previously blocked on two
 * or three sequential Supabase round-trips with no feedback and no recovery
 * path; a single failed query rendered the browser's default error page.
 */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Replace with a real reporting call in Phase 9.
    console.error("Segment error:", error);
  }, [error]);

  return (
    <div className="min-h-[50vh] flex items-center justify-center px-4">
      <div className="max-w-md text-center">
        <div className="w-14 h-14 rounded-2xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/60 flex items-center justify-center mx-auto mb-5">
          <svg
            className="w-6 h-6 text-red-600 dark:text-red-400"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            aria-hidden="true"
          >
            <circle cx="12" cy="12" r="10" />
            <path d="M12 8v4M12 16h.01" />
          </svg>
        </div>
        <h1 className="text-lg font-bold tracking-tight mb-2">
          This page failed to load
        </h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-6">
          Something went wrong on our end. Your data is safe.
        </p>
        <button
          onClick={reset}
          className="px-4 py-2 rounded-xl bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 text-xs font-semibold hover:opacity-90 transition-opacity"
        >
          Try again
        </button>
      </div>
    </div>
  );
}
