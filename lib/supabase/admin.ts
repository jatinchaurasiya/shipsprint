import "server-only";

import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { publicEnv, serverEnv } from "@/lib/env";

/**
 * Service-role client. Bypasses RLS entirely.
 *
 * `server-only` is a hard build-time guard: importing this module from a client
 * component fails the build rather than silently bundling the service-role key
 * into the browser payload.
 */
export function createAdminClient() {
  const { NEXT_PUBLIC_SUPABASE_URL } = publicEnv();
  const { SUPABASE_SERVICE_ROLE_KEY } = serverEnv();

  return createSupabaseClient(NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
