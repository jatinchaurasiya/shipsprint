import "server-only";

import { promises as dns } from "node:dns";

/**
 * DNS resolution for custom-domain verification.
 *
 * There was no verification loop at all: `domain_verifications` rows were
 * written once and never read, and the editor reported "Active & TLS Verified"
 * the instant the user clicked Connect. These helpers are what make the
 * reported status reflect reality.
 *
 * Uses `dns/promises`, which is available in the Node.js runtime. Route
 * handlers that call this must not be pinned to the edge runtime.
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
    // ENODATA / ENOTFOUND simply mean the record is absent, which is a normal
    // state while the user is still configuring DNS.
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
 * What the user must create, derived from the domain itself.
 *
 * An apex domain (`myapp.com`) cannot be pointed with a CNAME, so it needs an
 * A/ALIAS record. The previous instructions said "CNAME" for every domain and
 * gave the record name as `@ or app` while the API stored the first label
 * (`myapp`), so the UI and the API answered the same question differently.
 */
export function dnsInstructions(
  domain: string,
  cnameTarget: string,
  verifyPrefix: string,
  expectedIp: string | null
) {
  const isApex = domain.split(".").filter(Boolean).length === 2;

  return {
    // The value that must be matched exactly in the TXT lookup.
    ownership: {
      type: "TXT" as const,
      name: `${verifyPrefix}.${domain}`,
      value: expectedIp ?? "",
      note: "Proves you control this domain. Must be present for verification to complete.",
    },
    routing: isApex
      ? {
          type: "A" as const,
          name: "@",
          value: cnameTarget,
          note:
            "An apex domain cannot use CNAME. If your DNS provider supports ALIAS or ANAME, use that instead of A.",
        }
      : {
          type: "CNAME" as const,
          name: "@",
          value: cnameTarget,
          note: "A certificate is issued automatically on the first request once DNS resolves.",
        },
  };
}
