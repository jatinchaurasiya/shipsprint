import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest, NextResponse } from "next/server";

/**
 * Behavioural tests for the `proxy()` function in proxy.ts (the Next.js
 * middleware): customer-host rewrites, infrastructure pass-through, and the
 * auth redirects — including their ORIGIN, which is the part that was broken.
 *
 * The origin regression: in the Docker standalone deployment `request.url`
 * resolves to the container's own address (`http://0.0.0.0:3000`), not the
 * public host. So these tests construct requests whose URL carries that broken
 * container origin while the `Host` header is the real public host — exactly the
 * production shape — and assert the redirect lands on the configured public
 * origin (NEXT_PUBLIC_APP_URL), never on 0.0.0.0:3000.
 *
 * `updateSession` is mocked so no live Supabase project or public env is needed.
 */

const { updateSessionMock } = vi.hoisted(() => ({
  updateSessionMock: vi.fn(),
}));

vi.mock("@/lib/supabase/middleware", () => ({
  updateSession: (...args: unknown[]) => updateSessionMock(...args),
}));

const ENV_KEYS = [
  "ROOT_DOMAIN",
  "NEXT_PUBLIC_ROOT_DOMAIN",
  "APP_HOSTS",
  "NEXT_PUBLIC_APP_URL",
] as const;

function setEnv(env: Record<string, string | undefined>) {
  for (const key of ENV_KEYS) {
    if (env[key] === undefined) delete process.env[key];
    else process.env[key] = env[key];
  }
}

async function loadProxy(env: Record<string, string | undefined>) {
  setEnv(env);
  vi.resetModules();
  return import("../proxy");
}

// A request whose URL is the broken container origin but whose Host header is the
// real public host — the exact shape Next produces behind the Docker proxy.
function brokenRequest(pathname: string, host: string, search = "") {
  return new NextRequest(`http://0.0.0.0:3000${pathname}${search}`, {
    headers: { host },
  });
}

function publicRequest(url: string, host: string) {
  return new NextRequest(url, { headers: { host } });
}

function noRedirect(res: Response) {
  return res.headers.get("location") === null;
}

describe("proxy()", () => {
  beforeEach(() => {
    updateSessionMock.mockReset();
  });

  afterEach(() => {
    for (const key of ENV_KEYS) delete process.env[key];
  });

  describe("customer-host rewrites", () => {
    it("rewrites a subdomain path to /site/<slug>", async () => {
      const { proxy } = await loadProxy({ ROOT_DOMAIN: "shipsprint.site" });
      const res = await proxy(
        publicRequest("https://myapp.shipsprint.site/pricing", "myapp.shipsprint.site")
      );
      expect(res.headers.get("x-middleware-rewrite")).toContain("/site/myapp");
      expect(updateSessionMock).not.toHaveBeenCalled();
    });

    it("rewrites a custom domain to /site/custom:<domain>", async () => {
      const { proxy } = await loadProxy({ ROOT_DOMAIN: "shipsprint.site" });
      const res = await proxy(
        publicRequest("https://myshop.example.com/", "myshop.example.com")
      );
      expect(res.headers.get("x-middleware-rewrite")).toContain(
        "/site/custom:myshop.example.com"
      );
    });

    it("preserves the query string on the rewrite", async () => {
      const { proxy } = await loadProxy({ ROOT_DOMAIN: "shipsprint.site" });
      const res = await proxy(
        publicRequest("https://myapp.shipsprint.site/?ref=abc", "myapp.shipsprint.site")
      );
      expect(res.headers.get("x-middleware-rewrite")).toContain("/site/myapp?ref=abc");
    });
  });

  describe("customer-host pass-through (never rewritten)", () => {
    const passthroughPaths = [
      "/_next/static/chunks/app.js",
      "/uploads/2026-10-07/test.png",
      "/api/track",
      "/api/caddy/ask",
      "/api/health",
      "/robots.txt",
      "/sitemap.xml",
      "/favicon.ico",
    ];

    it.each(passthroughPaths)("%s passes through on a customer host", async (path) => {
      const { proxy } = await loadProxy({ ROOT_DOMAIN: "shipsprint.site" });
      const res = await proxy(
        publicRequest(`https://myapp.shipsprint.site${path}`, "myapp.shipsprint.site")
      );
      expect(res.headers.get("x-middleware-rewrite")).toBeNull();
      expect(updateSessionMock).not.toHaveBeenCalled();
    });

    it("passes Caddy's on-demand TLS ask through even when the Host is the app service name", async () => {
      // Caddy calls this directly (Host: the app container) with the candidate
      // domain in the query string. It must reach the handler, or the TLS
      // allow-list is defeated and Caddy sees a 200 for every hostname.
      const { proxy } = await loadProxy({ ROOT_DOMAIN: "shipsprint.site" });
      const res = await proxy(
        brokenRequest("/api/caddy/ask?domain=foo.com", "app")
      );
      expect(res.headers.get("x-middleware-rewrite")).toBeNull();
      expect(updateSessionMock).not.toHaveBeenCalled();
    });
  });

  describe("app-host auth redirects", () => {
    const env = { ROOT_DOMAIN: "shipsprint.site", NEXT_PUBLIC_APP_URL: "https://shipsprint.site" };

    it("redirects an unauthenticated /dashboard to the public login origin (not the container)", async () => {
      updateSessionMock.mockResolvedValue({ supabaseResponse: NextResponse.next(), user: null });
      const { proxy } = await loadProxy(env);
      const res = await proxy(brokenRequest("/dashboard", "shipsprint.site"));

      expect(res.status).toBe(307);
      // The regression: this must be the configured public origin, never 0.0.0.0:3000.
      expect(res.headers.get("location")).toBe(
        "https://shipsprint.site/login?next=%2Fdashboard"
      );
      expect(res.headers.get("location")).not.toContain("0.0.0.0");
    });

    it("preserves the query string through the login round-trip", async () => {
      updateSessionMock.mockResolvedValue({ supabaseResponse: NextResponse.next(), user: null });
      const { proxy } = await loadProxy(env);
      const res = await proxy(
        brokenRequest("/dashboard?template=ios-swift", "shipsprint.site")
      );

      expect(res.headers.get("location")).toBe(
        "https://shipsprint.site/login?next=%2Fdashboard%3Ftemplate%3Dios-swift"
      );
    });

    it("redirects a logged-in visitor on /login to the public dashboard origin", async () => {
      updateSessionMock.mockResolvedValue({
        supabaseResponse: NextResponse.next(),
        user: { id: "user-1" },
      });
      const { proxy } = await loadProxy(env);
      const res = await proxy(brokenRequest("/login", "shipsprint.site"));

      expect(res.status).toBe(307);
      expect(res.headers.get("location")).toBe("https://shipsprint.site/dashboard");
    });

    it("redirects a logged-in visitor on /signup to the public dashboard origin", async () => {
      updateSessionMock.mockResolvedValue({
        supabaseResponse: NextResponse.next(),
        user: { id: "user-1" },
      });
      const { proxy } = await loadProxy(env);
      const res = await proxy(brokenRequest("/signup", "shipsprint.site"));

      expect(res.status).toBe(307);
      expect(res.headers.get("location")).toBe("https://shipsprint.site/dashboard");
    });

    it("keeps the chosen template when a signed-in visitor lands on /signup", async () => {
      // The gallery's "Use template" CTA points at /signup?template=<id>. A
      // signed-in visitor is bounced off /signup by the proxy; the old bare
      // /dashboard redirect discarded the template, so the create dialog on
      // the dashboard opened with nothing preselected.
      updateSessionMock.mockResolvedValue({
        supabaseResponse: NextResponse.next(),
        user: { id: "user-1" },
      });
      const { proxy } = await loadProxy(env);
      const res = await proxy(
        brokenRequest("/signup?template=ios-swift", "shipsprint.site")
      );

      expect(res.status).toBe(307);
      expect(res.headers.get("location")).toBe(
        "https://shipsprint.site/dashboard?template=ios-swift"
      );
    });

    it("keeps a chosen plan (and template) when a signed-in visitor lands on /signup", async () => {
      updateSessionMock.mockResolvedValue({
        supabaseResponse: NextResponse.next(),
        user: { id: "user-1" },
      });
      const { proxy } = await loadProxy(env);
      const res = await proxy(
        brokenRequest("/signup?plan=pro_monthly&template=ios-swift", "shipsprint.site")
      );

      expect(res.headers.get("location")).toBe(
        "https://shipsprint.site/dashboard/billing?upgrade=pro_monthly&template=ios-swift"
      );
    });

    it("ignores an unknown plan on /signup instead of trusting it", async () => {
      updateSessionMock.mockResolvedValue({
        supabaseResponse: NextResponse.next(),
        user: { id: "user-1" },
      });
      const { proxy } = await loadProxy(env);
      const res = await proxy(
        brokenRequest("/signup?plan=bogus&template=saas-dev", "shipsprint.site")
      );

      expect(res.headers.get("location")).toBe(
        "https://shipsprint.site/dashboard?template=saas-dev"
      );
    });

    it("honors a validated ?next= for a signed-in visitor on /login", async () => {
      updateSessionMock.mockResolvedValue({
        supabaseResponse: NextResponse.next(),
        user: { id: "user-1" },
      });
      const { proxy } = await loadProxy(env);
      const res = await proxy(
        brokenRequest("/login?next=%2Fdashboard%2Feditor%2Fabc", "shipsprint.site")
      );

      expect(res.headers.get("location")).toBe(
        "https://shipsprint.site/dashboard/editor/abc"
      );
    });

    it("rejects an off-origin ?next= for a signed-in visitor on /login", async () => {
      updateSessionMock.mockResolvedValue({
        supabaseResponse: NextResponse.next(),
        user: { id: "user-1" },
      });
      const { proxy } = await loadProxy(env);
      const res = await proxy(
        brokenRequest("/login?next=https%3A%2F%2Fevil.com", "shipsprint.site")
      );

      expect(res.headers.get("location")).toBe("https://shipsprint.site/dashboard");
    });

    it.each(["%2Flogin", "%2Fsignup%3Fplan%3Dpro_monthly"])(
      "does not bounce a signed-in visitor back to an auth entry page (?next=%s)",
      async (next) => {
        updateSessionMock.mockResolvedValue({
          supabaseResponse: NextResponse.next(),
          user: { id: "user-1" },
        });
        const { proxy } = await loadProxy(env);
        const res = await proxy(
          brokenRequest(`/login?next=${next}`, "shipsprint.site")
        );

        expect(res.headers.get("location")).toBe("https://shipsprint.site/dashboard");
      }
    );

    it("redirects an unauthenticated /dashboard/analytics to login, preserving next", async () => {
      updateSessionMock.mockResolvedValue({
        supabaseResponse: NextResponse.next(),
        user: null,
      });
      const { proxy } = await loadProxy(env);
      const res = await proxy(
        brokenRequest("/dashboard/analytics", "shipsprint.site")
      );

      expect(res.status).toBe(307);
      expect(res.headers.get("location")).toBe(
        "https://shipsprint.site/login?next=%2Fdashboard%2Fanalytics"
      );
    });

    it("lets a signed-in visitor through to /dashboard/analytics", async () => {
      updateSessionMock.mockResolvedValue({
        supabaseResponse: NextResponse.next(),
        user: { id: "user-1" },
      });
      const { proxy } = await loadProxy(env);
      const res = await proxy(
        brokenRequest("/dashboard/analytics", "shipsprint.site")
      );
      expect(noRedirect(res)).toBe(true);
    });

    it("does not gate public marketing pages (e.g. /terms)", async () => {
      const { proxy } = await loadProxy(env);
      const res = await proxy(
        publicRequest("https://shipsprint.site/terms", "shipsprint.site")
      );
      expect(noRedirect(res)).toBe(true);
      expect(updateSessionMock).not.toHaveBeenCalled();
    });

    it("lets a logged-in visitor through to /dashboard", async () => {
      updateSessionMock.mockResolvedValue({
        supabaseResponse: NextResponse.next(),
        user: { id: "user-1" },
      });
      const { proxy } = await loadProxy(env);
      const res = await proxy(brokenRequest("/dashboard", "shipsprint.site"));
      expect(noRedirect(res)).toBe(true);
      expect(updateSessionMock).toHaveBeenCalledTimes(1);
    });

    it("returns the refreshed session response for a logged-out /login (no redirect)", async () => {
      updateSessionMock.mockResolvedValue({ supabaseResponse: NextResponse.next(), user: null });
      const { proxy } = await loadProxy(env);
      const res = await proxy(brokenRequest("/login", "shipsprint.site"));
      expect(noRedirect(res)).toBe(true);
      expect(updateSessionMock).toHaveBeenCalledTimes(1);
    });

    it("does not read the session for public, non-auth paths", async () => {
      const { proxy } = await loadProxy(env);
      await proxy(publicRequest("https://shipsprint.site/", "shipsprint.site"));
      await proxy(publicRequest("https://shipsprint.site/site/myapp", "shipsprint.site"));
      expect(updateSessionMock).not.toHaveBeenCalled();
    });
  });
});
