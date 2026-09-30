import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createCustomerPortal } from "@/lib/billing/dodo";
import { publicEnv } from "@/lib/env";
import { logger } from "@/lib/logger";
import { rateLimit, rateLimitHeaders } from "@/lib/rate-limit";

/**
 * Creates a Dodo customer-portal session, where the customer can update their
 * payment method, download invoices, or cancel.
 *
 * The previous implementation returned `error.message` verbatim, which could
 * echo upstream provider detail to the browser.
 */
export async function POST(_request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const limit = await rateLimit({
    identifier: user.id,
    bucket: "portal",
    limit: 20,
    windowSeconds: 300,
  });
  if (!limit.success) {
    return NextResponse.json(
      { error: "Too many requests. Please wait a few minutes." },
      { status: 429, headers: rateLimitHeaders(limit) }
    );
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("dodo_customer_id")
    .eq("id", user.id)
    .single();

  if (!profile?.dodo_customer_id) {
    return NextResponse.json(
      {
        error:
          "No billing account found. Upgrade to a paid plan to manage your subscription.",
      },
      { status: 404 }
    );
  }

  try {
    const url = await createCustomerPortal(
      profile.dodo_customer_id,
      publicEnv().NEXT_PUBLIC_APP_URL
    );
    return NextResponse.json({ url });
  } catch (error) {
    logger.exception("customer portal session failed", error, {
      user_id: user.id,
    });
    return NextResponse.json(
      { error: "Could not open the billing portal. Please try again shortly." },
      { status: 503 }
    );
  }
}
