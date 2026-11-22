import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { clientKey, looksLikeBot } from "@/lib/request";
import { readBodyText, parseBodyObject } from "@/lib/request-body";
import { subscribeSchema, firstIssue } from "@/lib/validation";
import { rateLimit, rateLimitHeaders } from "@/lib/rate-limit";
import { buildAnalyticsRow } from "@/lib/track";
import { logger } from "@/lib/logger";

/**
 * Public email capture & waitlist subscription endpoint.
 *
 * Unauthenticated by design (called by visitors on published landing pages).
 * Features:
 *   - Bot detection & rejection
 *   - Redis rate limiting (10 req/min/IP)
 *   - Strict body size limit (2 KB) and Zod email validation
 *   - Case-insensitive deduplication via idx_site_subscribers_unique
 *   - Automatically emits `button_type: "email_capture"` telemetry
 */
export async function POST(request: NextRequest) {
  // 1. Silent bot drop
  if (looksLikeBot(request)) {
    return NextResponse.json({ ok: true, message: "Thank you!" });
  }

  // 2. IP rate limiting
  const limit = await rateLimit({
    identifier: clientKey(request),
    bucket: "subscribe",
    limit: 10,
    windowSeconds: 60,
  });

  if (!limit.success) {
    logger.warn("subscription rate limit exceeded", { bucket: "subscribe" });
    return NextResponse.json(
      { error: "Too many subscription attempts. Please try again shortly." },
      { status: 429, headers: rateLimitHeaders(limit) }
    );
  }

  // 3. Bounded payload read
  const raw = await readBodyText(request, { maxBytes: 2048 });
  if (!raw.ok) {
    return NextResponse.json(
      { error: "Invalid request payload" },
      { status: 400 }
    );
  }

  const body = parseBodyObject(raw.text);
  if (!body) {
    return NextResponse.json(
      { error: "Malformed request payload" },
      { status: 400 }
    );
  }

  // 4. Schema validation
  const parsed = subscribeSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: firstIssue(parsed.error) },
      { status: 400 }
    );
  }

  const { site_id, email } = parsed.data;

  try {
    const supabase = createAdminClient();

    // 5. Look up published site & tier capabilities
    const { data: site } = await supabase
      .from("sites")
      .select("id, status, content, user_id, profiles(plans(*))")
      .eq("id", site_id)
      .maybeSingle();

    if (!site || site.status !== "published") {
      return NextResponse.json(
        { error: "Site not found or not published" },
        { status: 404 }
      );
    }

    // Email capture is enabled on every plan (H3). The Free tier is capped at
    // 100 subscribers per site; the cap is enforced by the database trigger
    // (`enforce_free_email_capture_cap`) so it also covers direct SQL inserts.
    // A 23514 from that trigger means the owner hit the Free cap — return a
    // friendly, honest message instead of a raw constraint violation.
    const { error: insertError } = await supabase
      .from("site_subscribers")
      .insert({
        site_id,
        email,
      });

    // Code 23505 is PostgreSQL unique_violation: if already subscribed, succeed idempotently
    if (insertError && insertError.code === "23505") {
      // already subscribed — idempotent success, falls through to analytics
    } else if (
      insertError &&
      insertError.code === "23514" &&
      /free plan email capture limit reached/i.test(insertError.message)
    ) {
      logger.warn("free plan email capture limit reached", { site_id });
      return NextResponse.json(
        {
          error:
            "This site has reached its email capture limit. Please try again later.",
        },
        { status: 403 }
      );
    } else if (insertError) {
      logger.error("failed to record subscriber", {
        detail: insertError.message,
        site_id,
      });
      return NextResponse.json(
        { error: "Failed to record subscription" },
        { status: 500 }
      );
    }

    // 7. Record analytics conversion event
    try {
      let refererPath = "/";
      const referer = request.headers.get("referer");
      if (referer) {
        try {
          refererPath = new URL(referer).pathname;
        } catch {
          refererPath = "/";
        }
      }

      await supabase.from("analytics_events").insert(
        buildAnalyticsRow(
          {
            siteId: site_id,
            eventType: "button_click",
            meta: {
              button_type: "email_capture",
              path: refererPath,
            },
          },
          request.headers.get("user-agent") ?? "unknown"
        )
      );
    } catch {
      // Non-fatal telemetry error
    }

    const successMessage =
      site.content?.hero?.email_success_message ||
      "You're on the list. We'll be in touch.";

    return NextResponse.json({ ok: true, message: successMessage });
  } catch (err) {
    logger.exception("subscription route failed", err, { site_id });
    return NextResponse.json(
      { error: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}
