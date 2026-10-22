/* Hallmark · pre-emit critique: P5 H5 E5 S5 R5 V5 */
import type { PlanId, PageType } from "@/types/database";

export interface TierPageLimits {
  canCreateCustomPages: boolean;
  canCreateBlogPages: boolean;
  maxPages: number;
  maxBlogPages: number;
  allowedSystemPages: PageType[];
}

export const PLAN_PAGE_LIMITS: Record<PlanId, TierPageLimits> = {
  free: {
    canCreateCustomPages: false,
    canCreateBlogPages: false,
    maxPages: 4, // Home, Privacy, Terms, Support (App Store compliance)
    maxBlogPages: 0,
    allowedSystemPages: ["home", "privacy", "terms", "support"],
  },
  basic: {
    canCreateCustomPages: true,
    canCreateBlogPages: true,
    maxPages: 14, // 4 compliance pages + 10 blog/custom pages
    maxBlogPages: 10,
    allowedSystemPages: ["home", "privacy", "terms", "support", "custom", "blog"],
  },
  pro: {
    canCreateCustomPages: true,
    canCreateBlogPages: true,
    maxPages: 104, // 4 compliance pages + 100 blog/custom pages (effectively unlimited)
    maxBlogPages: 100,
    allowedSystemPages: ["home", "privacy", "terms", "support", "custom", "blog"],
  },
};

export function getTierLimits(planId?: PlanId | null): TierPageLimits {
  if (planId === "pro") {
    return PLAN_PAGE_LIMITS.pro;
  }
  if (planId === "basic") {
    return PLAN_PAGE_LIMITS.basic;
  }
  return PLAN_PAGE_LIMITS.free;
}

export function canCreateCustomPages(planId?: PlanId | null): boolean {
  return getTierLimits(planId).canCreateCustomPages;
}

export function canCreateBlogPages(planId?: PlanId | null): boolean {
  return getTierLimits(planId).canCreateBlogPages;
}

export function getMaxPages(planId?: PlanId | null): number {
  return getTierLimits(planId).maxPages;
}

export function getMaxBlogPages(planId?: PlanId | null): number {
  return getTierLimits(planId).maxBlogPages;
}

export function isPageLimitReached(
  currentPagesCount: number,
  planId?: PlanId | null
): boolean {
  return currentPagesCount >= getMaxPages(planId);
}

export function isBlogLimitReached(
  currentBlogCount: number,
  planId?: PlanId | null
): boolean {
  return currentBlogCount >= getMaxBlogPages(planId);
}
