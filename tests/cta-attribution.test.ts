import { describe, expect, it } from "vitest";
import { resolveCtaStore, storeFromUrl } from "@/lib/analytics";

/**
 * The attribution bug: the navbar "Get the app" button reported
 * `button_type: "nav_download"`, which names no store, so the dashboard's
 * `includes("app_store")` / `includes("play_store")` matching filed every
 * header download click under "Other Buttons" instead of iOS or Google Play.
 *
 * The store is now resolved by the `site_analytics_cta` view (migration 007),
 * which falls back to the recorded `target_url` for those legacy events. These
 * cases pin the client side of that contract, including the pre-migration
 * fallback so a database where the view has not been updated keeps working.
 */
describe("resolveCtaStore", () => {
  it("trusts the store the view resolved", () => {
    expect(resolveCtaStore({ store: "apple", button_type: "nav_download" })).toBe(
      "apple"
    );
    expect(resolveCtaStore({ store: "google", button_type: "nav_download" })).toBe(
      "google"
    );
    expect(
      resolveCtaStore({ store: "other", button_type: "app_store_hero" })
    ).toBe("other");
  });

  it("attributes the legacy nav_download type by the view's answer", () => {
    // The regression itself: both legacy navbar labels resolve to a store
    // instead of falling through to "other".
    expect(resolveCtaStore({ store: "apple", button_type: "nav_download" })).not.toBe(
      "other"
    );
    expect(
      resolveCtaStore({ store: "google", button_type: "nav_download" })
    ).not.toBe("other");
  });

  it("classifies every store-specific button type the renderer emits", () => {
    for (const type of ["app_store_nav", "app_store_hero", "app_store_footer"]) {
      expect(resolveCtaStore({ button_type: type })).toBe("apple");
    }
    for (const type of ["play_store_nav", "play_store_hero", "play_store_footer"]) {
      expect(resolveCtaStore({ button_type: type })).toBe("google");
    }
  });

  it("recognises the platform synonyms", () => {
    expect(resolveCtaStore({ button_type: "ios_download" })).toBe("apple");
    expect(resolveCtaStore({ button_type: "apple_link" })).toBe("apple");
    expect(resolveCtaStore({ button_type: "android_download" })).toBe("google");
    expect(resolveCtaStore({ button_type: "google_play" })).toBe("google");
  });

  it("keeps non-store CTAs in Other", () => {
    expect(resolveCtaStore({ button_type: "waitlist_signup" })).toBe("other");
    expect(resolveCtaStore({ button_type: "pricing" })).toBe("other");
  });

  it("falls back to the button type when the view has no store column yet", () => {
    // Migration 007 pending: undefined/null store must degrade to the previous
    // behaviour, never to a crash or a dropped click.
    expect(resolveCtaStore({ store: null, button_type: "app_store_nav" })).toBe(
      "apple"
    );
    expect(resolveCtaStore({ button_type: "play_store_nav" })).toBe("google");
    expect(resolveCtaStore({ button_type: "nav_download" })).toBe("other");
  });

  it("ignores an unrecognised store value rather than trusting it", () => {
    expect(resolveCtaStore({ store: "samsung", button_type: "app_store_nav" })).toBe(
      "apple"
    );
    expect(resolveCtaStore({ store: "", button_type: "play_store_hero" })).toBe(
      "google"
    );
  });

  it("treats missing and non-string input as unknown", () => {
    expect(resolveCtaStore({})).toBe("other");
    expect(resolveCtaStore({ button_type: null })).toBe("other");
    expect(resolveCtaStore({ store: null, button_type: null })).toBe("other");
  });

  it("is case and whitespace insensitive", () => {
    expect(resolveCtaStore({ button_type: "  APP_STORE_NAV " })).toBe("apple");
    expect(resolveCtaStore({ store: " Apple " })).toBe("apple");
  });
});

/**
 * The renderer tags a click by the store of the link it actually opens, so a
 * Play Store URL pasted into the App Store field is not reported as an iOS
 * download. The fallback keeps the owner's declared intent when the URL is not
 * a recognisable storefront.
 */
describe("storeFromUrl", () => {
  it("recognises both storefronts", () => {
    expect(storeFromUrl("https://apps.apple.com/us/app/zenhabit/id123")).toBe("apple");
    expect(storeFromUrl("https://itunes.apple.com/gb/app/id123")).toBe("apple");
    expect(storeFromUrl("https://play.google.com/store/apps/details?id=com.zen")).toBe(
      "google"
    );
    expect(storeFromUrl("https://market.android.com/details?id=com.zen")).toBe(
      "google"
    );
  });

  it("returns other for anything that is not a storefront", () => {
    expect(storeFromUrl("https://example.com/waitlist")).toBe("other");
    expect(storeFromUrl("#")).toBe("other");
    expect(storeFromUrl("")).toBe("other");
    expect(storeFromUrl(undefined)).toBe("other");
    expect(storeFromUrl(null)).toBe("other");
  });

  it("is case insensitive and tolerates surrounding whitespace", () => {
    expect(storeFromUrl("  HTTPS://APPS.APPLE.COM/us/app/x/id1 ")).toBe("apple");
  });

  it("does not match a lookalike host", () => {
    expect(storeFromUrl("https://apps.apple.com.evil.example/app")).toBe("other");
    expect(storeFromUrl("https://notplay.google.com.attacker.example/")).toBe("other");
  });
});
