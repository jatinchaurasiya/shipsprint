"use client";

/**
 * Global error boundary. Catches render errors anywhere in the app and shows a
 * recoverable screen instead of the browser's default blank page.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body
        className="min-h-screen flex items-center justify-center bg-[#fafafa] dark:bg-[#09090b] text-zinc-900 dark:text-zinc-100 px-4"
        style={{ fontFamily: "var(--font-sans)" }}
      >
        <div className="max-w-md text-center">
          <h1 className="text-xl font-bold tracking-tight mb-2">
            Something went wrong
          </h1>
          <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-6">
            An unexpected error occurred while loading this page. Trying again
            often resolves it.
          </p>
          {error.digest && (
            <p className="text-xs text-zinc-600 font-mono mb-6">
              Reference: {error.digest}
            </p>
          )}
          <button
            onClick={reset}
            className="px-4 py-2 rounded-xl bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 text-xs font-semibold hover:opacity-90 transition-opacity"
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
