import { describe, expect, it } from "vitest";
import { normalizeImageUrl } from "@/lib/storage/image-url";

describe("normalizeImageUrl", () => {
  it("returns empty string for null or undefined or empty input", () => {
    expect(normalizeImageUrl(null)).toBe("");
    expect(normalizeImageUrl(undefined)).toBe("");
    expect(normalizeImageUrl("")).toBe("");
  });

  it("leaves data URLs untouched", () => {
    const dataUrl = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";
    expect(normalizeImageUrl(dataUrl)).toBe(dataUrl);
  });

  it("leaves existing relative URLs untouched", () => {
    expect(normalizeImageUrl("/uploads/2026-10-07/photo.png")).toBe(
      "/uploads/2026-10-07/photo.png"
    );
  });

  it("rewrites assets.shipsprint.site/uploads/... to /uploads/...", () => {
    expect(
      normalizeImageUrl(
        "https://assets.shipsprint.site/uploads/2026-10-07/6053a6ab-7171-40cd-b650-1e504d53b779.png"
      )
    ).toBe("/uploads/2026-10-07/6053a6ab-7171-40cd-b650-1e504d53b779.png");
  });

  it("rewrites assets.localhost/uploads/... to /uploads/...", () => {
    expect(
      normalizeImageUrl("http://assets.localhost/uploads/2026-10-07/test.png")
    ).toBe("/uploads/2026-10-07/test.png");
  });

  it("rewrites subdomains on shipsprint.site to /uploads/...", () => {
    expect(
      normalizeImageUrl("https://preview.shipsprint.site/uploads/2026-10-07/test.png")
    ).toBe("/uploads/2026-10-07/test.png");
  });

  it("leaves external third-party image URLs intact", () => {
    const external = "https://images.unsplash.com/photo-12345";
    expect(normalizeImageUrl(external)).toBe(external);
  });
});
