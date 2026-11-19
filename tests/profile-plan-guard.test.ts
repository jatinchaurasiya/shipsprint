import { describe, it, expect } from "vitest";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * C1 regression guard — profiles.plan_id must not be client-writable.
 *
 * The original hole: `authenticated` held a table-wide UPDATE grant on
 * public.profiles plus a permissive "Users can update own profile" policy, so
 * any signed-up user could PATCH their own row to `plan_id = "pro"` and get
 * Pro features without paying.
 *
 * These tests fail if:
 *   - the grant or the permissive policy comes back,
 *   - the SECURITY DEFINER guard trigger is removed,
 *   - the idempotent migration is deleted,
 *   - or any app code starts writing profiles with the user client instead of
 *     the service-role (admin) client.
 */

const ROOT = process.cwd();
const SCHEMA = readFileSync(join(ROOT, "supabase/schema.sql"), "utf8");
const MIGRATION = join(ROOT, "supabase/migrations/012_lock_profile_plan.sql");

function sourceFiles(dir: string): string[] {
  if (!existsSync(dir)) return [];
  const out: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      out.push(...sourceFiles(full));
    } else if (/\.(ts|tsx)$/.test(entry.name)) {
      out.push(full);
    }
  }
  return out;
}

describe("C1 — profiles.plan_id is not client-writable (schema)", () => {
  it("does not grant a table-wide UPDATE on profiles to authenticated", () => {
    expect(SCHEMA).not.toMatch(
      /grant\s+[^;]*\bupdate\b[^;]*on\s+public\.profiles\s+to\s+authenticated/i,
    );
  });

  it("explicitly revokes client writes on profiles", () => {
    expect(SCHEMA).toMatch(/revoke\s+[^;]*\bupdate\b[^;]*on\s+public\.profiles/i);
  });

  it("revokes column-level UPDATE on profiles too", () => {
    expect(SCHEMA).toMatch(/revoke\s+update\s*\([^)]*\)\s+on\s+public\.profiles/i);
  });

  it("revokes anon SELECT on profiles", () => {
    expect(SCHEMA).toMatch(/revoke\s+select\s+on\s+public\.profiles\s+from\s+anon/i);
  });

  it("drops the permissive profiles UPDATE policy", () => {
    expect(SCHEMA).not.toMatch(/create\s+policy\s+"Users can update own profile"/i);
  });

  it("keeps the owner SELECT policy (dashboard reads own profile)", () => {
    expect(SCHEMA).toMatch(/create\s+policy\s+"Users can view own profile"/i);
  });

  it("defines a SECURITY DEFINER guard that tests the session role", () => {
    const match = SCHEMA.match(
      /create\s+or\s+replace\s+function\s+public\.guard_profile_plan[\s\S]*?\$\$;/i,
    );
    expect(match).not.toBeNull();
    const body = match?.[0] ?? "";
    expect(body).toMatch(/security\s+definer/i);
    expect(body).toMatch(/set\s+search_path/i);
    expect(body).toMatch(/current_setting\('role'/i);
    expect(body).toMatch(/session_user/i);
    expect(body).toMatch(/coalesce/i);
    expect(body).toMatch(/plan_id/i);
    expect(body).toMatch(/dodo_customer_id/i);
  });

  it("creates the guard trigger on profiles", () => {
    expect(SCHEMA).toMatch(/create\s+trigger\s+trg_guard_profile_plan/i);
    expect(SCHEMA).toMatch(/before\s+update\s+on\s+public\.profiles/i);
  });
});

describe("C1 — idempotent migration ships the same fix", () => {
  it("exists", () => {
    expect(existsSync(MIGRATION)).toBe(true);
  });

  it("revokes the grant, drops the policy, and installs the guard", () => {
    const migration = readFileSync(MIGRATION, "utf8");
    expect(migration).toMatch(/revoke\s+[^;]*\bupdate\b[^;]*on\s+public\.profiles/i);
    expect(migration).toMatch(/drop\s+policy\s+if\s+exists\s+"Users can update own profile"/i);
    expect(migration).toMatch(/create\s+or\s+replace\s+function\s+public\.guard_profile_plan/i);
    expect(migration).toMatch(/create\s+trigger\s+trg_guard_profile_plan/i);
    expect(migration).toMatch(/column_privileges/i);
    expect(migration).toMatch(/session_user/i);
    expect(migration).toMatch(/revoke\s+select\s+on\s+public\.profiles\s+from\s+anon/i);
  });

  it("is re-runnable (drop trigger if exists / create or replace)", () => {
    const migration = readFileSync(MIGRATION, "utf8");
    expect(migration).toMatch(/drop\s+trigger\s+if\s+exists\s+trg_guard_profile_plan/i);
    expect(migration).toMatch(/create\s+or\s+replace\s+function/i);
  });
});

describe("C1 — no app code writes profiles with the user client", () => {
  const files = [
    ...sourceFiles(join(ROOT, "app")),
    ...sourceFiles(join(ROOT, "components")),
    ...sourceFiles(join(ROOT, "lib")),
  ];

  // Match a write applied to the profiles query chain itself, not any
  // unrelated .update() elsewhere in the same file.
  const PROFILES_WRITE =
    /\.from\(["']profiles["']\)[\s\S]{0,400}?\.(update|insert|upsert)\(/;

  it("finds the profiles write sites (guard against the scan silently matching nothing)", () => {
    const writers = files.filter((file) =>
      PROFILES_WRITE.test(readFileSync(file, "utf8")),
    );
    expect(writers.length).toBeGreaterThan(0);
  });

  it("every profiles write uses the service-role (admin) client", () => {
    const offenders = files.filter((file) => {
      const src = readFileSync(file, "utf8");
      return PROFILES_WRITE.test(src) && !/createAdminClient/.test(src);
    });
    expect(offenders).toEqual([]);
  });
});