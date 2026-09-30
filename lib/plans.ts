import type { Plan, PlanId } from "@/types/database";

/**
 * Failsafe Free plan.
 *
 * Several pages previously inlined an object literal for this, each with a
 * subset of the fields, which meant a new Plan column had to be added in four
 * places. `site_limit` is 1 and not 0 because the dashboard divides by it to
 * compute a usage percentage.
 */
export const FREE_PLAN: Plan = {
  id: "free",
  name: "Free",
  tagline: "One landing page to get started.",
  site_limit: 1,
  has_branding: true,
  has_custom_domain: false,
  has_analytics_dashboard: false,
  has_email_capture: false,
  sort_order: 10,
  is_active: true,
};

/** Feature list rendered on the pricing table, driven by the plan row. */
export interface PlanFeature {
  label: string;
  get: (plan: Plan) => boolean | number;
}

export const PLAN_FEATURES: PlanFeature[] = [
  { label: "Landing pages", get: (p) => p.site_limit },
  { label: "Remove ShipSprint branding", get: (p) => !p.has_branding },
  { label: "Custom domain + automatic SSL", get: (p) => p.has_custom_domain },
  { label: "Analytics dashboard", get: (p) => p.has_analytics_dashboard },
  { label: "Email capture", get: (p) => p.has_email_capture },
];

/**
 * Capability snapshot for a tier the user has not bought yet.
 *
 * The pricing table must describe Basic and Pro before anyone owns them, so
 * those rows cannot come from the database. These values mirror the seed in
 * supabase/schema.sql. They are a display-only copy: entitlements are always
 * read from the owner's actual `plans` row, so this can never grant access.
 *
 * `PLAN_CAPABILITIES` is the single source for that display. It replaces an
 * inline object literal that had been duplicated inside the render loop.
 */
const PLAN_CAPABILITIES: Record<Exclude<PlanId, "free">, Plan> = {
  basic: {
    id: "basic",
    name: "Basic",
    tagline: "For a solo launch with a real domain.",
    site_limit: 3,
    has_branding: false,
    has_custom_domain: true,
    has_analytics_dashboard: false,
    has_email_capture: true,
    sort_order: 20,
    is_active: true,
  },
  pro: {
    id: "pro",
    name: "Pro",
    tagline: "Multiple apps with analytics.",
    site_limit: 10,
    has_branding: false,
    has_custom_domain: true,
    has_analytics_dashboard: true,
    has_email_capture: true,
    sort_order: 30,
    is_active: true,
  },
};

export function planForDisplay(planId: PlanId): Plan {
  if (planId === "free") return FREE_PLAN;
  return PLAN_CAPABILITIES[planId];
}

export function formatPrice(cents: number, period?: "month" | "year"): string {
  if (cents === 0) return "$0";
  const amount = cents / 100;
  const formatted = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: cents % 100 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(amount);
  if (!period) return formatted;
  return period === "month" ? `${formatted}/mo` : `${formatted}/yr`;
}
