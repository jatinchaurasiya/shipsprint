import { createRequire } from "node:module";
import { describe, expect, it } from "vitest";

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

const { REQUIRED, inspectPublicEnv, buildStamp } = require_(
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