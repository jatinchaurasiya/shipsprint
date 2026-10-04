import type { PlanId, ProductId, BillingPeriod } from "./billing";

export type { PlanId, ProductId, BillingPeriod };

/**
 * NOTE ON SCHEMA OWNERSHIP
 *
 * These interfaces mirror the database. They are hand-written because the
 * generated types require a live Supabase connection; run
 * `node scripts/db-sync.mjs --apply` to produce `types/database.generated.ts`
 * and delete every `as Plan` / `as Site` cast in the app so the compiler
 * verifies queries against the real schema.
 *
 * The previous version of this file mixed billing period into the plan id
 * ("basic" vs "pro" only). Adding yearly plans would have forced every
 * feature check to become a string comparison against four values. The tier
 * and the SKU are now separate concepts in both the database and here.
 */

export interface Plan {
  id: PlanId;
  name: string;
  tagline: string;
  site_limit: number;
  has_branding: boolean;
  has_custom_domain: boolean;
  has_analytics_dashboard: boolean;
  has_email_capture: boolean;
  sort_order: number;
  is_active: boolean;
}

export interface Product {
  id: ProductId;
  plan_id: PlanId;
  billing_period: BillingPeriod;
  name: string;
  price_cents: number;
  dodo_product_id: string | null;
  is_active: boolean;
  sort_order: number;
}

export interface Profile {
  id: string;
  plan_id: PlanId;
  dodo_customer_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface FeatureItem {
  id: string;
  icon: string;
  title: string;
  description: string;
}

export interface StoreLinks {
  app_store_url?: string;
  play_store_url?: string;
}

export interface SiteContent {
  brand: {
    name: string;
    logo_url?: string;
  };
  hero: {
    app_name: string;
    badge_text: string;
    header: string;
    short_description: string;
  };
  features: FeatureItem[];
  store_links: StoreLinks;
  screenshots: string[];
  footer: {
    brand_name: string;
    legal_links: { label: string; url: string }[];
    contact_email?: string;
  };
}

export type SiteStatus = "draft" | "published";

export interface Site {
  id: string;
  user_id: string;
  slug: string;
  custom_domain: string | null;
  status: SiteStatus;
  content: SiteContent;
  theme: string;
  template_id: string | null;
  created_at: string;
  updated_at: string;
  published_at: string | null;
}

export type SubscriptionStatus =
  | "active"
  | "trialing"
  | "cancelled"
  | "expired"
  | "on_hold"
  | "paused"
  | "past_due"
  | "failed";

export interface Subscription {
  id: string;
  user_id: string;
  dodo_subscription_id: string;
  plan_id: PlanId;
  product_id: ProductId | null;
  status: SubscriptionStatus;
  current_period_end: string | null;
  cancel_at_period_end: boolean;
  created_at: string;
  updated_at: string;
}

export type EventType = "page_view" | "button_click";

/**
 * Telemetry payload. Every field is optional because `page_view` and
 * `button_click` carry different subsets, and the values arrive from a public
 * unauthenticated endpoint, so the server allow-lists keys before writing.
 */
export interface AnalyticsMeta {
  referrer?: string;
  path?: string;
  screen?: string;
  button_type?: string;
  target_host?: string;
  device?: "mobile" | "tablet" | "desktop";
  recorded_at?: string;
}

export interface AnalyticsEvent {
  id: string;
  site_id: string;
  event_type: EventType;
  meta: AnalyticsMeta;
  created_at: string;
}

export type DomainStatus =
  | "pending_dns"
  | "pending_validation"
  | "active"
  | "failed";

export type SslStatus = "pending" | "issuing" | "active" | "failed";

export interface DomainVerification {
  id: string;
  site_id: string;
  cloudflare_hostname_id: string | null;
  ownership_verification: Record<string, unknown> | null;
  ssl_status: SslStatus;
  status: DomainStatus;
  checked_at: string | null;
  created_at: string;
}

export interface Template {
  id: string;
  name: string;
  tagline: string;
  category: string;
  content: SiteContent;
  preview_image_url: string | null;
  is_active: boolean;
  sort_order: number;
}

/** Row shape returned by `site_analytics_summary`. */
export interface AnalyticsDailyRow {
  site_id: string;
  day: string;
  page_views: number;
  button_clicks: number;
  mobile: number;
  tablet: number;
  desktop: number;
}

/** Row shape returned by `site_analytics_sources`. */
export interface AnalyticsSourceRow {
  site_id: string;
  day: string;
  source: string;
  views: number;
}

/** Row shape returned by `site_analytics_cta`. */
export interface AnalyticsCtaRow {
  site_id: string;
  button_type: string;
  clicks: number;
}

/** Aggregate platform-wide telemetry and marketing proof metrics. */
export interface PlatformMetrics {
  publishedSites: number;
  activeTemplates: number;
  uptimePercent: number;
  launchSpeedMinutes: number;
  makerRating: number;
  reviewCount: number;
  weeklyInstallsSample: number;
  conversionRate: number;
}
