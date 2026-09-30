import { z } from "zod";

/**
 * Environment access is deliberately LAZY.
 *
 * Next.js evaluates module scope during static prerendering, so validating env
 * at import time would make `next build` require production secrets. Instead
 * every accessor parses on first use and caches the result, which means a
 * missing variable fails at the exact call site that needs it with a message
 * naming the variable.
 *
 * This replaces the previous approach of deciding "is this a real environment?"
 * by substring-matching env values (`apiKey.includes("placeholder")`). That
 * pattern made production behaviour depend on the wording of an undocumented
 * secret, and a placeholder Dodo key silently enabled a live plan-escalation
 * path in production.
 */

const requiredString = (name: string) =>
  z
    .string()
    .min(1, `${name} must not be empty`)
    .refine((v) => v.trim().length > 0, `${name} must not be blank`);

const publicSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: requiredString("NEXT_PUBLIC_SUPABASE_URL").url(
    "NEXT_PUBLIC_SUPABASE_URL must be a valid URL"
  ),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: requiredString("NEXT_PUBLIC_SUPABASE_ANON_KEY"),
  NEXT_PUBLIC_ROOT_DOMAIN: requiredString("NEXT_PUBLIC_ROOT_DOMAIN").default(
    "localhost:3000"
  ),
  NEXT_PUBLIC_APP_URL: requiredString("NEXT_PUBLIC_APP_URL").default(
    "http://localhost:3000"
  ),
});

const serverSchema = z.object({
  SUPABASE_SERVICE_ROLE_KEY: requiredString("SUPABASE_SERVICE_ROLE_KEY"),
  DODO_PAYMENTS_API_KEY: requiredString("DODO_PAYMENTS_API_KEY"),
  DODO_PAYMENTS_WEBHOOK_KEY: requiredString("DODO_PAYMENTS_WEBHOOK_KEY"),
  DODO_PAYMENTS_ENVIRONMENT: z.enum(["live_mode", "test_mode"]).default("test_mode"),
  R2_ACCOUNT_ID: requiredString("R2_ACCOUNT_ID"),
  R2_ACCESS_KEY_ID: requiredString("R2_ACCESS_KEY_ID"),
  R2_SECRET_ACCESS_KEY: requiredString("R2_SECRET_ACCESS_KEY"),
  R2_BUCKET_NAME: requiredString("R2_BUCKET_NAME"),
});

const serverOptionalSchema = z.object({
  REDIS_URL: z.string().optional(),
  SENTRY_DSN: z.string().optional(),
  ACME_CONTACT_EMAIL: z.string().email().optional(),
  CNAME_TARGET_HOST: z.string().optional(),
  CRON_SECRET: requiredString("CRON_SECRET"),
  DOMAIN_VERIFY_PREFIX: z.string().default("_shipverify"),
  R2_PUBLIC_DOMAIN: z.string().optional(),
  ROOT_DOMAIN: z.string().default("localhost:3000"),
  APP_HOSTS: z.string().optional(),
  LOG_LEVEL: z.enum(["debug", "info", "warn", "error"]).optional(),
  DODO_PRODUCT_ID_BASIC_MONTHLY: z.string().optional(),
  DODO_PRODUCT_ID_BASIC_YEARLY: z.string().optional(),
  DODO_PRODUCT_ID_PRO_MONTHLY: z.string().optional(),
  DODO_PRODUCT_ID_PRO_YEARLY: z.string().optional(),
  DODO_PRODUCT_ID_BASIC: z.string().optional(),
  DODO_PRODUCT_ID_PRO: z.string().optional(),
});

export type PublicEnv = z.infer<typeof publicSchema>;
export type ServerEnv = z.infer<typeof serverSchema> & z.infer<typeof serverOptionalSchema>;

export function isProduction() {
  return process.env.NODE_ENV === "production";
}

export function isDevelopment() {
  return process.env.NODE_ENV !== "production";
}

function formatIssues(error: z.ZodError) {
  return error.issues
    .map((issue) => `  - ${issue.path.join(".") || "(root)"}: ${issue.message}`)
    .join("\n");
}

let cachedPublic: PublicEnv | null = null;
let cachedServer: ServerEnv | null = null;
let cachedOptional: z.infer<typeof serverOptionalSchema> | null = null;

function parseOrThrow<T>(
  schema: z.ZodType<T>,
  source: Record<string, string | undefined>,
  label: string
): T {
  const result = schema.safeParse(source);
  if (!result.success) {
    throw new Error(
      `Invalid ${label} configuration. Check your .env file:\n${formatIssues(result.error)}`
    );
  }
  return result.data;
}

/** NEXT_PUBLIC_* vars. Inlined into the client bundle at build time. */
export function publicEnv(): PublicEnv {
  if (!cachedPublic) {
    cachedPublic = parseOrThrow(publicSchema, process.env, "public");
  }
  return cachedPublic;
}

/**
 * Server-only vars. Never call this from a client component — it will throw
 * under `server-only`, and the values must not reach the browser bundle.
 */
export function serverEnv(): ServerEnv {
  if (!cachedServer) {
    const optional = parseOrThrow(serverOptionalSchema, process.env, "server");
    cachedOptional = optional;
    cachedServer = parseOrThrow(serverSchema, process.env, "server") as ServerEnv;
  }
  return cachedServer;
}

/** Vars that are genuinely optional in local development. */
export function optionalEnv() {
  if (!cachedOptional) {
    cachedOptional = parseOrThrow(serverOptionalSchema, process.env, "server");
  }
  return cachedOptional;
}

/**
 * Parses an optional integration config, returning `null` when unconfigured.
 *
 * In production an unconfigured integration is a hard error at the point of
 * use — it is never a silent downgrade. In development it is a disabled
 * feature with an explicit reason, so it is never confused with a real
 * failure.
 */
export function optionalIntegration<T>(
  label: string,
  parse: () => T
): { ok: true; value: T } | { ok: false; reason: string } {
  try {
    return { ok: true, value: parse() };
  } catch (error) {
    if (isProduction()) {
      throw new Error(
        `${label} is required in production but is not configured: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
    return {
      ok: false,
      reason: `${label} is not configured; the feature is disabled in development.`,
    };
  }
}
