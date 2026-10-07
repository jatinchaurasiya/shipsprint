/* Hallmark · pre-emit critique: P5 H5 E5 S5 R5 V5 */
import { NextResponse, type NextRequest } from "next/server";
import { classifyHost } from "@/proxy";
import { createAdminClient } from "@/lib/supabase/admin";
import { resolvePublicSite } from "@/lib/site-lookup";
import { canUseAiDiscovery } from "@/lib/plans";
import { generateLlmsTxtContent } from "@/lib/ai-discovery";
import { logger } from "@/lib/logger";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const rootDomain = process.env.NEXT_PUBLIC_ROOT_DOMAIN || "shipsprint.site";
  const rawHost = request.headers.get("host") || "";
  const classified = classifyHost(rawHost);

  if (classified.kind === "app" || !classified.value) {
    return new NextResponse("Not Found", { status: 404 });
  }

  try {
    const lookup =
      classified.kind === "custom"
        ? `custom:${classified.value}`
        : classified.value;

    const admin = createAdminClient();
    const resolved = await resolvePublicSite(lookup, admin);

    if (!resolved || resolved.site.status !== "published") {
      return new NextResponse("Not Found", { status: 404 });
    }

    const { site, plan } = resolved;
    const isPro = canUseAiDiscovery(plan);

    // /llms.txt is Pro-only and must be explicitly enabled
    if (!isPro || !site.ai_discovery_enabled || !site.llms_txt_enabled) {
      return new NextResponse("Not Found", { status: 404 });
    }

    const canonicalOrigin = site.custom_domain
      ? `https://${site.custom_domain}`
      : `https://${site.slug}.${rootDomain}`;

    const textContent = generateLlmsTxtContent(site, canonicalOrigin);

    return new NextResponse(textContent, {
      status: 200,
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "public, max-age=3600, s-maxage=3600",
      },
    });
  } catch (err) {
    logger.exception("failed to generate /llms.txt", err, { host: rawHost });
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
