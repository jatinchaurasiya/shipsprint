import "server-only";

import { promises as dns } from "node:dns";

/**
 * DNS resolution for custom-domain verification.
 *
 * Provides real-time DNS queries for:
 *   1. Domain ownership TXT records (_shipverify.<domain>)
 *   2. Domain routing CNAME records (pointing to cnameTarget)
 *   3. Domain routing A records (matching server IPv4 or cnameTarget IPv4)
 *
 * Uses `dns/promises`, which is available in the Node.js runtime.
 */

export interface DnsResult {
  ok: boolean;
  values: string[];
  error?: string;
}

const TIMEOUT_MS = 5000;

function withTimeout<T>(promise: Promise<T>): Promise<T | null> {
  return Promise.race([
    promise,
    new Promise<null>((resolve) => setTimeout(() => resolve(null), TIMEOUT_MS)),
  ]);
}

export async function resolveTxt(hostname: string): Promise<DnsResult> {
  try {
    const records = await withTimeout(dns.resolveTxt(hostname));
    if (records === null) {
      return { ok: false, values: [], error: "DNS lookup timed out" };
    }
    return {
      ok: true,
      // resolveTxt returns string[][] per record.
      values: records.map((parts) => parts.join("")),
    };
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code;
    return {
      ok: false,
      values: [],
      error: code === "ENOTFOUND" || code === "ENODATA" ? "no_record" : String(code ?? error),
    };
  }
}

export async function resolveCname(hostname: string): Promise<DnsResult> {
  try {
    const records = await withTimeout(dns.resolveCname(hostname));
    if (records === null) {
      return { ok: false, values: [], error: "DNS lookup timed out" };
    }
    return { ok: true, values: records };
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code;
    return {
      ok: false,
      values: [],
      error: code === "ENOTFOUND" || code === "ENODATA" ? "no_record" : String(code ?? error),
    };
  }
}

export async function resolveARecord(hostname: string): Promise<DnsResult> {
  try {
    const records = await withTimeout(dns.resolve4(hostname));
    if (records === null) {
      return { ok: false, values: [], error: "DNS lookup timed out" };
    }
    return { ok: true, values: records };
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code;
    return {
      ok: false,
      values: [],
      error: code === "ENOTFOUND" || code === "ENODATA" ? "no_record" : String(code ?? error),
    };
  }
}

/**
 * Resolves the primary public IPv4 address of the routing target.
 * Prefers the explicit SERVER_IPV4 environment variable, falling back to
 * dynamically resolving the A record of `cnameTarget`.
 */
export async function getDnsTargetIp(cnameTarget: string): Promise<string | null> {
  const envIp = process.env.SERVER_IPV4?.trim();
  if (envIp) return envIp;

  try {
    const res = await resolveARecord(cnameTarget);
    if (res.ok && res.values.length > 0 && res.values[0]) {
      return res.values[0];
    }
  } catch {
    // Non-fatal; falls back to cnameTarget string
  }
  return null;
}

/**
 * Detects whether a domain is an apex domain (e.g. `example.com`, `example.co.uk`)
 * or a subdomain (e.g. `app.example.com`, `launch.example.co.uk`), and extracts
 * the exact relative record name for registrar configurations.
 */
export function parseDomainLabels(domain: string): {
  isApex: boolean;
  subdomainLabel: string;
} {
  const clean = domain.trim().toLowerCase().replace(/\.$/, "");
  const parts = clean.split(".").filter(Boolean);

  if (parts.length <= 2) {
    return { isApex: true, subdomainLabel: "@" };
  }

  // Common second-level domain ccTLDs where a 3-part hostname is still an apex
  const twoPartTlds = new Set([
    "co.uk", "org.uk", "me.uk", "ltd.uk",
    "com.au", "net.au", "org.au", "edu.au",
    "co.nz", "net.nz", "org.nz",
    "co.za", "org.za",
    "co.jp", "ne.jp", "or.jp",
    "com.br", "net.br",
    "com.mx", "org.mx",
    "co.in", "net.in", "org.in", "gen.in", "firm.in", "ind.in",
    "com.sg", "edu.sg",
    "com.tr", "org.tr",
  ]);

  const lastTwo = `${parts[parts.length - 2]}.${parts[parts.length - 1]}`;
  if (parts.length === 3 && twoPartTlds.has(lastTwo)) {
    return { isApex: true, subdomainLabel: "@" };
  }

  const apexLabelCount = twoPartTlds.has(lastTwo) ? 3 : 2;
  const subLabels = parts.slice(0, parts.length - apexLabelCount);
  return {
    isApex: false,
    subdomainLabel: subLabels.join(".") || "@",
  };
}

/**
 * Produces accurate, registrar-compatible DNS instructions for a custom domain.
 *
 * For subdomains (e.g. `app.mybrand.com`):
 *   - Type: CNAME
 *   - Name: `app` (relative)
 *   - Value: `cname.shipsprint.site`
 *
 * For apex domains (e.g. `mybrand.com`):
 *   - Type: A
 *   - Name: `@`
 *   - Value: IPv4 address (or cnameTarget for ALIAS/ANAME)
 */
export function dnsInstructions(
  domain: string,
  cnameTarget: string,
  verifyPrefix: string,
  ownershipToken: string,
  targetIp: string | null = null
) {
  const { isApex, subdomainLabel } = parseDomainLabels(domain);

  return {
    ownership: {
      type: "TXT" as const,
      name: `${verifyPrefix}.${domain}`,
      value: ownershipToken,
      note: `Proves domain control. Add TXT record with host '${verifyPrefix}' (or '${verifyPrefix}.${domain}') and value above.`,
    },
    routing: isApex
      ? {
          type: "A" as const,
          name: "@",
          value: targetIp || cnameTarget,
          note: targetIp
            ? `Point '@' to ${targetIp} via an A record, or use an ALIAS/ANAME record pointing to ${cnameTarget} if your DNS provider supports CNAME flattening.`
            : `An apex domain cannot use CNAME. Point '@' to ${cnameTarget} using an ALIAS or ANAME record (or an A record to your server IP).`,
        }
      : {
          type: "CNAME" as const,
          name: subdomainLabel,
          value: cnameTarget,
          note: `Point your subdomain '${subdomainLabel}' (or '${domain}') to ${cnameTarget} using a CNAME record.`,
        },
  };
}
