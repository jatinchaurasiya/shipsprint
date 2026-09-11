import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getDodoClient } from "@/lib/billing/dodo";

export async function POST(request: NextRequest) {
  try {
    const rawBody = await request.text();
    const dodo = getDodoClient();

    let event: any;

    if (dodo && process.env.DODO_PAYMENTS_WEBHOOK_KEY) {
      // Verify signature via official Dodo Payments SDK
      const headers: Record<string, string> = {};
      request.headers.forEach((val, key) => {
        headers[key] = val;
      });

      try {
        event = dodo.webhooks.unwrap(rawBody, {
          headers,
          key: process.env.DODO_PAYMENTS_WEBHOOK_KEY,
        });
      } catch (err: any) {
        console.error("Dodo webhook signature verification failed:", err);
        return NextResponse.json({ error: "Invalid webhook signature" }, { status: 400 });
      }
    } else {
      // In development or when webhook secret is pending setup
      try {
        event = JSON.parse(rawBody);
      } catch {
        return NextResponse.json({ error: "Malformed JSON payload" }, { status: 400 });
      }
    }

    const eventType = event.type || event.event_type;
    const data = event.data || {};
    const admin = createAdminClient();

    console.log(`Received Dodo Payments webhook: ${eventType}`);

    switch (eventType) {
      case "subscription.active":
      case "subscription.renewed":
      case "payment.succeeded": {
        const metadata = data.metadata || {};
        const userId = metadata.user_id;
        const planId = metadata.plan_id;
        const customerId = data.customer?.customer_id || data.customer_id;
        const subscriptionId = data.subscription_id || data.id;
        const periodEnd = data.current_period_end || data.expires_at || null;

        if (userId && planId) {
          // Update profile
          await admin
            .from("profiles")
            .update({
              plan_id: planId,
              dodo_customer_id: customerId,
              updated_at: new Date().toISOString(),
            })
            .eq("id", userId);

          // Update or insert subscription
          if (subscriptionId) {
            await admin.from("subscriptions").upsert({
              user_id: userId,
              dodo_subscription_id: subscriptionId,
              plan_id: planId,
              status: "active",
              current_period_end: periodEnd ? new Date(periodEnd).toISOString() : null,
              updated_at: new Date().toISOString(),
            }, { onConflict: "dodo_subscription_id" });
          }
        }
        break;
      }

      case "subscription.cancelled":
      case "subscription.expired": {
        const subscriptionId = data.subscription_id || data.id;

        if (subscriptionId) {
          const { data: sub } = await admin
            .from("subscriptions")
            .select("user_id")
            .eq("dodo_subscription_id", subscriptionId)
            .maybeSingle();

          if (sub?.user_id) {
            // Downgrade to free tier
            await admin
              .from("profiles")
              .update({
                plan_id: "free",
                updated_at: new Date().toISOString(),
              })
              .eq("id", sub.user_id);

            await admin
              .from("subscriptions")
              .update({
                status: eventType === "subscription.cancelled" ? "cancelled" : "expired",
                updated_at: new Date().toISOString(),
              })
              .eq("dodo_subscription_id", subscriptionId);
          }
        }
        break;
      }

      default:
        // Acknowledge unhandled event
        break;
    }

    return NextResponse.json({ received: true });
  } catch (error: any) {
    console.error("Webhook processing error:", error);
    return NextResponse.json(
      { error: error?.message || "Internal server error" },
      { status: 500 }
    );
  }
}
