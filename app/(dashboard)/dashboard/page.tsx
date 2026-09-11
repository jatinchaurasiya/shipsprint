import { createClient } from "@/lib/supabase/server";
import { CreateSiteDialog } from "@/components/dashboard/create-site-dialog";
import { SiteCard } from "@/components/dashboard/site-card";
import type { Site, Plan, Profile } from "@/types/database";
import Link from "next/link";
import {
  ExternalLink,
  Edit3,
  Globe,
  Smartphone,
  Sparkles,
  ArrowUpRight,
} from "lucide-react";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Fetch profile & plan
  const { data: profile } = await supabase
    .from("profiles")
    .select("*, plans(*)")
    .eq("id", user?.id)
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

  // Fetch user's sites
  const { data: sites } = await supabase
    .from("sites")
    .select("*")
    .eq("user_id", user?.id)
    .order("created_at", { ascending: false });

  const siteList: Site[] = (sites as Site[]) || [];
  const currentCount = siteList.length;
  const maxLimit = plan.site_limit;
  const canCreate = currentCount < maxLimit;
  const usagePercent = Math.min(100, Math.round((currentCount / maxLimit) * 100));

  const rootDomain = process.env.NEXT_PUBLIC_ROOT_DOMAIN || "shipsprint.site";

  return (
    <div className="space-y-8">
      {/* Top Banner & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-zinc-200/80 dark:border-zinc-800/80">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
            Landing Pages
          </h1>
          <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 mt-1">
            Build and manage high-converting landing pages for your indie apps.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <CreateSiteDialog
            canCreate={canCreate}
            currentCount={currentCount}
            maxLimit={maxLimit}
          />
        </div>
      </div>

      {/* Quota Progress Bar */}
      <div className="p-4 rounded-2xl bg-white dark:bg-zinc-950 border border-zinc-200/80 dark:border-zinc-800/80 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-zinc-100 dark:bg-zinc-900 flex items-center justify-center text-zinc-600 dark:text-zinc-300">
            <Smartphone className="w-4 h-4" />
          </div>
          <div>
            <div className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
              <span>
                {currentCount} of {maxLimit} Site{maxLimit > 1 ? "s" : ""} Used
              </span>
              <span className="text-[10px] font-normal px-2 py-0.5 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300">
                {plan.name} Tier
              </span>
            </div>
            <div className="w-48 sm:w-64 h-1.5 bg-zinc-100 dark:bg-zinc-800 rounded-full mt-2 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  usagePercent >= 100
                    ? "bg-amber-500"
                    : "bg-blue-600 dark:bg-blue-500"
                }`}
                style={{ width: `${usagePercent}%` }}
              />
            </div>
          </div>
        </div>

        {!canCreate && (
          <Link
            href="/dashboard/billing"
            className="text-xs font-medium text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
          >
            <span>Upgrade for more site capacity</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </Link>
        )}
      </div>

      {/* Sites List or Empty State */}
      {siteList.length === 0 ? (
        <div className="py-16 px-4 rounded-3xl border border-dashed border-zinc-300 dark:border-zinc-800 bg-white/40 dark:bg-zinc-950/40 text-center">
          <div className="w-14 h-14 rounded-2xl bg-zinc-100 dark:bg-zinc-900 text-zinc-500 flex items-center justify-center mx-auto mb-4 border border-zinc-200 dark:border-zinc-800 shadow-sm">
            <Sparkles className="w-6 h-6 text-blue-500" />
          </div>
          <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
            No landing pages created yet
          </h2>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 max-w-sm mx-auto">
            Get started by creating your first landing page. Enter your app name and launch in minutes.
          </p>
          <div className="mt-6">
            <CreateSiteDialog
              canCreate={canCreate}
              currentCount={currentCount}
              maxLimit={maxLimit}
            />
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {siteList.map((site) => (
            <SiteCard key={site.id} site={site} rootDomain={rootDomain} />
          ))}
        </div>
      )}
    </div>
  );
}
