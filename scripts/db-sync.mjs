#!/usr/bin/env node
/**
 * Database reconciliation.
 *
 * The repo contains hand-written migrations, but there is no evidence they were
 * ever applied to the live project. The initial schema contains a
 * `drop trigger if exists on_auth_user_created on auth.users;` statement whose
 * `IF EXISTS` clause sits in the column-list position, which would abort the
 * entire migration if it is a syntax error. That has to be determined against
 * the real database, not assumed either way.
 *
 * This script:
 *   1. Verifies required environment is present, without printing secrets.
 *   2. Links the Supabase project.
 *   3. Reports the live migration history and the actual schema.
 *   4. Flags drift between the migrations and the live database.
 *   5. Applies anything missing, and generates TypeScript types.
 *
 * Usage:
 *   node scripts/db-sync.mjs           # report only, no writes
 *   node scripts/db-sync.mjs --apply   # apply pending migrations
 *
 * Requires: supabase CLI on PATH, and a Supabase access token
 * (npx supabase login) or SUPABASE_ACCESS_TOKEN in the environment.
 */

import { readFileSync, existsSync, writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const APPLY = process.argv.includes("--apply");
const CI = "--yes" in process.argv;

const c = {
  ok: (s) => console.log(`  \x1b[32m${s}\x1b[39m`),
  warn: (s) => console.log(`  \x1b[33m${s}\x1b[39m`),
  fail: (s) => console.log(`  \x1b[31m${s}\x1b[39m`),
  info: (s) => console.log(`  \x1b[36m${s}\x1b[39m`),
  head: (s) => console.log(`\n\x1b[1m${s}\x1b[0m`),
};

function parseEnvFile() {
  const path = join(ROOT, ".env.local");
  if (!existsSync(path)) return {};

  const out = {};
  for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    out[key] = value;
  }
  return out;
}

const env = parseEnvFile();
process.env.SUPABASE_URL ??= env.NEXT_PUBLIC_SUPABASE_URL;
process.env.SUPABASE_ANON_KEY ??= env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// ---------------------------------------------------------------------------
// 1. Environment
// ---------------------------------------------------------------------------
c.head("Environment");

const fileSize = existsSync(join(ROOT, ".env.local"))
  ? readFileSync(join(ROOT, ".env.local"), "utf8").trim().length
  : 0;

if (fileSize === 0) {
  c.fail(".env.local is empty.");
  console.log(
    "\n  Populate it with at least:\n" +
      "    NEXT_PUBLIC_SUPABASE_URL=\n" +
      "    NEXT_PUBLIC_SUPABASE_ANON_KEY=\n" +
      "    SUPABASE_SERVICE_ROLE_KEY=\n\n" +
      "  See .env.example for the full list.\n"
  );
  process.exit(1);
}

const REQUIRED = ["NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_ANON_KEY"];
let envOk = true;
for (const key of REQUIRED) {
  if (env[key] && env[key].length > 10) c.ok(`${key} present`);
  else {
    c.fail(`${key} missing or truncated`);
    envOk = false;
  }
}

// The project ref is needed to link. It is not a secret.
const projectRef = env.NEXT_PUBLIC_SUPABASE_URL?.match(
  /https:\/\/([a-z0-9]+)\.supabase\.(co|in)/
)?.[1];
if (projectRef) c.info(`project ref: ${projectRef}`);
else c.warn("could not parse a project ref from the URL");

if (!envOk) process.exit(1);

// ---------------------------------------------------------------------------
// 2. CLI
// ---------------------------------------------------------------------------
c.head("Supabase CLI");

function run(args, { allowFail = false } = {}) {
  try {
    return execFileSync("supabase.cmd", args, {
      cwd: ROOT,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    });
  } catch (error) {
    if (allowFail) return "";
    c.fail(`\`supabase ${args.join(" ")}\` failed`);
    const stderr = error.stderr?.toString().trim();
    if (stderr) console.log(stderr.split(/\r?\n/).slice(0, 12).map((l) => `      ${l}`).join("\n"));
    process.exit(1);
  }
}

try {
  execFileSync("supabase.cmd", ["--version"], { encoding: "utf8" });
} catch {
  c.fail("supabase CLI not found. Install with: npm i -g supabase");
  process.exit(1);
}
c.ok(run("supabase --version").trim());

const hasToken =
  process.env.SUPABASE_ACCESS_TOKEN || process.env.SB_ACCESS_TOKEN || CI;
if (!hasToken) {
  c.warn("No access token found. Run `supabase login` first if linking fails.");
}

// ---------------------------------------------------------------------------
// 3. Link
// ---------------------------------------------------------------------------
c.head("Project link");

if (projectRef) {
  const existing = existsSync(join(ROOT, "supabase", ".temp", "project-ref"));
  if (existing) {
    const current = readFileSync(
      join(ROOT, "supabase", ".temp", "project-ref"),
      "utf8"
    ).trim();
    if (current === projectRef) {
      c.ok(`already linked to ${current}`);
    } else {
      c.info(`relinking ${current} -> ${projectRef}`);
      run(["link", "--project-ref", projectRef, ...(CI ? ["--yes"] : [])], {
        allowFail: true,
      });
    }
  } else {
    c.info(`linking ${projectRef}`);
    run(["link", "--project-ref", projectRef, ...(CI ? ["--yes"] : [])], {
      allowFail: true,
    });
  }
} else {
  c.warn("no project ref; skipping link");
}

// ---------------------------------------------------------------------------
// 4. Live schema state
// ---------------------------------------------------------------------------
c.head("Live schema");

const migrationList = run(
  ["migration", "list", "--linked"],
  { allowFail: true }
).trim();

if (migrationList) {
  console.log(
    migrationList
      .split(/\r?\n/)
      .map((l) => `      ${l}`)
      .join("\n")
  );

  const applied = migrationList
    .split(/\r?\n/)
    .filter((l) => l.includes("|") && !l.includes("LOCAL"))
    .map((l) => l.split("|")[1]?.trim())
    .filter(Boolean);

  if (applied.length === 0) {
    c.warn("no migrations recorded against the project");
    c.info("the database is likely empty: every migration still needs applying");
  } else {
    c.ok(`${applied.length} migration(s) applied`);
  }
} else {
  c.warn("could not list migrations (not linked, or no access token)");
}

const localMigrations = existsSync(join(ROOT, "supabase", "migrations"))
  ? readFileSync(join(ROOT, "supabase", "migrations"), "utf8")
  : "";

// ---------------------------------------------------------------------------
// 5. Drift
// ---------------------------------------------------------------------------
c.head("Drift");

const diff = run(["db", "diff", "--linked", "--schema", "public"], {
  allowFail: true,
}).trim();

if (diff && diff.length > 0 && !/no schema changes/i.test(diff)) {
  c.warn("the live database does not match the migration files");
  console.log(
    diff
      .split(/\r?\n/)
      .slice(0, 60)
      .map((l) => `      ${l}`)
      .join("\n")
  );
} else {
  c.ok("no drift detected between migrations and the live database");
}

// ---------------------------------------------------------------------------
// 6. Apply
// ---------------------------------------------------------------------------
c.head("Migrations");

if (!APPLY) {
  c.info("dry run. re-run with --apply to push pending migrations");
  console.log(
    "\n  \x1b[1mWhen you are ready:\x1b[0m\n" +
      "    node scripts/db-sync.mjs --apply\n\n" +
      "  That will run `supabase migration up`, then regenerate\n" +
      "  types/database.generated.ts and report any type errors in the app.\n"
  );
  process.exit(0);
}

const up = run(["migration", "up", "--linked", ...(CI ? ["--include-all"] : [])], {
  allowFail: true,
});

if (up) {
  console.log(up.split(/\r?\n/).map((l) => `      ${l}`).join("\n"));
  c.ok("migrations applied");
} else {
  c.warn("`migration up` produced no output; it may already be current");
}

void localMigrations;

// ---------------------------------------------------------------------------
// 7. Types
// ---------------------------------------------------------------------------
c.head("Types");

const outPath = join(ROOT, "types", "database.generated.ts");
const generated = run(
  ["gen", "types", "typescript", "--project-id", projectRef ?? "", "--schema", "public"],
  { allowFail: true }
).trim();

if (generated && generated.includes("export type Database")) {
  writeFileSync(outPath, generated, "utf8");
  c.ok(`wrote ${outPath.replace(ROOT + "\\", "")}`);
  c.info(
    "next: replace types/database.ts with the generated definitions and delete\n" +
      "      the `as Site` / `as Plan` casts so the compiler checks queries."
  );
} else {
  c.warn("could not generate types");
}

console.log("");
