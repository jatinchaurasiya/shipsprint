import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(
  request: NextRequest,
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
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
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

    const body = await request.json();
    const { content, status } = body;

    const updatePayload: Record<string, any> = {
      updated_at: new Date().toISOString(),
    };

    if (content) {
      updatePayload.content = content;
    }

    if (status) {
      updatePayload.status = status;
      if (status === "published") {
        updatePayload.published_at = new Date().toISOString();
      }
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
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
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
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Internal server error" },
      { status: 500 }
    );
  }
}
