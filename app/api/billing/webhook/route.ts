import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getDodoClient, loadProducts } from "@/lib/billing/dodo";
import { serverEnv } from "@/lib/env";
import { logger } from "@/lib/logger";
import { assertCronAuthorized } from "@/lib/request";
import type { PlanId, ProductId, SubscriptionStatus } from "@/types/database";

/**
 * Dodo Payments webhook.
 *
 * Register this endpoint as:
 *     https://shipsprint.site/api/billing/webhook
 *
 * SECURITY
 *   Signature verification is MANDATORY. The previous handler made it
 *   conditional: with the webhook key unset it fell through to
 *   `JSON.parse(rawBody)`, so anyone could POST a crafted event and set their
 *   own `profiles.plan_id` to "pro". There is no development bypass in this
 *   file; the endpoint returns 503 rather than acting on an unverifiable
 *   request.
 *
 * USER RESOLUTION
 *   Deliberately does not rely on metadata propagating from the checkout
 *   session to the subscription payload. A `checkout_intents` row is written
 *   before the customer is redirected to Dodo, and the user is resolved from
 *   it. Metadata is a fallback only.
 *
 * TIER RESOLUTION
 *   The Dodo `product_id` is mapped through the `products` catalogue, so the
 *   plan id lives in one place in the database rather than in environment
 *   variables duplicated across the codebase.
 */

export const runtime = "nodejs";

interface DodoEvent {
  type: string;
  timestamp?: string;
  business_id?: string;
  data: {
    subscription_id?: string;
    product_id?: string;
    next_billing_date?: string;
    previous_billing_date?: string;
    status?: SubscriptionStatus;
    cancel_at_next_billing_date?: boolean;
    cancelled_at?: string | null;
    metadata?: Record<string, string | number | boolean>;
    customer?: {
      customer_id?: string;
      email?: string;
      metadata?: Record<string, string | number | boolean>;
    };
    customer_id?: string;
    subscription?: { subscription_id?: string };
  };
}

function readString(
  source: Record<string, string | number | boolean> | undefined,
  key: string
): string | undefined {
  const value = source?.[key];
  return typeof value === "string" ? value : undefined;
}

const ENTITLING_EVENTS = new Set([
  "subscription.active",
  "subscription.renewed",
  "subscription.updated",
  "subscription.unpaused",
  "payment.succeeded",
]);

const FAILURE_EVENTS = new Set([
  "payment.failed",
  "subscription.failed",
  "subscription.past_due",
  "subscription.on_hold",
  "dunning.started",
]);

type Admin = ReturnType<typeof createAdminClient>;

async function resolveUserId(admin: Admin, event: DodoEvent): Promise<string | null> {
  const subscriptionId = event.data.subscription_id;
  const { metadata, customer } = event.data;

  // 1. Authoritative: the intent recorded when checkout was created.
  if (subscriptionId) {
    const { data: intent } = await admin
      .from("checkout_intents")
      .select("user_id")
      .eq("dodo_subscription_id", subscriptionId)
      .not("dodo_subscription_id", "is", null)
      .limit(1)
      .maybeSingle();
    if (intent?.user_id) return intent.user_id;
  }

  // 2. Metadata on the subscription payload.
  const fromMeta = readString(metadata, "user_id");
  if (fromMeta) return fromMeta;

  // 3. Metadata on the customer payload.
  const fromCustomer = readString(customer?.metadata, "user_id");
  if (fromCustomer) return fromCustomer;

  // 4. Last resort: find the profile that already holds this customer id.
  const customerId = customer?.customer_id;
  if (customerId) {
    const { data: profile } = await admin
      .from("profiles")
      .select("id")
      .eq("dodo_customer_id", customerId)
      .limit(1)
      .maybeSingle();
    if (profile?.id) return profile.id;
  }

  return null;
}

async function resolveCustomerId(
  admin: Admin,
  userId: string,
  event: DodoEvent
): Promise<string | null> {
  if (event.data.customer?.customer_id) return event.data.customer.customer_id;
  if (event.data.customer_id) return event.data.customer_id;

  const { data } = await admin
    .from("profiles")
    .select("dodo_customer_id")
    .eq("id", userId)
    .maybeSingle();

  return data?.dodo_customer_id ?? null;
}

export async function POST(request: NextRequest) {
  // The raw body is required: signature verification hashes the exact bytes.
  const rawBody = await request.text();

  let env: ReturnType<typeof serverEnv>;
  try {
    env = serverEnv();
  } catch (error) {
    // No webhook secret means the endpoint cannot authenticate a sender, so it
    // must refuse to act rather than trust the payload.
    logger.exception("billing webhook misconfigured", error);
    return NextResponse.json({ error: "Webhook is not configured." }, { status: 503 });
  }

  const headers: Record<string, string> = {};
  request.headers.forEach((value, key) => {
    headers[key] = value;
  });

  let event: DodoEvent;
  try {
    event = getDodoClient().webhooks.unwrap(rawBody, {
      headers,
      key: env.DODO_PAYMENTS_WEBHOOK_KEY,
    }) as unknown as DodoEvent;
  } catch (error) {
    logger.warn("rejected unsigned or malformed webhook", {
      detail: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json({ error: "Invalid signature." }, { status: 400 });
  }

  const eventType = event.type;
  const admin = createAdminClient();

  // Record every delivery before acting on it. This is the only way to answer
  // "did the upgrade webhook arrive?" after the fact, and Dodo retries on a
  // non-2xx response, so the duplicates are useful signal.
  let eventRowId: number | null = null;
  try {
    const { data: inserted } = await admin
      .from("webhook_events")
      .insert({
        event_type: eventType,
        payload: event as unknown as Record<string, unknown>,
      })
      .select("id")
      .single();
    eventRowId = inserted?.id ?? null;
  } catch (error) {
    logger.warn("could not record webhook event", {
      event_type: eventType,
      detail: error instanceof Error ? error.message : String(error),
    });
  }

  logger.info("dodo webhook received", { event_type: eventType, event_row: eventRowId });

  const subscriptionId =
    event.data.subscription_id ?? event.data.subscription?.subscription_id;

  try {
    if (ENTITLING_EVENTS.has(eventType)) {
      const userId = await resolveUserId(admin, event);
      if (!userId) {
        logger.error("could not resolve user for billing event", {
          event_type: eventType,
          subscription_id: subscriptionId ?? null,
        });
        return NextResponse.json({ received: true, resolved: false });
      }

      // Map the Dodo product through the catalogue. dodo_product_id is the
      // authoritative key; metadata is a fallback for the pre-migration case.
      const products = await loadProducts(admin as never);
      const byDodoId = products.find(
        (p) => p.dodo_product_id && p.dodo_product_id === event.data.product_id
      );
      const byMeta = products.find(
        (p) => p.id === readString(event.data.metadata, "product_id")
      );

      const product = byDodoId ?? byMeta;
      const planId: PlanId | null =
        product?.plan_id ??
        (readString(event.data.metadata, "plan_id") as PlanId | undefined) ??
        null;

      if (!planId) {
        logger.error("could not map dodo product to a plan", {
          event_type: eventType,
          dodo_product_id: event.data.product_id ?? null,
        });
        return NextResponse.json({ received: true, resolved: false });
      }

      const productId: ProductId | null = product?.id ?? null;
      const periodEnd = event.data.next_billing_date ?? null;
      const status: SubscriptionStatus = event.data.status ?? "active";

      await admin
        .from("profiles")
        .update({
          plan_id: planId,
          dodo_customer_id: await resolveCustomerId(admin, userId, event),
          updated_at: new Date().toISOString(),
        })
        .eq("id", userId);

      if (subscriptionId) {
        await admin.from("subscriptions").upsert(
          {
            user_id: userId,
            dodo_subscription_id: subscriptionId,
            plan_id: planId,
            product_id: productId,
            status,
            current_period_end: periodEnd,
            cancel_at_period_end: Boolean(event.data.cancel_at_next_billing_date),
            updated_at: new Date().toISOString(),
          },
          { onConflict: "dodo_subscription_id" }
        );

        // Close the matching intent so later events resolve without metadata.
        await admin
          .from("checkout_intents")
          .update({ dodo_subscription_id: subscriptionId, status: "completed" })
          .eq("user_id", userId)
          .eq("status", "pending");
      }

      await markEvent(admin, eventRowId, true, `granted ${planId}`);
      return NextResponse.json({ received: true, resolved: true, plan: planId });
    }

    if (FAILURE_EVENTS.has(eventType)) {
      const userId = await resolveUserId(admin, event);
      if (userId && subscriptionId) {
        // Keep the plan. Dunning runs its own grace period and the customer has
        // not lost access yet; only `subscription.expired` ends the period.
        await admin
          .from("subscriptions")
          .update({ status: "past_due", updated_at: new Date().toISOString() })
          .eq("dodo_subscription_id", subscriptionId);
      }
      await markEvent(admin, eventRowId, true, "past_due");
      return NextResponse.json({ received: true, degraded: true });
    }

    if (eventType === "subscription.cancelled") {
      if (subscriptionId) {
        await admin
          .from("subscriptions")
          .update({
            status: "cancelled",
            cancel_at_period_end: true,
            updated_at: new Date().toISOString(),
          })
          .eq("dodo_subscription_id", subscriptionId);
      }
      // The profile plan is intentionally NOT downgraded here. The customer
      // paid for the remainder of the period; the expiry cron downgrades once
      // the period actually ends.
      await markEvent(admin, eventRowId, true, "pending expiry");
      return NextResponse.json({ received: true, pending_expiry: true });
    }

    if (eventType === "subscription.expired") {
      if (subscriptionId) {
        const { data: sub } = await admin
          .from("subscriptions")
          .update({
            status: "expired",
            cancel_at_period_end: false,
            updated_at: new Date().toISOString(),
          })
          .eq("dodo_subscription_id", subscriptionId)
          .select("user_id")
          .maybeSingle();

        if (sub?.user_id) {
          await admin
            .from("profiles")
            .update({ plan_id: "free", updated_at: new Date().toISOString() })
            .eq("id", sub.user_id);

          await admin.from("audit_log").insert({
            actor_id: sub.user_id,
            action: "subscription.expired",
            entity_type: "profile",
            entity_id: sub.user_id,
          });
        }
      }
      await markEvent(admin, eventRowId, true, "downgraded to free");
      return NextResponse.json({ received: true, downgraded: true });
    }

    if (eventType === "subscription.plan_changed") {
      const products = await loadProducts(admin as never);
      const product = products.find(
        (p) => p.dodo_product_id && p.dodo_product_id === event.data.product_id
      );
      const userId = await resolveUserId(admin, event);
      if (product && userId) {
        await admin
          .from("profiles")
          .update({ plan_id: product.plan_id, updated_at: new Date().toISOString() })
          .eq("id", userId);

        if (subscriptionId) {
          await admin
            .from("subscriptions")
            .update({
              plan_id: product.plan_id,
              product_id: product.id,
              updated_at: new Date().toISOString(),
            })
            .eq("dodo_subscription_id", subscriptionId);
        }
      }
      await markEvent(admin, eventRowId, Boolean(product && userId), "plan changed");
      return NextResponse.json({
        received: true,
        plan_changed: Boolean(product && userId),
      });
    }

    await markEvent(admin, eventRowId, true, "ignored");
    return NextResponse.json({ received: true, ignored: true });
  } catch (error) {
    logger.exception("billing webhook processing failed", error, {
      event_type: eventType,
      event_row: eventRowId,
    });
    await markEvent(admin, eventRowId, false, "processing error");
    return NextResponse.json({ error: "Processing failed." }, { status: 500 });
  }
}

async function markEvent(
  admin: Admin,
  id: number | null,
  processed: boolean,
  note: string
): Promise<void> {
  if (id === null) return;
  try {
    await admin
      .from("webhook_events")
      .update({ processed, note })
      .eq("id", id);
  } catch {
    // Telemetry must never fail a payment.
  }
}

/**
 * Reconciles subscriptions that never received a terminal event, which happens
 * when the webhook endpoint is briefly unreachable.
 *
 * Schedule with:
 *   curl -H "Authorization: Bearer $CRON_SECRET" \
 *     https://shipsprint.site/api/billing/webhook
 */
export async function GET(request: NextRequest) {
  if (!assertCronAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();
  const now = new Date().toISOString();

  const { data: lapsed } = await admin
    .from("subscriptions")
    .select("id, user_id")
    .eq("status", "cancelled")
    .eq("cancel_at_period_end", true)
    .lte("current_period_end", now);

  let downgraded = 0;
  for (const sub of lapsed ?? []) {
    if (!sub?.user_id) continue;
    await admin
      .from("profiles")
      .update({ plan_id: "free", updated_at: now })
      .eq("id", sub.user_id);
    await admin
      .from("subscriptions")
      .update({ status: "expired", cancel_at_period_end: false, updated_at: now })
      .eq("id", sub.id);
    downgraded += 1;
  }

  return NextResponse.json({ checked: true, downgraded });
}
