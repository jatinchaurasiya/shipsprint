import { createClient } from "@/lib/supabase/server";
import { canonicalOrigin, safeRedirectPath } from "@/lib/redirect";
import { NextResponse, type NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const next = safeRedirectPath(requestUrl.searchParams.get("next"));

  // `requestUrl.origin` is the container's own address in the production
  // deployment, not the public origin the user arrived on, so redirects built
  // from it send the browser to 0.0.0.0:3000. See canonicalOrigin.
  const origin = canonicalOrigin(requestUrl.origin);

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(new URL(next, origin));
    }
  }

  const errorParam =
    requestUrl.searchParams.get("error_description") ||
    requestUrl.searchParams.get("error") ||
    "auth_callback_failed";

  return NextResponse.redirect(
    new URL(`/login?error=${encodeURIComponent(errorParam)}`, origin)
  );
}
