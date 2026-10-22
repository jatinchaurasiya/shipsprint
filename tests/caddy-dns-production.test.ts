import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { parseDomainLabels, dnsInstructions } from "@/lib/dns";
import { NextRequest } from "next/server";

// Mock Supabase admin client and rate limiting for Caddy ask route tests
const adminMock = vi.hoisted(() => ({
  from: vi.fn(),
}));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => adminMock,
}));

vi.mock("@/lib/rate-limit", () => ({
  rateLimit: vi.fn().mockResolvedValue({ success: true, remaining: 599, reset: 0 }),
  rateLimitHeaders: vi.fn().mockReturnValue({}),
}));

describe("Caddy & DNS Production Verification Suite", () => {
  describe("parseDomainLabels", () => {
    it("correctly identifies standard two-label apex domains", () => {
      expect(parseDomainLabels("example.com")).toEqual({
        isApex: true,
        subdomainLabel: "@",
      });
      expect(parseDomainLabels("myshop.org")).toEqual({
        isApex: true,
        subdomainLabel: "@",
      });
      expect(parseDomainLabels("startup.io")).toEqual({
        isApex: true,
        subdomainLabel: "@",
      });
    });

    it("correctly identifies two-part ccTLD apex domains", () => {
      expect(parseDomainLabels("brand.co.uk")).toEqual({
        isApex: true,
        subdomainLabel: "@",
      });
      expect(parseDomainLabels("app.com.au")).toEqual({
        isApex: true,
        subdomainLabel: "@",
      });
      expect(parseDomainLabels("tech.co.in")).toEqual({
        isApex: true,
        subdomainLabel: "@",
      });
      expect(parseDomainLabels("company.co.jp")).toEqual({
        isApex: true,
        subdomainLabel: "@",
      });
    });

    it("correctly identifies standard subdomains and extracts relative label", () => {
      expect(parseDomainLabels("app.example.com")).toEqual({
        isApex: false,
        subdomainLabel: "app",
      });
      expect(parseDomainLabels("launch.myshop.org")).toEqual({
        isApex: false,
        subdomainLabel: "launch",
      });
      expect(parseDomainLabels("preview.v2.startup.io")).toEqual({
        isApex: false,
        subdomainLabel: "preview.v2",
      });
    });

    it("correctly identifies subdomains on two-part ccTLDs", () => {
      expect(parseDomainLabels("app.brand.co.uk")).toEqual({
        isApex: false,
        subdomainLabel: "app",
      });
      expect(parseDomainLabels("portal.tech.co.in")).toEqual({
        isApex: false,
        subdomainLabel: "portal",
      });
    });
  });

  describe("dnsInstructions", () => {
    const cnameTarget = "cname.shipsprint.site";
    const verifyPrefix = "_shipverify";
    const token = "shipverify=site_123456";

    it("generates CNAME routing instructions for subdomains with relative record name", () => {
      const instructions = dnsInstructions(
        "app.myfitnessapp.com",
        cnameTarget,
        verifyPrefix,
        token
      );

      // Ownership TXT record
      expect(instructions.ownership.type).toBe("TXT");
      expect(instructions.ownership.name).toBe("_shipverify.app.myfitnessapp.com");
      expect(instructions.ownership.value).toBe("shipverify=site_123456");

      // Routing CNAME record
      expect(instructions.routing.type).toBe("CNAME");
      expect(instructions.routing.name).toBe("app");
      expect(instructions.routing.value).toBe("cname.shipsprint.site");
      expect(instructions.routing.note).toContain("app");
    });

    it("generates A/ALIAS routing instructions for apex domains with resolved IPv4", () => {
      const serverIp = "76.76.21.21";
      const instructions = dnsInstructions(
        "myfitnessapp.com",
        cnameTarget,
        verifyPrefix,
        token,
        serverIp
      );

      // Ownership TXT record
      expect(instructions.ownership.type).toBe("TXT");
      expect(instructions.ownership.name).toBe("_shipverify.myfitnessapp.com");
      expect(instructions.ownership.value).toBe("shipverify=site_123456");

      // Routing A record
      expect(instructions.routing.type).toBe("A");
      expect(instructions.routing.name).toBe("@");
      expect(instructions.routing.value).toBe("76.76.21.21");
      expect(instructions.routing.note).toContain("76.76.21.21");
    });

    it("gracefully falls back when server IPv4 is not yet resolved", () => {
      const instructions = dnsInstructions(
        "myfitnessapp.com",
        cnameTarget,
        verifyPrefix,
        token,
        null
      );

      expect(instructions.routing.type).toBe("A");
      expect(instructions.routing.name).toBe("@");
      expect(instructions.routing.value).toBe("cname.shipsprint.site");
      expect(instructions.routing.note).toContain("ALIAS or ANAME");
    });
  });

  describe("/api/caddy/ask TLS authorization", () => {
    beforeEach(() => {
      vi.clearAllMocks();
      process.env.ROOT_DOMAIN = "shipsprint.site";
      process.env.NEXT_PUBLIC_ROOT_DOMAIN = "shipsprint.site";
      process.env.CNAME_TARGET_HOST = "cname.shipsprint.site";
      process.env.APP_HOSTS = "staging.shipsprint.site,preview.shipsprint.site";
      process.env.R2_PUBLIC_DOMAIN = "assets.shipsprint.site";
    });

    it("authorizes apex domain, www, assets, and CNAME target unconditionally", async () => {
      const { GET } = await import("@/app/api/caddy/ask/route");

      for (const domain of [
        "shipsprint.site",
        "www.shipsprint.site",
        "assets.shipsprint.site",
        "cname.shipsprint.site",
        "staging.shipsprint.site",
        "preview.shipsprint.site",
      ]) {
        const req = new NextRequest(`http://app:3000/api/caddy/ask?domain=${domain}`);
        const res = await GET(req);
        expect(res.status, `domain ${domain} should be authorized`).toBe(200);
      }
    });

    it("authorizes registered customer subdomains", async () => {
      adminMock.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({
              data: { id: "site_sub_1", slug: "fitflow", custom_domain: null, status: "published" },
            }),
          }),
        }),
      });

      const { GET } = await import("@/app/api/caddy/ask/route");
      const req = new NextRequest("http://app:3000/api/caddy/ask?domain=fitflow.shipsprint.site");
      const res = await GET(req);
      expect(res.status).toBe(200);
    });

    it("authorizes registered custom domains and marks active TLS", async () => {
      const updateMock = vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ data: null, error: null }),
      });

      adminMock.from.mockImplementation((table: string) => {
        if (table === "sites") {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({
                  data: { id: "site_cust_1", slug: "mybrand", custom_domain: "mybrand.com", status: "published" },
                }),
              }),
            }),
          };
        }
        if (table === "domain_verifications") {
          return { update: updateMock };
        }
        return {};
      });

      const { GET } = await import("@/app/api/caddy/ask/route");
      const req = new NextRequest("http://app:3000/api/caddy/ask?domain=mybrand.com");
      const res = await GET(req);
      expect(res.status).toBe(200);
      expect(updateMock).toHaveBeenCalledWith(
        expect.objectContaining({ ssl_status: "active" })
      );
    });

    it("denies unknown and unverified domains", async () => {
      adminMock.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({ data: null }),
          }),
        }),
      });

      const { GET } = await import("@/app/api/caddy/ask/route");
      const req = new NextRequest("http://app:3000/api/caddy/ask?domain=malicious-attacker.com");
      const res = await GET(req);
      expect(res.status).toBe(403);
    });

    it("denies requests with empty or missing domain parameter", async () => {
      const { GET } = await import("@/app/api/caddy/ask/route");
      const req = new NextRequest("http://app:3000/api/caddy/ask");
      const res = await GET(req);
      expect(res.status).toBe(403);
    });
  });
});
