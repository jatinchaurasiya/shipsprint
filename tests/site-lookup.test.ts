import { beforeEach, describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Regression tests for the public site lookup.
 *
 * The production outage this covers: `app/site/[slug]` selected the site with
 * the owner's profile and plan embedded inline
 * (`sites.select("*, profiles (..., plans (...))")`). The live database carries
 * two foreign key constraints for `sites.user_id -> profiles.id` — the one
 * Postgres derives from the inline `references` clause (`sites_user_id_fkey`)
 * and a hand-named `sites_user_fkey` — so PostgREST refused the embed with
 * PGRST201 ("more than one relationship"). The page treated that error exactly
 * like a missing row, and every published landing page answered "Page Not
 * Found" while the database was in fact healthy and the site published.
 *
 * Two properties are asserted here: the site row is read on its own, and a
 * failure anywhere in the plan enrichment can never take the page down.
 */

const loggerMock = vi.hoisted(() => ({
  error: vi.fn(),
  warn: vi.fn(),
  info: vi.fn(),
  exception: vi.fn(),
}));

vi.mock("@/lib/logger", () => ({ logger: loggerMock }));

const { resolvePublicSite, FREE_PLAN } = await import("@/lib/site-lookup");

type Reply = { data?: unknown; error?: { message: string } | null };

interface Call {
  table: string;
  select: string;
  eq: [string, string] | null;
}

/** Minimal stand-in for the fluent PostgREST builder. */
function fakeClient(replies: { sites?: Reply; profiles?: Reply }) {
  const calls: Call[] = [];

  const client = {
    from(table: string) {
      const call: Call = { table, select: "", eq: null };
      calls.push(call);

      const builder = {
        select(columns: string) {
          call.select = columns;
          return builder;
        },
        eq(column: string, value: string) {
          call.eq = [column, value];
          return builder;
        },
        async maybeSingle() {
          const reply = table === "sites" ? replies.sites : replies.profiles;
          return { data: reply?.data ?? null, error: reply?.error ?? null };
        },
      };

      return builder;
    },
  };

  return { client: client as unknown as SupabaseClient, calls };
}

const SITE = {
  id: "9c42df20-2868-4b87-a3b3-c5ae7fdabc5b",
  user_id: "1e0ebdfc-5acd-44f8-946e-79912fdc6d7a",
  slug: "cc-c",
  custom_domain: null,
  status: "published",
  content: {},
  theme: "v1",
  template_id: "ai-studio",
  created_at: "2026-10-04T00:00:00Z",
  updated_at: "2026-10-04T00:00:00Z",
  published_at: "2026-10-04T00:00:00Z",
};

const PRO = { id: "pro", name: "Pro", has_branding: false, site_limit: 10 };

describe("resolvePublicSite", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("reads the site row without embedding the owner profile", async () => {
    // The regression itself. A join here is what made a relationship problem
    // indistinguishable from a missing site.
    const { client, calls } = fakeClient({
      sites: { data: SITE },
      profiles: { data: { plans: PRO } },
    });

    await resolvePublicSite("cc-c", client);

    const siteCall = calls.find((c) => c.table === "sites")!;
    expect(siteCall.select).toBe("*");
    expect(siteCall.select).not.toContain("profiles");
    expect(siteCall.eq).toEqual(["slug", "cc-c"]);
  });

  it("returns the site and the owner's plan", async () => {
    const { client } = fakeClient({
      sites: { data: SITE },
      profiles: { data: { id: SITE.user_id, plan_id: "pro", plans: PRO } },
    });

    const resolved = await resolvePublicSite("cc-c", client);

    expect(resolved?.site).toEqual(SITE);
    expect(resolved?.plan).toEqual(PRO);
  });

  it("lowercases the slug so host case cannot cause a miss", async () => {
    const { client, calls } = fakeClient({ sites: { data: SITE } });

    await resolvePublicSite("CC-C", client);

    expect(calls[0]?.eq).toEqual(["slug", "cc-c"]);
  });

  it("resolves a custom domain without the custom: prefix", async () => {
    const { client, calls } = fakeClient({
      sites: { data: { ...SITE, slug: "cc-c", custom_domain: "myshop.example.com" } },
    });

    await resolvePublicSite("custom:myshop.example.com", client);

    expect(calls[0]?.eq).toEqual(["custom_domain", "myshop.example.com"]);
  });

  it("still renders the site when the plan lookup fails", async () => {
    // A paid site must not lose its page because of an entitlement lookup.
    const { client } = fakeClient({
      sites: { data: SITE },
      profiles: { error: { message: "PGRST201: could not embed" } },
    });

    const resolved = await resolvePublicSite("cc-c", client);

    expect(resolved?.site).toEqual(SITE);
    expect(resolved?.plan).toEqual(FREE_PLAN);
    expect(loggerMock.warn).toHaveBeenCalled();
  });

  it("still renders the site when the profile row is missing", async () => {
    const { client } = fakeClient({ sites: { data: SITE }, profiles: { data: null } });

    const resolved = await resolvePublicSite("cc-c", client);

    expect(resolved?.plan).toEqual(FREE_PLAN);
  });

  it("accepts an embedded plan returned as an array", async () => {
    // PostgREST returns an embedded to-many resource as an array; a schema
    // change must not crash the render.
    const { client } = fakeClient({
      sites: { data: SITE },
      profiles: { data: { plans: [PRO] } },
    });

    const resolved = await resolvePublicSite("cc-c", client);

    expect(resolved?.plan).toEqual(PRO);
  });

  it("returns null only when no such site exists", async () => {
    const { client } = fakeClient({ sites: { data: null } });

    await expect(resolvePublicSite("nothing-here", client)).resolves.toBeNull();
  });

  it("throws on a lookup failure instead of reporting a missing page", async () => {
    // A database error must surface as a server error. Returning null here is
    // what turned the PGRST201 into a 404 for every visitor.
    const { client } = fakeClient({
      sites: { error: { message: "connection reset" } },
    });

    await expect(resolvePublicSite("cc-c", client)).rejects.toThrow(
      /connection reset/
    );
    expect(loggerMock.error).toHaveBeenCalled();
  });
});