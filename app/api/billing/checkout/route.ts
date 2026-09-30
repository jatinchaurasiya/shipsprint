import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  createCheckout,
  dodoIsLive,
  loadProducts,
  ProductNotConfiguredError,
} from "@/lib/billing/dodo";
import { publicEnv } from "@/lib/env";
import { logger } from "@/lib/logger";
import { rateLimit, rateLimitHeaders } from "@/lib/rate-limit";
import { checkoutSchema, firstIssue } from "@/lib/validation";
import { isUpgrade, planRank } from "@/types/billing";
import type { PlanId } from "@/types/database";

/**
 * Starts a paid checkout.
 *
 * The previous version fell back to writing `plan_id` directly with the
 * service-role client whenever the Dodo client was unavailable — which included
 * the case where the API key was still a copied placeholder. That branch was
 * reachable in production and granted paid plans for free.
 *
 * There is no simulation path here. A missing or invalid Dodo configuration is
 * a 503, and development-only simulation lives in `/api/dev/simulate-upgrade`,
 * which returns 404 in production.
 *
 * The request names a `product_id` (a SKU such as `pro_yearly`), never a plan
 * id. The tier is derived from the catalogue, so a client cannot ask to be
 * charged for a cheap product and upgraded to an expensive tier.
 */

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const limit = await rateLimit({
    identifier: user.id,
    bucket: "checkout",
    limit: 10,
    windowSeconds: 300,
  });
  if (!limit.success) {
    return NextResponse.json(
      { error: "Too many checkout attempts. Please wait a few minutes." },
      { status: 429, headers: rateLimitHeaders(limit) }
    );
  }

  const body = await request.json().catch(() => null);
  if (!body) {
    return NextResponse.json(
      { error: "Request body must be valid JSON." },
      { status: 400 }
    );
  }

  const parsed = checkoutSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: firstIssue(parsed.error) }, { status: 400 });
  }

  const admin = createAdminClient();

  let products;
  try {
    products = await loadProducts(admin as never);
  } catch {
    return NextResponse.json(
      { error: "Billing is temporarily unavailable. Please try again shortly." },
      { status: 503 }
    );
  }

  const product = products.find((p) => p.id === parsed.data.product_id);
  if (!product) {
    return NextResponse.json(
      { error: "That plan is not available." },
      { status: 400 }
    );
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("plan_id")
    .eq("id", user.id)
    .single();

  const currentPlan = (profile?.plan_id ?? "free") as PlanId;

  // Switching billing period on the same tier is a legitimate purchase, so the
  // guard is on tier rank rather than equality.
  if (planRank(product.plan_id) <= planRank(currentPlan)) {
    return NextResponse.json(
      {
        error: isUpgrade(currentPlan, product.plan_id)
          ? "That plan is not an upgrade from your current one."
          : "You are already on this plan or a higher one.",
      },
      { status: 409 }
    );
  }

  let checkout;
  try {
    checkout = await createCheckout({
      userId: user.id,
      userEmail: user.email,
      userName: (user.user_metadata?.name as string | undefined) ?? null,
      product,
      appUrl: publicEnv().NEXT_PUBLIC_APP_URL,
    });
  } catch (error) {
    if (error instanceof ProductNotConfiguredError) {
      logger.error("product has no dodo id", {
        product_id: error.productId,
        live: dodoIsLive(),
      });
      return NextResponse.json(
        { error: "That plan is not available right now. Please contact support." },
        { status: 503 }
      );
    }

    logger.exception("checkout session creation failed", error, {
      product_id: product.id,
      live: dodoIsLive(),
    });
    return NextResponse.json(
      { error: "Billing is temporarily unavailable. Please try again shortly." },
      { status: 503 }
    );
  }

  // The authoritative link from checkout back to user. The webhook resolves the
  // subscription through this rather than depending on metadata propagation.
  await admin.from("checkout_intents").insert({
    user_id: user.id,
    product_id: product.id,
    plan_id: product.plan_id,
    dodo_checkout_session_id: checkout.sessionId,
    status: "pending",
  });

  // Persist the customer id now rather than waiting for a webhook, so the
  // billing portal is reachable as soon as checkout starts.
  await admin
    .from("profiles")
    .update({ dodo_customer_id: checkout.customerId })
    .eq("id", user.id);

  return NextResponse.json({ url: checkout.checkoutUrl });
}
