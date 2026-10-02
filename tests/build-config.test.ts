import { describe, expect, it } from "vitest";
import { evaluatePublicConfigStamp } from "@/lib/build-config";

/**
 * Regression test for the production signup outage.
 *
 * `NEXT_PUBLIC_*` values are inlined into the browser bundle at BUILD time, so
 * docker-compose supplying them at runtime does nothing for the client. An image
 * built without them as build args produced a deployment where the server
 * answered `/api/health` with "healthy" and every page rendered, while the
 * browser had `process.env.NEXT_PUBLIC_SUPABASE_URL === undefined` and signup
 * was deadlocked.
 *
 * The three failure shapes were measured in real builds and are not
 * interchangeable, which is why each is asserted separately:
 *
 *   value present -> inlined, signup works
 *   value ""      -> inlined as "", Zod reports "must not be empty"
 *   value absent  -> key omitted,   Zod reports "expected string, received undefined"
 *
 * Only the absent case matches the reported production error, which is what
 * identifies a build that never received the build args at all.
 */
describe("build stamp evaluation", () => {
  it("accepts a stamp written by a correct build", () => {
    const stamp = JSON.stringify({
      NEXT_PUBLIC_SUPABASE_URL: "https://abcdefgh.supabase.co",
      NEXT_PUBLIC_SUPABASE_ANON_KEY_SET: true,
      NEXT_PUBLIC_ROOT_DOMAIN: "shipsprint.site",
      NEXT_PUBLIC_APP_URL: "https://shipsprint.site",
    });

    expect(evaluatePublicConfigStamp(stamp)).toBe("ok");
  });

  it("rejects a stamp with an empty URL", () => {
    expect(
      evaluatePublicConfigStamp(
        JSON.stringify({
          NEXT_PUBLIC_SUPABASE_URL: "",
          NEXT_PUBLIC_SUPABASE_ANON_KEY_SET: true,
        })
      )
    ).toBe("error");
  });

  it("rejects a stamp whose URL is only whitespace", () => {
    expect(
      evaluatePublicConfigStamp(
        JSON.stringify({
          NEXT_PUBLIC_SUPABASE_URL: "   ",
          NEXT_PUBLIC_SUPABASE_ANON_KEY_SET: true,
        })
      )
    ).toBe("error");
  });

  it("rejects a stamp that never received the anon key", () => {
    expect(
      evaluatePublicConfigStamp(
        JSON.stringify({
          NEXT_PUBLIC_SUPABASE_URL: "https://abcdefgh.supabase.co",
          NEXT_PUBLIC_SUPABASE_ANON_KEY_SET: false,
        })
      )
    ).toBe("error");
  });

  it("rejects a stamp missing the URL entirely", () => {
    expect(
      evaluatePublicConfigStamp(JSON.stringify({ NEXT_PUBLIC_SUPABASE_ANON_KEY_SET: true }))
    ).toBe("error");
  });

  it("rejects a stamp where the anon key flag is not a boolean true", () => {
    // The guard writes a real boolean. Anything else means the stamp is not
    // the artifact the Dockerfile produced and cannot be trusted.
    expect(
      evaluatePublicConfigStamp(
        JSON.stringify({
          NEXT_PUBLIC_SUPABASE_URL: "https://abcdefgh.supabase.co",
          NEXT_PUBLIC_SUPABASE_ANON_KEY_SET: "yes",
        })
      )
    ).toBe("error");
  });

  it("rejects malformed JSON", () => {
    expect(evaluatePublicConfigStamp("{not json")).toBe("error");
  });

  it("rejects a JSON scalar", () => {
    expect(evaluatePublicConfigStamp('"ok"')).toBe("error");
    expect(evaluatePublicConfigStamp("null")).toBe("error");
  });

  it("reports an absent stamp as missing, which flags pre-guard images", () => {
    expect(evaluatePublicConfigStamp(null)).toBe("missing");
  });
});