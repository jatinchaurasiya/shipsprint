import { describe, it, expect } from "vitest";
import {
  httpUrl,
  httpOrRelativeUrl,
  safeHref,
  siteContentSchema,
  createSiteSchema,
  updateSiteSchema,
  checkoutSchema,
  createDomainSchema,
  MAX_CONTENT_BYTES,
} from "@/lib/validation";

/**
 * Stored-XSS regression tests.
 *
 * `store_links` and `legal_links` values are written by the user and rendered
 * into `<a href>` on a public page. `type="url"` in the editor is only a hint,
 * so `javascript:alert(1)` was accepted and rendered. These are the payloads
 * that must never reach an href.
 */
describe("httpUrl", () => {
  it("accepts http and https", () => {
    expect(httpUrl.safeParse("https://apps.apple.com/app/id1").success).toBe(true);
    expect(httpUrl.safeParse("http://example.com").success).toBe(true);
  });

  it("accepts empty, since the editor allows clearing a field", () => {
    expect(httpUrl.safeParse("").success).toBe(true);
  });

  it("rejects javascript and other active schemes", () => {
    for (const payload of [
      "javascript:alert(1)",
      "JavaScript:alert(1)",
      "  javascript:alert(document.cookie)",
      "data:text/html;base64,PHNjcmlwdD5hbGVydCgxKTwvc2NyaXB0Pg==",
      "vbscript:msgbox(1)",
      "file:///etc/passwd",
    ]) {
      expect(
        httpUrl.safeParse(payload).success,
        `${payload} must be rejected`
      ).toBe(false);
    }
  });

  it("rejects malformed URLs and overlong values", () => {
    expect(httpUrl.safeParse("not a url").success).toBe(false);
    expect(httpUrl.safeParse(`https://x.com/${"a".repeat(3000)}`).success).toBe(
      false
    );
  });
});

describe("httpOrRelativeUrl", () => {
  it("accepts safe relative paths and absolute http(s) URLs", () => {
    expect(httpOrRelativeUrl.safeParse("/terms").success).toBe(true);
    expect(httpOrRelativeUrl.safeParse("/privacy").success).toBe(true);
    expect(httpOrRelativeUrl.safeParse("https://example.com/terms").success).toBe(true);
    expect(httpOrRelativeUrl.safeParse("").success).toBe(true);
  });

  it("rejects protocol-relative and backslash-smuggled paths", () => {
    expect(httpOrRelativeUrl.safeParse("//evil.com").success).toBe(false);
    expect(httpOrRelativeUrl.safeParse("/\\evil.com").success).toBe(false);
    expect(httpOrRelativeUrl.safeParse("/path\\evil").success).toBe(false);
    expect(httpOrRelativeUrl.safeParse("javascript:alert(1)").success).toBe(false);
  });
});

describe("safeHref", () => {
  it("passes through valid absolute URLs", () => {
    expect(safeHref("https://example.com/a")).toBe("https://example.com/a");
  });

  it("passes through valid root-relative paths", () => {
    expect(safeHref("/terms")).toBe("/terms");
    expect(safeHref("/privacy")).toBe("/privacy");
    expect(safeHref("/legal/privacy-policy")).toBe("/legal/privacy-policy");
  });

  it("neutralises anything that is not http(s) or safe relative", () => {
    expect(safeHref("javascript:alert(1)")).toBe("#");
    expect(safeHref("//evil.com")).toBe("#");
    expect(safeHref("/\\evil.com")).toBe("#");
    expect(safeHref("/path\\evil")).toBe("#");
    expect(safeHref("")).toBe("#");
    expect(safeHref(null)).toBe("#");
    expect(safeHref(undefined)).toBe("#");
    expect(safeHref({ href: "javascript:alert(1)" })).toBe("#");
  });
});

const validContent = {
  brand: { name: "MyApp", logo_url: "https://cdn.example.com/logo.png" },
  hero: {
    app_name: "MyApp",
    badge_text: "Now available",
    header: "A better way to do things",
    short_description: "Short and sweet.",
  },
  features: [
    { id: "feat-1", icon: "Zap", title: "Fast", description: "Very fast." },
  ],
  store_links: {
    app_store_url: "https://apps.apple.com/app/id1",
    play_store_url: "",
  },
  screenshots: ["https://cdn.example.com/1.png"],
  footer: {
    brand_name: "MyApp",
    legal_links: [{ label: "Privacy", url: "https://myapp.com/privacy" }],
    contact_email: "hi@myapp.com",
  },
};

describe("siteContentSchema", () => {
  it("accepts a well-formed document", () => {
    const result = siteContentSchema.safeParse(validContent);
    expect(result.success).toBe(true);
  });

  it("rejects javascript: URLs anywhere they can reach an href", () => {
    const withBadStore = structuredClone(validContent);
    withBadStore.store_links.app_store_url = "javascript:alert(1)";
    expect(siteContentSchema.safeParse(withBadStore).success).toBe(false);

    const withBadLegal = structuredClone(validContent);
    withBadLegal.footer.legal_links[0]!.url = "javascript:alert(1)";
    expect(siteContentSchema.safeParse(withBadLegal).success).toBe(false);
  });

  it("accepts template-style relative legal links", () => {
    const withRelativeLegal = structuredClone(validContent);
    withRelativeLegal.footer.legal_links = [
      { label: "Terms of Service", url: "/terms" },
      { label: "Privacy Policy", url: "/privacy" },
    ];
    expect(siteContentSchema.safeParse(withRelativeLegal).success).toBe(true);
  });

  it("rejects unknown keys instead of persisting them", () => {
    const smuggled = { ...validContent, __proto__: {} } as Record<string, unknown>;
    smuggled.injected = "value";
    expect(siteContentSchema.safeParse(smuggled).success).toBe(false);
  });

  it("rejects a wrong type for a known field", () => {
    const bad = structuredClone(validContent) as unknown as Record<string, unknown>;
    bad.features = "not an array";
    expect(siteContentSchema.safeParse(bad).success).toBe(false);
  });

  it("enforces array bounds", () => {
    const manyFeatures = structuredClone(validContent);
    manyFeatures.features = Array.from({ length: 25 }, (_, i) => ({
      id: `f${i}`,
      icon: "Zap",
      title: "t",
      description: "d",
    }));
    expect(siteContentSchema.safeParse(manyFeatures).success).toBe(false);

    const manyShots = structuredClone(validContent);
    manyShots.screenshots = Array.from(
      { length: 21 },
      (_, i) => `https://cdn.example.com/${i}.png`
    );
    expect(siteContentSchema.safeParse(manyShots).success).toBe(false);
  });

  it("enforces a 256KB ceiling that the route also checks", () => {
    const big = structuredClone(validContent);
    big.hero.short_description = "x".repeat(MAX_CONTENT_BYTES + 1);
    // The schema caps the field; the route additionally checks the serialized
    // document size, so assert the constant is what the route uses.
    expect(MAX_CONTENT_BYTES).toBe(256 * 1024);
    expect(siteContentSchema.safeParse(big).success).toBe(false);
  });

  it("rejects an invalid contact email", () => {
    const bad = structuredClone(validContent);
    bad.footer.contact_email = "not-an-email";
    expect(siteContentSchema.safeParse(bad).success).toBe(false);

    const blank = structuredClone(validContent);
    blank.footer.contact_email = "";
    expect(siteContentSchema.safeParse(blank).success).toBe(true);
  });
});

describe("createSiteSchema", () => {
  it("normalises and accepts a reasonable slug", () => {
    const result = createSiteSchema.safeParse({ name: "My App", slug: "  My-App  " });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.slug).toBe("my-app");
  });

  it("rejects slugs that are not URL-safe hostnames", () => {
    for (const slug of [
      "a", // too short
      "has space",
      "has_underscore",
      "-leading",
      "trailing-",
      "UPPER!!",
      "a".repeat(49),
    ]) {
      expect(
        createSiteSchema.safeParse({ name: "x", slug }).success,
        `${slug} must be rejected`
      ).toBe(false);
    }
  });

  it("requires a name", () => {
    expect(createSiteSchema.safeParse({ slug: "my-app" }).success).toBe(false);
    expect(createSiteSchema.safeParse({ name: "", slug: "my-app" }).success).toBe(
      false
    );
  });
});

describe("updateSiteSchema", () => {
  it("requires at least one field", () => {
    expect(updateSiteSchema.safeParse({}).success).toBe(false);
  });

  it("rejects an arbitrary status string", () => {
    // The column is now a CHECK constraint, so this must be rejected at the edge
    // too rather than bricking the site.
    expect(
      updateSiteSchema.safeParse({ status: "publshed" }).success
    ).toBe(false);
    expect(updateSiteSchema.safeParse({ status: "draft" }).success).toBe(true);
    expect(updateSiteSchema.safeParse({ status: "published" }).success).toBe(
      true
    );
  });
});

describe("checkoutSchema", () => {
  it("accepts exactly the four purchasable SKUs", () => {
    for (const product_id of [
      "basic_monthly",
      "basic_yearly",
      "pro_monthly",
      "pro_yearly",
    ]) {
      expect(
        checkoutSchema.safeParse({ product_id }).success,
        `${product_id} must be accepted`
      ).toBe(true);
    }
  });

  it("rejects plan ids, so a caller cannot ask for a tier not for sale", () => {
    // Accepting "pro" here would let a client name the expensive tier and be
    // charged for whatever the route chose. The request must name a SKU.
    for (const plan_id of ["free", "basic", "pro", "enterprise"]) {
      expect(
        checkoutSchema.safeParse({ plan_id }).success,
        `${plan_id} must be rejected`
      ).toBe(false);
      expect(checkoutSchema.safeParse({ product_id: plan_id }).success).toBe(
        false
      );
    }
  });

  it("rejects unknown or malformed input", () => {
    expect(checkoutSchema.safeParse({}).success).toBe(false);
    expect(
      checkoutSchema.safeParse({ product_id: "pro_lifetime" }).success
    ).toBe(false);
    expect(
      checkoutSchema.safeParse({ product_id: "pro_monthly", extra: 1 }).success
    ).toBe(true); // zod strips unknown keys by default; assert no crash
  });
});

describe("createDomainSchema", () => {
  it("accepts a valid domain", () => {
    expect(
      createDomainSchema.safeParse({
        site_id: "550e8400-e29b-41d4-a716-446655440000",
        domain: "myapp.com",
      }).success
    ).toBe(true);
  });

  it("rejects a non-uuid site id", () => {
    expect(
      createDomainSchema.safeParse({ site_id: "not-a-uuid", domain: "myapp.com" })
        .success
    ).toBe(false);
  });

  it("rejects a domain with no dot or with invalid labels", () => {
    for (const domain of ["localhost", "-bad.com", "bad-.com", "a b.com", "x"]) {
      expect(
        createDomainSchema.safeParse({
          site_id: "550e8400-e29b-41d4-a716-446655440000",
          domain,
        }).success,
        `${domain} must be rejected`
      ).toBe(false);
    }
  });
});
