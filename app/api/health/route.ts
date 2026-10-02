import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { optionalEnv, isProduction } from "@/lib/env";
import { readPublicConfigStamp } from "@/lib/build-config";

export const runtime = "nodejs";

/**
 * Liveness and readiness probe.
 *
 * Reports whether the process is up, whether the environment is configured, and
 * whether the database is actually reachable. A container that reports healthy
 * while every query fails is worse than one that restarts.
 *
 * Never exposes configuration values, only whether they are present.
 */
export async function GET() {
  const started = Date.now();
  const checks: Record<string, "ok" | "missing" | "error"> = {};

  const optional = optionalEnv();
  const required = [
    "NEXT_PUBLIC_SUPABASE_URL",
    "NEXT_PUBLIC_SUPABASE_ANON_KEY",
    "SUPABASE_SERVICE_ROLE_KEY",
    "DODO_PAYMENTS_API_KEY",
    "DODO_PAYMENTS_WEBHOOK_KEY",
    "R2_ACCOUNT_ID",
    "R2_ACCESS_KEY_ID",
    "R2_SECRET_ACCESS_KEY",
    "R2_BUCKET_NAME",
    "CRON_SECRET",
  ] as const;

  for (const name of required) {
    checks[name] = process.env[name] ? "ok" : "missing";
  }
  checks.REDIS_URL = optional.REDIS_URL ? "ok" : "missing";

  // The runtime env check above is NOT evidence that the client bundle can
  // authenticate anyone. NEXT_PUBLIC_* values are compiled into JavaScript at
  // build time, so a container can hold correct runtime env while shipping a
  // bundle with no Supabase config — which is exactly what reached production
  // twice: /api/health answered "healthy", every page rendered, and signup was
  // deadlocked because the browser's publicEnv() threw.
  //
  // public-config.json is written by the Dockerfile during the guarded build and
  // records what the compiler was given. The build additionally greps the
  // emitted chunks to prove the values were actually inlined, so an image that
  // reaches this point has already had that verified. This check therefore
  // reports provenance, and detects images built before the guard existed.
  const clientBundle = await readPublicConfigStamp();
  checks.CLIENT_BUNDLE_CONFIG =
    clientBundle === "missing" && !isProduction() ? "ok" : clientBundle;

  // Real database round-trip, not just a config check.
  let database: "ok" | "error" = "error";
  try {
    const { error } = await createAdminClient()
      .from("plans")
      .select("id")
      .limit(1);
    database = error ? "error" : "ok";
  } catch {
    database = "error";
  }

  const missing = Object.entries(checks)
    .filter(([, status]) => status === "missing")
    .map(([name]) => name);

  const healthy = database === "ok" && missing.length === 0;

  return NextResponse.json(
    {
      status: healthy ? "healthy" : "degraded",
      checks,
      missing,
      database,
      durationMs: Date.now() - started,
      version: process.env.npm_package_version ?? "unknown",
    },
    { status: healthy ? 200 : 503 }
  );
}
