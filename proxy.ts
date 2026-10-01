import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";
import { safeRedirectPath } from "@/lib/redirect";

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

const rootDomain = (process.env.ROOT_DOMAIN || "localhost:3000")
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

  // If customer subdomain or custom domain, rewrite to /site/[lookup]
  if (host.kind !== "app" && host.value) {
    if (
      pathname.startsWith("/_next") ||
      pathname.startsWith("/api/analytics/beacon") ||
      pathname.startsWith("/favicon.ico")
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

  if (pathname.startsWith("/dashboard") && !user) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", safeRedirectPath(pathname));
    return NextResponse.redirect(loginUrl);
  }

  if ((pathname === "/login" || pathname === "/signup") && user) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
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
