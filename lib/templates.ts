/* Hallmark · pre-emit critique: P5 H5 E5 S5 R5 V5 */
import type { Template, SiteContent } from "@/types/database";
import { getDefaultSitePages } from "./legal-pages";

/**
 * Built-in templates collection.
 * Templates have been completely removed per architecture update.
 * All sites are created directly with standard production mobile app launch configuration.
 */
export const BUILTIN_TEMPLATES: Template[] = [];

/**
 * Default content for a new user site.
 *
 * This is deliberately **neutral**: the user's app name and contact email,
 * and nothing else. It must never seed ShipSprint's own marketing copy,
 * feature list, onboarding steps or social proof into a customer's page —
 * the page is about *their* app, not about ShipSprint.
 *
 * Everything else is left empty so the editor/renderer shows honest
 * placeholders and the user fills in their own content.
 */
export function getFlagshipDefaultContent(
  appName: string,
  email?: string
): SiteContent {
  const contactEmail = email || "";
  return {
    brand: {
      name: appName,
      logo_url: "",
      app_icon_url: "",
      categories: [],
    },
    hero: {
      app_name: appName,
      badge_text: "",
      header: appName,
      short_description: "",
      device_screenshot_url: "",
      device_screenshot_url_secondary: "",
      primary_cta_label: "",
      secondary_cta_label: "",
      email_capture_enabled: false,
      email_placeholder: "Enter your email for early access",
      email_cta_label: "Get Early Access",
      email_success_message: "You're on the list. We'll be in touch.",
    },
    features: [],
    store_links: {
      availability: "both",
      app_store_url: "",
      play_store_url: "",
      testflight_url: "",
    },
    screenshots: [],
    pages: getDefaultSitePages(appName, contactEmail),
    footer: {
      brand_name: appName,
      tagline: "",
      legal_links: [],
      contact_email: contactEmail,
    },
  };
}

/** Clone template content and replace brand and contact info */
export function customizeTemplateContent(
  template: Template,
  name: string,
  contactEmail?: string
): SiteContent {
  const cloned = JSON.parse(JSON.stringify(template.content)) as SiteContent;
  cloned.brand.name = name;
  cloned.hero.app_name = name;
  cloned.footer.brand_name = name;
  const email = contactEmail || "support@shipsprint.site";
  cloned.footer.contact_email = email;
  cloned.pages = getDefaultSitePages(name, email);
  return cloned;
}

export function getTemplateSlug(template: Template): string {
  if (template.slug) return template.slug;
  const parts = template.id.split("-");
  return parts.length > 1 ? parts[1]! : parts[0]!;
}

export function getTemplateSubdomain(template: Template): string {
  const slug = getTemplateSlug(template);
  const rootDomain = process.env.NEXT_PUBLIC_ROOT_DOMAIN || "shipsprint.site";
  return `${slug}.${rootDomain}`;
}
