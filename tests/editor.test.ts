import { describe, expect, it } from "vitest";
import {
  domainStatusCopy,
  generateFeatureId,
  parseReleaseNotes,
  VIEWPORT_CONFIGS,
  BLANK_RELEASE,
  type DomainState,
} from "@/lib/editor";

describe("Editor Domain Status Copy", () => {
  it("reports active status with emerald tone when certificate is issued", () => {
    const state: DomainState = {
      status: "active",
      ssl_status: "active",
      dns_resolves: true,
      instructions: null,
    };
    const copy = domainStatusCopy(state);
    expect(copy.label).toBe("Active");
    expect(copy.tone).toBe("emerald");
    expect(copy.detail).toContain("DNS verified");
  });

  it("reports pending_validation with amber tone and routing guidance", () => {
    const state: DomainState = {
      status: "pending_validation",
      ssl_status: "pending",
      dns_resolves: false,
      instructions: null,
    };
    const copy = domainStatusCopy(state);
    expect(copy.label).toBe("Waiting for DNS");
    expect(copy.tone).toBe("amber");
    expect(copy.detail).toContain("routing record");
  });

  it("reports verification failure with red tone", () => {
    const state: DomainState = {
      status: "failed",
      ssl_status: "failed",
      dns_resolves: false,
      instructions: null,
    };
    const copy = domainStatusCopy(state);
    expect(copy.label).toBe("Verification failed");
    expect(copy.tone).toBe("red");
    expect(copy.detail).toContain("expected DNS records were not found");
  });

  it("defaults to pending_dns with amber tone when state is null or pending_dns", () => {
    const nullCopy = domainStatusCopy(null);
    expect(nullCopy.label).toBe("Pending DNS");
    expect(nullCopy.tone).toBe("amber");

    const pendingCopy = domainStatusCopy({
      status: "pending_dns",
      ssl_status: null,
    });
    expect(pendingCopy.label).toBe("Pending DNS");
    expect(pendingCopy.tone).toBe("amber");
  });
});

describe("Editor Helpers", () => {
  it("generates unique feature ids on consecutive invocations", () => {
    const id1 = generateFeatureId();
    const id2 = generateFeatureId();
    expect(id1).toMatch(/^feat-[a-z0-9]+-[a-z0-9]+$/);
    expect(id2).toMatch(/^feat-[a-z0-9]+-[a-z0-9]+$/);
    expect(id1).not.toBe(id2);
  });

  it("parses multiline release notes, trimming whitespace and filtering empty lines", () => {
    const raw = `
      Instant QR transfers  
      
      Live transaction detail
         Card spend controls   
    `;
    const notes = parseReleaseNotes(raw);
    expect(notes).toEqual([
      "Instant QR transfers",
      "Live transaction detail",
      "Card spend controls",
    ]);
  });

  it("returns empty array for empty release notes", () => {
    expect(parseReleaseNotes("")).toEqual([]);
    expect(parseReleaseNotes("   \n\n  \t  ")).toEqual([]);
  });

  it("provides baseline BLANK_RELEASE with empty fields", () => {
    expect(BLANK_RELEASE.eyebrow).toBe("");
    expect(BLANK_RELEASE.title).toBe("");
    expect(BLANK_RELEASE.release_notes).toEqual([]);
    expect(BLANK_RELEASE.image_url).toBe("");
  });
});

describe("Viewport Configuration", () => {
  it("provides configurations for desktop, tablet, and mobile", () => {
    expect(VIEWPORT_CONFIGS.desktop).toBeDefined();
    expect(VIEWPORT_CONFIGS.tablet).toBeDefined();
    expect(VIEWPORT_CONFIGS.mobile).toBeDefined();
  });

  it("desktop uses fluid width", () => {
    expect(VIEWPORT_CONFIGS.desktop.widthClass).toContain("w-full");
    expect(VIEWPORT_CONFIGS.desktop.dimensions).toBe("Fluid");
    expect(VIEWPORT_CONFIGS.desktop.name).toBe("Desktop");
  });

  it("tablet uses 768px width", () => {
    expect(VIEWPORT_CONFIGS.tablet.widthClass).toContain("768px");
    expect(VIEWPORT_CONFIGS.tablet.dimensions).toContain("768");
    expect(VIEWPORT_CONFIGS.tablet.name).toBe("Tablet");
  });

  it("mobile uses 375px width", () => {
    expect(VIEWPORT_CONFIGS.mobile.widthClass).toContain("375px");
    expect(VIEWPORT_CONFIGS.mobile.dimensions).toContain("375");
    expect(VIEWPORT_CONFIGS.mobile.name).toBe("Mobile");
  });
});
