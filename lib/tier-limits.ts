/* Hallmark · pre-emit critique: P5 H5 E5 S5 R5 V5 */
import type { PlanId, PageType } from "@/types/database";

export interface TierPageLimits {
  canCreateCustomPages: boolean;
  maxPages: number;
  allowedSystemPages: PageType[];
}

export const PLAN_PAGE_LIMITS: Record<PlanId, TierPageLimits> = {
  free: {
    canCreateCustomPages: false,
    maxPages: 4, // Home, Privacy, Terms, Support
    allowedSystemPages: ["home", "privacy", "terms", "support"],
  },
  basic: {
    canCreateCustomPages: true,
    maxPages: 8,
    allowedSystemPages: ["home", "privacy", "terms", "support", "custom"],
  },
  pro: {
    canCreateCustomPages: true,
    maxPages: 15,
    allowedSystemPages: ["home", "privacy", "terms", "support", "custom"],
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

export function getMaxPages(planId?: PlanId | null): number {
  return getTierLimits(planId).maxPages;
}

export function isPageLimitReached(
  currentPagesCount: number,
  planId?: PlanId | null
): boolean {
  return currentPagesCount >= getMaxPages(planId);
}
