import { DodoPayments } from "dodopayments";

/**
 * Returns an instance of DodoPayments client.
 * Returns null if DODO_PAYMENTS_API_KEY is not configured.
 */
export function getDodoClient(): DodoPayments | null {
  const apiKey = process.env.DODO_PAYMENTS_API_KEY;

  if (!apiKey || apiKey.includes("your-dodo") || apiKey.includes("placeholder")) {
    return null;
  }

  const isLive = process.env.DODO_PAYMENTS_ENVIRONMENT === "live_mode";

  return new DodoPayments({
    bearerToken: apiKey,
    environment: isLive ? "live_mode" : "test_mode",
    webhookKey: process.env.DODO_PAYMENTS_WEBHOOK_KEY || undefined,
  });
}

/**
 * Mapping from ShipSprint internal plan IDs to Dodo Payments product IDs.
 */
export const PLAN_PRODUCTS: Record<string, { productId: string; name: string; priceCents: number }> = {
  basic: {
    productId: process.env.DODO_PRODUCT_ID_BASIC || "p_basic_tier",
    name: "ShipSprint Basic",
    priceCents: 499,
  },
  pro: {
    productId: process.env.DODO_PRODUCT_ID_PRO || "p_pro_tier",
    name: "ShipSprint Pro",
    priceCents: 999,
  },
};

interface CreateCheckoutParams {
  userId: string;
  userEmail: string;
  planId: "basic" | "pro";
  returnUrl: string;
}

/**
 * Creates a Dodo Payments checkout session.
 */
export async function createCheckout({
  userId,
  userEmail,
  planId,
  returnUrl,
}: CreateCheckoutParams): Promise<{ checkoutUrl: string; sessionId: string }> {
  const client = getDodoClient();

  if (!client) {
    throw new Error(
      "Dodo Payments is not configured. Please set DODO_PAYMENTS_API_KEY in your .env.local."
    );
  }

  const product = PLAN_PRODUCTS[planId];
  if (!product) {
    throw new Error(`Invalid plan "${planId}". Must be "basic" or "pro".`);
  }

  const session = await client.checkoutSessions.create({
    product_cart: [
      {
        product_id: product.productId,
        quantity: 1,
      },
    ],
    customer: {
      email: userEmail,
    },
    return_url: returnUrl,
    metadata: {
      user_id: userId,
      plan_id: planId,
    },
  });

  if (!session.checkout_url) {
    throw new Error("Dodo Payments did not return a valid checkout_url.");
  }

  return {
    checkoutUrl: session.checkout_url,
    sessionId: session.session_id,
  };
}

/**
 * Creates a Dodo Payments Customer Portal session for billing self-service.
 */
export async function createCustomerPortal(
  customerId: string,
  returnUrl: string
): Promise<string> {
  const client = getDodoClient();

  if (!client) {
    throw new Error("Dodo Payments is not configured.");
  }

  const portalSession = await client.customers.customerPortal.create(customerId, {
    return_url: returnUrl,
  });

  return portalSession.url;
}
