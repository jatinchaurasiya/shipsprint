import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { optionalEnv } from "@/lib/env";

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
