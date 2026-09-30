import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { DashboardNav } from "@/components/dashboard/dashboard-nav";
import type { Plan } from "@/types/database";

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

  // Single query: the profile and its plan are always read together.
  const { data: profile } = await supabase
    .from("profiles")
    .select("*, plans(*)")
    .eq("id", user.id)
    .single();

  const plan = (profile?.plans ?? null) as Plan | null;

  return (
    <div className="min-h-screen bg-[#fafafa] dark:bg-[#09090b] text-zinc-900 dark:text-zinc-100 flex flex-col">
      <DashboardNav userEmail={user.email || ""} plan={plan} />
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>
    </div>
  );
}
