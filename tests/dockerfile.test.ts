import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Regression test for the build that failed three times before this existed.
 *
 * A multi-line `RUN node -e '...'` was committed to the Dockerfile. Docker
 * parses each PHYSICAL line as its own instruction, so the script body was read
 * as Dockerfile commands and the build stopped with:
 *
 *   Dockerfile:62
 *    61 |     RUN node -e '
 *  >>> const required = ["NEXT_PUBLIC_SUPABASE_URL", ...];
 *   ERROR: failed to solve: dockerfile parse error on line 62: unknown instruction: const
 *
 * The script itself was valid JavaScript and valid shell, and it had been tested
 * that way, which is exactly why the mistake survived: extracting a RUN body and
 * running it through `node` or `sh -n` does not exercise the Dockerfile parser at
 * all. Nothing else in the toolchain reads this file, so `typecheck`, `lint`, the
 * test suite and `next build` all passed while the image could not be produced.
 *
 * This test reads the Dockerfile the way Docker does. It is the only check in the
 * repository that would have caught the error before a push.
 */

const DOCKERFILE = join(process.cwd(), "Dockerfile");

/** Instructions the Dockerfile parser recognises. */
const INSTRUCTIONS = new Set([
  "ADD",
  "ARG",
  "CMD",
  "COPY",
  "ENTRYPOINT",
  "ENV",
  "EXPOSE",
  "FROM",
  "HEALTHCHECK",
  "LABEL",
  "MAINTAINER",
  "ONBUILD",
  "RUN",
  "SHELL",
  "STOPSIGNAL",
  "USER",
  "VOLUME",
  "WORKDIR",
]);

interface ParsedInstruction {
  line: number;
  instruction: string;
  text: string;
}

/**
 * Minimal Dockerfile tokenizer: folds backslash continuations, then treats each
 * remaining logical line as one instruction, which is the behaviour that broke.
 */
function parseDockerfile(source: string): ParsedInstruction[] {
  const raw = source.split("\n");
  const logical: { line: number; text: string }[] = [];

  for (let i = 0; i < raw.length; i++) {
    const line = raw[i] ?? "";
    const trimmed = line.trim();

    // Blank, comment, or parser directive such as `# syntax=...`.
    if (!trimmed || trimmed.startsWith("#")) continue;

    if (trimmed.endsWith("\\")) {
      // Continuation: append the next physical line to this logical line.
      const head = trimmed.slice(0, -1).trim();
      let next = i + 1;
      let tail = "";
      while (next < raw.length) {
        const candidate = raw[next]?.trim() ?? "";
        tail = candidate.endsWith("\\") ? candidate.slice(0, -1).trim() : candidate;
        i = next;
        if (!candidate.endsWith("\\")) break;
        next++;
      }
      logical.push({ line: i + 1, text: `${head} ${tail}`.trim() });
      continue;
    }

    logical.push({ line: i + 1, text: trimmed });
  }

  return logical.map(({ line, text }) => {
    const [first = "", ...rest] = text.split(/\s+/);
    return { line, instruction: first.toUpperCase(), text: rest.join(" ") };
  });
}

const dockerfile = readFileSync(DOCKERFILE, "utf8");
const instructions = parseDockerfile(dockerfile);

describe("Dockerfile parses as Docker parses it", () => {
  it("tokenises at least one instruction", () => {
    expect(instructions.length).toBeGreaterThan(0);
  });

  it("contains no unknown instruction", () => {
    // This is the assertion the failing build violated.
    const unknown = instructions.filter((entry) => !INSTRUCTIONS.has(entry.instruction));
    expect(
      unknown.map((entry) => `line ${entry.line}: ${entry.text}`),
      "every logical Dockerfile line must start with a real instruction"
    ).toEqual([]);
  });

  it("defines the stages the runtime image depends on", () => {
    const froms = instructions
      .filter((entry) => entry.instruction === "FROM")
      .map((entry) => entry.text);
    expect(froms.length).toBeGreaterThanOrEqual(3);
    expect(froms.some((line) => /\bas deps\b/i.test(line))).toBe(true);
    expect(froms.some((line) => /\bas builder\b/i.test(line))).toBe(true);
    expect(froms.some((line) => /\bas runner\b/i.test(line))).toBe(true);
  });

  it("declares the NEXT_PUBLIC_* build arguments the bundle depends on", () => {
    const args = new Set(
      instructions
        .filter((entry) => entry.instruction === "ARG")
        .map((entry) => entry.text.split("=")[0])
    );
    for (const name of [
      "NEXT_PUBLIC_SUPABASE_URL",
      "NEXT_PUBLIC_SUPABASE_ANON_KEY",
      "NEXT_PUBLIC_ROOT_DOMAIN",
      "NEXT_PUBLIC_APP_URL",
    ]) {
      expect(args, `ARG ${name} must be declared`).toContain(name);
    }
  });

  it("validates the public build config before the compiler runs", () => {
    // Ordering is the entire point: the guard must abort before the expensive,
    // silently-corrupting `npm run build` rather than after it.
    const guard = instructions.findIndex(
      (entry) => entry.instruction === "RUN" && entry.text.includes("public-config.cjs check")
    );
    const build = instructions.findIndex(
      (entry) => entry.instruction === "RUN" && entry.text.includes("npm run build")
    );
    expect(guard).toBeGreaterThanOrEqual(0);
    expect(build).toBeGreaterThanOrEqual(0);
    expect(guard).toBeLessThan(build);
  });

  it("stamps the config after the build, so the output directory exists", () => {
    const build = instructions.findIndex(
      (entry) => entry.instruction === "RUN" && entry.text.includes("npm run build")
    );
    const stamp = instructions.findIndex(
      (entry) => entry.instruction === "RUN" && entry.text.includes("public-config.cjs stamp")
    );
    expect(stamp).toBeGreaterThan(build);
  });

  it("copies the standalone output, which carries the stamp into the image", () => {
    const standaloneCopies = instructions.filter(
      (entry) => entry.instruction === "COPY" && entry.text.includes(".next/standalone")
    );
    expect(standaloneCopies.length).toBeGreaterThan(0);
    // It must be owned by the non-root user that the runtime stage switches to.
    for (const entry of standaloneCopies) {
      expect(entry.text).toContain("--chown=nextjs:nodejs");
    }
  });

  it("keeps every RUN instruction on a single physical line", () => {
    // Direct guard against reintroducing an inline multi-line script.
    const raw = dockerfile.split("\n");
    const offenders = instructions
      .filter((entry) => entry.instruction === "RUN")
      .map((entry) => raw[entry.line - 1] ?? "")
      .filter((line) => /node\s+-e\s+['"`]/.test(line));

    expect(
      offenders,
      "inline `node -e` in a Dockerfile is parsed as multiple instructions; use a script file"
    ).toEqual([]);
  });
});