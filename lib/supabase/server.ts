import "server-only";

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { publicEnv } from "@/lib/env";
import { sessionCookieDomain } from "@/lib/redirect";

export async function createClient() {
  const cookieStore = await cookies();
  const env = publicEnv();

  return createServerClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      // Scope the session cookie to the registered root domain so the owner's
      // session is also sent to customer subdomains and their own draft preview
      // works at the live URL. Host-only in local development (undefined).
      cookieOptions: { domain: sessionCookieDomain() },
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Server Components cannot write cookies. Supabase docs specify
            // swallowing this: the session refresh is performed by the edge
            // middleware, which forwards refreshed cookies via its response.
            // Never throw here or every Server Component render that happens to
            // touch an auth-scoped client would 500.
          }
        },
      },
    }
  );
}
