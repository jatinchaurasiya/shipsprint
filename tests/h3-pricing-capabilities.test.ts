import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  FREE_PLAN,
  PLAN_FEATURES,
  PLAN_FEATURES as FEATURES,
  planForDisplay,
  FREE_EMAIL_CAP,
} from "@/lib/plans";
import type { Plan } from "@/types/database";

const ROOT = process.cwd();
const SCHEMA = readFileSync(join(ROOT, "supabase/schema.sql"), "utf8");

/**
 * H3 — pricing table must match what the app actually enforces.
 *
 * The original bug: the pricing table promised "Analytics dashboard" to Basic
 * while the DB seed had `has_analytics_dashboard = false`, promised "Email
 * capture" to Free while the API 403'd it, and sold "Remove ShipSprint
 * branding" when no branding existed. This suite is the feature-matrix guard:
 * every row is checked against the plan booleans that the database seeds and
 * the app reads.
 */
describe("H3 — plan capabilities match the database seed", () => {
  it("free plan: email capture on, analytics off, branding on", () => {
    expect(FREE_PLAN.has_email_capture).toBe(true);
    expect(FREE_PLAN.has_analytics_dashboard).toBe(false);
    expect(FREE_PLAN.has_branding).toBe(true);
  });

  it("basic plan: limited analytics on, email capture on, branding off", () => {
    const basic = planForDisplay("basic");
    expect(basic.has_analytics_dashboard).toBe(true);
    expect(basic.has_email_capture).toBe(true);
    expect(basic.has_branding).toBe(false);
    expect(basic.has_custom_domain).toBe(true);
  });

  it("pro plan: full analytics on, email capture on, branding off", () => {
    const pro = planForDisplay("pro");
    expect(pro.has_analytics_dashboard).toBe(true);
    expect(pro.has_email_capture).toBe(true);
    expect(pro.has_branding).toBe(false);
  });

  it("the schema.sql seed matches PLAN_CAPABILITIES", () => {
    // Free: (..., has_branding=true, has_custom_domain=false,
    //         has_analytics_dashboard=false, has_email_capture=true, ...)
    expect(SCHEMA).toMatch(
      /'free',.*?\n\s*1,\s*true,\s*false,\s*false,\s*true,\s*false,\s*10\)/s,
    );
    // Basic: (..., has_branding=false, has_custom_domain=true,
    //          has_analytics_dashboard=true, has_email_capture=true, ...)
    expect(SCHEMA).toMatch(
      /'basic',.*?\n\s*3,\s*false,\s*true,\s*true,\s*true,\s*false,\s*20\)/s,
    );
  });

  it("the free email cap is 100 and matches the trigger", () => {
    expect(FREE_EMAIL_CAP).toBe(100);
    const migration = readFileSync(
      join(ROOT, "supabase/migrations/018_email_capture_free_limit.sql"),
      "utf8",
    );
    expect(migration).toMatch(/v_count\s*>=\s*100/);
  });
});

describe("H3 — pricing table rows are truthful", () => {
  const row = (label: string) => FEATURES.find((f) => f.label === label);

  it("Basic shows an analytics dashboard (limited)", () => {
    const value = row("Analytics dashboard")?.get(planForDisplay("basic"));
    expect(typeof value).toBe("string");
    expect(value).toContain("7-day");
  });

  it("Pro shows the full analytics dashboard", () => {
    const value = row("Analytics dashboard")?.get(planForDisplay("pro"));
    expect(typeof value).toBe("string");
    expect(value).toContain("Full");
    expect(value).toContain("90d");
  });

  it("Free shows no analytics dashboard", () => {
    expect(row("Analytics dashboard")?.get(FREE_PLAN)).toBe(false);
  });

  it("every plan shows email capture; Free is capped at 100", () => {
    const free = row("Email capture")?.get(FREE_PLAN);
    expect(free).toBe("100 subscribers");
    expect(row("Email capture")?.get(planForDisplay("basic"))).toBe(
      "Unlimited",
    );
    expect(row("Email capture")?.get(planForDisplay("pro"))).toBe("Unlimited");
  });

  it("paid plans remove the ShipSprint badge; Free keeps it", () => {
    expect(row("Remove ShipSprint branding")?.get(FREE_PLAN)).toBe(false);
    expect(row("Remove ShipSprint branding")?.get(planForDisplay("basic"))).toBe(
      true,
    );
    expect(row("Remove ShipSprint branding")?.get(planForDisplay("pro"))).toBe(
      true,
    );
  });
});

describe("H3 — made-with badge is gated on has_branding", () => {
  const renderer = readFileSync(
    join(ROOT, "components/renderer/site-renderer.tsx"),
    "utf8",
  );
  const badge = readFileSync(
    join(ROOT, "components/ui/made-with-shipsprint-badge.tsx"),
    "utf8",
  );

  it("the badge component exists and says Made with ShipSprint", () => {
    expect(badge).toContain("Made with ShipSprint");
  });

  it("the renderer shows the badge only when has_branding !== false", () => {
    expect(renderer).toContain("has_branding !== false");
    expect(renderer).toContain("MadeWithShipSprintBadge");
  });

  it("the renderer does not discard the plan prop", () => {
    // The old code destructured `plan: _plan` and never used it — that is
    // what let the badge/branding row drift. It must be consumed now.
    expect(renderer).not.toMatch(/plan:\s*_plan/);
  });
});

describe("H3 — email capture is not gated off in the subscribe API", () => {
  const route = readFileSync(
    join(ROOT, "app/api/subscribe/route.ts"),
    "utf8",
  );

  it("the route no longer 403s on has_email_capture === false", () => {
    expect(route).not.toContain("Email capture is not enabled for this site");
  });

  it("the route maps the Free-cap trigger to a friendly 403", () => {
    expect(route).toContain("free plan email capture limit reached");
    expect(route).toContain("email capture limit");
  });
});

describe("H3 — analytics tier semantics", () => {
  const page = readFileSync(
    join(ROOT, "app/(dashboard)/dashboard/analytics/page.tsx"),
    "utf8",
  );

  it("the analytics page clamps Basic to the 7-day window", () => {
    expect(page).toContain("plan.id === \"pro\" ? daysMap[period]");
    expect(page).toContain("daysMap[\"7d\"]");
  });
});

// Keep the import used even if the alias is not.
void PLAN_FEATURES;
void (null as unknown as Plan);