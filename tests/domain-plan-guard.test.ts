import { describe, it, expect } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * H1 regression guard — custom domains are Pro-only, enforced in the database.
 *
 * The original hole: the only plan gate was in app/api/domains/route.ts. A
 * free user could call PostgREST directly:
 *
 *   PATCH /rest/v1/sites?id=eq.<site-uid>  {"custom_domain":"myapp.com"}
 *
 * and get a custom domain + automatic TLS without paying. These tests fail if
 * the guard, its plan check, root-domain protection, hostname validation, or
 * the API's error mapping is removed.
 */

const ROOT = process.cwd();
const SCHEMA = readFileSync(join(ROOT, "supabase/schema.sql"), "utf8");
const MIGRATION = join(ROOT, "supabase/migrations/014_lock_custom_domain_plan.sql");

function guardBody(): string {
  const match = SCHEMA.match(
    /create\s+or\s+replace\s+function\s+public\.guard_custom_domain[\s\S]*?\$\$;/i,
  );
  return match?.[0] ?? "";
}

describe("H1 — guard_custom_domain()", () => {
  it("is SECURITY DEFINER with a pinned search_path", () => {
    const body = guardBody();
    expect(body).not.toBe("");
    expect(body).toMatch(/security\s+definer/i);
    expect(body).toMatch(/set\s+search_path/i);
  });

  it("checks the owner's plan (has_custom_domain)", () => {
    expect(guardBody()).toMatch(/has_custom_domain/i);
    expect(guardBody()).toMatch(/insufficient_privilege/i);
  });

  it("blocks hijacking the platform root domain and its subdomains", () => {
    const body = guardBody();
    expect(body).toMatch(/app\.root_domain/i);
    expect(body).toMatch(/new\.custom_domain = v_root/i);
    expect(body).toMatch(/like\s*\('%\.'\s*\|\|\s*v_root\)/i);
  });

  it("always blocks the real platform domain even if app.root_domain is overridden", () => {
    const body = guardBody();
    expect(body).toMatch(/new\.custom_domain = 'shipsprint\.site'/);
    expect(body).toMatch(/new\.custom_domain like '%\.shipsprint\.site'/);
  });

  it("validates the hostname and rejects IP addresses", () => {
    const body = guardBody();
    expect(body).toMatch(/!~/);
    expect(body).toMatch(/\^\[0-9\.\]\+\$/);
    expect(body).toMatch(/length\(new\.custom_domain\) > 253/);
  });

  it("normalizes to lowercase and treats blank as NULL (disconnect)", () => {
    const body = guardBody();
    expect(body).toMatch(/trim\(lower\(new\.custom_domain\)\)/i);
    expect(body).toMatch(/new\.custom_domain := null/i);
  });

  it("fires on INSERT and UPDATE OF custom_domain", () => {
    expect(SCHEMA).toMatch(
      /create\s+trigger\s+trg_guard_custom_domain\s+before\s+insert\s+or\s+update\s+of\s+custom_domain\s+on\s+public\.sites/i,
    );
  });

  it("locks EXECUTE so clients cannot call the trigger function via RPC", () => {
    expect(SCHEMA).toMatch(
      /revoke\s+execute\s+on\s+function\s+public\.guard_custom_domain\(\)\s+from\s+public,\s*anon,\s*authenticated/i,
    );
  });
});

describe("H1 — idempotent, self-verifying migration ships", () => {
  it("exists", () => {
    expect(existsSync(MIGRATION)).toBe(true);
  });

  it("installs the guard and verifies itself", () => {
    const mig = readFileSync(MIGRATION, "utf8");
    expect(mig).toMatch(/create\s+or\s+replace\s+function\s+public\.guard_custom_domain/i);
    expect(mig).toMatch(/create\s+trigger\s+trg_guard_custom_domain/i);
    expect(mig).toMatch(/has_custom_domain/);
    expect(mig).toMatch(/pg_get_functiondef/);
    expect(mig).toMatch(/notify\s+pgrst/i);
  });
});

describe("H1 — the API maps trigger errors to actionable responses", () => {
  const src = readFileSync(join(ROOT, "app/api/domains/route.ts"), "utf8");

  it("maps insufficient_privilege (42501) to 403", () => {
    expect(src).toMatch(/updateError\.code === "42501"/);
    expect(src).toMatch(/status: 403/);
  });

  it("maps check_violation (23514) to 400 with the trigger message", () => {
    expect(src).toMatch(/updateError\.code === "23514"/);
    expect(src).toMatch(/status: 400/);
  });

  it("maps unique_violation (23505) to 409", () => {
    expect(src).toMatch(/updateError\.code === "23505"/);
    expect(src).toMatch(/status: 409/);
  });

  it("uses the admin (service-role) client for the domain write", () => {
    expect(src).toMatch(/createAdminClient/);
    expect(src).toMatch(/admin[\s\S]{0,120}\.update\(\{\s*custom_domain/);
  });
});

describe("H1 — no other app path writes custom_domain", () => {
  it("PUT /api/sites/[id] does not accept custom_domain", () => {
    const validation = readFileSync(join(ROOT, "lib/validation.ts"), "utf8");
    const updateBlock = validation.match(/updateSiteSchema[\s\S]*?\.refine\(/);
    expect(updateBlock).not.toBeNull();
    expect(updateBlock?.[0] ?? "").not.toMatch(/custom_domain/);
  });
});