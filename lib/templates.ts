import type { Template, SiteContent } from "@/types/database";

export const BUILTIN_TEMPLATES: Template[] = [
  {
    id: "fintech-launch",
    name: "FinPay Launch",
    tagline: "Fintech waitlist page with email capture, phone feature band, and App Store release panel.",
    category: "finance",
    preview_image_url: "https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=800&auto=format&fit=crop&q=80",
    is_active: true,
    sort_order: 5,
    content: {
      brand: {
        name: "FinPay",
        logo_url: "",
      },
      hero: {
        app_name: "FinPay",
        badge_text: "Sample badge — replace with your launch status",
        header: "Modern banking for teams that move fast.",
        short_description: "Corporate cards, real-time spend insights, and instant transfers for finance teams. Join the waitlist and get early access.",
        email_capture_enabled: true,
        email_placeholder: "Your email address",
        email_cta_label: "Get Early Access",
        email_success_message: "You're on the list. We'll be in touch.",
      },
      features: [
        {
          id: "feat-1",
          icon: "Zap",
          title: "Instant QR transfers",
          description: "Send money in seconds with a scan. No account numbers, no waiting.",
          image_url: "https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=800&auto=format&fit=crop&q=80",
        },
        {
          id: "feat-2",
          icon: "BarChart3",
          title: "Live transaction detail",
          description: "Every payment itemized the second it happens, with receipts attached.",
          image_url: "https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=800&auto=format&fit=crop&q=80",
        },
        {
          id: "feat-3",
          icon: "Shield",
          title: "Card spend controls",
          description: "Freeze cards, set limits, and approve spend before it happens.",
          image_url: "https://images.unsplash.com/photo-1563013544-824ae1b704d3?w=800&auto=format&fit=crop&q=80",
        },
      ],
      logo_wall: {
        eyebrow: "Sample press strip — replace with your own logos",
        logos: [
          { id: "logo-1", name: "Press logo 1 (sample)", image_url: "" },
          { id: "logo-2", name: "Press logo 2 (sample)", image_url: "" },
          { id: "logo-3", name: "Press logo 3 (sample)", image_url: "" },
          { id: "logo-4", name: "Press logo 4 (sample)", image_url: "" },
        ],
      },
      release: {
        eyebrow: "Coming soon",
        title: "To be released on the App Store soon…",
        description: "FinPay is in final review. Join the waitlist and be first in when it lands.",
        version: "2.0",
        rating: "4.8 (sample)",
        rating_count: "12.4K ratings (sample)",
        age_rating: "4+",
        chart_rank: "#3 in Finance (sample)",
        release_notes: [
          "Instant QR transfers",
          "Live transaction detail",
          "Card spend controls",
        ],
        image_url: "https://images.unsplash.com/photo-1512941937669-90a1b58e7e9c?w=800&auto=format&fit=crop&q=80",
      },
      store_links: {
        app_store_url: "",
        play_store_url: "",
      },
      screenshots: [
        "https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=800&auto=format&fit=crop&q=80",
        "https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=800&auto=format&fit=crop&q=80",
      ],
      footer: {
        brand_name: "FinPay",
        tagline: "Modern banking for teams that move fast.",
        legal_links: [
          { label: "Terms of Service", url: "/terms" },
          { label: "Privacy Policy", url: "/privacy" },
        ],
        contact_email: "hello@finpay.app",
        columns: [
          {
            heading: "Product",
            links: [
              { label: "Templates", url: "/templates" },
              { label: "Pricing", url: "/#pricing" },
            ],
          },
          {
            heading: "Company",
            links: [
              { label: "About", url: "/#impacts" },
              { label: "Contact", url: "" },
            ],
          },
          {
            heading: "Support",
            links: [
              { label: "Help Center", url: "" },
              { label: "Privacy", url: "/privacy" },
            ],
          },
        ],
      },
    },
  },
  {
    id: "ios-swift",
    name: "SwiftLaunch",
    tagline: "Apple-grade mobile app landing page with App Store badges and screenshot carousel.",
    category: "productivity",
    preview_image_url: "https://images.unsplash.com/photo-1616469829941-c7200edec809?w=800&auto=format&fit=crop&q=80",
    is_active: true,
    sort_order: 10,
    content: {
      brand: {
        name: "FocusFlow",
        logo_url: "",
      },
      hero: {
        app_name: "FocusFlow",
        badge_text: "Sample badge — replace with your launch status",
        header: "Master your deep work, effortlessly.",
        short_description: "The distraction-free timer and task companion built exclusively for creative minds, indie founders, and remote builders.",
      },
      features: [
        {
          id: "feat-1",
          icon: "Zap",
          title: "Intelligent Pomodoro Intervals",
          description: "Adaptive work sessions calibrated to your peak energy levels throughout the day.",
        },
        {
          id: "feat-2",
          icon: "Sparkles",
          title: "Instant Cloud Sync",
          description: "Seamless synchronization between iPhone, iPad, Mac, and Apple Watch.",
        },
        {
          id: "feat-3",
          icon: "Shield",
          title: "Privacy by Design",
          description: "Your habits and task logs stay encrypted on your device.",
        },
        {
          id: "feat-4",
          icon: "Globe",
          title: "Siri Shortcuts & Widgets",
          description: "Control your timer hands-free and keep your daily goals front and center on your Lock Screen.",
        },
      ],
      store_links: {
        app_store_url: "",
        play_store_url: "",
      },
      screenshots: [
        "https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=800&auto=format&fit=crop&q=80",
        "https://images.unsplash.com/photo-1507238691740-187a5b1d37b8?w=800&auto=format&fit=crop&q=80",
      ],
      footer: {
        brand_name: "FocusFlow",
        legal_links: [
          { label: "Terms of Service", url: "/terms" },
          { label: "Privacy Policy", url: "/privacy" },
        ],
        contact_email: "support@focusflow.app",
      },
    },
  },
  {
    id: "saas-dev",
    name: "DevSprint",
    tagline: "High-converting developer tool and B2B SaaS landing page with dark mode and API showcase.",
    category: "developer",
    preview_image_url: "https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=800&auto=format&fit=crop&q=80",
    is_active: true,
    sort_order: 20,
    content: {
      brand: {
        name: "ShipAPI",
        logo_url: "",
      },
      hero: {
        app_name: "ShipAPI",
        badge_text: "Sample badge — replace with your status",
        header: "The modern developer API for instant edge caching.",
        short_description: "Deploy globally distributed endpoints with single-digit latency, automated rate limiting, and zero server management.",
      },
      features: [
        {
          id: "feat-1",
          icon: "Zap",
          title: "Low Edge Latency",
          description: "Route requests through a global network so your users get fast responses.",
        },
        {
          id: "feat-2",
          icon: "Cpu",
          title: "Zero-Config CLI & SDK",
          description: "One command to install, generate type-safe bindings, and deploy to production.",
        },
        {
          id: "feat-3",
          icon: "Shield",
          title: "Enterprise Grade Security",
          description: "Automated DDoS mitigation, end-to-end TLS termination, and granular token scopes.",
        },
        {
          id: "feat-4",
          icon: "BarChart3",
          title: "Real-Time Telemetry",
          description: "Inspect live traffic, request logs, and error rates with sub-second dashboard updates.",
        },
      ],
      store_links: {
        app_store_url: "",
        play_store_url: "",
      },
      screenshots: [
        "https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=800&auto=format&fit=crop&q=80",
      ],
      footer: {
        brand_name: "ShipAPI",
        legal_links: [
          { label: "Terms of Service", url: "/terms" },
          { label: "Privacy Policy", url: "/privacy" },
        ],
        contact_email: "team@shipapi.dev",
      },
    },
  },
  {
    id: "ai-studio",
    name: "NeuroCraft",
    tagline: "Futuristic neon and glassmorphic aesthetic for AI startups, chatbots, and generative tools.",
    category: "saas",
    preview_image_url: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&auto=format&fit=crop&q=80",
    is_active: true,
    sort_order: 30,
    content: {
      brand: {
        name: "NeuroCopy AI",
        logo_url: "",
      },
      hero: {
        app_name: "NeuroCopy AI",
        badge_text: "Sample badge — replace with your stack",
        header: "Turn raw ideas into viral copy in seconds.",
        short_description: "The AI writing copilot that adapts to your brand voice, eliminates writer's block, and crafts high-converting copy across all your channels.",
      },
      features: [
        {
          id: "feat-1",
          icon: "Sparkles",
          title: "Adaptive Brand Voice",
          description: "Upload past articles or tweets to train a private voice model that sounds authentically like you.",
        },
        {
          id: "feat-2",
          icon: "Zap",
          title: "One-Click Multichannel Export",
          description: "Instantly transform one core idea into newsletter drafts, LinkedIn hooks, and Twitter threads.",
        },
        {
          id: "feat-3",
          icon: "Shield",
          title: "Zero Training On Your Data",
          description: "Your intellectual property is never fed back into public foundation model training sets.",
        },
      ],
      store_links: {
        app_store_url: "",
        play_store_url: "",
      },
      screenshots: [
        "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&auto=format&fit=crop&q=80",
      ],
      footer: {
        brand_name: "NeuroCopy AI",
        legal_links: [
          { label: "Terms of Service", url: "/terms" },
          { label: "Privacy Policy", url: "/privacy" },
        ],
        contact_email: "hello@neurocopy.ai",
      },
    },
  },
  {
    id: "stealth-waitlist",
    name: "StealthLaunch",
    tagline: "Minimalist pre-launch page designed to generate hype and build massive early subscriber waitlists.",
    category: "social",
    preview_image_url: "https://images.unsplash.com/photo-1507238691740-187a5b1d37b8?w=800&auto=format&fit=crop&q=80",
    is_active: true,
    sort_order: 40,
    content: {
      brand: {
        name: "VibeCast",
        logo_url: "",
      },
      hero: {
        app_name: "VibeCast",
        badge_text: "Sample badge — replace with your waitlist count",
        header: "Something extraordinary is coming to audio.",
        short_description: "Join top creators who are revolutionizing voice storytelling. Request early access today and secure your founding member username.",
      },
      features: [
        {
          id: "feat-1",
          icon: "Zap",
          title: "Instant Priority Queue",
          description: "Share your unique referral link to jump 100 spots ahead in line for early beta access.",
        },
        {
          id: "feat-2",
          icon: "Sparkles",
          title: "Founding Member Perks",
          description: "Early waitlist members receive lifetime premium audio effects and custom profile badges.",
        },
        {
          id: "feat-3",
          icon: "Shield",
          title: "Strict No-Spam Pledge",
          description: "We only email when your beta invite is ready. No marketing newsletters, ever.",
        },
      ],
      store_links: {
        app_store_url: "",
        play_store_url: "",
      },
      screenshots: [],
      footer: {
        brand_name: "VibeCast",
        legal_links: [
          { label: "Privacy Policy", url: "/privacy" },
        ],
        contact_email: "founders@vibecast.io",
      },
    },
  },
  {
    id: "indie-portfolio",
    name: "MakerGrid",
    tagline: "Showcase all your micro-products, revenue milestones, and apps in one cohesive portfolio.",
    category: "general",
    preview_image_url: "https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800&auto=format&fit=crop&q=80",
    is_active: true,
    sort_order: 50,
    content: {
      brand: {
        name: "Alex Rivera",
        logo_url: "",
      },
      hero: {
        app_name: "Alex Rivera",
        badge_text: "Sample badge — replace with your milestone",
        header: "Building lightweight tools for internet creators.",
        short_description: "A collection of focused micro-products built in public. Simple software designed to solve single, painful problems without bloat.",
      },
      features: [
        {
          id: "feat-1",
          icon: "Sparkles",
          title: "Apps Shipped This Year",
          description: "From productivity tools to developer utilities, crafted with precision and obsessive care.",
        },
        {
          id: "feat-2",
          icon: "BarChart3",
          title: "Transparent Open Metrics",
          description: "Tracking real revenue, conversion rates, and lessons learned live on Twitter and Substack.",
        },
        {
          id: "feat-3",
          icon: "Shield",
          title: "Bootstrapped & Profitable",
          description: "No VC pressure, no bloated roadmaps. Sustainable software built for long-term reliability.",
        },
      ],
      store_links: {
        app_store_url: "",
        play_store_url: "",
      },
      screenshots: [
        "https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800&auto=format&fit=crop&q=80",
      ],
      footer: {
        brand_name: "Alex Rivera",
        legal_links: [
          { label: "Terms of Service", url: "/terms" },
          { label: "Privacy Policy", url: "/privacy" },
        ],
        contact_email: "alex@rivera.dev",
      },
    },
  },
];

/** Retrieve template by ID with fallback */
export function getTemplateById(templateId?: string | null): Template | undefined {
  if (!templateId) return undefined;
  return BUILTIN_TEMPLATES.find((t) => t.id === templateId);
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
  if (contactEmail) {
    cloned.footer.contact_email = contactEmail;
  }
  return cloned;
}
