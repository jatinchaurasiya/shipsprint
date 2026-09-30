import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { logger } from "@/lib/logger";
import { createSiteSchema, firstIssue } from "@/lib/validation";
import type { SiteContent } from "@/types/database";

export async function POST(request: NextRequest) {
  const admin = createAdminClient();

  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json().catch(() => null);
    if (!body) {
      return NextResponse.json(
        { error: "Request body must be valid JSON." },
        { status: 400 }
      );
    }

    // Single source of truth for slug validation. A second, divergent copy
    // lived in create-site-dialog.tsx and the two drifted.
    const parsed = createSiteSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: firstIssue(parsed.error) }, { status: 400 });
    }

    const { name, slug: cleanSlug } = parsed.data;

    // Fetch user profile and plan
    const { data: profile } = await supabase
      .from("profiles")
      .select("*, plans(*)")
      .eq("id", user.id)
      .single();

    const siteLimit = profile?.plans?.site_limit ?? 1;

    // Check existing sites count for user
    const { count: existingCount, error: countError } = await supabase
      .from("sites")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id);

    if (countError) {
      return NextResponse.json(
        { error: "Failed to verify site quota." },
        { status: 500 }
      );
    }

    if ((existingCount ?? 0) >= siteLimit) {
      return NextResponse.json(
        {
          error: `You have reached your limit of ${siteLimit} site${
            siteLimit > 1 ? "s" : ""
          } on your current plan. Please upgrade to create more sites.`,
          code: "SITE_LIMIT_REACHED",
        },
        { status: 403 }
      );
    }

    // Check if slug is already taken globally
    const { data: slugExisting } = await supabase
      .from("sites")
      .select("id")
      .eq("slug", cleanSlug)
      .maybeSingle();

    if (slugExisting) {
      return NextResponse.json(
        { error: "This subdomain slug is already taken. Please choose another one." },
        { status: 409 }
      );
    }

    // Initial default content matching PRD specification
    const defaultContent: SiteContent = {
      brand: {
        name: name,
        logo_url: "",
      },
      hero: {
        app_name: name,
        badge_text: "Now Available on iOS & Android",
        header: `The modern companion for ${name}`,
        short_description: `Designed with craft and precision to help you achieve more every day. Simple, fast, and delightful.`,
      },
      features: [
        {
          id: "feat-1",
          icon: "Zap",
          title: "Lightning Fast Performance",
          description: "Engineered for speed and responsiveness with zero friction.",
        },
        {
          id: "feat-2",
          icon: "Shield",
          title: "Privacy First by Design",
          description: "Your data stays on your device. Never tracked, never sold.",
        },
        {
          id: "feat-3",
          icon: "Sparkles",
          title: "Clean, Apple-Grade Aesthetics",
          description: "Immersive dark mode, fluid micro-animations, and pure typography.",
        },
      ],
      store_links: {
        // Intentionally empty. These previously defaulted to
        // https://apps.apple.com and https://play.google.com, so a site
        // published without editing rendered a working "Download on the App
        // Store" button pointing at Apple's homepage.
        app_store_url: "",
        play_store_url: "",
      },
      screenshots: [],
      footer: {
        brand_name: name,
        legal_links: [],
        contact_email: user.email || "",
      },
    };

    const { data: newSite, error: insertError } = await supabase
      .from("sites")
      .insert({
        user_id: user.id,
        slug: cleanSlug,
        content: defaultContent,
        status: "draft",
        theme: "v1",
      })
      .select()
      .single();

    if (insertError) {
      // 23505 = unique violation. The pre-insert availability check is a
      // TOCTOU race, so a concurrent request can win; the client should get a
      // 409 with a usable message rather than a 500.
      if (insertError.code === "23505") {
        return NextResponse.json(
          { error: "That URL is already taken. Try a different one." },
          { status: 409 }
        );
      }
      // check_violation comes from the reserved-slug and site-limit triggers.
      if (insertError.code === "23514") {
        return NextResponse.json(
          { error: insertError.message },
          { status: 400 }
        );
      }

      logger.exception("site creation failed", insertError, { user_id: user.id });
      return NextResponse.json(
        { error: "Failed to create site." },
        { status: 500 }
      );
    }

    await admin.from("audit_log").insert({
      actor_id: user.id,
      action: "site.create",
      entity_type: "site",
      entity_id: newSite?.id ?? null,
      details: { slug: cleanSlug },
    });

    return NextResponse.json({ site: newSite });
  } catch (error) {
    logger.exception("site creation failed", error);
    return NextResponse.json(
      { error: "Failed to create site." },
      { status: 500 }
    );
  }
}
