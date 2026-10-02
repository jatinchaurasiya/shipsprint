import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { createRequire } from "node:module";
import { afterEach, describe, expect, it } from "vitest";

/**
 * Covers the build guard that aborted (or failed to abort) the production image.
 *
 * The three states below were measured in real builds and are not
 * interchangeable:
 *   value present -> inlined, signup works
 *   value ""      -> inlined as "", Zod reports "must not be empty"
 *   value absent  -> key omitted,  Zod reports "expected string, received undefined"
 *
 * Only the absent case matches the production error, so a guard that merely tests
 * truthiness would be one `!value` check away from letting a blank through.
 */

const require_ = createRequire(import.meta.url);

const { REQUIRED, inspectPublicEnv, buildStamp, verify } = require_(
  "../scripts/public-config.cjs"
) as {
  REQUIRED: string[];
  inspectPublicEnv: (env: Record<string, string | undefined>) => {
    ok: boolean;
    missing: string[];
  };
  buildStamp: (env: Record<string, string | undefined>) => {
    NEXT_PUBLIC_SUPABASE_URL: string;
    NEXT_PUBLIC_SUPABASE_ANON_KEY_SET: boolean;
    NEXT_PUBLIC_ROOT_DOMAIN: string;
    NEXT_PUBLIC_APP_URL: string;
  };
  verify: (env: Record<string, string | undefined>, bundleDir?: string) => number;
};

const { evaluatePublicConfigStamp } = require_("../lib/build-config.ts") as {
  evaluatePublicConfigStamp: (raw: string | null) => string;
};

const valid = {
  NEXT_PUBLIC_SUPABASE_URL: "https://abcdefgh.supabase.co",
  NEXT_PUBLIC_SUPABASE_ANON_KEY: "eyJhbGciOiJIUzI1NiJ9.eyJyb2xlIjoiYW5vbiJ9.sig",
  NEXT_PUBLIC_ROOT_DOMAIN: "shipsprint.site",
  NEXT_PUBLIC_APP_URL: "https://shipsprint.site",
};

describe("public build config guard", () => {
  it("requires the two values the client bundle cannot work without", () => {
    expect(REQUIRED).toEqual([
      "NEXT_PUBLIC_SUPABASE_URL",
      "NEXT_PUBLIC_SUPABASE_ANON_KEY",
    ]);
  });

  it("accepts a fully populated environment", () => {
    expect(inspectPublicEnv(valid)).toEqual({ ok: true, missing: [] });
  });

  it("rejects absent values", () => {
    expect(inspectPublicEnv({})).toEqual({
      ok: false,
      missing: ["NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_ANON_KEY"],
    });
  });

  it("rejects empty values", () => {
    expect(
      inspectPublicEnv({ ...valid, NEXT_PUBLIC_SUPABASE_URL: "", NEXT_PUBLIC_SUPABASE_ANON_KEY: "" })
    ).toEqual({
      ok: false,
      missing: ["NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_ANON_KEY"],
    });
  });

  it("rejects whitespace-only values", () => {
    // Truthy, so a `!value` check would pass these through and ship a bundle
    // with an empty config.
    expect(
      inspectPublicEnv({ ...valid, NEXT_PUBLIC_SUPABASE_URL: "   ", NEXT_PUBLIC_SUPABASE_ANON_KEY: "\t\n" })
    ).toEqual({
      ok: false,
      missing: ["NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_ANON_KEY"],
    });
  });

  it("reports only the offending variable", () => {
    expect(inspectPublicEnv({ ...valid, NEXT_PUBLIC_SUPABASE_ANON_KEY: "" })).toEqual({
      ok: false,
      missing: ["NEXT_PUBLIC_SUPABASE_ANON_KEY"],
    });
  });

  it("tolerates optional values being absent", () => {
    const { NEXT_PUBLIC_ROOT_DOMAIN: _root, NEXT_PUBLIC_APP_URL: _url, ...minimal } = valid;
    expect(inspectPublicEnv(minimal)).toEqual({ ok: true, missing: [] });
  });

  describe("stamp", () => {
    it("records the url and a key presence flag", () => {
      expect(buildStamp(valid)).toEqual({
        NEXT_PUBLIC_SUPABASE_URL: "https://abcdefgh.supabase.co",
        NEXT_PUBLIC_SUPABASE_ANON_KEY_SET: true,
        NEXT_PUBLIC_ROOT_DOMAIN: "shipsprint.site",
        NEXT_PUBLIC_APP_URL: "https://shipsprint.site",
      });
    });

    it("never writes the anon key into the file", () => {
      const stamp = buildStamp(valid);
      expect(JSON.stringify(stamp)).not.toContain("eyJhbGciOiJIUzI1NiJ9");
      expect(Object.keys(stamp)).not.toContain("NEXT_PUBLIC_SUPABASE_ANON_KEY");
    });

    it("reports a whitespace-only key as not set", () => {
      expect(
        buildStamp({ ...valid, NEXT_PUBLIC_SUPABASE_ANON_KEY: "  " })
          .NEXT_PUBLIC_SUPABASE_ANON_KEY_SET
      ).toBe(false);
    });

    it("produces a stamp the health check accepts", () => {
      // The two modules must agree, or a correctly built image reports degraded.
      expect(evaluatePublicConfigStamp(JSON.stringify(buildStamp(valid)))).toBe("ok");
    });

    it("produces a stamp the health check rejects when misconfigured", () => {
      const stamp = buildStamp({ ...valid, NEXT_PUBLIC_SUPABASE_URL: "", NEXT_PUBLIC_SUPABASE_ANON_KEY: "" });
      expect(evaluatePublicConfigStamp(JSON.stringify(stamp))).toBe("error");
    });
  });
});
describe("inlining verification", () => {
  const HOST = "abcdefgh.supabase.co";
  const configured = {
    NEXT_PUBLIC_SUPABASE_URL: `https://${HOST}`,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: "anon-key",
  };

  const created: string[] = [];

  /** Builds a throwaway bundle directory and returns its path. */
  function bundle(files: Record<string, string>): string {
    const dir = mkdtempSync(join(tmpdir(), "shipsprint-bundle-"));
    created.push(dir);
    for (const [name, contents] of Object.entries(files)) {
      const target = join(dir, name);
      mkdirSync(dirname(target), { recursive: true });
      writeFileSync(target, contents);
    }
    return dir;
  }

  // Removes only the directories created above. `tmpdir()` is the shared /tmp,
  // so deleting it wholesale would be catastrophic.
  afterEach(() => {
    while (created.length > 0) {
      rmSync(created.pop()!, { recursive: true, force: true });
    }
  });

  it("passes when the url is present in a client chunk", () => {
    const dir = bundle({ "chunks/a.js": `var e={NEXT_PUBLIC_SUPABASE_URL:"https://${HOST}"}` });
    expect(verify(configured, dir)).toBe(0);
  });

  it("fails when no chunk contains the url", () => {
    // This is the production failure: arguments present, nothing inlined,
    // because lib/env.ts read them via the whole `process.env` object.
    const dir = bundle({ "chunks/a.js": 'var sI=z.object({NEXT_PUBLIC_SUPABASE_URL:sP("X")})' });
    expect(verify(configured, dir)).toBe(1);
  });

  it("fails on an empty bundle directory", () => {
    expect(verify(configured, bundle({}))).toBe(1);
  });

  it("fails when the bundle directory does not exist", () => {
    expect(verify(configured, join(tmpdir(), "definitely-not-here-9f2a"))).toBe(1);
  });

  it("fails before looking at the bundle when an argument is unset", () => {
    const dir = bundle({ "chunks/a.js": `https://${HOST}` });
    expect(verify({ NEXT_PUBLIC_SUPABASE_ANON_KEY: "k" }, dir)).toBe(1);
  });

  it("fails when the url is not a valid url", () => {
    const dir = bundle({ "chunks/a.js": HOST });
    expect(verify({ ...configured, NEXT_PUBLIC_SUPABASE_URL: "not-a-url" }, dir)).toBe(1);
  });

  it("searches nested directories", () => {
    const dir = bundle({ "chunks/nested/deep/b.js": `https://${HOST}` });
    expect(verify(configured, dir)).toBe(0);
  });

  it("ignores non-javascript files", () => {
    const dir = bundle({ "chunks/a.js.map": `https://${HOST}`, "chunks/a.js": "nothing" });
    expect(verify(configured, dir)).toBe(1);
  });
});
