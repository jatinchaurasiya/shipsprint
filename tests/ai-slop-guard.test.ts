import { describe, expect, it } from "vitest";
import { spawnSync } from "node:child_process";
import { resolve } from "node:path";
import { generatePrivacyPolicy, generateTermsOfService, generateSupportPage } from "@/lib/legal-pages";
import { HALLMARK_THEMES } from "@/lib/theme-tokens";

const DESLOP_PATH = resolve(process.cwd(), ".agents/skills/slopmonster/tools/deslop.py");

function checkWithDeslop(text: string): { score: number; output: string } {
  const res = spawnSync("python3", [DESLOP_PATH, "--text", text], {
    encoding: "utf-8",
  });
  const output = (res.stdout || "") + (res.stderr || "");
  const match = output.match(/score\s+(\d+)\/5/);
  const score = match ? parseInt(match[1]!, 10) : (res.status === 0 ? 5 : 0);
  return { score, output };
}

describe("SlopMonster Production Copy Quality Guards", () => {
  it("enforces 5/5 score for default template hero copy", () => {
    const text = "Build a high-converting App Store landing page without frontend code. Connect store links, preview on real device frames, and publish to your custom domain.";
    const result = checkWithDeslop(text);
    expect(result.score).toBe(5);
  });

  it("enforces 5/5 score for default feature builder copy", () => {
    const text = "Arrange sections and preview updates directly in the browser. The live preview matches what visitors see on mobile and desktop.";
    const result = checkWithDeslop(text);
    expect(result.score).toBe(5);
  });

  it("enforces 5/5 score for default theme tagline", () => {
    const text = HALLMARK_THEMES.minimal!.tagline;
    const result = checkWithDeslop(text);
    expect(result.score).toBe(5);
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
});
