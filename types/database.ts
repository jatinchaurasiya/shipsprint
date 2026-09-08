export type PlanId = 'free' | 'basic' | 'pro';

export interface Plan {
  id: PlanId;
  name: string;
  price_cents: number;
  site_limit: number;
  has_branding: boolean;
  has_custom_domain: boolean;
  has_analytics_dashboard: boolean;
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

export type SiteStatus = 'draft' | 'published';

export interface Site {
  id: string;
  user_id: string;
  slug: string;
  custom_domain: string | null;
  status: SiteStatus;
  content: SiteContent;
  theme: string;
  created_at: string;
  updated_at: string;
  published_at: string | null;
}

export interface Subscription {
  id: string;
  user_id: string;
  dodo_subscription_id: string;
  plan_id: PlanId;
  status: 'active' | 'cancelled' | 'expired' | 'on_hold';
  current_period_end: string | null;
  created_at: string;
  updated_at: string;
}

export type EventType = 'page_view' | 'button_click';

export interface AnalyticsEvent {
  id: string;
  site_id: string;
  event_type: EventType;
  meta: Record<string, any>;
  created_at: string;
}

export interface DomainVerification {
  id: string;
  site_id: string;
  cloudflare_hostname_id: string | null;
  ownership_verification: Record<string, any> | null;
  ssl_status: 'pending_validation' | 'active' | 'failed';
  status: 'pending' | 'verified' | 'failed';
  checked_at: string | null;
  created_at: string;
}
