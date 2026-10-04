import type { SupabaseClient } from "@supabase/supabase-js";
import { logger } from "@/lib/logger";
import type { Plan, Site } from "@/types/database";

/**
 * Resolving the site behind a public hostname.
 *
 * The lookup used to be a single query that embedded the owner's profile and
 * plan inline:
 *
 *   sites.select("*, profiles ( ..., plans ( ... ) )").eq("slug", ...)
 *
 * That made the existence of the page depend on a join. The production database
 * carries two foreign key constraints for the same column pair — the one
 * Postgres names from the inline `references public.profiles (id)` clause
 * (`sites_user_id_fkey`) plus a second, hand-named `sites_user_fkey` — and
 * PostgREST refuses to guess between them:
 *
 *   PGRST201: Could not embed because more than one relationship was found for
 *   'sites' and 'profiles'
 *
 * so the whole query errored. The caller treated "error" and "no such site"
 * identically, which turned a database error into a "Page Not Found" page for
 * every published landing page while `/api/health` (which queries `plans`
 * without any embed) kept reporting the database as healthy.
 *
 * The site's existence now depends on the site row and nothing else. The
 * owner's plan is fetched separately and is strictly an enrichment: it decides
 * branding and entitlements, never whether the page renders. A failure there
 * degrades to the free plan and is logged.
 */

/** The plan assumed when the owner's profile or plan cannot be read. */
export const FREE_PLAN: Plan = {
  id: "free",
  name: "Free",
  tagline: "",
  site_limit: 1,
  has_branding: true,
  has_custom_domain: false,
  has_analytics_dashboard: false,
  has_email_capture: false,
  sort_order: 0,
  is_active: true,
};

/**
 * The client the lookup runs against. Typed as the real Supabase client so the
 * query shape stays honest in production; tests pass a stub.
 */
export type SiteLookupClient = SupabaseClient;

export interface ResolvedSite {
  site: Site;
  /** The owner's plan, or the free plan when it could not be determined. */
  plan: Plan;
}

/**
 * Finds the site published at `slugParam`, which the proxy builds as either
 * `<slug>` or `custom:<hostname>`.
 *
 * Returns null when no such site exists — that is the only condition that means
 * "not found". A database error is thrown so it surfaces as a server error
 * instead of a plausible-looking 404.
 */
export async function resolvePublicSite(
  slugParam: string,
  admin: SiteLookupClient
): Promise<ResolvedSite | null> {
  const isCustom = slugParam.startsWith("custom:");
  const lookupValue = isCustom ? slugParam.replace(/^custom:/, "") : slugParam;

  // No embed here, deliberately. This query answers exactly one question —
  // does this hostname belong to a site? — and must not fail because of an
  // unrelated relationship elsewhere in the schema.
  let query = admin.from("sites").select("*");
  query = isCustom
    ? query.eq("custom_domain", lookupValue)
    : query.eq("slug", lookupValue.toLowerCase());

  const { data, error } = await query.maybeSingle();

  if (error) {
    // Previously swallowed and reported as "Page Not Found", which hid a
    // database failure behind a page that looked like a legitimate miss.
    logger.error("public site lookup failed", {
      lookup: slugParam,
      error: error.message,
    });
    throw new Error(`Site lookup failed: ${error.message}`);
  }

  if (!data) return null;

  const site = data as Site;
  return { site, plan: await resolveOwnerPlan(site.user_id, admin) };
}

/**
 * The owner's plan, used for branding and entitlements.
 *
 * Best-effort by design: the site page must still render if this fails.
 */
async function resolveOwnerPlan(
  userId: string,
  admin: SiteLookupClient
): Promise<Plan> {
  const { data, error } = await admin
    .from("profiles")
    // This relationship (profiles.plan_id -> plans.id) carries a single
    // constraint, so unlike sites -> profiles it embeds unambiguously.
    .select("*, plans(*)")
    .eq("id", userId)
    .maybeSingle();

  const profile = data as { plans?: Plan | Plan[] | null } | null;

  // PostgREST returns an embedded to-many resource as an array. The profile ->
  // plans relationship is many-to-one, so this should be a single object; the
  // array branch keeps a schema change from crashing the render.
  const plan = Array.isArray(profile?.plans) ? profile?.plans[0] : profile?.plans;

  if (error || !plan) {
    logger.warn("owner plan unavailable, falling back to the free plan", {
      user_id: userId,
      error: error?.message ?? "no plan row",
    });
    return FREE_PLAN;
  }

  return plan;
}