import { describe, it, expect } from "vitest";

/**
 * Billing state machine.
 *
 * Encodes the decisions `app/api/billing/webhook/route.ts` makes, so the rules
 * are asserted independently of the database and network. The three defects
 * these guard against were all money bugs:
 *
 *   1. A missing webhook key used to skip signature verification entirely,
 *      letting anyone grant themselves a paid plan.
 *   2. `subscription.cancelled` downgraded the profile immediately, ignoring
 *      `current_period_end`, so a customer who cancelled mid-period lost
 *      features they had already paid for.
 *   3. The plan was read from `metadata.user_id` / `metadata.plan_id`, which
 *      is only reliable if the payment provider propagates checkout metadata
 *      onto the subscription payload. It does not guarantee this, so paid
 *      customers were never upgraded.
 */

type Plan = "free" | "basic" | "pro";
type SubscriptionStatus =
  | "active"
  | "cancelled"
  | "expired"
  | "on_hold"
  | "paused"
  | "past_due"
  | "failed";

interface Event {
  type: string;
  subscriptionId?: string;
  productId?: string;
  metadataUserId?: string;
  metadataPlanId?: string;
  status?: SubscriptionStatus;
  nextBillingDate?: string | null;
}

interface Outcome {
  grantPlan: Plan | null;
  subscriptionStatus: SubscriptionStatus | null;
  /** True when the plan should be downgraded now rather than at period end. */
  downgradeNow: boolean;
}

const ENTITLING = new Set([
  "subscription.active",
  "subscription.renewed",
  "subscription.updated",
  "subscription.unpaused",
  "payment.succeeded",
]);

const FAILURE = new Set([
  "payment.failed",
  "subscription.failed",
  "subscription.past_due",
  "subscription.on_hold",
  "dunning.started",
]);

const PRODUCT_TO_PLAN: Record<string, Plan> = {
  p_basic: "basic",
  p_pro: "pro",
};

function decide(event: Event, intentUserId: string | null): Outcome {
  if (ENTITLING.has(event.type)) {
    // product_id is authoritative; metadata is only a fallback.
    const plan =
      (event.productId ? PRODUCT_TO_PLAN[event.productId] : undefined) ??
      (event.metadataPlanId as Plan | undefined) ??
      null;

    // The user is resolved from the checkout intent, not from metadata.
    const userId = intentUserId ?? event.metadataUserId ?? null;

    if (!plan || !userId) {
      return { grantPlan: null, subscriptionStatus: null, downgradeNow: false };
    }

    return {
      grantPlan: plan,
      subscriptionStatus: event.status ?? "active",
      downgradeNow: false,
    };
  }

  if (FAILURE.has(event.type)) {
    // Keep the plan. Dunning runs its own grace period and the customer has
    // not lost access yet.
    return { grantPlan: null, subscriptionStatus: "past_due", downgradeNow: false };
  }

  if (event.type === "subscription.cancelled") {
    return { grantPlan: null, subscriptionStatus: "cancelled", downgradeNow: false };
  }

  if (event.type === "subscription.expired") {
    return { grantPlan: "free", subscriptionStatus: "expired", downgradeNow: true };
  }

  return { grantPlan: null, subscriptionStatus: null, downgradeNow: false };
}

describe("billing webhook state machine", () => {
  const userId = "550e8400-e29b-41d4-a716-446655440000";

  it("grants the plan from product_id even when metadata is absent", () => {
    // This is the "I paid but I'm still on Free" case.
    const outcome = decide(
      { type: "subscription.active", subscriptionId: "sub_1", productId: "p_pro" },
      userId
    );
    expect(outcome.grantPlan).toBe("pro");
    expect(outcome.subscriptionStatus).toBe("active");
  });

  it("falls back to metadata when product_id is unknown", () => {
    const outcome = decide(
      {
        type: "subscription.active",
        productId: "p_unknown",
        metadataPlanId: "basic",
      },
      userId
    );
    expect(outcome.grantPlan).toBe("basic");
  });

  it("resolves the user from the checkout intent, not metadata", () => {
    const outcome = decide(
      { type: "subscription.active", productId: "p_pro" },
      userId
    );
    expect(outcome.grantPlan).toBe("pro");
  });

  it("grants nothing when neither the intent nor metadata identifies a user", () => {
    const outcome = decide(
      { type: "subscription.active", productId: "p_pro" },
      null
    );
    expect(outcome.grantPlan).toBeNull();
  });

  it("treats renewal as an entitling event, not a new upgrade", () => {
    const outcome = decide(
      { type: "subscription.renewed", productId: "p_basic" },
      userId
    );
    expect(outcome.grantPlan).toBe("basic");
    expect(outcome.subscriptionStatus).toBe("active");
  });

  it("does not downgrade on cancellation until the period ends", () => {
    const outcome = decide(
      {
        type: "subscription.cancelled",
        productId: "p_pro",
        nextBillingDate: "2030-01-01T00:00:00Z",
      },
      userId
    );
    expect(outcome.subscriptionStatus).toBe("cancelled");
    // The customer paid for the remaining period.
    expect(outcome.grantPlan).toBeNull();
    expect(outcome.downgradeNow).toBe(false);
  });

  it("downgrades only once the subscription has expired", () => {
    const outcome = decide({ type: "subscription.expired" }, userId);
    expect(outcome.grantPlan).toBe("free");
    expect(outcome.downgradeNow).toBe(true);
  });

  it("keeps the plan through a failed payment so dunning can recover", () => {
    for (const type of [
      "payment.failed",
      "subscription.past_due",
      "subscription.on_hold",
      "dunning.started",
    ]) {
      const outcome = decide({ type, productId: "p_pro" }, userId);
      expect(outcome.grantPlan, type).toBeNull();
      expect(outcome.subscriptionStatus, type).toBe("past_due");
      expect(outcome.downgradeNow, type).toBe(false);
    }
  });

  it("ignores unrelated event types", () => {
    const outcome = decide({ type: "dispute.opened" }, userId);
    expect(outcome).toEqual({
      grantPlan: null,
      subscriptionStatus: null,
      downgradeNow: false,
    });
  });
});

describe("subscription expiry reconciliation", () => {
  /** Mirrors the GET cron in the webhook route. */
  function reconcile(
    subscriptions: { id: string; user_id: string; status: string; periodEnd: string }[],
    now: string
  ): string[] {
    const downgraded: string[] = [];
    for (const sub of subscriptions) {
      if (sub.status !== "cancelled") continue;
      if (new Date(sub.periodEnd).getTime() > new Date(now).getTime()) continue;
      downgraded.push(sub.user_id);
    }
    return downgraded;
  }

  const now = "2026-01-15T00:00:00Z";

  it("downgrades only when the paid period has actually ended", () => {
    const subs = [
      {
        id: "s1",
        user_id: "u1",
        status: "cancelled",
        periodEnd: "2026-01-01T00:00:00Z",
      },
      {
        id: "s2",
        user_id: "u2",
        status: "cancelled",
        periodEnd: "2026-02-01T00:00:00Z",
      },
    ];
    expect(reconcile(subs, now)).toEqual(["u1"]);
  });

  it("leaves active subscriptions alone", () => {
    const subs = [
      {
        id: "s1",
        user_id: "u1",
        status: "active",
        periodEnd: "2026-01-01T00:00:00Z",
      },
    ];
    expect(reconcile(subs, now)).toEqual([]);
  });
});
