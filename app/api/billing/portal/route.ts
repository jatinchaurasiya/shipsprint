import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createCustomerPortal, getDodoClient } from "@/lib/billing/dodo";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("dodo_customer_id")
      .eq("id", user.id)
      .single();

    if (!profile?.dodo_customer_id) {
      return NextResponse.json(
        { error: "No active billing customer found. You are currently on the Free tier." },
        { status: 404 }
      );
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const returnUrl = `${appUrl}/dashboard/billing`;

    const dodo = getDodoClient();
    if (!dodo) {
      return NextResponse.json(
        { error: "Dodo Payments client is not configured." },
        { status: 503 }
      );
    }

    const portalUrl = await createCustomerPortal(profile.dodo_customer_id, returnUrl);

    return NextResponse.json({ url: portalUrl });
  } catch (error: any) {
    console.error("Customer portal error:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to generate billing portal session." },
      { status: 500 }
    );
  }
}
