import "server-only";

/**
 * Structured logging.
 *
 * The codebase previously used raw `console.*` in route handlers, with three
 * API routes having no logging at all. Payment and webhook handlers logged a
 * single unstructured line to a serverless runtime nobody reads, which made
 * production billing effectively undebuggable.
 *
 * Output is one JSON object per line so it is queryable in CloudWatch, Loki, or
 * any log aggregator. Never log secrets, tokens, or raw request bodies.
 */

export type LogLevel = "debug" | "info" | "warn" | "error";

const LEVEL_ORDER: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
};

const minLevel: LogLevel =
  (process.env.LOG_LEVEL as LogLevel | undefined) ??
  (process.env.NODE_ENV === "production" ? "info" : "debug");

/** Keys that must never be written to logs. */
const REDACTED_KEYS = new Set([
  "password",
  "token",
  "authorization",
  "cookie",
  "apikey",
  "api_key",
  "secret",
  "service_role",
  "supabase_service_role_key",
  "dodo_payments_api_key",
  "dodo_payments_webhook_key",
  "r2_secret_access_key",
]);

function redact(value: unknown, depth = 0): unknown {
  if (depth > 4) return "[truncated]";
  if (value === null || value === undefined) return value;
  if (typeof value !== "object") return value;

  if (Array.isArray(value)) {
    return value.slice(0, 50).map((item) => redact(item, depth + 1));
  }

  const out: Record<string, unknown> = {};
  for (const [key, item] of Object.entries(value as Record<string, unknown>)) {
    out[key] = REDACTED_KEYS.has(key.toLowerCase())
      ? "[redacted]"
      : redact(item, depth + 1);
  }
  return out;
}

function emit(level: LogLevel, message: string, context?: Record<string, unknown>) {
  if (LEVEL_ORDER[level] < LEVEL_ORDER[minLevel]) return;

  const entry = {
    level,
    time: new Date().toISOString(),
    message,
    ...(context ? { context: redact(context) } : {}),
  };

  const line = JSON.stringify(entry);
  if (level === "error") console.error(line);
  else if (level === "warn") console.warn(line);
  else console.log(line);
}

export const logger = {
  debug: (message: string, context?: Record<string, unknown>) =>
    emit("debug", message, context),
  info: (message: string, context?: Record<string, unknown>) =>
    emit("info", message, context),
  warn: (message: string, context?: Record<string, unknown>) =>
    emit("warn", message, context),
  error: (message: string, context?: Record<string, unknown>) =>
    emit("error", message, context),

  /**
   * Logs a caught error with its stack and returns a client-safe message.
   * Prevents upstream provider responses (which can echo credentials) from
   * reaching the browser.
   */
  exception(message: string, error: unknown, context?: Record<string, unknown>) {
    const err =
      error instanceof Error
        ? { name: error.name, message: error.message, stack: error.stack }
        : { message: String(error) };
    emit("error", message, { ...context, error: err });
    return "An unexpected error occurred. Please try again.";
  },
};
