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
