import type { Plan, PlanId } from "@/types/database";

/**
 * Failsafe Free plan.
 *
 * Several pages previously inlined an object literal for this, each with a
 * subset of the fields, which meant a new Plan column had to be added in four
 * places. `site_limit` is 1 and not 0 because the dashboard divides by it to
 * compute a usage percentage.
 *
 * H3: email capture is available on every plan (including Free), so
 * `has_email_capture` is true here. The Free tier is capped at
 * `FREE_EMAIL_CAP` subscribers — that limit is enforced in the database
 * (trigger), in the API, in the editor and in the analytics view, so the cap
 * is the single truth everywhere.
 */
export const FREE_PLAN: Plan = {
  id: "free",
  name: "Free",
  tagline: "One landing page to get started.",
  site_limit: 1,
  has_branding: true,
  has_custom_domain: false,
  has_analytics_dashboard: false,
  has_email_capture: true,
  has_ai_discovery: false,
  sort_order: 10,
  is_active: true,
};

/**
 * Free-tier email capture cap. Enforced by a database trigger (the durable
 * boundary, even for direct SQL inserts), by `POST /api/subscribe` (so the
 * visitor sees a friendly error instead of a raw 500), by the editor (so the
 * owner sees the count and the cap) and by the subscribers endpoint (which
 * reports it). The same constant is duplicated in
 * `supabase/migrations/018_email_capture_free_limit.sql` as 100 — the two must
 * stay in sync; the trigger is the authority and the API is the friendly
 * layer.
 */
export const FREE_EMAIL_CAP = 100;

/** Feature list rendered on the pricing table, driven by the plan row. */
export interface PlanFeature {
  label: string;
  get: (plan: Plan) => boolean | number | string;
}

/**
 * Pricing-table rows.
 *
 * Every row reads only `Plan` fields — no ad-hoc `p.id === "pro"` string
 * checks. Those checks were the root cause of H3: the table drifted away from
 * what the database actually enforces. The one display-only tier difference
 * (analytics depth) is expressed through `plan.has_analytics_dashboard`,
 * which the database seed sets per tier.
 */
export const PLAN_FEATURES: PlanFeature[] = [
  { label: "Landing pages", get: (p) => p.site_limit },
  { label: "Remove ShipSprint branding", get: (p) => !p.has_branding },
  { label: "Custom domain + automatic SSL", get: (p) => p.has_custom_domain },
  { label: "Privacy Policy generator", get: () => true },
  { label: "Terms & Conditions generator", get: () => true },
  {
    label: "Email capture",
    // Every plan can capture emails. The Free tier is capped at
    // FREE_EMAIL_CAP subscribers; paid tiers are unlimited.
    get: (p) => (p.id === "free" ? `${FREE_EMAIL_CAP} subscribers` : "Unlimited"),
  },
  {
    label: "Analytics dashboard",
    // Basic gets the limited dashboard (7-day window); Pro gets the full one
    // (7/30/90-day windows, per-site filtering, referrer and device
    // breakdowns). Free gets none. The string carries the depth so the
    // pricing table says exactly what each tier can do.
    get: (p) =>
      p.has_analytics_dashboard
        ? p.id === "pro"
          ? "Full Analytics (7/30/90d, per-site, referrers, devices)"
          : "Analytics dashboard (7-day)"
        : false,
  },
  { label: "AI Search & LLM Discoverability", get: (p) => Boolean(p.has_ai_discovery) },
  { label: "SEO Optimized", get: (p) => p.id === "pro" },
  {
    label: "Blog pages",
    get: (p) => (p.id === "pro" ? "Unlimited Blog pages" : p.id === "basic" ? "10 Blog pages" : false),
  },
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
    has_analytics_dashboard: true,
    has_email_capture: true,
    has_ai_discovery: false,
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
    has_ai_discovery: true,
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

export function isProPlan(planId?: PlanId | null): boolean {
  return planId === "pro";
}

export function canUseAiDiscovery(plan?: Plan | null): boolean {
  if (!plan) return false;
  return Boolean(plan.has_ai_discovery || plan.id === "pro");
}