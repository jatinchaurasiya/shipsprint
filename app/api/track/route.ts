import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { clientKey, looksLikeBot } from "@/lib/request";
import { readBodyText } from "@/lib/request-body";
import { buildAnalyticsRow, MAX_BEACON_BYTES, parseBeacon } from "@/lib/track";
import { rateLimit } from "@/lib/rate-limit";
import { logger } from "@/lib/logger";

/**
 * Public analytics beacon.
 *
 * Unauthenticated by design — it is called by third-party visitors' browsers —
 * which makes it the app's most abusable surface. It previously had no rate
 * limit, no cap on body size, and verified only that the site existed, so
 * anyone could inflate any site's numbers with a loop of `curl` calls.
 *
 * Responses are 204 for every accepted or rejected request. Returning 404 for
 * a missing site turned this endpoint into a site-id oracle.
 *
 * This handler owns no parsing logic. Everything it trusts lives in
 * `lib/track.ts` and `lib/request-body.ts`, both of which are pure and
 * unit-tested, so the failure modes are enumerated there rather than here.
 */

const NO_CONTENT = () => new NextResponse(null, { status: 204 });

export async function POST(request: NextRequest) {
  // Cheapest possible reject first: a crawler should not cost a Redis
  // round-trip or a buffered request body.
  if (looksLikeBot(request)) {
    return NO_CONTENT();
  }

  const limit = await rateLimit({
    identifier: clientKey(request),
    bucket: "track",
    limit: 60,
    windowSeconds: 60,
  });

  if (!limit.success) {
    logger.warn("analytics rate limit exceeded", { bucket: "track" });
    return NO_CONTENT();
  }

  // Bounded read. `Content-Type` is deliberately not consulted: `sendBeacon`
  // with a string body, older WebKit, and privacy extensions all send
  // `text/plain` or nothing, and treating that as an error loses real page
  // views. `parseBeacon` reads JSON *or* form encoding and, critically, can
  // never hand back a non-object — the previous `const { site_id } =
  // JSON.parse(raw)` threw an unhandled 500 on a body of literal `null`.
  const raw = await readBodyText(request, { maxBytes: MAX_BEACON_BYTES });
  if (!raw.ok) {
    if (raw.reason === "too_large") {
      logger.warn("analytics beacon body rejected", {
        max_bytes: MAX_BEACON_BYTES,
      });
    }
    return NO_CONTENT();
  }

  const parsed = parseBeacon(raw.text);
  if (!parsed.ok) {
    return NO_CONTENT();
  }

  const { siteId } = parsed.event;

  try {
    const supabase = createAdminClient();

    // Only published sites accept traffic. Without this, a draft site's metrics
    // could be inflated and any competitor's numbers could be poisoned.
    // `siteId` is already a validated UUID, so this cannot raise a Postgres
    // `invalid input syntax for type uuid` error.
    const { data: site } = await supabase
      .from("sites")
      .select("id")
      .eq("id", siteId)
      .eq("status", "published")
      .maybeSingle();

    if (!site) {
      return NO_CONTENT();
    }

    const { error } = await supabase.from("analytics_events").insert(
      buildAnalyticsRow(
        parsed.event,
        request.headers.get("user-agent") ?? "unknown"
      )
    );

    if (error) {
      logger.error("failed to record analytics event", { detail: error.message });
    }
  } catch (error) {
    // Analytics must never break a customer's page.
    logger.exception("analytics beacon failed", error, { site_id: siteId });
  }

  return NO_CONTENT();
}
