import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { SiteContent } from "@/types/database";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { name, slug } = body;

    if (!name || !slug) {
      return NextResponse.json(
        { error: "App Name and Slug are required." },
        { status: 400 }
      );
    }

    // Clean and validate slug format
    const cleanSlug = slug
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9-]/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "");

    if (cleanSlug.length < 2) {
      return NextResponse.json(
        { error: "Slug must be at least 2 characters long." },
        { status: 400 }
      );
    }

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
        app_store_url: "https://apps.apple.com",
        play_store_url: "https://play.google.com",
      },
      screenshots: [],
      footer: {
        brand_name: name,
        legal_links: [
          { label: "Privacy Policy", url: "#" },
          { label: "Terms of Service", url: "#" },
        ],
        contact_email: user.email || "support@example.com",
      },
    };

    // Insert site
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
      return NextResponse.json(
        { error: insertError.message || "Failed to create site." },
        { status: 500 }
      );
    }

    return NextResponse.json({ site: newSite });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Internal server error" },
      { status: 500 }
    );
  }
}
