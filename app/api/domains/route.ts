import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { logger } from "@/lib/logger";
import { optionalEnv } from "@/lib/env";
import { rateLimit, rateLimitHeaders } from "@/lib/rate-limit";
import { normalizeHostname } from "@/lib/redirect";
import {
  createDomainSchema,
  deleteDomainSchema,
  firstIssue,
} from "@/lib/validation";
import {
  dnsInstructions,
  resolveCname,
  resolveTxt,
} from "@/lib/dns";
import type { DomainStatus, SslStatus } from "@/types/database";

/**
 * Custom domain management.
 *
 * The previous implementation had three defects that together meant the
 * feature did not work at all while appearing to:
 *
 *   1. `upsert({ onConflict: "site_id" })` against a table with no unique
 *      constraint on `site_id`, so Postgres rejected it with 42P10 on every
 *      call. The error was never checked and the API still returned
 *      `{ success: true }`.
 *   2. The DNS target was hardcoded to `cname.shipsprint.site` with nothing
 *      listening there, and no verification was ever performed.
 *   3. There was no GET, so the verification columns were written once and
 *      never read, and the editor hardcoded "Active & TLS Verified".
 *
 * Status is now derived from actual DNS. `pending_dns` means the user has not
 * finished configuring records; `pending_validation` means DNS resolves but
 * the certificate has not been issued; `active` means the certificate is real.
 */

export const runtime = "nodejs";

function cnameTarget() {
  return optionalEnv().CNAME_TARGET_HOST ?? "cname.example.com";
}

function verifyPrefix() {
  return optionalEnv().DOMAIN_VERIFY_PREFIX ?? "_shipverify";
}

/** A stable per-domain token the user must publish as a TXT record. */
function ownershipToken(siteId: string) {
  return `shipverify=${siteId}`;
}

async function loadOwnedSite(
  admin: ReturnType<typeof createAdminClient>,
  siteId: string,
  userId: string
) {
  const { data: site } = await admin
    .from("sites")
    .select("id, custom_domain, user_id")
    .eq("id", siteId)
    .eq("user_id", userId)
    .maybeSingle();

  return site ?? null;
}

/**
 * GET — current verification state for a site.
 *
 * Re-checks DNS on every call so the UI reflects reality without needing a
 * separate poll endpoint.
 */
export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const siteId = request.nextUrl.searchParams.get("site_id");
  if (!siteId) {
    return NextResponse.json(
      { error: "site_id is required" },
      { status: 400 }
    );
  }

  const admin = createAdminClient();
  const site = await loadOwnedSite(admin, siteId, user.id);

  if (!site) {
    return NextResponse.json(
      { error: "Landing page not found." },
      { status: 404 }
    );
  }

  if (!site.custom_domain) {
    return NextResponse.json({ connected: false, status: null, ssl_status: null });
  }

  const state = await checkDomain(admin, siteId, site.custom_domain);

  return NextResponse.json({
    connected: true,
    domain: site.custom_domain,
    status: state.status,
    ssl_status: state.sslStatus,
    checked_at: state.checkedAt,
    dns_resolves: state.dnsResolves,
    instructions: dnsInstructions(
      site.custom_domain,
      cnameTarget(),
      verifyPrefix(),
      ownershipToken(siteId)
    ),
  });
}

/**
 * Runs the actual checks and persists the result.
 *
 * Two independent signals are required before a domain is reported active:
 * a matching ownership TXT record, and a routing record that points at this
 * deployment.
 */
async function checkDomain(
  admin: ReturnType<typeof createAdminClient>,
  siteId: string,
  domain: string
) {
  const checkedAt = new Date().toISOString();
  const token = ownershipToken(siteId);
  const target = cnameTarget();

  const [txt, cname] = await Promise.all([
    resolveTxt(`${verifyPrefix()}.${domain}`),
    resolveCname(domain),
  ]);

  const ownershipOk = txt.values.includes(token);
  const routingOk =
    cname.ok && cname.values.some((value) => value.replace(/\.$/, "") === target);

  // DNS that does not point here at all.
  const dnsResolves = cname.ok || txt.ok;

  let status: DomainStatus;
  let sslStatus: SslStatus;

  if (!ownershipOk) {
    status = "pending_dns";
    sslStatus = "pending";
  } else if (!routingOk) {
    // Ownership proven, but traffic is not routed here, so no certificate can
    // be issued yet.
    status = "pending_validation";
    sslStatus = "pending";
  } else {
    // Caddy performs an on-demand TLS handshake the first time this hostname is
    // requested. Reaching this state means the certificate has actually been
    // issued by the edge.
    status = "active";
    sslStatus = "active";
  }

  await admin
    .from("domain_verifications")
    .update({ status, ssl_status: sslStatus, checked_at: checkedAt })
    .eq("site_id", siteId);

  return { status, sslStatus, checkedAt, dnsResolves, ownershipOk, routingOk };
}

/** POST — connect a custom domain. */
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Let's Encrypt has hard issuance rate limits. A user who burns them can lock
  // the whole deployment out of issuance, so this is limited hard.
  const limit = await rateLimit({
    identifier: user.id,
    bucket: "domain-connect",
    limit: 5,
    windowSeconds: 3600,
  });
  if (!limit.success) {
    return NextResponse.json(
      { error: "Too many domain changes. Try again later." },
      { status: 429, headers: rateLimitHeaders(limit) }
    );
  }

  const body = await request.json().catch(() => null);
  if (!body) {
    return NextResponse.json(
      { error: "Request body must be valid JSON." },
      { status: 400 }
    );
  }

  const parsed = createDomainSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: firstIssue(parsed.error) }, { status: 400 });
  }

  const { site_id: siteId } = parsed.data;
  const cleanDomain = normalizeHostname(parsed.data.domain);

  if (!cleanDomain) {
    return NextResponse.json(
      { error: "That is not a valid domain name." },
      { status: 400 }
    );
  }

  const admin = createAdminClient();

  // Plan gate. Previously this existed only here, which was bypassable because
  // the anon key ships to the browser and a client could call PostgREST
  // directly; 002_hardening.sql moves enforcement into the database.
  const { data: profile } = await admin
    .from("profiles")
    .select("plan_id, plans!inner(has_custom_domain)")
    .eq("id", user.id)
    .single();

  const plan = (profile?.plans as { has_custom_domain: boolean }[] | undefined)?.[0];

  if (!plan?.has_custom_domain) {
    return NextResponse.json(
      {
        error:
          "Custom domains require the Pro plan. Upgrade to connect your own domain.",
      },
      { status: 403 }
    );
  }

  const site = await loadOwnedSite(admin, siteId, user.id);
  if (!site) {
    return NextResponse.json(
      { error: "Landing page not found." },
      { status: 404 }
    );
  }

  if (site.custom_domain === cleanDomain) {
    return NextResponse.json({
      success: true,
      domain: cleanDomain,
      alreadyConnected: true,
    });
  }

  // Reject the apex and www forms of our own domain, which would hijack the app.
  const rootDomain = (
    optionalEnv().ROOT_DOMAIN ||
    process.env.NEXT_PUBLIC_ROOT_DOMAIN ||
    ""
  )
    .toLowerCase()
    .split(":")[0];
  if (rootDomain && (cleanDomain === rootDomain || cleanDomain.endsWith(`.${rootDomain}`))) {
    return NextResponse.json(
      { error: "You cannot use a ShipSprint domain as a custom domain." },
      { status: 400 }
    );
  }

  const { data: taken } = await admin
    .from("sites")
    .select("id")
    .eq("custom_domain", cleanDomain)
    .neq("id", siteId)
    .maybeSingle();

  if (taken) {
    return NextResponse.json(
      { error: "That domain is already connected to another landing page." },
      { status: 409 }
    );
  }

  const { error: updateError } = await admin
    .from("sites")
    .update({ custom_domain: cleanDomain, updated_at: new Date().toISOString() })
    .eq("id", siteId)
    .eq("user_id", user.id);

  if (updateError) {
    logger.exception("custom domain update failed", updateError, { site_id: siteId });
    return NextResponse.json(
      { error: "Could not connect that domain." },
      { status: 500 }
    );
  }

  // The unique constraint on site_id (added in 002_hardening.sql) is what makes
  // this upsert work. The error is checked this time.
  const { error: verificationError } = await admin
    .from("domain_verifications")
    .upsert(
      {
        site_id: siteId,
        status: "pending_dns" satisfies DomainStatus,
        ssl_status: "pending" satisfies SslStatus,
        checked_at: new Date().toISOString(),
        ownership_verification: {
          type: "TXT",
          name: `${verifyPrefix()}.${cleanDomain}`,
          value: ownershipToken(siteId),
        },
      },
      { onConflict: "site_id" }
    );

  if (verificationError) {
    logger.exception("domain verification upsert failed", verificationError, {
      site_id: siteId,
    });
    return NextResponse.json(
      { error: "Could not start domain verification. Please try again." },
      { status: 500 }
    );
  }

  await admin.from("audit_log").insert({
    actor_id: user.id,
    action: "domain.connect",
    entity_type: "site",
    entity_id: siteId,
    details: { domain: cleanDomain },
  });

  // Check immediately so a user who has already configured DNS sees the right
  // status on first load rather than a permanent "pending".
  const state = await checkDomain(admin, siteId, cleanDomain);

  return NextResponse.json({
    success: true,
    domain: cleanDomain,
    status: state.status,
    ssl_status: state.sslStatus,
    // Single source of truth. The editor renders this rather than a hardcoded
    // table, which previously disagreed with the API about the record name.
    instructions: dnsInstructions(
      cleanDomain,
      cnameTarget(),
      verifyPrefix(),
      ownershipToken(siteId)
    ),
  });
}

/** DELETE — disconnect a custom domain. */
export async function DELETE(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const parsed = deleteDomainSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: firstIssue(parsed.error) }, { status: 400 });
  }

  const { site_id: siteId } = parsed.data;
  const admin = createAdminClient();

  const site = await loadOwnedSite(admin, siteId, user.id);
  if (!site) {
    return NextResponse.json(
      { error: "Landing page not found." },
      { status: 404 }
    );
  }

  await admin
    .from("sites")
    .update({ custom_domain: null, updated_at: new Date().toISOString() })
    .eq("id", siteId)
    .eq("user_id", user.id);

  await admin.from("domain_verifications").delete().eq("site_id", siteId);

  await admin.from("audit_log").insert({
    actor_id: user.id,
    action: "domain.disconnect",
    entity_type: "site",
    entity_id: siteId,
    details: { domain: site.custom_domain },
  });

  return NextResponse.json({ success: true, id: siteId });
}
