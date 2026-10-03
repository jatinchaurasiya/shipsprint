import { beforeAll, describe, expect, it, vi } from "vitest";

/**
 * Host classification for the proxy, tested against the REAL exported
 * `classifyHost` from `proxy.ts` (not a copy, which could drift from the source).
 *
 * `proxy.ts` builds its host allow-list from `ROOT_DOMAIN` / `APP_HOSTS` at
 * module scope, so each scenario sets the env, resets the module registry, and
 * re-imports to capture a fresh classifier. `updateSession` is mocked so the
 * import never touches a live Supabase project.
 *
 * The original inline classifier had two bugs that made the app unusable in real
 * environments:
 *   1. `"127.0.0.1".split(".")[0]` is `"127"`, so the app rewrote to `/site/127`
 *      and rendered "Page Not Found" on loopback (breaking Docker/Codespaces/LAN).
 *   2. Any host that was not the root domain was treated as a customer custom
 *      domain, so `/` returned "Page Not Found" on every preview and staging host.
 */

vi.mock("@/lib/supabase/middleware", () => ({ updateSession: vi.fn() }));

const PROXY_ENV_KEYS = ["ROOT_DOMAIN", "NEXT_PUBLIC_ROOT_DOMAIN", "APP_HOSTS"];

async function loadClassifier(
  env: Record<string, string | undefined>
): Promise<(host: string) => { kind: "app" | "subdomain" | "custom"; value: string | null }> {
  for (const key of PROXY_ENV_KEYS) {
    if (env[key] === undefined) delete process.env[key];
    else process.env[key] = env[key];
  }
  vi.resetModules();
  const mod = await import("../proxy");
  return mod.classifyHost;
}

describe("classifyHost with the production root domain", () => {
  let classify: (host: string) => { kind: "app" | "subdomain" | "custom"; value: string | null };

  beforeAll(async () => {
    classify = await loadClassifier({
      ROOT_DOMAIN: "shipsprint.site",
      APP_HOSTS: "staging.shipsprint.site,shipsprint-git-main.vercel.app",
    });
  });

  it("treats the app's own hosts as the app", () => {
    expect(classify("shipsprint.site")).toEqual({ kind: "app", value: null });
    expect(classify("www.shipsprint.site")).toEqual({ kind: "app", value: null });
    expect(classify("SHIPSPRINT.SITE")).toEqual({ kind: "app", value: null });
    expect(classify("shipsprint.site:443")).toEqual({ kind: "app", value: null });
  });

  it("recognises customer subdomains", () => {
    expect(classify("myapp.shipsprint.site")).toEqual({
      kind: "subdomain",
      value: "myapp",
    });
    expect(classify("myapp.shipsprint.site:443")).toEqual({
      kind: "subdomain",
      value: "myapp",
    });
    expect(classify("MYAPP.SHIPSPRINT.SITE")).toEqual({
      kind: "subdomain",
      value: "myapp",
    });
  });

  it("resolves multi-label subdomains to the full label", () => {
    expect(classify("a.b.shipsprint.site")).toEqual({
      kind: "subdomain",
      value: "a.b",
    });
  });

  it("treats preview and staging hosts as the app, not a custom domain", () => {
    expect(classify("shipsprint-git-main.vercel.app")).toEqual({
      kind: "app",
      value: null,
    });
    expect(classify("staging.shipsprint.site")).toEqual({
      kind: "app",
      value: null,
    });
  });

  it("treats unrelated hosts as customer custom domains", () => {
    expect(classify("myapp.com")).toEqual({ kind: "custom", value: "myapp.com" });
    expect(classify("www.myapp.co.uk")).toEqual({
      kind: "custom",
      value: "www.myapp.co.uk",
    });
  });

  it("is not fooled by a suffix-spoof that merely ends with the root", () => {
    // Does not END with ".shipsprint.site" (it lacks the leading dot), so it is a
    // custom domain, not a subdomain of the app.
    expect(classify("xshipsprint.site")).toEqual({
      kind: "custom",
      value: "xshipsprint.site",
    });
    expect(classify("shipsprint.site.evil.com")).toEqual({
      kind: "custom",
      value: "shipsprint.site.evil.com",
    });
  });

  it("handles an empty host without crashing", () => {
    expect(classify("")).toEqual({ kind: "app", value: null });
  });
});

describe("classifyHost on loopback", () => {
  let classify: (host: string) => { kind: "app" | "subdomain" | "custom"; value: string | null };

  beforeAll(async () => {
    classify = await loadClassifier({ ROOT_DOMAIN: "localhost:3000" });
  });

  it("does not treat 127.0.0.1 as a subdomain", () => {
    // The original bug: split on "." gave "127", rewriting the app to /site/127.
    expect(classify("127.0.0.1")).toEqual({ kind: "app", value: null });
    expect(classify("127.0.0.1:3000")).toEqual({ kind: "app", value: null });
  });

  it("supports the *.localhost development trick", () => {
    expect(classify("myapp.localhost:3000")).toEqual({
      kind: "subdomain",
      value: "myapp",
    });
  });

  it("treats bare localhost as the app", () => {
    expect(classify("localhost:3000")).toEqual({ kind: "app", value: null });
  });
});
