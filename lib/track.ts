import { parseBodyObject, parseJsonObject } from "@/lib/request-body";
import { trackEventSchema } from "@/lib/validation";
import type { AnalyticsMeta, EventType } from "@/types/database";

/**
 * Analytics beacon payload parsing.
 *
 * This is the whole of what `POST /api/track` trusts, and it used to live
 * inline in the route handler — which is why `tests/analytics.test.ts` had
 * drifted into testing a hand-copied duplicate of it that no longer described
 * the code that actually ran. The logic is pure and belongs here, importable
 * by both the route and its tests, so a change to one is a change to both.
 *
 * Isomorphic on purpose: no `server-only`, so tests can import it directly.
 */

/**
 * Hard cap on the request body. A real beacon is 200–400 bytes and the `meta`
 * allowlist below already caps the meaningful payload at 1 KB, so 4 KB is
 * ~10x headroom for a future field while still bounding what an anonymous
 * caller can push into the heap.
 */
export const MAX_BEACON_BYTES = 4 * 1024;

/** `meta` is attacker-controlled and later rendered in the dashboard. */
export const META_KEY_ALLOWLIST: ReadonlySet<string> = new Set([
  "referrer",
  "path",
  "screen",
  "button_type",
  "target_host",
  "target_url",
]);

export const MAX_META_VALUE_LENGTH = 512;
export const MAX_META_BYTES = 1024;

export type DeviceClass = "mobile" | "tablet" | "desktop";

export interface BeaconEvent {
  siteId: string;
  eventType: EventType;
  meta: Record<string, string>;
}

export type ParsedBeacon =
  | { ok: true; event: BeaconEvent }
  | { ok: false };

/**
 * Reduces untrusted `meta` to allow-listed, length-capped strings.
 *
 * A JSON body has no `string` type, so an attacker can send `{"path": {"$ne":
 * null}}`; anything that is not a primitive string is dropped rather than
 * coerced, which keeps the value safe to render and safe to store as `jsonb`.
 */
export function sanitizeMeta(input: unknown): Record<string, string> {
  if (typeof input !== "object" || input === null || Array.isArray(input)) {
    return {};
  }

  const out: Record<string, string> = {};
  let bytes = 0;

  for (const [key, value] of Object.entries(input as Record<string, unknown>)) {
    if (!META_KEY_ALLOWLIST.has(key)) continue;
    if (typeof value !== "string") continue;
    if (value.length > MAX_META_VALUE_LENGTH) continue;
    bytes += key.length + value.length;
    if (bytes > MAX_META_BYTES) break;
    out[key] = value;
  }

  return out;
}

export function inferDevice(userAgent: string): DeviceClass {
  if (/ipad|tablet|playbook|silk|(?!.*mobile)android/i.test(userAgent)) {
    return "tablet";
  }
  if (/mobile|iphone|ipod|windows.*phone|blackberry|opera mini/i.test(userAgent)) {
    return "mobile";
  }
  return "desktop";
}

/**
 * Coerces a form-encoded `meta` back into an object.
 *
 * `navigator.sendBeacon(url, new URLSearchParams(...))` has to flatten `meta`
 * to a string. Rehydrating it here means an embedder that cannot send JSON
 * still records referrer and button type instead of being silently dropped.
 */
function coerceMeta(value: unknown): unknown {
  if (typeof value !== "string") return value;
  const trimmed = value.trim();
  if (trimmed === "") return undefined;
  return parseJsonObject(trimmed) ?? undefined;
}

/**
 * Parses and validates a beacon body. Returns a value, never throws.
 *
 * Every rejection — malformed JSON, a non-object body, a missing field, a
 * `site_id` that is not a UUID, an unknown `event_type` — is the same `{ ok:
 * false }`, so the route can collapse them all into its one 204 response and
 * cannot leak which check failed.
 */
export function parseBeacon(text: string): ParsedBeacon {
  const body = parseBodyObject(text);
  if (!body) return { ok: false };

  const candidate: Record<string, unknown> = { ...body };
  if ("meta" in candidate) {
    const meta = coerceMeta(candidate.meta);
    if (meta === undefined) delete candidate.meta;
    else candidate.meta = meta;
  }

  const result = trackEventSchema.safeParse(candidate);
  if (!result.success) return { ok: false };

  return {
    ok: true,
    event: {
      siteId: result.data.site_id,
      eventType: result.data.event_type,
      meta: sanitizeMeta(result.data.meta),
    },
  };
}

/**
 * Builds the `analytics_events` row.
 *
 * `device` and `recorded_at` are written after the spread, so they overwrite
 * anything a caller sent under those names. `sanitizeMeta` already drops both
 * (neither is on the allowlist), so this is belt-and-braces — but it means a
 * future allowlist edit cannot accidentally let a caller forge the device the
 * dashboard groups by, or backdate a metric.
 */
export function buildAnalyticsRow(
  event: BeaconEvent,
  userAgent: string,
  now: Date = new Date(),
): { site_id: string; event_type: EventType; meta: AnalyticsMeta } {
  return {
    site_id: event.siteId,
    event_type: event.eventType,
    meta: {
      ...event.meta,
      device: inferDevice(userAgent),
      recorded_at: now.toISOString(),
    },
  };
}
