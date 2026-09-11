import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => null);

    if (!body || !body.site_id || !body.event_type) {
      return NextResponse.json(
        { error: "Invalid payload. 'site_id' and 'event_type' are required." },
        { status: 400 }
      );
    }

    const { site_id, event_type, meta } = body;

    // Validate event type
    const validEventTypes = ["page_view", "button_click"];
    if (!validEventTypes.includes(event_type)) {
      return NextResponse.json(
        { error: `Invalid event_type "${event_type}". Must be one of: ${validEventTypes.join(", ")}` },
        { status: 400 }
      );
    }

    // Ingest telemetry into analytics_events via Admin client
    const supabase = createAdminClient();

    // Verify site exists and is active
    const { data: site, error: siteError } = await supabase
      .from("sites")
      .select("id")
      .eq("id", site_id)
      .maybeSingle();

    if (siteError || !site) {
      return NextResponse.json(
        { error: "Site not found." },
        { status: 404 }
      );
    }

    // Extract headers for metadata
    const userAgent = request.headers.get("user-agent") || "unknown";
    const ip = request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "unknown";

    // Clean device inference
    let device = "desktop";
    if (/mobile|iphone|ipod|android.*mobile|windows.*phone/i.test(userAgent)) {
      device = "mobile";
    } else if (/ipad|tablet|android(?!.*mobile)/i.test(userAgent)) {
      device = "tablet";
    }

    const eventMeta = {
      ...(typeof meta === "object" && meta !== null ? meta : {}),
      device,
      recorded_at: new Date().toISOString(),
    };

    const { error: insertError } = await supabase
      .from("analytics_events")
      .insert({
        site_id,
        event_type,
        meta: eventMeta,
      });

    if (insertError) {
      console.error("Failed to insert analytics event:", insertError);
      return NextResponse.json(
        { error: "Failed to persist analytics event." },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Telemetry ingestion exception:", error);
    return NextResponse.json(
      { error: error?.message || "Internal server error" },
      { status: 500 }
    );
  }
}
