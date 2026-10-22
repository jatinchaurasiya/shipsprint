import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";

interface RouteProps {
  params: Promise<{ id: string }>;
}

/**
 * Site subscribers management endpoint for authenticated site owners.
 *
 * GET:
 *   - ?format=csv: Exports RFC-4180 CSV attachment for email marketing tools.
 *   - default: Returns JSON list of subscribers with total count.
 *
 * DELETE:
 *   - ?subscriber_id=<id>: Removes subscriber from the list.
 */
export async function GET(request: NextRequest, { params }: RouteProps) {
  const { id: siteId } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Verify site ownership
  const { data: site } = await supabase
    .from("sites")
    .select("id, slug, user_id")
    .eq("id", siteId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!site) {
    return NextResponse.json({ error: "Site not found" }, { status: 404 });
  }

  const format = request.nextUrl.searchParams.get("format");

  // CSV Export format
  if (format === "csv") {
    const { data: subscribers, error } = await supabase
      .from("site_subscribers")
      .select("email, created_at")
      .eq("site_id", siteId)
      .order("created_at", { ascending: false });

    if (error) {
      logger.error("failed to query subscribers for csv export", {
        detail: error.message,
        site_id: siteId,
      });
      return NextResponse.json(
        { error: "Failed to generate CSV" },
        { status: 500 }
      );
    }

    const header = "Email,Subscribed At (UTC)";
    const rows = (subscribers || []).map((s) => {
      const escapedEmail = `"${s.email.replace(/"/g, '""')}"`;
      return `${escapedEmail},"${s.created_at}"`;
    });

    const csvContent = [header, ...rows].join("\r\n");

    return new NextResponse(csvContent, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="subscribers-${site.slug}.csv"`,
        "Cache-Control": "no-store, no-cache, must-revalidate",
      },
    });
  }

  // JSON format
  const { data: subscribers, error, count } = await supabase
    .from("site_subscribers")
    .select("*", { count: "exact" })
    .eq("site_id", siteId)
    .order("created_at", { ascending: false });

  if (error) {
    logger.error("failed to query site subscribers", {
      detail: error.message,
      site_id: siteId,
    });
    return NextResponse.json(
      { error: "Failed to fetch subscribers" },
      { status: 500 }
    );
  }

  return NextResponse.json({
    subscribers: subscribers || [],
    count: count ?? (subscribers?.length || 0),
  });
}

export async function DELETE(request: NextRequest, { params }: RouteProps) {
  const { id: siteId } = await params;
  const subscriberId = request.nextUrl.searchParams.get("subscriber_id");

  if (!subscriberId) {
    return NextResponse.json(
      { error: "Missing subscriber_id query parameter" },
      { status: 400 }
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Verify site ownership
  const { data: site } = await supabase
    .from("sites")
    .select("id, user_id")
    .eq("id", siteId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!site) {
    return NextResponse.json({ error: "Site not found" }, { status: 404 });
  }

  const { error } = await supabase
    .from("site_subscribers")
    .delete()
    .eq("id", subscriberId)
    .eq("site_id", siteId);

  if (error) {
    logger.error("failed to delete subscriber", {
      detail: error.message,
      site_id: siteId,
      subscriber_id: subscriberId,
    });
    return NextResponse.json(
      { error: "Failed to delete subscriber" },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true, message: "Subscriber removed" });
}
