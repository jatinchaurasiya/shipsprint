import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { DashboardNav } from "@/components/dashboard/dashboard-nav";
import type { Profile, Plan } from "@/types/database";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Fetch user profile
  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  // Fetch plan details
  const planId = profile?.plan_id || "free";
  const { data: plan } = await supabase
    .from("plans")
    .select("*")
    .eq("id", planId)
    .single();

  return (
    <div className="min-h-screen bg-[#fafafa] dark:bg-[#09090b] text-zinc-900 dark:text-zinc-100 flex flex-col">
      <DashboardNav
        userEmail={user.email || ""}
        profile={profile as Profile | null}
        plan={plan as Plan | null}
      />
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>
    </div>
  );
}
