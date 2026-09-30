import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";
import {
  MAX_CONTENT_BYTES,
  firstIssue,
  updateSiteSchema,
  type ValidatedSiteContent,
} from "@/lib/validation";
import type { SiteStatus } from "@/types/database";

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

    const { data: site, error } = await supabase
      .from("sites")
      .select("*")
      .eq("id", id)
      .eq("user_id", user.id)
      .single();

    if (error || !site) {
      return NextResponse.json(
        { error: "Landing page not found or access denied." },
        { status: 404 }
      );
    }

    return NextResponse.json({ site });
  } catch (error) {
    return NextResponse.json(
      { error: (error instanceof Error ? error.message : undefined) || "Internal server error" },
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
    const { data: existingSite, error: fetchError } = await supabase
      .from("sites")
      .select("id, user_id")
      .eq("id", id)
      .eq("user_id", user.id)
      .single();

    if (fetchError || !existingSite) {
      return NextResponse.json(
        { error: "Landing page not found or access denied." },
        { status: 404 }
      );
    }

    const body = await request.json().catch(() => null);
    if (!body) {
      return NextResponse.json(
        { error: "Request body must be valid JSON." },
        { status: 400 }
      );
    }

    const parsed = updateSiteSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: firstIssue(parsed.error) }, { status: 400 });
    }

    const { content, status } = parsed.data;
    const updatePayload: {
      updated_at: string;
      content?: ValidatedSiteContent;
      status?: SiteStatus;
      published_at?: string | null;
    } = {
      updated_at: new Date().toISOString(),
    };

    if (content) {
      // Size cap enforced before the write, not after.
      const bytes = Buffer.byteLength(JSON.stringify(content), "utf8");
      if (bytes > MAX_CONTENT_BYTES) {
        return NextResponse.json(
          {
            error: `Page content is too large (${Math.round(bytes / 1024)}KB, limit ${Math.round(MAX_CONTENT_BYTES / 1024)}KB).`,
          },
          { status: 413 }
        );
      }
      updatePayload.content = content;
    }

    if (status) {
      updatePayload.status = status;
      updatePayload.published_at =
        status === "published" ? new Date().toISOString() : null;
    }

    const { data: updatedSite, error: updateError } = await supabase
      .from("sites")
      .update(updatePayload)
      .eq("id", id)
      .select()
      .single();

    if (updateError) {
      return NextResponse.json(
        { error: updateError.message || "Failed to update landing page." },
        { status: 500 }
      );
    }

    return NextResponse.json({ site: updatedSite });
  } catch (error) {
    logger.exception("site update failed", error, { site_id: id });
    return NextResponse.json(
      { error: "Failed to update landing page." },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: NextRequest,
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
    const { data: existingSite, error: fetchError } = await supabase
      .from("sites")
      .select("id, user_id")
      .eq("id", id)
      .eq("user_id", user.id)
      .single();

    if (fetchError || !existingSite) {
      return NextResponse.json(
        { error: "Landing page not found or access denied." },
        { status: 404 }
      );
    }

    const { error: deleteError } = await supabase
      .from("sites")
      .delete()
      .eq("id", id)
      .eq("user_id", user.id);

    if (deleteError) {
      return NextResponse.json(
        { error: deleteError.message || "Failed to delete landing page." },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, id });
  } catch (error) {
    logger.exception("site delete failed", error, { site_id: id });
    return NextResponse.json(
      { error: "Failed to delete landing page." },
      { status: 500 }
    );
  }
}
