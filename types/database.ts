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
  image_url?: string;
  proof_type?: "checklist" | "chart" | "readiness" | "image";
  proof_meta?: {
    checklist_items?: { label: string; date?: string; status: string; urgent?: boolean }[];
    chart_stat?: { value: string; label: string; ctr?: string; bars?: number[] };
    readiness_items?: { key: string; value: string }[];
  };
}

export interface LogoWallLogo {
  id: string;
  name: string;
  image_url: string;
}

export interface LogoWall {
  eyebrow: string;
  logos: LogoWallLogo[];
}

export interface ReleaseInfo {
  eyebrow: string;
  title: string;
  description: string;
  version: string;
  rating: string;
  rating_count: string;
  age_rating: string;
  chart_rank: string;
  release_notes: string[];
  image_url?: string;
}

export interface FooterColumn {
  heading: string;
  links: { label: string; url: string }[];
}

export type StoreAvailability =
  | "both"
  | "app_store_only"
  | "play_store_only"
  | "testflight";

export interface StoreLinks {
  availability?: StoreAvailability;
  app_store_url?: string;
  play_store_url?: string;
  testflight_url?: string;
}

export type PageType = "home" | "privacy" | "terms" | "support" | "custom";

export interface SitePage {
  id: string;
  slug: string;
  title: string;
  nav_label?: string;
  show_in_nav?: boolean;
  show_in_footer?: boolean;
  page_type: PageType;
  is_system?: boolean;
  is_published?: boolean;
  content_markdown: string;
  meta_title?: string;
  meta_description?: string;
  updated_at?: string;
}

export interface TrustSection {
  rating: string;
  review_count_text: string;
  featured_quote: string;
  author?: string;
}

export interface ShowcaseItem {
  id: string;
  title: string;
  description: string;
  align: "left" | "right";
  image_url?: string;
}

export interface StatItem {
  id: string;
  value: string;
  label: string;
}

export interface TestimonialItem {
  id: string;
  name: string;
  role: string;
  quote: string;
  avatar_url?: string;
  rating?: number;
  is_main?: boolean;
}

export interface PricingTier {
  id: string;
  name: string;
  price: string;
  period: string;
  description?: string;
  is_popular?: boolean;
  features: string[];
  cta_label: string;
}

export interface FaqItem {
  id: string;
  question: string;
  answer: string;
}

export interface BentoImpacts {
  eyebrow?: string;
  title?: string;
  description?: string;
  trust_avatars?: string[];
  trust_headline?: string;
  metric_stat?: string;
  metric_label?: string;
  rating_score?: number;
  rating_reviews_label?: string;
  sla_stat?: string;
  sla_label?: string;
  speed_stat?: string;
  speed_label?: string;
}

export interface HowItWorksStep {
  step: string;
  title: string;
  description: string;
}

export interface SiteContent {
  brand: {
    name: string;
    logo_url?: string;
    app_icon_url?: string;
    categories?: string[];
  };
  hero: {
    app_name: string;
    badge_text: string;
    header: string;
    short_description: string;
    device_screenshot_url?: string;
    device_screenshot_url_secondary?: string;
    primary_cta_label?: string;
    secondary_cta_label?: string;
    rating_stars?: number;
    rating_text?: string;
    email_capture_enabled?: boolean;
    email_placeholder?: string;
    email_cta_label?: string;
    email_success_message?: string;
  };
  impacts?: BentoImpacts;
  features: FeatureItem[];
  how_it_works?: HowItWorksStep[];
  logo_wall?: LogoWall;
  release?: ReleaseInfo;
  store_links: StoreLinks;
  screenshots: string[];
  pages?: SitePage[];
  trust?: TrustSection;
  showcase?: ShowcaseItem[];
  stats?: StatItem[];
  testimonials?: TestimonialItem[];
  pricing?: PricingTier[];
  faq?: FaqItem[];
  footer: {
    brand_name: string;
    tagline?: string;
    legal_links: { label: string; url: string }[];
    contact_email?: string;
    columns?: FooterColumn[];
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
  target_url?: string;
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
  slug?: string;
  tagline?: string;
  description?: string;
  category: string;
  theme: string;
  content: SiteContent;
  preview_image_url?: string | null;
  thumbnail_url?: string;
  is_active?: boolean;
  sort_order?: number;
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
  day: string;
  button_type: string;
  /**
   * Canonical store attribution computed by the view: 'apple' | 'google' |
   * 'other'. It resolves the store from button_type and falls back to the
   * recorded target_url, which is what attributes the legacy 'nav_download'
   * events the navbar used to emit.
   *
   * Optional because the column arrives with migration 007. Until that is
   * applied to a database the value is undefined and callers fall back to
   * deriving it from button_type, so a pending migration degrades the
   * attribution rather than breaking the dashboard.
   */
  store?: "apple" | "google" | "other" | null;
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
