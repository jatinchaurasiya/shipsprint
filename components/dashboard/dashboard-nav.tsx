"use client";

import { useState } from "react";
import Link from "next/link";
import { ShipSprintLogo } from "@/components/brand/logo";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { Plan } from "@/types/database";
import {
  LayoutGrid,
  BarChart3,
  CreditCard,
  LogOut,
  ChevronRight,
  Menu,
  X,
} from "lucide-react";

interface DashboardNavProps {
  userEmail: string;
  plan: Plan | null;
}

const NAV_ITEMS = [
  { label: "My Apps", href: "/dashboard", icon: LayoutGrid },
  { label: "Analytics", href: "/dashboard/analytics", icon: BarChart3 },
  { label: "Plans & Billing", href: "/dashboard/billing", icon: CreditCard },
];

export function DashboardNav({ userEmail, plan }: DashboardNavProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleSignOut = async () => {
    await createClient().auth.signOut();
    router.push("/login");
    router.refresh();
  };

  const currentPlanName = plan?.name || "Free";
  const isPro = plan?.id === "pro";

  return (
    <header className="sticky top-0 z-40 w-full border-b border-zinc-200/80 dark:border-zinc-800/80 bg-white/80 dark:bg-zinc-950/80 backdrop-blur-xl">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Left: Brand & Nav */}
        <div className="flex items-center gap-8">
          <ShipSprintLogo href="/dashboard" size="md" priority />

          <nav className="hidden md:flex items-center gap-1">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    isActive
                      ? "bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100"
                      : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200 hover:bg-zinc-50 dark:hover:bg-zinc-900"
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Right: Plan badge, Upgrade CTA, User & Logout, Mobile Hamburger */}
        <div className="flex items-center gap-3">
          {/* Plan badge */}
          <div className="flex items-center gap-2 px-2.5 py-1 rounded-full border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 text-[11px] font-medium text-zinc-700 dark:text-zinc-300">
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                isPro
                  ? "bg-purple-500 shadow-[0_0_8px_rgba(168,85,247,0.6)]"
                  : plan?.id === "basic"
                  ? "bg-blue-500"
                  : "bg-emerald-500"
              }`}
            />
            <span>{currentPlanName} Plan</span>
          </div>

          {/* Upgrade button if not pro */}
          {!isPro && (
            <Link
              href="/dashboard/billing"
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-900 dark:bg-zinc-100 hover:bg-zinc-800 dark:hover:bg-white text-white dark:text-zinc-900 text-xs font-medium shadow-sm transition-colors"
            >
              <span>Upgrade</span>
              <ChevronRight className="w-3 h-3" />
            </Link>
          )}

          {/* User Email & Sign Out (Desktop) */}
          <div className="hidden sm:flex items-center gap-2 pl-2 border-l border-zinc-200 dark:border-zinc-800">
            <span className="hidden lg:inline text-xs text-zinc-600 dark:text-zinc-400 max-w-[160px] truncate">
              {userEmail}
            </span>
            <button
              onClick={handleSignOut}
              title="Sign Out"
              className="p-1.5 rounded-lg text-zinc-600 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>

          {/* Mobile Menu Toggle Button */}
          <button
            type="button"
            onClick={() => setMobileMenuOpen((prev) => !prev)}
            className="md:hidden p-2 rounded-xl text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
            aria-label="Toggle navigation menu"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-zinc-200/80 dark:border-zinc-800/80 bg-white/95 dark:bg-zinc-950/95 backdrop-blur-xl px-4 py-4 space-y-3 animate-in slide-in-from-top-2 duration-200">
          <nav className="space-y-1">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-medium transition-colors ${
                    isActive
                      ? "bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 font-semibold"
                      : "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-900"
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>

          <div className="pt-3 border-t border-zinc-100 dark:border-zinc-900 flex items-center justify-between">
            <span className="text-xs text-zinc-600 truncate max-w-[200px]">
              {userEmail}
            </span>
            <button
              onClick={handleSignOut}
              className="flex items-center gap-1.5 text-xs text-red-600 dark:text-red-400 font-medium px-2.5 py-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      )}
    </header>
  );
}
