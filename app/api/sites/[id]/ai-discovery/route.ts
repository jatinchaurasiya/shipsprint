/* Hallmark · pre-emit critique: P5 H5 E5 S5 R5 V5 */
import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";
import { canUseAiDiscovery } from "@/lib/plans";
import {
  firstIssue,
  updateAiDiscoverySchema,
} from "@/lib/validation";
import {
  generateDeterministicAiSummary,
  generateSchemaOrgJsonLd,
  calculateDiscoverabilityHealth,
} from "@/lib/ai-discovery";
import type { Site, Plan } from "@/types/database";

export const runtime = "nodejs";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: site, error: siteError } = await supabase
      .from("sites")
      .select("*")
      .eq("id", id)
      .eq("user_id", user.id)
      .single();

    if (siteError || !site) {
      return NextResponse.json(
        { error: "Landing page not found or access denied." },
        { status: 404 }
      );
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("*, plans(*)")
      .eq("id", user.id)
      .single();

    const plan: Plan | null = (Array.isArray(profile?.plans)
      ? profile?.plans[0]
      : profile?.plans) || null;

    const isPro = canUseAiDiscovery(plan);

    const typedSite = site as Site;
    const rootDomain = process.env.NEXT_PUBLIC_ROOT_DOMAIN || "shipsprint.site";
    const canonicalUrl = typedSite.custom_domain
      ? `https://${typedSite.custom_domain}`
      : `https://${typedSite.slug}.${rootDomain}`;

    const defaultSummary = generateDeterministicAiSummary(typedSite.content, {
      customCategory: typedSite.ai_category,
      customAudience: typedSite.ai_target_audience,
    });

    const health = calculateDiscoverabilityHealth(typedSite);
    const jsonLdPreview = generateSchemaOrgJsonLd(typedSite, canonicalUrl);

    return NextResponse.json({
      isPro,
      settings: {
        ai_discovery_enabled: Boolean(typedSite.ai_discovery_enabled),
        ai_search_crawling_enabled: typedSite.ai_search_crawling_enabled ?? true,
        ai_training_crawling_enabled: typedSite.ai_training_crawling_enabled ?? false,
        llms_txt_enabled: Boolean(typedSite.llms_txt_enabled),
        ai_category: typedSite.ai_category || null,
        ai_target_audience: typedSite.ai_target_audience || null,
        ai_summary: typedSite.ai_summary || defaultSummary,
      },
      health: {
        score: typedSite.ai_score ?? health.score,
        ratingLabel: health.ratingLabel,
        checks: health.checks,
        last_scan: typedSite.ai_last_scan || null,
      },
      preview: {
        title: typedSite.content?.hero?.app_name || typedSite.content?.brand?.name || typedSite.slug,
        description: typedSite.content?.hero?.short_description || typedSite.content?.hero?.header,
        canonicalUrl,
        schemaType: jsonLdPreview["@type"],
        summary: typedSite.ai_summary || defaultSummary,
      },
    });
  } catch (error) {
    logger.exception("get ai discovery settings failed", error);
    return NextResponse.json(
      { error: "Failed to retrieve discoverability configuration." },
      { status: 500 }
    );
  }
}

export async function PUT(
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

    const body = await request.json().catch(() => null);
    if (!body) {
      return NextResponse.json(
        { error: "Request body must be valid JSON." },
        { status: 400 }
      );
    }

    const parsed = updateAiDiscoverySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: firstIssue(parsed.error) }, { status: 400 });
    }

    const typedSite = site as Site;
    const mergedSite: Site = {
      ...typedSite,
      ...parsed.data,
    };

    const health = calculateDiscoverabilityHealth(mergedSite);

    const updatePayload = {
      ...parsed.data,
      ai_score: health.score,
      ai_check_results: health.checks,
      updated_at: new Date().toISOString(),
    };

    const { data: updatedSite, error: updateError } = await supabase
      .from("sites")
      .update(updatePayload)
      .eq("id", id)
      .select()
      .single();

    if (updateError || !updatedSite) {
      return NextResponse.json(
        { error: updateError?.message || "Failed to update discoverability settings." },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      site: updatedSite,
      health,
    });
  } catch (error) {
    logger.exception("update ai discovery settings failed", error, { site_id: id });
    return NextResponse.json(
      { error: "Failed to update discoverability configuration." },
      { status: 500 }
    );
  }
}
