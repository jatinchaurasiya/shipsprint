/**
 * Normalizes an image URL for resilient cross-environment rendering.
 *
 * In development, editor preview, or when using assets.shipsprint.site before
 * public edge DNS or TLS is fully configured, rewriting `https://assets.shipsprint.site/uploads/*`
 * to `/uploads/*` guarantees that the browser always fetches through the local
 * Next.js R2 streaming endpoint without failing on external TLS handshakes.
 */
export function normalizeImageUrl(url: string | null | undefined): string {
  if (!url) return "";

  // Data URLs or already root-relative paths
  if (url.startsWith("data:") || url.startsWith("/")) {
    return url;
  }

  // Rewrite assets.shipsprint.site/uploads/... or *.shipsprint.site/uploads/... to /uploads/...
  try {
    const parsed = new URL(url);
    if (
      parsed.pathname.startsWith("/uploads/") &&
      (parsed.hostname === "assets.shipsprint.site" ||
       parsed.hostname.startsWith("assets.") ||
       parsed.hostname === "shipsprint.site" ||
       parsed.hostname.endsWith(".shipsprint.site") ||
       parsed.hostname === "localhost" ||
       parsed.hostname === "127.0.0.1")
    ) {
      return parsed.pathname + parsed.search;
    }
  } catch {
    // If not a valid URL, return as-is
  }

  return url;
}
