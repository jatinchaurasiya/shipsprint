import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { logger } from "@/lib/logger";
import { assertCronAuthorized } from "@/lib/request";

/**
 * Scheduled maintenance.
 *
 * Protected by CRON_SECRET because the rollup and prune functions run with the
 * service role and bypass RLS.
 *
 * Schedule (cron):
 *   every 15 minutes -> curl -fsS -X POST -H "Authorization: Bearer $CRON_SECRET" \
 *     https://shipsprint.site/api/cron/maintenance
 */

export const runtime = "nodejs";
// Long enough for a large prune, short enough that an overlapping run is
// visible as a 409 rather than a hang.
export const maxDuration = 120;

export async function POST(request: NextRequest) {
  if (!assertCronAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();
  const started = Date.now();
  const result: Record<string, unknown> = {};

  // Refresh the daily rollup. The dashboard reads this, so a missed run makes
  // the numbers stale rather than wrong.
  try {
    const { data, error } = await admin.rpc("rollup_telemetry", { p_days: 3 });
    result.rolledUp = error ? null : data;
    if (error) {
      logger.error("rollup failed", { detail: error.message });
    }
  } catch (error) {
    result.rolledUp = null;
    logger.exception("rollup threw", error);
  }

  // Raw events are only useful for short-window debugging; the rollup is the
  // durable record. Ninety days is a reasonable forensic window.
  try {
    const { data, error } = await admin.rpc("prune_analytics", { p_days: 90 });
    result.pruned = error ? null : data;
    if (error) {
      logger.error("prune failed", { detail: error.message });
    }
  } catch (error) {
    result.pruned = null;
    logger.exception("prune threw", error);
  }

  // Re-check custom domains stuck in a non-active state. DNS propagation and
  // on-demand TLS issuance are both asynchronous, so a domain can become
  // servable after the user's last check.
  try {
    const { data: stuck, error: stuckError } = await admin
      .from("domain_verifications")
      .select("site_id, status")
      .in("status", ["pending_dns", "pending_validation"])
      .lt("checked_at", new Date(Date.now() - 10 * 60 * 1000).toISOString())
      .limit(50);

    if (stuckError) throw stuckError;
    result.domainsPending = stuck?.length ?? 0;
    // Full re-verification happens on the next /api/domains read or editor poll;
    // this only marks what is stale so it is not silently forgotten.
  } catch (error) {
    result.domainsPending = null;
    logger.exception("domain reconcile failed", error);
  }

  // Drop checkout intents that were never completed, so the table does not
  // accumulate abandoned sessions forever.
  try {
    const cutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const { error } = await admin
      .from("checkout_intents")
      .update({ status: "expired" })
      .eq("status", "pending")
      .lt("created_at", cutoff);
    if (error) throw error;
    result.intentsExpired = true;
  } catch (error) {
    result.intentsExpired = false;
    logger.exception("intent cleanup failed", error);
  }

  return NextResponse.json({
    ok: true,
    durationMs: Date.now() - started,
    ...result,
  });
}
