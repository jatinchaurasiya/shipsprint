import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { renderToStaticMarkup } from "react-dom/server";
import { getFlagshipDefaultContent } from "@/lib/templates";
import { SiteRenderer } from "@/components/renderer/site-renderer";

/**
 * H2 regression guard — no fabricated metrics, ratings, uptime or review
 * counts anywhere: not on the marketing homepage, not in the default content
 * seeded into every new customer site, and not in the renderer fallbacks.
 */

const ROOT = process.cwd();

describe("H2 — default site content has no fabricated metrics", () => {
  const content = getFlagshipDefaultContent("TestApp");

  it("does not seed a star rating", () => {
    expect(content.hero.rating_stars).toBeUndefined();
  });

  it("does not seed fabricated impact metrics", () => {
    const impacts = content.impacts ?? {};
    expect(impacts.metric_stat).toBeUndefined();
    expect(impacts.metric_label).toBeUndefined();
    expect(impacts.rating_score).toBeUndefined();
    expect(impacts.rating_reviews_label).toBeUndefined();
    expect(impacts.sla_stat).toBeUndefined();
    expect(impacts.sla_label).toBeUndefined();
    expect(impacts.speed_stat).toBeUndefined();
    expect(impacts.speed_label).toBeUndefined();
    expect(impacts.trust_avatars).toBeUndefined();
    expect(impacts.trust_headline).toBeUndefined();
  });

  it("does not seed fake chart / checklist / readiness numbers", () => {
    expect(content.features[1]?.proof_meta?.chart_stat).toBeUndefined();

    for (const item of content.features[0]?.proof_meta?.checklist_items ?? []) {
      expect(item.date).toBeUndefined();
      expect(item.urgent).toBeUndefined();
    }

    for (const item of content.features[2]?.proof_meta?.readiness_items ?? []) {
      expect(item.value).not.toMatch(/12\s*\/\s*12/);
      expect(item.value).not.toMatch(/verified/i);
    }
  });

  it("renders without any of the fabricated strings", () => {
    const html = renderToStaticMarkup(<SiteRenderer content={content} />);
    for (const fake of [
      "4.9/5", // rating display
      "4.9 stars", // rating aria-label
      "1,200",
      "14,820",
      "18.4",
      "842",
      "99.9",
      "Trusted by indie makers",
      "Starred by indie makers",
      "Average indie maker rating",
    ]) {
      expect(html, `rendered default site must not contain ${fake}`).not.toContain(
        fake,
      );
    }
  });
});

describe("H2 — default site content is neutral (no ShipSprint marketing)", () => {
  const content = getFlagshipDefaultContent("TestApp");

  it("does not seed ShipSprint's marketing copy or feature list", () => {
    const allText = JSON.stringify(content);
    for (const s of [
      "Built for indie app makers",
      "Launch your app page. Without the code.",
      "Build a high-converting App Store landing page",
      "Zero-drift page builder",
      "Store buttons that convert",
      "Domains, TLS & reminders",
      "Set up your brand",
      "Verified milestones & proof",
      "Publish & track installs",
      "Designed for indie apps shipping worldwide.",
    ]) {
      expect(allText, `default content must not contain ${s}`).not.toContain(s);
    }
  });

  it("starts with an empty feature list and no impacts/how-it-works", () => {
    expect(content.features).toEqual([]);
    expect(content.impacts).toBeUndefined();
    expect(content.how_it_works).toBeUndefined();
  });

  it("uses the user's app name as the headline", () => {
    expect(content.hero.header).toBe("TestApp");
    expect(content.hero.badge_text).toBe("");
    expect(content.hero.short_description).toBe("");
  });
});

describe("H2 — marketing source has no fabricated metrics", () => {
  const metricsSrc = readFileSync(join(ROOT, "lib/metrics.ts"), "utf8");
  const pageSrc = readFileSync(join(ROOT, "app/page.tsx"), "utf8");

  it("lib/metrics.ts has no Math.max floor and no fabricated defaults", () => {
    expect(metricsSrc).not.toMatch(/Math\.max/);
    expect(metricsSrc).not.toMatch(/publishedSites:\s*120/);
    expect(metricsSrc).not.toMatch(/makerRating/);
    expect(metricsSrc).not.toMatch(/weeklyInstallsSample/);
    expect(metricsSrc).not.toMatch(/conversionRate/);
    expect(metricsSrc).not.toMatch(/uptimePercent/);
  });

  it("app/page.tsx no longer renders the fabricated metrics", () => {
    for (const fake of [
      "makerRating",
      "weeklyInstallsSample",
      "conversionRate",
      "uptimePercent",
      "launchSpeedMinutes",
      "Trusted by indie makers",
      "Starred by indie makers",
      "Average indie maker rating",
    ]) {
      expect(pageSrc, `app/page.tsx must not reference ${fake}`).not.toContain(fake);
    }
  });

  it("app/page.tsx shows only the real published-site count", () => {
    expect(pageSrc).toContain("metrics.publishedSites");
  });
});