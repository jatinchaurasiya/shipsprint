import "server-only";

import { createHash, randomUUID } from "node:crypto";
import type { NextRequest } from "next/server";
import { optionalEnv } from "@/lib/env";

/**
 * Client identification for rate limiting.
 *
 * The raw IP is never stored or returned. It is salted and truncated to 128
 * bits, which is enough to make a per-client bucket work while keeping the
 * value non-reversible. The salt rotates daily so hashes cannot be correlated
 * across days or brute-forced against a known IP range.
 */

function dailySalt() {
  const secret = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "dev-salt";
  const day = new Date().toISOString().slice(0, 10);
  return createHash("sha256").update(`${secret}:${day}`).digest();
}

export function getClientIp(request: NextRequest): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    // Left-most entry is the original client.
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }
  return (
    request.headers.get("x-real-ip") ??
    request.headers.get("cf-connecting-ip") ??
    "unknown"
  );
}

/** Opaque, non-reversible, daily-rotating client key. */
export function clientKey(request: NextRequest): string {
  const ip = getClientIp(request);
  const userAgent = request.headers.get("user-agent") ?? "";
  return createHash("sha256")
    .update(dailySalt())
    .update(`${ip}|${userAgent}`)
    .digest("hex")
    .slice(0, 32);
}

/**
 * Cheap bot heuristic. Analytics numbers are worthless if a crawler or a
 * scanner is a meaningful share of traffic.
 */
export function looksLikeBot(request: NextRequest): boolean {
  const ua = request.headers.get("user-agent") ?? "";
  if (!ua) return true;

  if (
    request.headers.get("sec-fetch-mode") === "no-cors" &&
    !request.headers.get("sec-fetch-dest")
  ) {
    // Prefetch / beacon probes with an inconsistent fingerprint.
  }

  return /bot|crawler|spider|crawling|slurp|curl|wget|python-requests|headless|phantomjs|axios|okhttp|libwww|scrapy|monitoring|uptime|pingdom/i.test(
    ua
  );
}

export function requestId(request: NextRequest): string {
  return request.headers.get("x-request-id") ?? randomUUID();
}

/** Guard for cron endpoints so they cannot be invoked by anyone. */
export function assertCronAuthorized(request: NextRequest): boolean {
  const secret = optionalEnv().CRON_SECRET;
  if (!secret) return false;
  const header = request.headers.get("authorization");
  return header === `Bearer ${secret}`;
}
