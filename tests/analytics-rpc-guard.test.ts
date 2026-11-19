import { describe, it, expect } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * C2 regression guard — analytics maintenance functions must be service-role
 * only.
 *
 * prune_analytics(integer) and rollup_telemetry(integer) are SECURITY DEFINER
 * functions. PostgreSQL grants EXECUTE on functions to PUBLIC by default, and
 * Supabase exposes public-schema functions over PostgREST RPC, so anyone with
 * the public anon key could call:
 *
 *   POST /rest/v1/rpc/prune_analytics {"p_days": 100000}
 *
 * and delete every tenant's analytics events, or poison telemetry_daily via
 * rollup_telemetry.
 *
 * These tests fail if the revoke/grant is removed, if get_platform_metrics
 * loses its anon grant (homepage metrics), if a new SECURITY DEFINER function
 * is added without a lock, or if the cron stops using the admin client.
 */

const ROOT = process.cwd();
const SCHEMA = readFileSync(join(ROOT, "supabase/schema.sql"), "utf8");
const MIGRATION = join(ROOT, "supabase/migrations/013_lock_analytics_functions.sql");

describe("C2 — mutating analytics functions are service-role only", () => {
  it("revokes execute on prune_analytics/rollup_telemetry from public + clients", () => {
    expect(SCHEMA).toMatch(
      /revoke\s+execute\s+on\s+function\s+public\.prune_analytics\(integer\)\s+from\s+public,\s*anon,\s*authenticated/i,
    );
    expect(SCHEMA).toMatch(
      /revoke\s+execute\s+on\s+function\s+public\.rollup_telemetry\(integer\)\s+from\s+public,\s*anon,\s*authenticated/i,
    );
  });

  it("grants execute on both to service_role", () => {
    expect(SCHEMA).toMatch(
      /grant\s+execute\s+on\s+function\s+public\.prune_analytics\(integer\)\s+to\s+service_role/i,
    );
    expect(SCHEMA).toMatch(
      /grant\s+execute\s+on\s+function\s+public\.rollup_telemetry\(integer\)\s+to\s+service_role/i,
    );
  });

  it("keeps get_platform_metrics callable by anon (marketing homepage)", () => {
    expect(SCHEMA).toMatch(
      /grant\s+execute\s+on\s+function\s+public\.get_platform_metrics\(\)\s+to\s+anon,\s*authenticated/i,
    );
  });

  it("revokes execute on trigger functions (defence in depth)", () => {
    for (const fn of [
      "set_updated_at()",
      "guard_profile_plan()",
      "enforce_site_limit()",
      "reject_reserved_slug()",
      "handle_new_user()",
    ]) {
      const escaped = fn.replace(/[()]/g, "\\$&");
      expect(SCHEMA).toMatch(
        new RegExp(`revoke\\s+execute\\s+on\\s+function\\s+public\\.${escaped}\\s+from\\s+public`, "i"),
      );
    }
  });
});

describe("C2 — no SECURITY DEFINER function is left callable by clients", () => {
  it("every SECURITY DEFINER function in schema.sql is locked", () => {
    // Parse function definitions from the SQL text. Each function body runs
    // from its `create or replace function` to the next one (or EOF).
    const starts = [
      ...SCHEMA.matchAll(/create\s+or\s+replace\s+function\s+public\.(\w+)/gi),
    ].map((m) => ({ name: m[1] ?? "", idx: m.index ?? 0 }));

    const unlocked: string[] = [];
    for (let i = 0; i < starts.length; i++) {
      const current = starts[i];
      if (!current) continue;
      const next = starts[i + 1];
      const body = SCHEMA.slice(current.idx, next?.idx ?? SCHEMA.length);
      if (!/security\s+definer/i.test(body)) continue;
      if (current.name === "get_platform_metrics") continue; // intentional
      const revoke = new RegExp(
        `revoke\\s+execute\\s+on\\s+function\\s+public\\.${current.name}\\b`,
        "i",
      );
      if (!revoke.test(SCHEMA)) unlocked.push(current.name);
    }
    expect(unlocked).toEqual([]);
  });
});

describe("C2 — idempotent, self-verifying migration ships", () => {
  it("exists", () => {
    expect(existsSync(MIGRATION)).toBe(true);
  });

  it("revokes from public, grants service_role, and self-verifies", () => {
    const mig = readFileSync(MIGRATION, "utf8");
    expect(mig).toMatch(/revoke\s+execute\s+on\s+function\s+public\.prune_analytics\(integer\)\s+from\s+public/i);
    expect(mig).toMatch(/grant\s+execute\s+on\s+function\s+public\.prune_analytics\(integer\)\s+to\s+service_role/i);
    expect(mig).toMatch(/has_function_privilege/i);
    expect(mig).toMatch(/notify\s+pgrst/i);
  });
});

describe("C2 — app callers use the right client", () => {
  it("cron uses the admin (service-role) client for both maintenance RPCs", () => {
    const src = readFileSync(join(ROOT, "app/api/cron/maintenance/route.ts"), "utf8");
    expect(src).toMatch(/createAdminClient/);
    expect(src).toMatch(/admin\.rpc\(["']rollup_telemetry["']/);
    expect(src).toMatch(/admin\.rpc\(["']prune_analytics["']/);
  });

  it("homepage metrics use the public anon client (must stay callable)", () => {
    const src = readFileSync(join(ROOT, "lib/metrics.ts"), "utf8");
    expect(src).toMatch(/rpc\([\s\S]*?get_platform_metrics/);
  });
});