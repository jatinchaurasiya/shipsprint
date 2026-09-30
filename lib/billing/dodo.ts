import "server-only";

import DodoPayments from "dodopayments";
import { serverEnv } from "@/lib/env";
import { logger } from "@/lib/logger";
import type { Product } from "@/types/database";
import type { ProductId } from "@/types/billing";

/**
 * Dodo Payments client.
 *
 * Configuration is mandatory. The previous implementation returned `null` when
 * the API key contained the substring "placeholder", which meant a production
 * deploy with a copied-and-forgotten key fell through to a code path that
 * granted paid plans for free.
 *
 * Note the option names: the SDK takes `bearerToken` and `webhookKey`. The
 * earlier client passed `apiKey`/`webhookSecret`, which the SDK ignores, so
 * every request was sent unauthenticated.
 *
 * Product ids are read from the `products` table rather than environment
 * variables. That means adding a price or a billing period is an INSERT, not a
 * redeploy — and a product with no id configured fails loudly at checkout
 * instead of silently charging the wrong amount.
 */

let cached: DodoPayments | null = null;

export function getDodoClient(): DodoPayments {
  if (cached) return cached;

  // Throws with a message naming the missing variables if unconfigured.
  const env = serverEnv();

  cached = new DodoPayments({
    environment: env.DODO_PAYMENTS_ENVIRONMENT,
    bearerToken: env.DODO_PAYMENTS_API_KEY,
    webhookKey: env.DODO_PAYMENTS_WEBHOOK_KEY,
  });

  return cached;
}

export function dodoIsLive(): boolean {
  return serverEnv().DODO_PAYMENTS_ENVIRONMENT === "live_mode";
}

export class ProductNotConfiguredError extends Error {
  constructor(public readonly productId: ProductId) {
    super(
      `Product "${productId}" has no dodo_product_id configured. ` +
        `Run the product id UPDATE in supabase/schema.sql.`
    );
    this.name = "ProductNotConfiguredError";
  }
}

/**
 * Loads the product catalogue from the database.
 *
 * Called per checkout rather than cached, so a price change in the Supabase
 * dashboard takes effect immediately. One indexed row read is cheap next to
 * the value of never charging a stale price.
 */
export async function loadProducts(admin: {
  from: (table: string) => {
    select: (columns: string) => {
      eq: (column: string, value: boolean) => PromiseLike<{
        data: Product[] | null;
        error: { message: string } | null;
      }>;
    };
  }
}): Promise<Product[]> {
  const { data, error } = await admin
    .from("products")
    .select("id, plan_id, billing_period, name, price_cents, dodo_product_id, is_active, sort_order")
    .eq("is_active", true);

  if (error) {
    logger.exception("failed to load product catalogue", error);
    throw new Error("Billing is temporarily unavailable. Please try again shortly.");
  }

  const resolveDodoProductId = (product: Product): string | null => {
    if (product.dodo_product_id) return product.dodo_product_id;
    const specificKey = `DODO_PRODUCT_ID_${product.id.toUpperCase()}`;
    if (process.env[specificKey]) return process.env[specificKey]!;
    if (product.plan_id === "basic" && process.env.DODO_PRODUCT_ID_BASIC) {
      return process.env.DODO_PRODUCT_ID_BASIC;
    }
    if (product.plan_id === "pro" && process.env.DODO_PRODUCT_ID_PRO) {
      return process.env.DODO_PRODUCT_ID_PRO;
    }
    return null;
  };

  return (data ?? [])
    .map((p) => ({
      ...p,
      dodo_product_id: resolveDodoProductId(p),
    }))
    .sort((a, b) => a.sort_order - b.sort_order);
}

export interface CheckoutInput {
  userId: string;
  userEmail: string;
  userName?: string | null;
  product: Product;
  appUrl: string;
}

export interface CheckoutResult {
  checkoutUrl: string;
  sessionId: string;
  customerId: string;
}

export async function createCheckout(input: CheckoutInput): Promise<CheckoutResult> {
  const dodo = getDodoClient();

  if (!input.product.dodo_product_id) {
    throw new ProductNotConfiguredError(input.product.id);
  }

  const billing = new URL("/dashboard/billing", input.appUrl).toString();
  const cancelled = new URL(
    "/dashboard/billing?checkout=cancelled",
    input.appUrl
  ).toString();

  // Create the customer explicitly rather than passing an inline address.
  //
  // The inline `customer: { email, name }` form (NewCustomer) accepts no
  // metadata, and the checkout-session response does not return a customer id.
  // That combination is why `profiles.dodo_customer_id` was previously never
  // populated, leaving every subscriber without a reachable billing portal.
  const customer = await dodo.customers.create({
    email: input.userEmail,
    name: input.userName || input.userEmail,
    metadata: {
      user_id: input.userId,
      product_id: input.product.id,
      plan_id: input.product.plan_id,
    },
  });

  const session = await dodo.checkoutSessions.create({
    product_cart: [{ product_id: input.product.dodo_product_id, quantity: 1 }],
    customer: { customer_id: customer.customer_id },
    // Session metadata is a second path back to the user. The checkout_intents
    // row is the authoritative one; this is belt and braces.
    metadata: {
      user_id: input.userId,
      product_id: input.product.id,
      plan_id: input.product.plan_id,
    },
    return_url: billing,
    cancel_url: cancelled,
  });

  if (!session.checkout_url) {
    logger.error("dodo checkout session had no url", {
      session_id: session.session_id,
      product_id: input.product.id,
    });
    throw new Error("Dodo did not return a checkout URL");
  }

  return {
    checkoutUrl: session.checkout_url,
    sessionId: session.session_id,
    customerId: customer.customer_id,
  };
}

export async function createCustomerPortal(
  customerId: string,
  appUrl: string
): Promise<string> {
  const dodo = getDodoClient();
  const portal = await dodo.customers.customerPortal.create(customerId, {
    return_url: new URL("/dashboard/billing", appUrl).toString(),
  });

  if (!portal.link) {
    logger.error("dodo customer portal returned no link", { customer_id: customerId });
    throw new Error("Dodo did not return a customer portal URL");
  }

  return portal.link;
}
