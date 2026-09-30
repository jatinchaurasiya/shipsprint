import { describe, it, expect } from "vitest";
import { safeRedirectPath, normalizeHostname } from "@/lib/redirect";

/**
 * Open-redirect regression tests.
 *
 * `new URL("https://evil.com", "https://app.example.com/login")` returns
 * `https://evil.com` — an absolute URL in the second argument wins. The auth
 * callback fed an unvalidated `?next=` straight into that, so a crafted
 * confirmation link redirected the user to an attacker site immediately after
 * clicking a link from a trusted-looking email. These cases are the payloads
 * that matter.
 */
describe("safeRedirectPath", () => {
  it("allows ordinary same-origin paths", () => {
    expect(safeRedirectPath("/dashboard")).toBe("/dashboard");
    expect(safeRedirectPath("/dashboard/editor/abc")).toBe(
      "/dashboard/editor/abc"
    );
    expect(safeRedirectPath("/dashboard?tab=analytics")).toBe(
      "/dashboard?tab=analytics"
    );
    expect(safeRedirectPath("/dashboard#section")).toBe("/dashboard#section");
  });

  it("rejects absolute URLs", () => {
    expect(safeRedirectPath("https://evil.com")).toBe("/dashboard");
    expect(safeRedirectPath("http://evil.com")).toBe("/dashboard");
    expect(safeRedirectPath("HTTPS://EVIL.COM")).toBe("/dashboard");
  });

  it("rejects protocol-relative URLs", () => {
    // A browser treats //evil.com as an absolute URL.
    expect(safeRedirectPath("//evil.com")).toBe("/dashboard");
    expect(safeRedirectPath("//evil.com/path")).toBe("/dashboard");
  });

  it("rejects backslash-smuggled authority", () => {
    // /\evil.com and \evil.com are normalised to //evil.com by browsers.
    expect(safeRedirectPath("/\\evil.com")).toBe("/dashboard");
    expect(safeRedirectPath("\\evil.com")).toBe("/dashboard");
    expect(safeRedirectPath("/path\\..\\..")).toBe("/dashboard");
  });

  it("rejects javascript and data URIs", () => {
    expect(safeRedirectPath("javascript:alert(1)")).toBe("/dashboard");
    expect(safeRedirectPath("JavaScript:alert(1)")).toBe("/dashboard");
    expect(safeRedirectPath("  javascript:alert(1)")).toBe("/dashboard");
    expect(safeRedirectPath("data:text/html,<script>alert(1)</script>")).toBe(
      "/dashboard"
    );
  });

  it("rejects percent-encoded escapes", () => {
    expect(safeRedirectPath("%2F%2Fevil.com")).toBe("/dashboard");
    expect(safeRedirectPath("%2f%2fevil.com")).toBe("/dashboard");
    expect(safeRedirectPath("%5C%5Cevil.com")).toBe("/dashboard");
  });

  it("rejects other schemes", () => {
    expect(safeRedirectPath("vbscript:msgbox(1)")).toBe("/dashboard");
    expect(safeRedirectPath("file:///etc/passwd")).toBe("/dashboard");
  });

  it("falls back for empty, null and non-path input", () => {
    expect(safeRedirectPath(null)).toBe("/dashboard");
    expect(safeRedirectPath(undefined)).toBe("/dashboard");
    expect(safeRedirectPath("")).toBe("/dashboard");
    expect(safeRedirectPath("   ")).toBe("/dashboard");
    expect(safeRedirectPath("dashboard")).toBe("/dashboard");
  });

  it("honours a custom fallback", () => {
    expect(safeRedirectPath("https://evil.com", "/login")).toBe("/login");
  });
});

describe("normalizeHostname", () => {
  it("accepts and lowercases valid domains", () => {
    expect(normalizeHostname("MyApp.com")).toBe("myapp.com");
    expect(normalizeHostname("  myapp.co.uk  ")).toBe("myapp.co.uk");
    expect(normalizeHostname("a-b.example.com")).toBe("a-b.example.com");
  });

  it("reduces a pasted URL to its hostname", () => {
    expect(normalizeHostname("https://myapp.com/path?q=1")).toBe("myapp.com");
    expect(normalizeHostname("http://www.myapp.com/")).toBe("www.myapp.com");
  });

  it("strips port, userinfo and trailing dot", () => {
    expect(normalizeHostname("myapp.com:8080")).toBe("myapp.com");
    expect(normalizeHostname("user@myapp.com")).toBe("myapp.com");
    expect(normalizeHostname("myapp.com.")).toBeNull();
  });

  it("rejects malformed input", () => {
    expect(normalizeHostname("")).toBeNull();
    expect(normalizeHostname("localhost")).toBeNull();
    expect(normalizeHostname("nodot")).toBeNull();
    expect(normalizeHostname("-bad.com")).toBeNull();
    expect(normalizeHostname("bad-.com")).toBeNull();
    expect(normalizeHostname("bad..com")).toBeNull();
    expect(normalizeHostname(".leading.com")).toBeNull();
    expect(normalizeHostname(`${"a".repeat(300)}.com`)).toBeNull();
  });

  it("rejects schemes that are not http(s)", () => {
    expect(normalizeHostname("javascript:alert(1)")).toBeNull();
  });
});
