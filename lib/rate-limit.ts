import "server-only";

import Redis from "ioredis";
import { isProduction, optionalEnv } from "@/lib/env";
import { logger } from "@/lib/logger";

/**
 * Fixed-window rate limiting.
 *
 * Backed by Redis so limits hold across multiple app containers. Falls back to
 * an in-process map in development, which is sufficient for a single local
 * server and avoids requiring Redis to run the app at all.
 *
 * The previous codebase had no rate limiting anywhere, which made the public
 * `POST /api/track` beacon an unbounded, unauthenticated write into the
 * database and `POST /api/upload` an unbounded claim on the R2 bill.
 */

export interface RateLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  /** Unix ms at which the current window resets. */
  resetAt: number;
}

export interface RateLimitOptions {
  /** Identifies the caller: user id, hashed IP, or a site id. */
  identifier: string;
  /** Logical bucket, e.g. "track" or "upload". Combined with the identifier. */
  bucket: string;
  /** Max requests permitted per window. */
  limit: number;
  /** Window length in seconds. */
  windowSeconds: number;
}

let redis: Redis | null = null;
let redisUnavailable = false;

function getRedis(): Redis | null {
  if (redisUnavailable) return null;
  if (redis) return redis;

  const url = optionalEnv().REDIS_URL;
  if (!url) {
    if (isProduction()) {
      // Do not silently disable protection in production.
      redisUnavailable = true;
      logger.error("rate limit backend missing", {
        detail: "REDIS_URL is not set. Rate limiting is in-memory and per-process.",
      });
      return null;
    }
    return null;
  }

  const client = new Redis(url, {
    maxRetriesPerRequest: 1,
    enableOfflineQueue: false,
    lazyConnect: true,
  });
  client.on("error", (error) => {
    logger.warn("redis error", { detail: error.message });
  });
  redis = client;
  return redis;
}

const memoryBuckets = new Map<string, { count: number; resetAt: number }>();

function memoryLimit(options: RateLimitOptions): RateLimitResult {
  const now = Date.now();
  const windowMs = options.windowSeconds * 1000;
  const key = `${options.bucket}:${options.identifier}`;
  const existing = memoryBuckets.get(key);

  // Opportunistic cleanup so the map does not grow without bound.
  if (memoryBuckets.size > 10_000) {
    for (const [k, v] of memoryBuckets) {
      if (v.resetAt <= now) memoryBuckets.delete(k);
    }
  }

  if (!existing || existing.resetAt <= now) {
    const entry = { count: 1, resetAt: now + windowMs };
    memoryBuckets.set(key, entry);
    return {
      success: true,
      limit: options.limit,
      remaining: options.limit - 1,
      resetAt: entry.resetAt,
    };
  }

  existing.count += 1;
  return {
    success: existing.count <= options.limit,
    limit: options.limit,
    remaining: Math.max(0, options.limit - existing.count),
    resetAt: existing.resetAt,
  };
}

export async function rateLimit(options: RateLimitOptions): Promise<RateLimitResult> {
  const client = getRedis();

  if (!client) return memoryLimit(options);

  const window = Math.floor(Date.now() / (options.windowSeconds * 1000));
  const key = `rl:${options.bucket}:${options.identifier}:${window}`;
  const resetAt = (window + 1) * options.windowSeconds * 1000;

  try {
    const pipeline = client.multi();
    pipeline.incr(key);
    pipeline.expire(key, options.windowSeconds);
    const results = await pipeline.exec();

    const count = Number(results?.[0]?.[1] ?? 1);

    return {
      success: count <= options.limit,
      limit: options.limit,
      remaining: Math.max(0, options.limit - count),
      resetAt,
    };
  } catch (error) {
    // Fail open for availability, but loudly: an unavailable limiter must not
    // take the whole site down.
    logger.warn("rate limit check failed, failing open", {
      detail: error instanceof Error ? error.message : String(error),
    });
    return {
      success: true,
      limit: options.limit,
      remaining: options.limit,
      resetAt: Date.now() + options.windowSeconds * 1000,
    };
  }
}

/** Standard rate-limit headers for a response. */
export function rateLimitHeaders(result: RateLimitResult): Record<string, string> {
  return {
    "X-RateLimit-Limit": String(result.limit),
    "X-RateLimit-Remaining": String(result.remaining),
    "X-RateLimit-Reset": String(Math.ceil(result.resetAt / 1000)),
  };
}
