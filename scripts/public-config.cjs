#!/usr/bin/env node
/**
 * Guard for the NEXT_PUBLIC_* values that are inlined into the client bundle.
 *
 * WHY THIS IS A SCRIPT AND NOT AN INLINE `RUN node -e '...'`
 * A Dockerfile instruction cannot span lines. Docker parses each physical line
 * as its own instruction, so an inline multi-line script is read as a sequence
 * of Dockerfile commands and the build dies with
 * `dockerfile parse error: unknown instruction: const`. Keeping the logic here
 * makes every RUN a single line and puts the behaviour under test.
 *
 * WHY IT EXISTS
 * NEXT_PUBLIC_* values are substituted into the JavaScript bundle by the
 * compiler, so a value missing at build time cannot be supplied by
 * docker-compose at runtime. An image built without them starts normally, serves
 * every page, and answers /api/health with "healthy" — because compose *does*
 * provide them as runtime env — while the browser has no Supabase config at all,
 * `publicEnv()` throws on first use, and signup deadlocks with every button
 * permanently disabled.
 *
 * Three failure shapes were measured in real builds and are not equivalent:
 *   value present -> inlined correctly
 *   value ""      -> inlined as ""       -> Zod "must not be empty"
 *   value absent  -> key omitted entirely -> Zod "received undefined"
 * Only the absent case matches the reported production error, which identifies a
 * build that never received the build arguments.
 *
 * USAGE
 *   node scripts/public-config.cjs check   # abort the build if misconfigured
 *   node scripts/public-config.cjs stamp   # record provenance for /api/health
 */

const REQUIRED = ["NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_ANON_KEY"];

/**
 * Reports which required build arguments are unusable.
 * Whitespace-only counts as unset: it survives a `!value` check but produces a
 * bundle with an empty config.
 */
function inspectPublicEnv(env) {
  const missing = REQUIRED.filter((key) => {
    const value = env[key];
    return typeof value !== "string" || value.trim().length === 0;
  });
  return { ok: missing.length === 0, missing };
}

/**
 * Provenance of the inlined config, consumed by /api/health.
 *
 * The URL and a presence flag only. The anon key is never written into a file
 * that ships inside the image.
 */
function buildStamp(env) {
  const url = typeof env.NEXT_PUBLIC_SUPABASE_URL === "string" ? env.NEXT_PUBLIC_SUPABASE_URL : "";
  const anonKey = typeof env.NEXT_PUBLIC_SUPABASE_ANON_KEY === "string" ? env.NEXT_PUBLIC_SUPABASE_ANON_KEY : "";
  return {
    NEXT_PUBLIC_SUPABASE_URL: url,
    NEXT_PUBLIC_SUPABASE_ANON_KEY_SET: anonKey.trim().length > 0,
    NEXT_PUBLIC_ROOT_DOMAIN: typeof env.NEXT_PUBLIC_ROOT_DOMAIN === "string" ? env.NEXT_PUBLIC_ROOT_DOMAIN : "",
    NEXT_PUBLIC_APP_URL: typeof env.NEXT_PUBLIC_APP_URL === "string" ? env.NEXT_PUBLIC_APP_URL : "",
  };
}

const RULE = "=".repeat(72);

function describe(value) {
  if (value === undefined) return "ABSENT";
  if (value === null) return "NOT SET";
  return value.trim().length === 0 ? "EMPTY" : "PRESENT";
}

function check(env = process.env) {
  const { ok, missing } = inspectPublicEnv(env);
  if (ok) {
    console.log("public build config OK");
    return 0;
  }

  console.error("");
  console.error(RULE);
  console.error("BUILD ABORTED: missing required NEXT_PUBLIC_* build arguments");
  console.error(RULE);
  for (const key of missing) {
    console.error(`  - ${key} is ${describe(env[key])}`);
  }
  console.error("");
  console.error("These are inlined into the client bundle at BUILD time and cannot");
  console.error("be supplied at runtime. Supply them as build arguments, either via");
  console.error("docker-compose build args or the repository secrets read by");
  console.error(".github/workflows/deploy.yml:");
  console.error("");
  console.error("  NEXT_PUBLIC_SUPABASE_URL       https://<project-ref>.supabase.co");
  console.error("  NEXT_PUBLIC_SUPABASE_ANON_KEY  the anon / publishable key");
  console.error("");
  console.error("Shipping an image built without them yields a site where the server");
  console.error("looks healthy and signup is permanently disabled.");
  console.error("");
  return 1;
}

function stamp(env = process.env, targetDir = ".next/standalone") {
  const { ok, missing } = inspectPublicEnv(env);
  if (!ok) {
    console.error(`refusing to stamp an invalid build: ${missing.join(", ")}`);
    return 1;
  }

  // Written after `npm run build`, because that regenerates .next/standalone.
  // Placing it there lets the existing COPY --from=builder carry it into the
  // runtime image without an extra copy step.
  const fs = require("node:fs");
  const path = require("node:path");
  const destination = path.join(targetDir, "public-config.json");
  fs.mkdirSync(targetDir, { recursive: true });
  fs.writeFileSync(destination, JSON.stringify(buildStamp(env)) + "\n");
  console.log(`wrote ${destination}`);
  return 0;
}

module.exports = { REQUIRED, inspectPublicEnv, buildStamp, check, stamp };

if (require.main === module) {
  const mode = process.argv[2];
  if (mode === "check") process.exit(check());
  else if (mode === "stamp") process.exit(stamp());
  else {
    console.error(`usage: node scripts/public-config.cjs <check|stamp>`);
    process.exit(2);
  }
}