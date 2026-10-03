import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";
import {
  canonicalOrigin,
  postSignupDestination,
  safeRedirectPath,
} from "@/lib/redirect";

/**
 * Network boundary for the app.
 *
 * Two responsibilities:
 *   1. Auth redirects and session refresh, for the dashboard only.
 *   2. Rewriting customer subdomains and custom domains to /site/[lookup].
 *
 * Note on host classification: the previous implementation treated *any* host
 * that was not the root domain as a customer custom domain. That made `/`
 * render "Page Not Found" on every preview and staging host, and broke
 * `127.0.0.1` (split on "." yields "127" as the subdomain). Hosts serving the
 * app itself are now an explicit allow-list.
 */

type HostKind = "app" | "subdomain" | "custom";

const rootDomain = (
  process.env.ROOT_DOMAIN ||
  process.env.NEXT_PUBLIC_ROOT_DOMAIN ||
  "localhost:3000"
)
  .toLowerCase()
  .split(":")[0]!;

/**
 * Hosts that serve the application itself. `APP_HOSTS` exists so preview and
 * staging deployments do not get rewritten as customer custom domains.
 */
const appHosts = new Set<string>([
  rootDomain,
  `www.${rootDomain}`,
  "localhost",
  "127.0.0.1",
  ...(process.env.APP_HOSTS ?? "")
    .split(",")
    .map((host) => host.trim().toLowerCase().split(":")[0]!)
    .filter(Boolean),
]);

export function classifyHost(rawHost: string): { kind: HostKind; value: string | null } {
  const hostname = rawHost.toLowerCase().split(":")[0]!;
  if (!hostname) return { kind: "app", value: null };

  if (appHosts.has(hostname)) return { kind: "app", value: null };

  // Customer subdomain: myapp.shipsprint.site, or myapp.localhost in dev.
  if (hostname.endsWith(`.${rootDomain}`)) {
    const label = hostname.slice(0, -(rootDomain.length + 1));
    if (label) return { kind: "subdomain", value: label };
  }
  if (hostname.endsWith(".localhost")) {
    const label = hostname.slice(0, -".localhost".length);
    if (label) return { kind: "subdomain", value: label };
  }

  // Everything else is a candidate custom domain. The database lookup decides
  // whether it exists, and Caddy's on-demand TLS `ask` endpoint independently
  // gates certificate issuance.
  return { kind: "custom", value: hostname };
}

/** Paths that need a refreshed session and an auth redirect. */
function needsAuth(pathname: string) {
  return (
    pathname === "/login" ||
    pathname === "/signup" ||
    pathname.startsWith("/dashboard")
  );
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const host = classifyHost(request.headers.get("host") ?? "");

  // If customer subdomain or custom domain, rewrite to /site/[lookup].
  //
  // Two kinds of paths pass through unrewritten on a customer host:
  //   - assets the rendered site legitimately needs (_next, favicon, robots,
  //     sitemap) and the analytics beacon (/api/track);
  //   - infrastructure endpoints addressed by host rather than by the public
  //     path. /api/caddy/ask is called by Caddy itself (Host: the app service
  //     name) as the on-demand TLS allow-list; rewriting it away made Caddy see
  //     a 200 HTML page for every hostname and defeated the certificate
  //     rate-limit guard. /api/health is the same class of internal endpoint.
  if (host.kind !== "app" && host.value) {
    if (
      pathname.startsWith("/_next") ||
      pathname.startsWith("/api/track") ||
      pathname === "/api/caddy/ask" ||
      pathname === "/api/health" ||
      pathname === "/robots.txt" ||
      pathname === "/sitemap.xml" ||
      pathname === "/favicon.ico"
    ) {
      return NextResponse.next();
    }

    const url = request.nextUrl.clone();
    url.pathname = `/site/${host.kind === "custom" ? `custom:${host.value}` : host.value}`;
    return NextResponse.rewrite(url);
  }

  // App host logic (shipsprint.site, localhost, etc.)
  if (!needsAuth(pathname)) {
    return NextResponse.next();
  }

  const { supabaseResponse, user } = await updateSession(request);

  // `request.url` carries the container's own origin behind the proxy
  // (0.0.0.0:3000), so the redirect base must come from the configured public
  // origin — see canonicalOrigin.
  const origin = canonicalOrigin(request.url);

  if (pathname.startsWith("/dashboard") && !user) {
    const loginUrl = new URL("/login", origin);
    // Preserve the query so context (e.g. ?template=, ?upgrade=) survives the
    // login round-trip instead of silently resetting to a bare /dashboard.
    loginUrl.searchParams.set(
      "next",
      safeRedirectPath(request.nextUrl.pathname + request.nextUrl.search)
    );
    return NextResponse.redirect(loginUrl);
  }

  // An already-signed-in visitor on an auth entry page is stale navigation, so
  // send them where that page itself would have taken them — reusing the signup
  // form's own destination rules so a chosen ?plan= / ?template= survives
  // (the old bare-/dashboard redirect silently discarded it, and the gallery
  // template the user had just picked never reached the create dialog).
  // /login honors a validated ?next= for the same reason. A next pointing back
  // at /login or /signup would bounce an already-signed-in browser between the
  // entry pages forever, so it degrades to /dashboard.
  if ((pathname === "/login" || pathname === "/signup") && user) {
    const destination =
      pathname === "/signup"
        ? postSignupDestination(request.nextUrl.searchParams)
        : safeRedirectPath(request.nextUrl.searchParams.get("next"));

    const entry = destination.split(/[?#]/)[0];
    if (entry === "/login" || entry === "/signup") {
      return NextResponse.redirect(new URL("/dashboard", origin));
    }
    return NextResponse.redirect(new URL(destination, origin));
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    /*
     * Everything except static assets. API routes are included so they can be
     * classified, but `needsAuth` short-circuits before the session refresh.
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|woff2?)$).*)",
  ],
};
