import Link from "next/link";

/**
 * "Made with ShipSprint" badge.
 *
 * H3: the Free plan shows this badge on published pages; paid plans
 * (Basic/Pro) have `has_branding = false` and the badge is hidden. This is
 * the real, visible difference the pricing table's "Remove ShipSprint
 * branding" row sells.
 *
 * Rendered as a small fixed badge in the bottom-right corner so it never
 * obscures the page content. On the editor's live preview it is shown too
 * (the preview mirrors the published page), but never on the ShipSprint
 * marketing site itself.
 */
export function MadeWithShipSprintBadge({
  isPreview = false,
}: {
  isPreview?: boolean;
}) {
  const href = isPreview ? "#" : "/";
  return (
    <div
      className="fixed bottom-4 right-4 z-[200] pointer-events-auto"
      data-testid="made-with-shipsprint-badge"
    >
      <Link
        href={href}
        target={isPreview ? undefined : "_blank"}
        rel={isPreview ? undefined : "noopener noreferrer"}
        aria-label="Made with ShipSprint"
        className="group inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-zinc-900/90 px-3 py-1.5 text-[10px] font-semibold tracking-wide text-white shadow-lg backdrop-blur-sm transition-colors hover:bg-zinc-800 dark:border-zinc-700 dark:bg-zinc-100/95 dark:text-zinc-900 dark:hover:bg-white"
      >
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
          className="shrink-0"
        >
          <path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z" />
          <path d="m12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z" />
          <path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0" />
          <path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5" />
        </svg>
        <span>Made with ShipSprint</span>
      </Link>
    </div>
  );
}