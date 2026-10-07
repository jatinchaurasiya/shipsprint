/* Hallmark · pre-emit critique: P5 H5 E5 S5 R5 V5 */
/**
 * Editor data types, domain helpers, and viewport configuration.
 * Adheres to Hallmark anti-slop guidelines: locked tokens, honest copy,
 * and multi-viewport responsive baselines.
 */

import type {
  DomainStatus,
  SslStatus,
  ReleaseInfo,
} from "@/types/database";

export interface DnsInstructions {
  ownership: { type: string; name: string; value: string; note: string };
  routing: { type: string; name: string; value: string; note: string };
}

export interface DomainState {
  status: DomainStatus | null;
  ssl_status: SslStatus | null;
  dns_resolves?: boolean;
  instructions?: DnsInstructions | null;
}

export type EditorSectionId =
  | "hero"
  | "impacts"
  | "features"
  | "how"
  | "store"
  | "screenshots"
  | "logos"
  | "release"
  | "pages"
  | "footer"
  | "domain"
  | "ai_discovery";

export interface EditorSection {
  id: EditorSectionId;
  label: string;
  badge?: number | string;
}

export type ViewportMode = "desktop" | "tablet" | "mobile";

export interface ViewportConfig {
  name: string;
  widthClass: string;
  maxHeightClass: string;
  label: string;
  dimensions: string;
}

export const VIEWPORT_CONFIGS: Record<ViewportMode, ViewportConfig> = {
  desktop: {
    name: "Desktop",
    widthClass: "w-full max-w-6xl",
    maxHeightClass: "max-h-full",
    label: "preview.shipsprint.site",
    dimensions: "Fluid",
  },
  tablet: {
    name: "Tablet",
    widthClass: "w-[768px] max-w-full",
    maxHeightClass: "max-h-[1024px]",
    label: "preview.shipsprint.site · 768px",
    dimensions: "768 × 1024",
  },
  mobile: {
    name: "Mobile",
    widthClass: "w-[375px] max-w-full",
    maxHeightClass: "max-h-[812px]",
    label: "preview.shipsprint.site · 375px",
    dimensions: "375 × 812",
  },
};

/** Human-readable domain verification status. Never claims TLS exists prematurely. */
export function domainStatusCopy(state: DomainState | null): {
  label: string;
  detail: string;
  tone: "amber" | "emerald" | "red";
} {
  switch (state?.status) {
    case "active":
      return {
        label: "Active",
        detail: "DNS verified and a certificate has been issued.",
        tone: "emerald",
      };
    case "pending_validation":
      return {
        label: "Waiting for DNS",
        detail:
          "Ownership verified. Add the routing record so traffic reaches this site.",
        tone: "amber",
      };
    case "failed":
      return {
        label: "Verification failed",
        detail: "The expected DNS records were not found. Check them and retry.",
        tone: "red",
      };
    case "pending_dns":
    default:
      return {
        label: "Pending DNS",
        detail:
          "Add the ownership TXT record below. Nothing goes live until DNS resolves.",
        tone: "amber",
      };
  }
}

/** Generates a collision-resistant unique identifier for features. */
export function generateFeatureId(): string {
  return `feat-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

/** Parses multiline release notes into trimmed, non-empty bullet points. */
export function parseReleaseNotes(raw: string): string[] {
  return raw
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

export const BLANK_RELEASE: ReleaseInfo = {
  eyebrow: "",
  title: "",
  description: "",
  version: "",
  rating: "",
  rating_count: "",
  age_rating: "",
  chart_rank: "",
  release_notes: [],
  image_url: "",
};
