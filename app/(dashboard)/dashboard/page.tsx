import { createClient } from "@/lib/supabase/server";
import { CreateSiteDialog } from "@/components/dashboard/create-site-dialog";
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
          {siteList.map((site) => {
            const isPublished = site.status === "published";
            const appName = site.content?.hero?.app_name || site.slug;
            const liveUrl = site.custom_domain
              ? `https://${site.custom_domain}`
              : `https://${site.slug}.${rootDomain}`;

            return (
              <div
                key={site.id}
                className="group relative flex flex-col justify-between p-6 rounded-2xl bg-white dark:bg-zinc-950 border border-zinc-200/80 dark:border-zinc-800/80 shadow-[0_4px_20px_rgb(0,0,0,0.02)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.06)] dark:hover:shadow-[0_8px_30px_rgb(0,0,0,0.2)] transition-all hover:border-zinc-300 dark:hover:border-zinc-700"
              >
                {/* Header */}
                <div>
                  <div className="flex items-start justify-between gap-3 mb-4">
                    <div className="w-11 h-11 rounded-xl bg-gradient-to-tr from-zinc-100 to-zinc-200 dark:from-zinc-900 dark:to-zinc-800 border border-zinc-200 dark:border-zinc-700/60 flex items-center justify-center font-bold text-base text-zinc-800 dark:text-zinc-200 uppercase shadow-inner">
                      {site.content?.brand?.logo_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={site.content.brand.logo_url}
                          alt={appName}
                          className="w-full h-full object-cover rounded-xl"
                        />
                      ) : (
                        appName.slice(0, 2)
                      )}
                    </div>

                    {/* Status Badge */}
                    <span
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium ${
                        isPublished
                          ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400 border border-emerald-200/60 dark:border-emerald-800/40"
                          : "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-700"
                      }`}
                    >
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${
                          isPublished ? "bg-emerald-500 animate-pulse" : "bg-zinc-400"
                        }`}
                      />
                      {isPublished ? "Published" : "Draft"}
                    </span>
                  </div>

                  <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-50 tracking-tight">
                    {appName}
                  </h3>

                  <div className="flex items-center gap-1.5 text-xs text-zinc-500 dark:text-zinc-400 mt-1 font-mono truncate">
                    <Globe className="w-3 h-3 shrink-0 text-zinc-400" />
                    <span className="truncate">{site.slug}.{rootDomain}</span>
                  </div>

                  {site.custom_domain && (
                    <div className="flex items-center gap-1.5 text-xs text-purple-600 dark:text-purple-400 mt-1 font-mono truncate">
                      <span className="w-1.5 h-1.5 rounded-full bg-purple-500 shrink-0" />
                      <span className="truncate">{site.custom_domain}</span>
                    </div>
                  )}
                </div>

                {/* Card Actions */}
                <div className="pt-6 mt-6 border-t border-zinc-100 dark:border-zinc-900 flex items-center justify-between gap-3">
                  <Link
                    href={`/dashboard/editor/${site.id}`}
                    className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-zinc-900 dark:bg-zinc-100 hover:bg-zinc-800 dark:hover:bg-white text-white dark:text-zinc-900 text-xs font-medium transition-colors shadow-sm"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    <span>Edit Page</span>
                  </Link>

                  {isPublished && (
                    <a
                      href={liveUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 rounded-xl border border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-colors"
                      title="Visit live site"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
