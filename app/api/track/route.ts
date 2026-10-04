import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { clientKey, looksLikeBot } from "@/lib/request";
import { rateLimit } from "@/lib/rate-limit";
import { logger } from "@/lib/logger";
import type { EventType } from "@/types/database";

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
 */

const VALID_EVENT_TYPES: EventType[] = ["page_view", "button_click"];

/** `meta` is attacker-controlled and later rendered in the dashboard. */
const META_KEY_ALLOWLIST = new Set([
  "referrer",
  "path",
  "screen",
  "button_type",
  "target_host",
  "target_url",
]);

const MAX_META_BYTES = 1024;

interface TrackBody {
  site_id?: unknown;
  event_type?: unknown;
  meta?: unknown;
}

function sanitizeMeta(input: unknown): Record<string, string> {
  if (typeof input !== "object" || input === null || Array.isArray(input)) return {};

  const out: Record<string, string> = {};
  let bytes = 0;

  for (const [key, value] of Object.entries(input as Record<string, unknown>)) {
    if (!META_KEY_ALLOWLIST.has(key)) continue;
    if (typeof value !== "string") continue;
    if (value.length > 512) continue;
    bytes += key.length + value.length;
    if (bytes > MAX_META_BYTES) break;
    out[key] = value;
  }

  return out;
}

function inferDevice(userAgent: string): "mobile" | "tablet" | "desktop" {
  if (/ipad|tablet|playbook|silk|(?!.*mobile)android/i.test(userAgent)) {
    return "tablet";
  }
  if (/mobile|iphone|ipod|windows.*phone|blackberry|opera mini/i.test(userAgent)) {
    return "mobile";
  }
  return "desktop";
}

export async function POST(request: NextRequest) {
  const key = clientKey(request);

  const limit = await rateLimit({
    identifier: key,
    bucket: "track",
    limit: 60,
    windowSeconds: 60,
  });

  if (!limit.success) {
    logger.warn("analytics rate limit exceeded", { bucket: "track" });
    return new NextResponse(null, { status: 204 });
  }

  let body: TrackBody;
  try {
    const raw = await request.text();
    body = (raw ? JSON.parse(raw) : {}) as TrackBody;
  } catch {
    return new NextResponse(null, { status: 204 });
  }

  const { site_id, event_type, meta } = body;

  if (typeof site_id !== "string" || typeof event_type !== "string") {
    return new NextResponse(null, { status: 204 });
  }

  if (!VALID_EVENT_TYPES.includes(event_type as EventType)) {
    return new NextResponse(null, { status: 204 });
  }

  if (looksLikeBot(request)) {
    return new NextResponse(null, { status: 204 });
  }

  try {
    const supabase = createAdminClient();

    // Only published sites accept traffic. Without this, a draft site's metrics
    // could be inflated and any competitor's numbers could be poisoned.
    const { data: site } = await supabase
      .from("sites")
      .select("id")
      .eq("id", site_id)
      .eq("status", "published")
      .maybeSingle();

    if (!site) {
      return new NextResponse(null, { status: 204 });
    }

    const userAgent = request.headers.get("user-agent") ?? "unknown";

    const { error } = await supabase.from("analytics_events").insert({
      site_id,
      event_type: event_type as EventType,
      meta: {
        ...sanitizeMeta(meta),
        device: inferDevice(userAgent),
        recorded_at: new Date().toISOString(),
      },
    });

    if (error) {
      logger.error("failed to record analytics event", { detail: error.message });
    }
  } catch (error) {
    // Analytics must never break a customer's page.
    logger.exception("analytics beacon failed", error, { site_id });
  }

  return new NextResponse(null, { status: 204 });
}
