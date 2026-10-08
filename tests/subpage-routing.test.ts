import { describe, expect, it } from "vitest";
import { stripCustomerSitePrefix } from "@/proxy";

describe("subpage routing and link resolution", () => {
  describe("stripCustomerSitePrefix", () => {
    it("redirects customer subdomain /site/<slug> to root /", () => {
      expect(stripCustomerSitePrefix("/site/botch", "botch")).toBe("/");
      expect(stripCustomerSitePrefix("/site/botch/", "botch")).toBe("/");
    });

    it("redirects customer subdomain /site/<slug>/<pageSlug> to /<pageSlug>", () => {
      expect(stripCustomerSitePrefix("/site/botch/privacy", "botch")).toBe("/privacy");
      expect(stripCustomerSitePrefix("/site/botch/terms", "botch")).toBe("/terms");
      expect(stripCustomerSitePrefix("/site/botch/support", "botch")).toBe("/support");
    });

    it("redirects bare /site or /site/ to /", () => {
      expect(stripCustomerSitePrefix("/site", "botch")).toBe("/");
      expect(stripCustomerSitePrefix("/site/", "botch")).toBe("/");
    });

    it("redirects /site/privacy to /privacy", () => {
      expect(stripCustomerSitePrefix("/site/privacy", "botch")).toBe("/privacy");
    });

    it("redirects custom domain /site/custom:<domain>/<pageSlug> to /<pageSlug>", () => {
      expect(stripCustomerSitePrefix("/site/custom:mybrand.com/privacy", "mybrand.com")).toBe("/privacy");
      expect(stripCustomerSitePrefix("/site/custom:mybrand.com", "mybrand.com")).toBe("/");
    });

    it("ignores non-site customer paths so they can rewrite normally", () => {
      expect(stripCustomerSitePrefix("/", "botch")).toBeNull();
      expect(stripCustomerSitePrefix("/privacy", "botch")).toBeNull();
      expect(stripCustomerSitePrefix("/terms", "botch")).toBeNull();
      expect(stripCustomerSitePrefix("/custom-page", "botch")).toBeNull();
    });
  });

  describe("homeHref rules", () => {
    it("ensures customer subdomains and custom domains use root / as homeHref", () => {
      const getHomeHref = (isCustomerHost: boolean, siteSlug: string) => {
        return isCustomerHost ? "/" : `/site/${siteSlug}`;
      };

      // Customer on botch.shipsprint.site or mybrand.com
      expect(getHomeHref(true, "botch")).toBe("/");
      // Platform visitor on shipsprint.site/site/botch
      expect(getHomeHref(false, "botch")).toBe("/site/botch");
    });

    it("ensures subpage URLs in footer and nav match host context", () => {
      const resolveSubpageUrl = (homeHref: string, pageSlug: string) => {
        const prefix = homeHref === "/" ? "" : homeHref;
        const clean = pageSlug.startsWith("/") ? pageSlug.slice(1) : pageSlug;
        return `${prefix}/${clean}`;
      };

      // On customer subdomain (homeHref = "/")
      expect(resolveSubpageUrl("/", "privacy")).toBe("/privacy");
      expect(resolveSubpageUrl("/", "terms")).toBe("/terms");
      expect(resolveSubpageUrl("/", "support")).toBe("/support");

      // On platform domain (homeHref = "/site/botch")
      expect(resolveSubpageUrl("/site/botch", "privacy")).toBe("/site/botch/privacy");
      expect(resolveSubpageUrl("/site/botch", "terms")).toBe("/site/botch/terms");
      expect(resolveSubpageUrl("/site/botch", "support")).toBe("/site/botch/support");
    });
  });
});
