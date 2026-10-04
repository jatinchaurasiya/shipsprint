/**
 * CTA analytics: which store a click belongs to.
 *
 * The navbar "Get the app" button used to report `button_type: "nav_download"`,
 * a label that names no store. The dashboard only ever matched the button type
 * against `app_store` / `play_store`, so every header download click was filed
 * under "Other Buttons" and the iOS/Android split silently under-counted both
 * stores.
 *
 * Two things fix that, and both are needed:
 *
 *   1. The renderer emits a store-specific type (`app_store_nav` /
 *      `play_store_nav`), which only helps clicks from now on.
 *   2. The store of an already-recorded click is resolved when it is read.
 *      `analytics_events` is append-only, and each legacy `nav_download` row
 *      recorded the destination it opened in `meta.target_url`, so the store is
 *      recoverable without rewriting history. `site_analytics_cta` does that in
 *      SQL and exposes the result as a `store` column.
 *
 * This module consumes that column. The button-type fallback exists only so a
 * database where migration 007 has not been applied yet keeps working exactly
 * as before instead of rendering nothing.
 */

export type CtaStore = "apple" | "google" | "other";

/** Mirrors the SQL classification so both sides agree on the same labels. */
const APPLE_BUTTON = /(app_store|ios|apple)/;
const GOOGLE_BUTTON = /(play_store|android|google)/;

/**
 * The two storefront hosts each store publishes to.
 *
 * Matched against the parsed hostname rather than as a substring of the URL:
 * "https://apps.apple.com.evil.example/app" contains the Apple host but is not
 * Apple, and counting it as an iOS download would let any lookalike link
 * inflate the store totals.
 */
const APPLE_HOSTS = new Set(["apps.apple.com", "itunes.apple.com"]);
const GOOGLE_HOSTS = new Set(["play.google.com", "market.android.com"]);

/**
 * The store a destination URL belongs to, or 'other' when it names neither.
 *
 * Used when tagging a click, so the recorded `button_type` describes the link
 * the visitor actually followed rather than which form field happened to be
 * filled in. Someone who pastes a Play Store link into the App Store field
 * would otherwise be reported as an iOS download.
 */
export function storeFromUrl(url: string | null | undefined): CtaStore {
  const value = url?.trim();
  if (!value) return "other";

  let host: string;
  try {
    host = new URL(value).hostname.toLowerCase();
  } catch {
    return "other";
  }

  if (APPLE_HOSTS.has(host)) return "apple";
  if (GOOGLE_HOSTS.has(host)) return "google";
  return "other";
}

/**
 * Resolves the store for one `site_analytics_cta` row.
 *
 * The view's `store` value is authoritative. Anything else — a missing column
 * from an unapplied migration, or an unexpected label — falls back to matching
 * the button type, which is the pre-migration behaviour.
 */
export function resolveCtaStore(row: {
  store?: string | null;
  button_type?: string | null;
}): CtaStore {
  const explicit = row.store?.trim().toLowerCase();
  if (explicit === "apple" || explicit === "google" || explicit === "other") {
    return explicit;
  }

  const button = row.button_type?.trim().toLowerCase() ?? "";
  if (APPLE_BUTTON.test(button)) return "apple";
  if (GOOGLE_BUTTON.test(button)) return "google";
  return "other";
}

/**
 * Computes non-colliding x-axis tick indices for timeline bar charts.
 *
 * Squeezing 30 or 90 dates under narrow bar columns causes text overlap.
 * This adaptive stride guarantees:
 *   - 7D shows all 7 days (with responsive mobile labels)
 *   - 30D shows ~6 uniformly spaced ticks (every 5-6 days) starting at 0 and ending on the exact last day
 *   - 90D shows ~7 uniformly spaced ticks (every 14-15 days) starting at 0 and ending on the exact last day
 *   - No two ticks ever collide or get truncated at the end boundary
 */
export function getChartTickIndices(
  totalPoints: number,
  period: "7d" | "30d" | "90d"
): Set<number> {
  if (totalPoints <= 0) return new Set();
  if (totalPoints === 1) return new Set([0]);

  if (period === "7d") {
    return new Set(Array.from({ length: totalPoints }, (_, i) => i));
  }

  const targetTicks = period === "30d" ? 6 : 7;
  const tickCount = Math.min(totalPoints, targetTicks);
  const step = (totalPoints - 1) / (tickCount - 1);

  const indices = new Set<number>();
  for (let i = 0; i < tickCount; i++) {
    indices.add(Math.round(i * step));
  }
  return indices;
}