import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export async function middleware(request: NextRequest) {
  // 1. Update Supabase auth session
  const { supabaseResponse, user } = await updateSession(request);

  const { pathname } = request.nextUrl;
  const host = request.headers.get("host") || "";

  // 2. Auth Protection Rules
  const isAuthPage = pathname === "/login" || pathname === "/signup";
  const isDashboardPage = pathname.startsWith("/dashboard");

  if (isDashboardPage && !user) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (isAuthPage && user) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  // 3. Subdomain and Custom Domain Routing
  // Clean root domain from host
  const rootDomain = process.env.NEXT_PUBLIC_ROOT_DOMAIN || "shipsprint.site";
  const isLocalhost = host.includes("localhost") || host.includes("127.0.0.1");

  // Bypass static files and api routes for subdomain rewriting
  const isStaticOrApi =
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api") ||
    pathname.startsWith("/auth") ||
    pathname.startsWith("/login") ||
    pathname.startsWith("/signup") ||
    pathname.startsWith("/dashboard") ||
    pathname.startsWith("/site") ||
    pathname.includes(".");

  if (!isStaticOrApi) {
    let subdomain: string | null = null;

    if (isLocalhost) {
      // For local testing, e.g. fitpulse.localhost:3000
      const hostParts = host.split(":")[0].split(".");
      if (hostParts.length > 1 && hostParts[0] !== "localhost") {
        subdomain = hostParts[0];
      }
    } else {
      // In production
      const cleanHost = host.toLowerCase().replace(/:\d+$/, "");
      if (cleanHost.endsWith(`.${rootDomain}`)) {
        // e.g. habitflow.shipsprint.site
        subdomain = cleanHost.replace(`.${rootDomain}`, "");
      } else if (cleanHost !== rootDomain && cleanHost !== `www.${rootDomain}`) {
        // Custom domain! e.g. habitflow.com -> rewrite with custom domain identifier
        subdomain = `custom:${cleanHost}`;
      }
    }

    if (subdomain) {
      // Rewrite to /site/[slug]
      const url = request.nextUrl.clone();
      url.pathname = `/site/${subdomain}`;
      return NextResponse.rewrite(url, {
        headers: supabaseResponse.headers,
      });
    }
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * Feel free to modify this pattern to include more paths.
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
