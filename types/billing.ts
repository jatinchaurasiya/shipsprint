/**
 * Billing domain vocabulary.
 *
 * Kept separate from `types/database.ts` because these are the values the
 * application branches on, and they are deliberately duplicated in three
 * places that must agree:
 *
 *   1. `supabase/schema.sql`           (CHECK constraints + product seed rows)
 *   2. `public.products`               (the authoritative catalogue)
 *   3. here                            (compile-time narrowing)
 *
 * The split of `PlanId` (tier) from `ProductId` (SKU) is the fix that makes
 * yearly plans work. Before this, the plan id doubled as the billed product,
 * so a yearly subscription had nowhere to record the period and adding one
 * would have required a code change plus edits to every feature check.
 */

/** The entitlement tier. This is what `profiles.plan_id` stores. */
export type PlanId = "free" | "basic" | "pro";

/** The billed SKU. Four SKUs map onto three tiers. */
export type ProductId =
  | "basic_monthly"
  | "basic_yearly"
  | "pro_monthly"
  | "pro_yearly";

export type BillingPeriod = "monthly" | "yearly";

/** Ordered cheapest-first, used to decide whether a plan change is an upgrade. */
export const PLAN_ORDER: readonly PlanId[] = ["free", "basic", "pro"] as const;

/** Yearly discount, for display. Computed from prices rather than hardcoded. */
export function yearlySavingPercent(
  monthlyCents: number,
  yearlyCents: number
): number {
  if (monthlyCents <= 0) return 0;
  const fullYear = monthlyCents * 12;
  if (fullYear <= yearlyCents) return 0;
  return Math.round(((fullYear - yearlyCents) / fullYear) * 100);
}

export function planRank(plan: PlanId): number {
  return PLAN_ORDER.indexOf(plan);
}

export function isUpgrade(from: PlanId, to: PlanId): boolean {
  return planRank(to) > planRank(from);
}
