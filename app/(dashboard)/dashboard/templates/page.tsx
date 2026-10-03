import { TemplateGallery } from "@/components/templates/template-gallery";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Templates — ShipSprint",
};

/**
 * Templates inside the dashboard shell.
 *
 * The nav previously pointed at the public marketing route `/templates`, which
 * renders the landing-page shell (marketing header, `hero__display` hero,
 * marketing footer) and contains no link back to the dashboard — clicking
 * "Templates" stranded a signed-in user on what looked like the landing page.
 * This route sits inside the (dashboard) group, so it keeps the dashboard nav
 * and is protected twice: by the proxy's `/dashboard` auth rule and by the
 * layout's own session check.
 *
 * CTAs are auth-aware (`authenticated`), sending the chosen template straight
 * to `/dashboard?template=<id>` where the create dialog auto-opens with it
 * preselected — no round-trip through /signup.
 */
export default function DashboardTemplatesPage() {
  return (
    <div className="space-y-8">
      <div className="pb-6 border-b border-zinc-200/80 dark:border-zinc-800/80">
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
          Templates
        </h1>
        <p className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-400 mt-1">
          Start from a production-ready design. Choose a template to create a
          new landing page with it preselected.
        </p>
      </div>

      <TemplateGallery authenticated />
    </div>
  );
}
