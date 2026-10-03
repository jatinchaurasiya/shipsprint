/**
 * Redirect-target validation.
 *
 * `new URL("https://evil.com", "https://app.example.com/login")` returns
 * `https://evil.com` — an absolute URL in the second argument wins. Feeding an
 * unvalidated `?next=` parameter into that (or into `router.push`) is an open
 * redirect, which is a ready-made phishing primitive when the redirect fires
 * immediately after a successful email confirmation or OAuth callback.
 *
 * Only same-origin application paths are accepted. Anything protocol-relative
 * (`//host`), absolute (`https://host`), backslash-smuggled (`/\host`), or
 * scheme-bearing is rejected.
 */

const DEFAULT_REDIRECT = "/dashboard";

/**
 * The absolute origin a server-side redirect should target.
 *
 * `request.url` cannot be trusted for this behind the container. The Next.js
 * standalone server reconstructs the request origin from its own HOSTNAME and
 * PORT rather than from the public host that Caddy terminated TLS for, and the
 * Dockerfile sets `HOSTNAME=0.0.0.0`. A Google sign-up therefore completed
 * successfully and then redirected to `https://0.0.0.0:3000/dashboard`, an
 * address no browser can reach. The protocol was correct (`https`, taken from
 * X-Forwarded-Proto) while the host was the container's, which is why the
 * failure looked arbitrary.
 *
 * NEXT_PUBLIC_APP_URL is the configured public origin and exists for exactly
 * this purpose, so it wins whenever it is a usable absolute http(s) URL. The
 * request origin stays as the fallback, which is what local development wants:
 * there APP_URL is http://localhost:3000 and matches the request anyway.
 *
 * Returns only an origin, so a misconfigured value cannot smuggle a path or
 * authority into a redirect. Never throws — an unusable configuration degrades
 * to the request origin instead of turning a redirect into a 500.
 */
export function canonicalOrigin(requestOrigin: string): string {
  const configured = process.env.NEXT_PUBLIC_APP_URL?.trim();

  if (configured) {
    const origin = toOrigin(configured);
    if (origin) return origin;
  }

  return toOrigin(requestOrigin) ?? requestOrigin;
}

/** Reduces a value to a bare http(s) origin, or null when it is not one. */
function toOrigin(value: string): string | null {
  try {
    const url = new URL(value);
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    return url.origin;
  } catch {
    return null;
  }
}

/**
 * The public origin of the application itself, for links that must reach the
 * app even when the page is rendered on a customer subdomain or custom domain
 * (where the proxy rewrites every app path back to the customer's own site).
 *
 * NEXT_PUBLIC_APP_URL is the configured public origin and is inlined into both
 * the server and client bundles, so this works from Server Components and from
 * client components alike. When it is unset or unusable it degrades to the
 * registered root domain rather than emitting an empty or relative href — which
 * on a customer host would silently loop back to the customer's own page.
 */
export function appOrigin(): string {
  const configured = process.env.NEXT_PUBLIC_APP_URL?.trim();
  const origin = configured ? toOrigin(configured) : null;
  if (origin) return origin;

  const root = (
    process.env.NEXT_PUBLIC_ROOT_DOMAIN ||
    process.env.ROOT_DOMAIN ||
    "localhost:3000"
  )
    .toLowerCase()
    .split(":")[0]!;

  if (!root || root === "localhost" || root === "127.0.0.1") {
    return "http://localhost:3000";
  }
  return `https://${root}`;
}

/**
 * The `Domain` attribute for the Supabase auth session cookie, or undefined to
 * leave the cookie host-only.
 *
 * The session is established on the apex app host (shipsprint.site) but must
 * also be visible on customer subdomains (myapp.shipsprint.site) so a site owner
 * can preview their own draft at its live URL. A host-only cookie is scoped to
 * the exact host that set it and is never sent to sibling subdomains, so the
 * owner check on the subdomain silently failed and the owner's own draft
 * rendered as a 404. Scoping the cookie to the registered root domain shares
 * one session across the apex and all customer subdomains without leaking it to
 * unrelated domains.
 *
 * A `Domain` attribute is only valid for a real DNS hostname: browsers reject it
 * for IP addresses and it is unnecessary on single-label loopback hosts, so
 * local development keeps the host-only default and returns undefined.
 */
export function sessionCookieDomain(): string | undefined {
  const root = (
    process.env.ROOT_DOMAIN ||
    process.env.NEXT_PUBLIC_ROOT_DOMAIN ||
    ""
  )
    .trim()
    .toLowerCase()
    .split(":")[0]!
    .replace(/\.$/, "");

  if (!root || !root.includes(".")) return undefined;
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(root)) return undefined;
  return root;
}

export function safeRedirectPath(
  candidate: string | null | undefined,
  fallback: string = DEFAULT_REDIRECT
): string {
  if (typeof candidate !== "string") return fallback;

  const value = candidate.trim();
  if (!value) return fallback;

  // Reject anything that could escape the origin.
  //   //host, /\host  -> protocol-relative
  //   scheme:...     -> absolute URL or javascript:
  //   %2f%2fhost     -> percent-encoded protocol-relative
  if (value.startsWith("//")) return fallback;
  if (value.startsWith("/\\")) return fallback;
  if (value.includes("\\")) return fallback;
  if (/^\s*[a-zA-Z][a-zA-Z0-9+.-]*:/.test(value)) return fallback;
  if (/^%2f/i.test(value) || /^%5c/i.test(value)) return fallback;

  // Must be a root-relative path with no authority component.
  if (!value.startsWith("/")) return fallback;

  return value;
}

/**
 * The destination after signing up, derived from the query that arrived with
 * the visitor.
 *
 * A plan or template chosen on the marketing site travels as `?plan=` /
 * `?template=` on the signup URL. Both the signup form and the proxy need the
 * exact same answer: the proxy intercepts an already-signed-in visitor who
 * opens /signup (a stale link, a gallery CTA) and previously redirected to a
 * bare /dashboard, silently discarding the template they had just picked —
 * the create dialog then opened with no template preselected. One function,
 * shared by both call sites, means the two paths cannot drift.
 *
 * The plan is validated against the fixed product list and every interpolated
 * value is percent-encoded, so a crafted query cannot smuggle a path or an
 * authority into the resulting relative redirect.
 */
const PRODUCT_IDS = [
  "basic_monthly",
  "basic_yearly",
  "pro_monthly",
  "pro_yearly",
] as const;

export function postSignupDestination(
  params: Pick<URLSearchParams, "get">
): string {
  const plan = params.get("plan");
  const planId =
    plan && (PRODUCT_IDS as readonly string[]).includes(plan) ? plan : null;
  const template = params.get("template");
  const templateParam = template
    ? `&template=${encodeURIComponent(template)}`
    : "";

  if (planId) {
    return `/dashboard/billing?upgrade=${encodeURIComponent(planId)}${templateParam}`;
  }
  if (template) {
    return `/dashboard?template=${encodeURIComponent(template)}`;
  }
  return "/dashboard";
}

/** True when a custom domain is syntactically usable. */
export function normalizeHostname(input: string): string | null {
  let value = input.trim().toLowerCase();
  if (!value) return null;

  // Accept a pasted URL and reduce it to the hostname.
  if (value.includes("://")) {
    try {
      value = new URL(value).hostname.toLowerCase();
    } catch {
      return null;
    }
  }

  // Strip a port, path, and any userinfo.
  const authority = value.split("/")[0]?.split("?")[0]?.split("#")[0];
  if (!authority) return null;

  const at = authority.lastIndexOf("@");
  const host = (at === -1 ? authority : authority.slice(at + 1)).split(":")[0];
  if (!host) return null;

  value = host;

  if (!value || value.length > 253) return null;
  if (!/^[a-z0-9.-]+$/.test(value)) return null;
  if (value.includes("..")) return null;

  const labels = value.split(".");
  if (labels.length < 2) return null;

  // Validate every DNS label independently. Checking only the first and last
  // character of the whole hostname let `bad-.com` through, because it ends in
  // "m" rather than "-".
  for (const label of labels) {
    if (label.length < 1 || label.length > 63) return null;
    if (label.startsWith("-") || label.endsWith("-")) return null;
    if (!/^[a-z0-9-]+$/.test(label)) return null;
  }

  return value;
}
