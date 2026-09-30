import "server-only";

import { createClient } from "@supabase/supabase-js";
import { publicEnv } from "@/lib/env";
import { logger } from "@/lib/logger";
import { FREE_PLAN } from "@/lib/plans";
import type { Plan, Product } from "@/types/database";

/**
 * Public pricing catalogue.
 *
 * `plans` and `products` are reference data with anon-readable SELECT
 * policies, so this uses the public anon key rather than the cookie-bound user
 * client. Two consequences that matter:
 *
 *   1. `next build` succeeds without secrets. The homepage calls this during
 *      prerendering, and a cookie-bound Supabase client throws when
 *      NEXT_PUBLIC_* is absent — which would make the marketing page
 *      unbuildable in CI and during local development.
 *
 *   2. The marketing page does not vary per user, so it can be statically
 *      rendered and revalidated rather than made fully dynamic.
 *
 * A failure returns empty arrays rather than throwing: the page then renders
 * the `FREE_PLAN` / `planForDisplay` fallbacks instead of erroring. A pricing
 * page that 500s because the database blipped is worse than one showing
 * slightly stale copy.
 */
export async function fetchCatalogue(): Promise<{
  plans: Plan[];
  products: Product[];
}> {
  let url: string;
  let anonKey: string;
  try {
    ({ NEXT_PUBLIC_SUPABASE_URL: url, NEXT_PUBLIC_SUPABASE_ANON_KEY: anonKey } =
      publicEnv());
  } catch (error) {
    logger.warn("catalogue unavailable: env not configured", {
      detail: error instanceof Error ? error.message : undefined,
    });
    return { plans: [], products: [] };
  }

  const supabase = createClient(url, anonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  try {
    const [plansResult, productsResult] = await Promise.all([
      supabase
        .from("plans")
        .select("*")
        .eq("is_active", true)
        .order("sort_order"),
      supabase
        .from("products")
        .select(
          "id, plan_id, billing_period, name, price_cents, dodo_product_id, is_active, sort_order"
        )
        .eq("is_active", true)
        .order("sort_order"),
    ]);

    return {
      plans: (plansResult.data as Plan[] | null) ?? [],
      products: (productsResult.data as Product[] | null) ?? [],
    };
  } catch (error) {
    logger.exception("catalogue fetch failed", error);
    return { plans: [], products: [] };
  }
}

export interface PricingTier {
  plan: Plan;
  monthly: Product;
  yearly: Product;
}

/**
 * Groups the SKUs into display tiers, falling back to the built-in capability
 * snapshot so the page still renders if the catalogue is empty.
 */
export function groupTiers(
  plans: Plan[],
  products: Product[],
  planForDisplay: (id: "basic" | "pro") => Plan
): PricingTier[] {
  const tiers: PricingTier[] = [];

  for (const id of ["basic", "pro"] as const) {
    const monthly = products.find(
      (p) => p.plan_id === id && p.billing_period === "monthly"
    );
    const yearly = products.find(
      (p) => p.plan_id === id && p.billing_period === "yearly"
    );
    if (!monthly || !yearly) continue;

    tiers.push({
      plan: plans.find((p) => p.id === id) ?? planForDisplay(id),
      monthly,
      yearly,
    });
  }

  return tiers;
}

export { FREE_PLAN };
