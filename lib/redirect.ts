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
