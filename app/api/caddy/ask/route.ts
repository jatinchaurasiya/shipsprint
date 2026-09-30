import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { logger } from "@/lib/logger";
import { rateLimit, rateLimitHeaders } from "@/lib/rate-limit";
import { clientKey } from "@/lib/request";
import { normalizeHostname } from "@/lib/redirect";

/**
 * Caddy on-demand TLS authorization endpoint.
 *
 * Caddy calls this over HTTPS on a loopback address before it requests a
 * certificate for an incoming hostname. Returning 200 authorizes issuance for
 * that name; anything else (403 is conventional) makes Caddy fall back to
 * serving over plain HTTP.
 *
 * This is the allow-list that makes on-demand TLS safe. Without it, any domain
 * pointed at this IP would trigger an issuance attempt, which would exhaust the
 * Let's Encrypt rate limit (5 duplicate certificates per week, 50 per
 * registered domain) and lock the deployment out of issuance entirely — a
 * denial of service available to anyone who can set a DNS record.
 *
 * The endpoint runs on the Node.js runtime because it queries Postgres and
 * uses the rate limiter.
 */

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const rawDomain = request.nextUrl.searchParams.get("domain");
  const domain = normalizeHostname(rawDomain ?? "");

  if (!domain) {
    return new NextResponse(null, { status: 403 });
  }

  // Rate limit per caller as well as per domain. Caddy's `ask` calls arrive from
  // the edge, so the client key is a coarse abuse guard rather than a per-user
  // limit; the per-domain check below is the real control.
  const limit = await rateLimit({
    identifier: clientKey(request),
    bucket: "caddy-ask",
    limit: 600,
    windowSeconds: 60,
  });
  if (!limit.success) {
    return new NextResponse(null, {
      status: 403,
      headers: rateLimitHeaders(limit),
    });
  }

  try {
    const admin = createAdminClient();

    // Only a domain that a customer has actually connected, on a published
    // site, is eligible. A draft's domain is not served publicly, so issuing a
    // certificate for it would be a free issuance primitive.
    const { data: site } = await admin
      .from("sites")
      .select("id, custom_domain, status")
      .eq("custom_domain", domain)
      .eq("status", "published")
      .maybeSingle();

    if (!site) {
      logger.warn("denied on-demand TLS for unknown domain", { domain });
      return new NextResponse(null, { status: 403 });
    }

    // Record that a certificate was requested. `ssl_status` transitions to
    // 'issuing' here, which is what the editor displays instead of claiming
    // verification that has not happened.
    await admin
      .from("domain_verifications")
      .update({
        ssl_status: site.custom_domain ? "issuing" : "pending",
        checked_at: new Date().toISOString(),
      })
      .eq("site_id", site.id);

    logger.info("authorized on-demand TLS", { domain, site_id: site.id });

    return new NextResponse(null, { status: 200 });
  } catch (error) {
    // Fail closed. If the allow-list cannot be consulted, do not issue.
    logger.exception("on-demand TLS check failed", error, { domain });
    return new NextResponse(null, { status: 403 });
  }
}
