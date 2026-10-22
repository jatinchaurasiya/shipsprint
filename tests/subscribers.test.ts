import { describe, expect, it } from "vitest";
import { subscribeSchema } from "@/lib/validation";

describe("subscribeSchema validation", () => {
  const validSiteId = "123e4567-e89b-12d3-a456-426614174000";

  it("accepts a valid site_id UUID and email", () => {
    const result = subscribeSchema.safeParse({
      site_id: validSiteId,
      email: "founder@example.com",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.email).toBe("founder@example.com");
      expect(result.data.site_id).toBe(validSiteId);
    }
  });

  it("trims whitespace and normalizes email to lowercase", () => {
    const result = subscribeSchema.safeParse({
      site_id: validSiteId,
      email: "  USER.Name+TAG@DOMAIN.COM   ",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.email).toBe("user.name+tag@domain.com");
    }
  });

  it("rejects invalid site_id (not a UUID)", () => {
    const result = subscribeSchema.safeParse({
      site_id: "not-a-uuid",
      email: "user@example.com",
    });
    expect(result.success).toBe(false);
  });

  it("rejects invalid email formats", () => {
    const badEmails = [
      "",
      "plainaddress",
      "@missingusername.com",
      "username@.com",
      "username@com",
      "spaces in@address.com",
    ];

    for (const bad of badEmails) {
      const result = subscribeSchema.safeParse({
        site_id: validSiteId,
        email: bad,
      });
      expect(result.success, `expected "${bad}" to fail validation`).toBe(false);
    }
  });

  it("rejects emails exceeding 255 characters", () => {
    const longLocal = "a".repeat(250);
    const result = subscribeSchema.safeParse({
      site_id: validSiteId,
      email: `${longLocal}@example.com`,
    });
    expect(result.success).toBe(false);
  });

  it("strictly rejects extra unexpected fields (strict schema)", () => {
    const result = subscribeSchema.safeParse({
      site_id: validSiteId,
      email: "user@example.com",
      honeypot: "bot-payload",
      admin: true,
    });
    expect(result.success).toBe(false);
  });
});

describe("CSV RFC-4180 escaping for subscriber export", () => {
  it("escapes quotes and handles special characters in subscriber emails", () => {
    const rawSubscribers = [
      { email: "regular@example.com", created_at: "2026-10-22T10:00:00.000Z" },
      { email: 'user"quote"@example.com', created_at: "2026-10-22T10:05:00.000Z" },
      { email: "user,comma@example.com", created_at: "2026-10-22T10:10:00.000Z" },
    ];

    const header = "Email,Subscribed At (UTC)";
    const rows = rawSubscribers.map((s) => {
      const escapedEmail = `"${s.email.replace(/"/g, '""')}"`;
      return `${escapedEmail},"${s.created_at}"`;
    });
    const csvContent = [header, ...rows].join("\r\n");

    expect(csvContent).toContain("Email,Subscribed At (UTC)");
    expect(csvContent).toContain('"regular@example.com","2026-10-22T10:00:00.000Z"');
    expect(csvContent).toContain('"user""quote""@example.com","2026-10-22T10:05:00.000Z"');
    expect(csvContent).toContain('"user,comma@example.com","2026-10-22T10:10:00.000Z"');
    expect(csvContent.includes("\r\n")).toBe(true);
  });
});
