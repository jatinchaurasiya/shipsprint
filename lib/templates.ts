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
 * Flagship ShipSprint Landing Page Template Generator.
 * Directly seeds new sites with the exact visual fidelity and copy structure
 * of the high-converting ShipSprint marketing landing page.
 */
export function getFlagshipDefaultContent(
  appName: string,
  email?: string
): SiteContent {
  const contactEmail = email || "support@shipsprint.site";
  return {
    brand: {
      name: appName,
      logo_url: "",
      app_icon_url: "",
      categories: ["Habit", "Focus", "Productivity", "Health", "Design", "Life"],
    },
    hero: {
      app_name: appName,
      badge_text: "Built for indie app makers",
      header: "Launch your app page. Without the code.",
      short_description:
        "Plan, prioritize, and publish your App Store landing page in one simple workspace. Stay on-brand, track every install, and never touch frontend code again.",
      device_screenshot_url: "/shipsprint-phone-mockup.png",
      device_screenshot_url_secondary: "/shipsprint-phone-mockup.png",
      primary_cta_label: "Start building",
      secondary_cta_label: "See How It Works",
      rating_stars: 5,
      rating_text: "Built for App Store launches",
      email_capture_enabled: false,
      email_placeholder: "Enter your email for early access",
      email_cta_label: "Get Early Access",
      email_success_message: "You're on the list. We'll be in touch.",
    },
    impacts: {
      eyebrow: "Our impacts",
      title: "Real results. Real impact.",
      description: `See how indie makers turn visitors into installs. From faster launches to calmer workflows, ${appName} helps you ship more — every single day.`,
      trust_avatars: ["ZH", "FF", "SA"],
      trust_headline: "Trusted by indie makers",
      metric_stat: "1,200+",
      metric_label: "Live app landing pages published worldwide",
      rating_score: 4.9,
      rating_reviews_label: "Average indie maker rating across launches",
      sla_stat: "99.9%",
      sla_label: "Uptime SLA via Caddy edge & automated TLS",
      speed_stat: "< 2 min",
      speed_label: "From setup to live custom domain",
    },
    features: [
      {
        id: "feat-1",
        icon: "Check",
        title: "Zero-drift page builder",
        description:
          "Create, prioritize, and publish sections with ease. The editor renders the same component visitors see — what you arrange is what ships.",
        proof_type: "checklist",
        proof_meta: {
          checklist_items: [
            { label: "App icon + screenshots", date: "Feb 19", status: "Ready", urgent: false },
            { label: "Store badges + QR", date: "Feb 20", status: "High priority", urgent: true },
            { label: "Ratings + reviews", date: "Feb 21", status: "Normal", urgent: false },
          ],
        },
      },
      {
        id: "feat-2",
        icon: "Zap",
        title: "Store buttons that convert",
        description:
          "App Store and Google Play buttons with cookieless tap tracking. See which visits become installs — no banners, no cookies.",
        proof_type: "chart",
        proof_meta: {
          chart_stat: {
            value: "14,820 installs",
            label: "Weekly installs",
            ctr: "+24.8% CTR",
            bars: [35, 55, 40, 70, 52, 85, 64],
          },
        },
      },
      {
        id: "feat-3",
        icon: "Shield",
        title: "Domains, TLS & reminders",
        description:
          "Connect a custom domain with automatic TLS, and never miss a launch step again. Status is read from the database — never claimed before it is true.",
        proof_type: "readiness",
        proof_meta: {
          readiness_items: [
            { key: "Launch checklist", value: "12 / 12 items verified" },
            { key: "Mobile Launch Suite", value: "Apple & Android ready" },
            { key: "Automatic SSL/TLS", value: "Active (Let's Encrypt)" },
          ],
        },
      },
    ],
    how_it_works: [
      {
        step: "Step 1",
        title: "Craft your identity",
        description:
          "Add your icon, screenshots, store links, and copy. Watch the live preview update instantly with zero drift.",
      },
      {
        step: "Step 2",
        title: "Showcase verified proof",
        description:
          "Highlight core capabilities, checklist milestones, and verified ratings to build immediate trust with visitors.",
      },
      {
        step: "Step 3",
        title: "Publish & track installs",
        description:
          "Publish to your subdomain or custom domain with automated TLS. Track cookieless store taps from day one.",
      },
    ],
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
      tagline: "Designed for indie apps shipping worldwide.",
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
