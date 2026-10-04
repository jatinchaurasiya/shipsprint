import type { EventType } from "@/types/database";

/**
 * The one client-side entry point for the analytics beacon.
 *
 * The renderer previously hand-rolled two different transports: a
 * `fetch({ keepalive: true })` for the page view and a
 * `navigator.sendBeacon` for CTA clicks, each building its own payload inline.
 * That split is what made the endpoint's `Content-Type` handling a mystery —
 * the two paths sent different headers for the same logical event, and neither
 * was pinned to a single contract.
 *
 * The rule the server relies on: the body is always a UTF-8 JSON string. That
 * is achieved with an explicit `Blob` typed `application/json`, because
 * `sendBeacon(url, string)` labels the body `text/plain;charset=UTF-8` and
 * some WebKit builds omit the header entirely. Pinning it here means the server
 * never has to guess — and it still parses defensively, because third-party
 * embeds, privacy extensions, and in-app webviews will not go through here.
 */

const TRACK_ENDPOINT = "/api/track";

export interface TrackEventParams {
  siteId: string;
  eventType: EventType;
  meta?: Record<string, string>;
}

/**
 * Fire-and-forget. Must never throw and must never reject — analytics that can
 * break a customer's page is worse than analytics that are missing.
 */
export function trackEvent({ siteId, eventType, meta }: TrackEventParams): void {
  if (typeof window === "undefined" || !siteId) return;

  let payload: string;
  try {
    payload = JSON.stringify({
      site_id: siteId,
      event_type: eventType,
      meta: meta ?? {},
    });
  } catch {
    return;
  }

  // `sendBeacon` is not a `fetch`: a rejected quota returns `false` rather than
  // throwing, so the fallback below still runs in the common "too many beacons
  // in flight" case instead of dropping the event.
  try {
    if (
      typeof navigator !== "undefined" &&
      typeof navigator.sendBeacon === "function"
    ) {
      const blob = new Blob([payload], { type: "application/json" });
      if (navigator.sendBeacon(TRACK_ENDPOINT, blob)) return;
    }
  } catch {
    // Fall through to fetch.
  }

  try {
    void fetch(TRACK_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: payload,
      keepalive: true,
    }).catch(() => {});
  } catch {
    // Nothing left to do.
  }
}
