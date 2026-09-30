import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { publicEnv, isProduction } from "@/lib/env";

/**
 * Refreshes the Supabase session and returns the current user.
 *
 * The previous implementation returned `user: null` when the env vars were
 * missing, which silently disabled the `/dashboard` redirect in middleware and
 * left the route group layout as the only guard. In production a broken env
 * must fail loudly rather than quietly downgrading the auth boundary.
 */
export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  let url: string;
  let anonKey: string;
  try {
    ({ NEXT_PUBLIC_SUPABASE_URL: url, NEXT_PUBLIC_SUPABASE_ANON_KEY: anonKey } =
      publicEnv());
  } catch (error) {
    if (isProduction()) throw error;
    return { supabaseResponse, user: null };
  }

  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        supabaseResponse = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options)
        );
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  return { supabaseResponse, user };
}
