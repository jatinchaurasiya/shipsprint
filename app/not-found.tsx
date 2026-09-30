import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#fafafa] dark:bg-[#09090b] text-zinc-900 dark:text-zinc-100 px-4 text-center">
      <div className="max-w-md">
        <p className="text-xs font-semibold uppercase tracking-widest text-zinc-400 mb-3">
          404
        </p>
        <h1 className="text-2xl font-bold tracking-tight mb-3">
          We couldn&apos;t find that page
        </h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-8">
          The link may be broken, or the landing page may have been renamed or
          taken down by its creator.
        </p>
        <Link
          href="/"
          className="inline-flex items-center px-4 py-2 rounded-xl bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 text-xs font-semibold hover:opacity-90 transition-opacity"
        >
          Go to ShipSprint
        </Link>
      </div>
    </div>
  );
}
