import "server-only";

import { createClient } from "@supabase/supabase-js";
import { publicEnv } from "@/lib/env";
import { logger } from "@/lib/logger";

/**
 * Public platform telemetry for the marketing homepage.
 *
 * Only **real, measured** values are returned. There are deliberately no
 * default/fallback numbers and no fabricated floors: if the database is
 * unavailable, the homepage shows an honest "be the first" state instead of
 * invented social proof.
 *
 * The previous version hard-coded 120 published sites, a 4.9/5 rating,
 * 120 reviews, 842 weekly installs and an 18.4% CTR, then clamped real values
 * with a fabricated floor so the invented numbers could never be undercut.
 * That is false advertising and it also seeded fake metrics into every new
 * customer site via the flagship template.
 */
export interface PlatformMetrics {
  /** Number of published landing pages (real count). */
  publishedSites: number;
  /** Aggregate store taps recorded across all sites (real sum). */
  totalClicks: number;
}

/** Honest empty state — used when Supabase is unavailable. */
export const EMPTY_PLATFORM_METRICS: PlatformMetrics = {
  publishedSites: 0,
  totalClicks: 0,
};

export async function fetchPlatformMetrics(): Promise<PlatformMetrics> {
  let url: string;
  let anonKey: string;
  try {
    ({ NEXT_PUBLIC_SUPABASE_URL: url, NEXT_PUBLIC_SUPABASE_ANON_KEY: anonKey } =
      publicEnv());
  } catch (error) {
    logger.warn("platform metrics unavailable: env not configured", {
      detail: error instanceof Error ? error.message : undefined,
    });
    return EMPTY_PLATFORM_METRICS;
  }

  const supabase = createClient(url, anonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  try {
    const { data, error } = await supabase.rpc("get_platform_metrics");

    if (error || !data || typeof data !== "object") {
      logger.warn("platform metrics RPC failed", {
        detail: error?.message ?? "no data",
      });
      return EMPTY_PLATFORM_METRICS;
    }

    const row = data as {
      published_sites?: number;
      total_clicks?: number;
    };

    return {
      publishedSites:
        typeof row.published_sites === "number" ? row.published_sites : 0,
      totalClicks: typeof row.total_clicks === "number" ? row.total_clicks : 0,
    };
  } catch (error) {
    logger.warn("platform metrics fetch failed", {
      detail: error instanceof Error ? error.message : undefined,
    });
    return EMPTY_PLATFORM_METRICS;
  }
}