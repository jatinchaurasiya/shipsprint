"use client";

import { createBrowserClient } from "@supabase/ssr";
import { publicEnv } from "@/lib/env";

type BrowserClient = ReturnType<typeof createBrowserClient>;

let cached: BrowserClient | null = null;

/**
 * Returns a lazily-created singleton browser client.
 *
 * Creation is deferred rather than done at module scope because this file is
 * imported by client components that Next also evaluates during static
 * prerendering, where `NEXT_PUBLIC_*` values are not guaranteed to be present
 * and `createBrowserClient` throws. Validating on first call also means a
 * misconfigured environment surfaces a message naming the missing variable
 * instead of a Supabase stack trace.
 */
export function createClient(): BrowserClient {
  if (!cached) {
    const env = publicEnv();
    cached = createBrowserClient(
      env.NEXT_PUBLIC_SUPABASE_URL,
      env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    );
  }
  return cached;
}
