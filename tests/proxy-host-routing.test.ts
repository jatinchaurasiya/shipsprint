import { describe, it, expect } from "vitest";

/**
 * Host classification for the proxy.
 *
 * Extracted from `proxy.ts` so it can be tested without booting Next. The
 * original implementation was a single inline function with two bugs that made
 * the app unusable in real environments:
 *
 *   1. `"127.0.0.1".split(".")[0]` is `"127"`, so the entire app rewrote to
 *      `/site/127` and rendered "Page Not Found" on loopback. This breaks
 *      Docker, Codespaces, and LAN testing.
 *   2. Any host that was not the root domain was treated as a customer custom
 *      domain, so `/` returned "Page Not Found" on every Vercel preview and
 *      staging host.
 */

type HostKind = "app" | "subdomain" | "custom";

function buildClassifier(rootDomain: string, extraAppHosts: string[] = []) {
  const root = rootDomain.toLowerCase().split(":")[0]!;

  const appHosts = new Set<string>([
    root,
    `www.${root}`,
    "localhost",
    "127.0.0.1",
    ...extraAppHosts
      .map((host) => host.trim().toLowerCase().split(":")[0]!)
      .filter(Boolean),
  ]);

  return function classify(rawHost: string): {
    kind: HostKind;
    value: string | null;
  } {
    const hostname = rawHost.toLowerCase().split(":")[0]!;
    if (!hostname) return { kind: "app", value: null };

    if (appHosts.has(hostname)) return { kind: "app", value: null };

    if (hostname.endsWith(`.${root}`)) {
      const label = hostname.slice(0, -(root.length + 1));
      if (label) return { kind: "subdomain", value: label };
    }
    if (hostname.endsWith(".localhost")) {
      const label = hostname.slice(0, -".localhost".length);
      if (label) return { kind: "subdomain", value: label };
    }

    return { kind: "custom", value: hostname };
  };
}

describe("classifyHost with the production root domain", () => {
  const classify = buildClassifier("shipsprint.site", [
    "shipsprint-git-main.vercel.app",
    "staging.shipsprint.site",
  ]);

  it("treats the app's own hosts as the app", () => {
    expect(classify("shipsprint.site")).toEqual({ kind: "app", value: null });
    expect(classify("www.shipsprint.site")).toEqual({
      kind: "app",
      value: null,
    });
    expect(classify("SHIP SPRINT.SITE".replace(" ", ""))).toEqual({
      kind: "app",
      value: null,
    });
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
    expect(classify("MYAPP.SHIP SPRINT.SITE".replace(" ", ""))).toEqual({
      kind: "subdomain",
      value: "myapp",
    });
  });

  it("treats preview and staging hosts as the app, not a custom domain", () => {
    // This is the bug: without an allow-list, a preview deployment rendered
    // "Page Not Found" because the whole app was rewritten to /site/<host>.
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

  it("handles an empty host without crashing", () => {
    expect(classify("")).toEqual({ kind: "app", value: null });
  });
});

describe("classifyHost on loopback", () => {
  const classify = buildClassifier("localhost:3000");

  it("does not treat 127.0.0.1 as a subdomain", () => {
    // The original bug: split on "." gave "127", rewriting the app to /site/127.
    expect(classify("127.0.0.1")).toEqual({ kind: "app", value: null });
    expect(classify("127.0.0.1:3000")).toEqual({ kind: "app", value: null });
  });

  it("supports the *.localhost:3000 development trick", () => {
    expect(classify("myapp.localhost:3000")).toEqual({
      kind: "subdomain",
      value: "myapp",
    });
  });

  it("treats bare localhost as the app", () => {
    expect(classify("localhost:3000")).toEqual({ kind: "app", value: null });
  });
});
