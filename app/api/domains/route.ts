import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const { site_id, domain } = body;

    if (!site_id || !domain) {
      return NextResponse.json(
        { error: "site_id and domain are required." },
        { status: 400 }
      );
    }

    // Clean domain
    const cleanDomain = domain
      .toLowerCase()
      .trim()
      .replace(/^https?:\/\//, "")
      .replace(/\/.*$/, "")
      .replace(/:.*$/, "");

    // Validate domain format
    const domainRegex = /^(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}$/;
    if (!domainRegex.test(cleanDomain)) {
      return NextResponse.json(
        { error: "Invalid domain format. Example: 'app.example.com' or 'example.com'." },
        { status: 400 }
      );
    }

    // Check user's plan permission
    const { data: profile } = await supabase
      .from("profiles")
      .select("*, plans(*)")
      .eq("id", user.id)
      .single();

    if (!profile?.plans?.has_custom_domain) {
      return NextResponse.json(
        {
          error:
            "Custom domains are exclusive to the ShipSprint Pro plan. Please upgrade to connect custom domains.",
        },
        { status: 403 }
      );
    }

    // Verify site ownership
    const { data: site, error: siteError } = await supabase
      .from("sites")
      .select("id, user_id, custom_domain")
      .eq("id", site_id)
      .eq("user_id", user.id)
      .single();

    if (siteError || !site) {
      return NextResponse.json(
        { error: "Landing page not found or access denied." },
        { status: 404 }
      );
    }

    const admin = createAdminClient();

    // Check if domain is already claimed by another site
    const { data: existingDomain } = await admin
      .from("sites")
      .select("id")
      .eq("custom_domain", cleanDomain)
      .neq("id", site_id)
      .maybeSingle();

    if (existingDomain) {
      return NextResponse.json(
        { error: "This custom domain is already connected to another site." },
        { status: 409 }
      );
    }

    // Update site with custom domain
    const { error: updateError } = await admin
      .from("sites")
      .update({
        custom_domain: cleanDomain,
        updated_at: new Date().toISOString(),
      })
      .eq("id", site_id);

    if (updateError) {
      return NextResponse.json(
        { error: "Failed to update custom domain for this site." },
        { status: 500 }
      );
    }

    // Create or update domain_verifications entry
    await admin.from("domain_verifications").upsert({
      site_id,
      status: "pending",
      ssl_status: "pending_validation",
      checked_at: new Date().toISOString(),
      ownership_verification: {
        type: "CNAME",
        name: cleanDomain.includes(".") ? cleanDomain.split(".")[0] : "@",
        target: "cname.shipsprint.site",
      },
    }, { onConflict: "site_id" });

    return NextResponse.json({
      success: true,
      domain: cleanDomain,
      dns_instructions: {
        type: "CNAME",
        name: "@ or subdomain",
        value: "cname.shipsprint.site",
      },
    });
  } catch (error: any) {
    console.error("Domain connection error:", error);
    return NextResponse.json(
      { error: error?.message || "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const { site_id } = body;

    if (!site_id) {
      return NextResponse.json({ error: "site_id is required" }, { status: 400 });
    }

    const admin = createAdminClient();

    // Verify site ownership
    const { data: site } = await admin
      .from("sites")
      .select("id")
      .eq("id", site_id)
      .eq("user_id", user.id)
      .single();

    if (!site) {
      return NextResponse.json({ error: "Site not found" }, { status: 404 });
    }

    await admin
      .from("sites")
      .update({
        custom_domain: null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", site_id);

    await admin.from("domain_verifications").delete().eq("site_id", site_id);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Internal server error" },
      { status: 500 }
    );
  }
}
