import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { EditorView } from "@/components/editor/editor-view";
import type { Site, Plan } from "@/types/database";

export const dynamic = "force-dynamic";

export default async function EditorPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/login?next=/dashboard/editor/${id}`);
  }

  // Fetch site owned by user
  const { data: site, error } = await supabase
    .from("sites")
    .select("*")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (error || !site) {
    notFound();
  }

  // Fetch user profile and plan
  const { data: profile } = await supabase
    .from("profiles")
    .select("*, plans(*)")
    .eq("id", user.id)
    .single();

  const plan: Plan = profile?.plans || {
    id: "free",
    name: "Free",
    price_cents: 0,
    site_limit: 1,
    has_branding: true,
    has_custom_domain: false,
    has_analytics_dashboard: false,
  };

  return <EditorView site={site as Site} plan={plan} />;
}
