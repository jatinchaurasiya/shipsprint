/* Hallmark · pre-emit critique: P5 H5 E5 S5 R5 V5 */
import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";
import { canUseAiDiscovery } from "@/lib/plans";
import { rateLimit, rateLimitHeaders } from "@/lib/rate-limit";
import { clientKey } from "@/lib/request";
import { calculateDiscoverabilityHealth } from "@/lib/ai-discovery";
import type { Site, Plan } from "@/types/database";

export const runtime = "nodejs";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Rate limiting: 10 diagnostic scans per minute per user/site
    const limit = await rateLimit({
      identifier: `${clientKey(request)}:${user.id}:${id}`,
      bucket: "ai-discovery-scan",
      limit: 10,
      windowSeconds: 60,
    });

    if (!limit.success) {
      return NextResponse.json(
        { error: "Too many scans requested. Please wait a moment before trying again." },
        { status: 429, headers: rateLimitHeaders(limit) }
      );
    }

    // Verify site belongs to user
    const { data: site, error: fetchError } = await supabase
      .from("sites")
      .select("*")
      .eq("id", id)
      .eq("user_id", user.id)
      .single();

    if (fetchError || !site) {
      return NextResponse.json(
        { error: "Landing page not found or access denied." },
        { status: 404 }
      );
    }

    // Server-side plan entitlement verification
    const { data: profile } = await supabase
      .from("profiles")
      .select("*, plans(*)")
      .eq("id", user.id)
      .single();

    const plan: Plan | null = (Array.isArray(profile?.plans)
      ? profile?.plans[0]
      : profile?.plans) || null;

    if (!canUseAiDiscovery(plan)) {
      return NextResponse.json(
        {
          error:
            "AI Search & LLM Discoverability requires the Pro plan. Upgrade to enable.",
        },
        { status: 403 }
      );
    }

    const typedSite = site as Site;
    const isPublished = typedSite.status === "published";

    // Strictly resolve target domain from verified site properties (SSRF defense)
    const rootDomain = process.env.NEXT_PUBLIC_ROOT_DOMAIN || "localhost:3000";
    const appOrigin = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

    const targetBaseUrl = typedSite.custom_domain
      ? `https://${typedSite.custom_domain}`
      : rootDomain.includes("localhost")
      ? `${appOrigin}/site/${typedSite.slug}`
      : `https://${typedSite.slug}.${rootDomain}`;

    let isLiveReachable = false;
    let robotsAccessible = false;
    let sitemapAccessible = false;

    // Real HTTP diagnostic verification
    if (isPublished) {
      const abortController = new AbortController();
      const timeoutId = setTimeout(() => abortController.abort(), 4000);

      try {
        const pageRes = await fetch(targetBaseUrl, {
          method: "GET",
          headers: {
            "User-Agent": "ShipSprint-Discoverability-Auditor/1.0 (+https://shipsprint.site)",
            Accept: "text/html",
          },
          signal: abortController.signal,
          cache: "no-store",
        });

        isLiveReachable = pageRes.ok;
      } catch {
        isLiveReachable = false;
      } finally {
        clearTimeout(timeoutId);
      }

      // Check robots.txt and sitemap.xml
      const robotsUrl = typedSite.custom_domain
        ? `https://${typedSite.custom_domain}/robots.txt`
        : rootDomain.includes("localhost")
        ? `${appOrigin}/robots.txt`
        : `https://${typedSite.slug}.${rootDomain}/robots.txt`;

      const sitemapUrl = typedSite.custom_domain
        ? `https://${typedSite.custom_domain}/sitemap.xml`
        : rootDomain.includes("localhost")
        ? `${appOrigin}/sitemap.xml`
        : `https://${typedSite.slug}.${rootDomain}/sitemap.xml`;

      try {
        const [rRes, sRes] = await Promise.all([
          fetch(robotsUrl, { method: "GET", cache: "no-store" }).catch(() => null),
          fetch(sitemapUrl, { method: "GET", cache: "no-store" }).catch(() => null),
        ]);
        robotsAccessible = Boolean(rRes?.ok);
        sitemapAccessible = Boolean(sRes?.ok);
      } catch {
        robotsAccessible = false;
        sitemapAccessible = false;
      }
    }

    const health = calculateDiscoverabilityHealth(typedSite, {
      isLiveReachable,
      robotsAccessible,
      sitemapAccessible,
    });

    // Save diagnostic results to database
    const nowIso = new Date().toISOString();
    await supabase
      .from("sites")
      .update({
        ai_score: health.score,
        ai_last_scan: nowIso,
        ai_check_results: health.checks,
        updated_at: nowIso,
      })
      .eq("id", id);

    return NextResponse.json({
      success: true,
      scannedAt: nowIso,
      targetUrl: targetBaseUrl,
      health,
    });
  } catch (error) {
    logger.exception("ai discovery scan failed", error, { site_id: id });
    return NextResponse.json(
      { error: "Unable to complete diagnostic check right now." },
      { status: 500 }
    );
  }
}
