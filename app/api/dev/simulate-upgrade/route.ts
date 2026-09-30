import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { logger } from "@/lib/logger";
import { firstIssue } from "@/lib/validation";
import { z } from "zod";

/**
 * DEVELOPMENT ONLY. Simulates a successful upgrade.
 *
 * The equivalent logic used to live as an `else` branch inside
 * `/api/billing/checkout`, which meant that any production deploy whose Dodo
 * key was missing or still a placeholder granted every visitor a paid plan. It
 * now lives here, behind a runtime guard, in a route that does nothing at all
 * in production.
 */

const bodySchema = z.object({ plan_id: z.enum(["basic", "pro"]) });

export async function POST(request: NextRequest) {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const parsed = bodySchema.safeParse(
    await request.json().catch(() => null)
  );
  if (!parsed.success) {
    return NextResponse.json({ error: firstIssue(parsed.error) }, { status: 400 });
  }

  const admin = createAdminClient();
  await admin
    .from("profiles")
    .update({ plan_id: parsed.data.plan_id })
    .eq("id", user.id);

  logger.warn("simulated plan change via dev route", {
    user_id: user.id,
    plan_id: parsed.data.plan_id,
  });

  return NextResponse.json({
    ok: true,
    simulated: true,
    plan_id: parsed.data.plan_id,
  });
}
