import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createCheckout, getDodoClient } from "@/lib/billing/dodo";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user || !user.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const { plan_id } = body;

    if (!plan_id || !["basic", "pro"].includes(plan_id)) {
      return NextResponse.json(
        { error: "Invalid plan_id. Must be 'basic' or 'pro'." },
        { status: 400 }
      );
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const returnUrl = `${appUrl}/dashboard/billing?success=true&plan=${plan_id}`;

    const dodo = getDodoClient();

    if (dodo) {
      // Create live Dodo Payments checkout session
      const { checkoutUrl } = await createCheckout({
        userId: user.id,
        userEmail: user.email,
        planId: plan_id as "basic" | "pro",
        returnUrl,
      });

      return NextResponse.json({ url: checkoutUrl });
    } else {
      // Local / Development Simulator Fallback:
      // When DODO_PAYMENTS_API_KEY is not yet populated, simulate upgrade
      const admin = createAdminClient();
      await admin
        .from("profiles")
        .update({
          plan_id,
          updated_at: new Date().toISOString(),
        })
        .eq("id", user.id);

      return NextResponse.json({
        url: returnUrl,
        simulated: true,
        message: "Upgraded plan in development mode.",
      });
    }
  } catch (error: any) {
    console.error("Billing checkout error:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to initiate checkout session." },
      { status: 500 }
    );
  }
}
