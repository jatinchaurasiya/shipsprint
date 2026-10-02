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

/** Where Next.js writes the browser bundle. */
const CLIENT_BUNDLE_DIR = ".next/static";

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

/**
 * Confirms the compiler actually inlined the URL into the browser bundle.
 *
 * This exists because the build arguments alone prove nothing. An image was
 * built with both arguments present, passed the argument guard, recorded a
 * healthy-looking stamp, and still shipped a bundle with no Supabase config,
 * because lib/env.ts read the values by handing the whole `process.env` object
 * to the schema. Next.js substitutes NEXT_PUBLIC_* only for direct member
 * access, so nothing was inlined and the browser saw `undefined`.
 *
 * Checking the emitted artefact is the only assertion that can catch that class
 * of failure, so it happens after the build and fails it.
 */
function verify(env = process.env, bundleDir = CLIENT_BUNDLE_DIR) {
  const fs = require("node:fs");
  const path = require("node:path");

  const { ok, missing } = inspectPublicEnv(env);
  if (!ok) {
    console.error(`cannot verify inlining: ${missing.join(", ")} unset`);
    return 1;
  }

  let host;
  try {
    host = new URL(env.NEXT_PUBLIC_SUPABASE_URL.trim()).hostname;
  } catch {
    console.error("NEXT_PUBLIC_SUPABASE_URL is not a valid URL; cannot verify inlining");
    return 1;
  }
  if (!host) return 1;

  let entries;
  try {
    entries = fs.readdirSync(bundleDir, { recursive: true });
  } catch {
    console.error(`cannot read ${bundleDir}; did npm run build run before verify?`);
    return 1;
  }

  for (const entry of entries) {
    if (!String(entry).endsWith(".js")) continue;
    try {
      const source = fs.readFileSync(path.join(bundleDir, String(entry)), "utf8");
      if (source.includes(host)) {
        console.log(`verified: ${host} is inlined in the client bundle`);
        return 0;
      }
    } catch {
      // Unreadable chunk: keep scanning rather than fail on an unrelated error.
    }
  }

  console.error("");
  console.error(RULE);
  console.error("BUILD ABORTED: NEXT_PUBLIC_SUPABASE_URL was not inlined");
  console.error(RULE);
  console.error(`  expected host : ${host}`);
  console.error(`  searched      : ${bundleDir}`);
  console.error("");
  console.error("The build arguments were present, but the value never reached the");
  console.error("browser bundle. Next.js inlines NEXT_PUBLIC_* only for direct");
  console.error("`process.env.NEXT_PUBLIC_*` member access; reading them any other");
  console.error("way (for example by passing the whole `process.env` object to a");
  console.error("validator) leaves the browser with undefined while the server works.");
  console.error("");
  console.error("Check how lib/env.ts reads these values.");
  console.error("");
  return 1;
}

module.exports = { REQUIRED, CLIENT_BUNDLE_DIR, inspectPublicEnv, buildStamp, check, stamp, verify };

if (require.main === module) {
  const mode = process.argv[2];
  if (mode === "check") process.exit(check());
  else if (mode === "stamp") process.exit(stamp());
  else if (mode === "verify") process.exit(verify());
  else {
    console.error(`usage: node scripts/public-config.cjs <check|verify|stamp>`);
    process.exit(2);
  }
}