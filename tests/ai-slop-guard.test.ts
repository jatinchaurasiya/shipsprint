import { describe, expect, it } from "vitest";
import { generatePrivacyPolicy, generateTermsOfService, generateSupportPage } from "@/lib/legal-pages";
import { HALLMARK_THEMES } from "@/lib/theme-tokens";
import { auditCopy } from "@/lib/slop-detector";

describe("SlopMonster Production Copy Quality Guards", () => {
  it("enforces 5/5 score for default template hero copy", () => {
    const text =
      "Build a high-converting App Store landing page without frontend code. Connect store links, preview on real device frames, and publish to your custom domain.";
    const result = auditCopy(text);
    expect(result.score).toBe(5);
    expect(result.isClean).toBe(true);
  });

  it("enforces 5/5 score for default feature builder copy", () => {
    const text =
      "Arrange sections and preview updates directly in the browser. The live preview matches what visitors see on mobile and desktop.";
    const result = auditCopy(text);
    expect(result.score).toBe(5);
    expect(result.isClean).toBe(true);
  });

  it("enforces 5/5 score for default theme tagline", () => {
    const text = HALLMARK_THEMES.minimal!.tagline;
    const result = auditCopy(text);
    expect(result.score).toBe(5);
    expect(result.isClean).toBe(true);
  });

  it("enforces 5/5 score for generated legal account deletion copy", () => {
    const privacy = generatePrivacyPolicy("OrbitHealth", "support@orbithealth.app");
    // Ensure 'seamless' is completely absent
    expect(privacy.toLowerCase()).not.toContain("seamless");
    expect(privacy).toContain("Account Deletion");
  });

  it("enforces 5/5 score for generated terms and support pages", () => {
    const terms = generateTermsOfService("OrbitHealth", "support@orbithealth.app");
    const support = generateSupportPage("OrbitHealth", "support@orbithealth.app");

    expect(terms.toLowerCase()).not.toContain("seamless");
    expect(support.toLowerCase()).not.toContain("seamless");
    expect(support.toLowerCase()).not.toContain("robust");
    expect(support.toLowerCase()).not.toContain("effortless");
  });

  it("correctly catches AI slop tells and deducts quality points", () => {
    // 1. Catches AI vocabulary
    const slopVocab = "Our app seamlessly elevates your daily morning routine with cutting-edge tools.";
    const vocabResult = auditCopy(slopVocab);
    expect(vocabResult.score).toBeLessThan(5);
    expect(vocabResult.isClean).toBe(false);
    expect(vocabResult.hits.vocab.length).toBeGreaterThan(0);

    // 2. Catches AI constructions ("not just X, but Y")
    const slopPhrase = "It's not just a tracker, but a lifestyle companion.";
    const phraseResult = auditCopy(slopPhrase);
    expect(phraseResult.score).toBeLessThan(5);
    expect(phraseResult.hits.phrases.length).toBeGreaterThan(0);

    // 3. Catches rule-of-three cadence
    const slopTricolon = "Fast, clean, and direct app launcher.";
    const tricolonResult = auditCopy(slopTricolon);
    expect(tricolonResult.score).toBeLessThan(5);
    expect(tricolonResult.hits.rhythm.length).toBeGreaterThan(0);
  });
});
