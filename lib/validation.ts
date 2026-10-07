import { z } from "zod";
import type { EventType } from "@/types/database";

/**
 * Request validation.
 *
 * Every route handler parses its body through these schemas. Previously the
 * bodies were hand-rolled with no validation at all: `PUT /api/sites/[id]`
 * accepted arbitrary `jsonb` of any size and a `status` value of any string,
 * and user-supplied `store_links` / `legal_links` URLs were written straight
 * into the database and then rendered into `<a href>` on the public page.
 */

/**
 * An http(s) URL, or an empty string.
 *
 * `z.url()` accepts `javascript:`, `data:`, and `file:`. Because these values
 * are later rendered as `href` attributes on a public page, a `javascript:`
 * payload here is a stored XSS vector.
 */
export const httpUrl = z
  .string()
  .trim()
  .max(2048)
  .refine(
    (value) => {
      if (value === "") return true;
      try {
        const url = new URL(value);
        return url.protocol === "http:" || url.protocol === "https:";
      } catch {
        return false;
      }
    },
    { message: "Must be a valid http or https URL" }
  );

/**
 * An http(s) URL, a safe root-relative path (e.g. /terms, /privacy), or an empty string.
 */
export const httpOrRelativeUrl = z
  .string()
  .trim()
  .max(2048)
  .refine(
    (value) => {
      if (value === "") return true;
      if (value.startsWith("/")) {
        return !value.startsWith("//") && !value.startsWith("/\\") && !value.includes("\\");
      }
      try {
        const url = new URL(value);
        return url.protocol === "http:" || url.protocol === "https:";
      } catch {
        return false;
      }
    },
    { message: "Must be a valid http, https, or relative URL (e.g. /terms)" }
  );

/** A URL that must be present and well-formed. */
export const requiredHttpUrl = httpUrl.refine((v) => v !== "", {
  message: "URL is required",
});

/**
 * Renders only safe http(s) hrefs or safe root-relative paths. Defence in depth for
 * rows written before these schemas existed, and for content that arrives from templates.
 */
export function safeHref(value: unknown): string {
  if (typeof value !== "string" || value === "") return "#";
  const trimmed = value.trim();
  if (trimmed.startsWith("/")) {
    if (!trimmed.startsWith("//") && !trimmed.startsWith("/\\") && !trimmed.includes("\\")) {
      return trimmed;
    }
    return "#";
  }
  try {
    const url = new URL(trimmed);
    if (url.protocol === "http:" || url.protocol === "https:") return trimmed;
  } catch {
    // fall through
  }
  return "#";
}

const shortText = (max: number) => z.string().trim().max(max);

export const featureSchema = z.object({
  id: shortText(64),
  icon: shortText(32),
  title: shortText(120),
  description: shortText(600),
  image_url: httpOrRelativeUrl.optional(),
  proof_type: z.enum(["checklist", "chart", "readiness", "image"]).optional(),
  proof_meta: z
    .object({
      checklist_items: z
        .array(
          z.object({
            label: shortText(120),
            date: shortText(40).optional(),
            status: shortText(40),
            urgent: z.boolean().optional(),
          })
        )
        .max(10)
        .optional(),
      chart_stat: z
        .object({
          value: shortText(60),
          label: shortText(80),
          ctr: shortText(40).optional(),
          bars: z.array(z.number()).max(14).optional(),
        })
        .optional(),
      readiness_items: z
        .array(
          z.object({
            key: shortText(80),
            value: shortText(120),
          })
        )
        .max(10)
        .optional(),
    })
    .optional(),
});

export const bentoImpactsSchema = z
  .object({
    eyebrow: shortText(80).optional(),
    title: shortText(160).optional(),
    description: shortText(500).optional(),
    trust_avatars: z.array(shortText(10)).max(8).optional(),
    trust_headline: shortText(120).optional(),
    metric_stat: shortText(40).optional(),
    metric_label: shortText(120).optional(),
    rating_score: z.number().min(0).max(5).optional(),
    rating_reviews_label: shortText(120).optional(),
    sla_stat: shortText(40).optional(),
    sla_label: shortText(120).optional(),
    speed_stat: shortText(40).optional(),
    speed_label: shortText(120).optional(),
  })
  .strict();

export const howItWorksStepSchema = z
  .object({
    step: shortText(40),
    title: shortText(120),
    description: shortText(400),
  })
  .strict();

const logoWallLogoSchema = z
  .object({
    id: shortText(64),
    name: shortText(60),
    image_url: httpUrl,
  })
  .strict();

const footerColumnSchema = z
  .object({
    heading: shortText(40),
    links: z
      .array(
        z
          .object({
            label: shortText(60),
            url: httpOrRelativeUrl,
          })
          .strict()
      )
      .max(8),
  })
  .strict();

export const sitePageSchema = z
  .object({
    id: shortText(64),
    slug: z
      .string()
      .trim()
      .toLowerCase()
      .max(64)
      .regex(/^(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?)?$/, "Invalid page slug"),
    title: shortText(120),
    nav_label: shortText(60).optional(),
    show_in_nav: z.boolean().optional(),
    show_in_footer: z.boolean().optional(),
    page_type: z.enum(["home", "privacy", "terms", "support", "custom"]),
    is_system: z.boolean().optional(),
    is_published: z.boolean().optional(),
    content_markdown: z.string().max(65536),
    meta_title: shortText(160).optional(),
    meta_description: shortText(320).optional(),
    updated_at: z.string().optional(),
  })
  .strict();

export const storeLinksSchema = z
  .object({
    availability: z
      .enum(["both", "app_store_only", "play_store_only", "testflight"])
      .optional(),
    app_store_url: httpUrl.optional(),
    play_store_url: httpUrl.optional(),
    testflight_url: httpUrl.optional(),
  })
  .strict();

/**
 * The full editor payload.
 *
 * `.strict()` on every object rejects unknown keys rather than silently
 * persisting them, which stops a client from smuggling arbitrary extra data
 * into the jsonb column.
 */
export const siteContentSchema = z
  .object({
    brand: z
      .object({
        name: shortText(80),
        logo_url: httpOrRelativeUrl.optional(),
        app_icon_url: httpOrRelativeUrl.optional(),
        categories: z.array(shortText(40)).max(12).optional(),
      })
      .strict(),
    hero: z
      .object({
        app_name: shortText(80),
        badge_text: shortText(120),
        header: shortText(200),
        short_description: shortText(500),
        device_screenshot_url: httpOrRelativeUrl.optional(),
        device_screenshot_url_secondary: httpOrRelativeUrl.optional(),
        primary_cta_label: shortText(60).optional(),
        secondary_cta_label: shortText(60).optional(),
        rating_stars: z.number().min(1).max(5).optional(),
        rating_text: shortText(120).optional(),
        email_capture_enabled: z.boolean().optional(),
        email_placeholder: shortText(80).optional(),
        email_cta_label: shortText(40).optional(),
        email_success_message: shortText(200).optional(),
      })
      .strict(),
    impacts: bentoImpactsSchema.optional(),
    features: z.array(featureSchema).max(24),
    how_it_works: z.array(howItWorksStepSchema).max(12).optional(),
    logo_wall: z
      .object({
        eyebrow: shortText(80),
        logos: z.array(logoWallLogoSchema).max(12),
      })
      .strict()
      .optional(),
    release: z
      .object({
        eyebrow: shortText(80),
        title: shortText(120),
        description: shortText(500),
        version: shortText(40),
        rating: shortText(20),
        rating_count: shortText(40),
        age_rating: shortText(20),
        chart_rank: shortText(60),
        release_notes: z.array(shortText(200)).max(8),
        image_url: httpUrl.optional(),
      })
      .strict()
      .optional(),
    store_links: storeLinksSchema,
    screenshots: z.array(httpUrl).max(20),
    pages: z.array(sitePageSchema).max(30).optional(),
    trust: z
      .object({
        rating: shortText(20),
        review_count_text: shortText(60),
        featured_quote: shortText(300),
        author: shortText(80).optional(),
      })
      .strict()
      .optional(),
    showcase: z
      .array(
        z
          .object({
            id: shortText(64),
            title: shortText(120),
            description: shortText(500),
            align: z.enum(["left", "right"]),
            image_url: httpUrl.optional(),
          })
          .strict()
      )
      .max(6)
      .optional(),
    stats: z
      .array(
        z
          .object({
            id: shortText(64),
            value: shortText(40),
            label: shortText(60),
          })
          .strict()
      )
      .max(8)
      .optional(),
    testimonials: z
      .array(
        z
          .object({
            id: shortText(64),
            name: shortText(80),
            role: shortText(80),
            quote: shortText(400),
            avatar_url: httpUrl.optional(),
            rating: z.number().min(1).max(5).optional(),
            is_main: z.boolean().optional(),
          })
          .strict()
      )
      .max(8)
      .optional(),
    pricing: z
      .array(
        z
          .object({
            id: shortText(64),
            name: shortText(60),
            price: shortText(40),
            period: shortText(40),
            description: shortText(200).optional(),
            is_popular: z.boolean().optional(),
            features: z.array(shortText(120)).max(12),
            cta_label: shortText(60),
          })
          .strict()
      )
      .max(6)
      .optional(),
    faq: z
      .array(
        z
          .object({
            id: shortText(64),
            question: shortText(200),
            answer: shortText(1000),
          })
          .strict()
      )
      .max(12)
      .optional(),
    footer: z
      .object({
        brand_name: shortText(80),
        tagline: shortText(200).optional(),
        legal_links: z
          .array(
            z
              .object({
                label: shortText(60),
                url: httpOrRelativeUrl,
              })
              .strict()
          )
          .max(10),
        contact_email: z.union([z.literal(""), z.email()]),
        columns: z.array(footerColumnSchema).max(4).optional(),
      })
      .strict(),
  })
  .strict();


/** Hard ceiling on the serialized document, enforced before the DB write. */
export const MAX_CONTENT_BYTES = 256 * 1024;

export const siteStatusSchema = z.enum(["draft", "published"]);

export const createSiteSchema = z.object({
  name: shortText(80).min(1, "Name is required"),
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .min(2, "Slug must be at least 2 characters")
    .max(48, "Slug must be at most 48 characters")
    .regex(
      /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/,
      "Slug may only contain lowercase letters, numbers and hyphens"
    ),
  template_id: z.string().trim().max(64).optional().nullable(),
});

export const updateSiteSchema = z
  .object({
    content: siteContentSchema.optional(),
    status: siteStatusSchema.optional(),
    theme: z.string().trim().max(64).optional(),
  })
  .refine(
    (value) =>
      value.content !== undefined ||
      value.status !== undefined ||
      value.theme !== undefined,
    {
      message: "Provide at least one of content, status, or theme",
    }
  );

/**
 * A purchasable SKU, not a plan id.
 *
 * The client names a product such as `pro_yearly`; the tier is derived from the
 * `products` catalogue. Accepting a plan id here would let a caller ask to be
 * charged for the cheap product and granted the expensive tier.
 */
export const checkoutSchema = z.object({
  product_id: z.enum([
    "basic_monthly",
    "basic_yearly",
    "pro_monthly",
    "pro_yearly",
  ]),
});

export const createDomainSchema = z.object({
  site_id: z.uuid("site_id must be a UUID"),
  domain: z
    .string()
    .trim()
    .toLowerCase()
    .min(4)
    .max(253)
    .regex(
      /^(?!-)[a-z0-9-]{1,63}(?<!-)(\.(?!-)[a-z0-9-]{1,63}(?<!-))+$/,
      "Enter a valid domain name, for example myapp.com"
    ),
});

export const deleteDomainSchema = z.object({
  site_id: z.uuid("site_id must be a UUID"),
});

/**
 * The analytics event types, as a runtime value.
 *
 * `EventType` in `types/database.ts` mirrors the Postgres enum and is the type
 * everyone annotates against. The `satisfies` clause makes that mirror
 * load-bearing in both directions: adding a string here that the database does
 * not have, or renaming one, is a compile error rather than a beacon that is
 * silently rejected at runtime.
 */
export const EVENT_TYPES = [
  "page_view",
  "button_click",
] as const satisfies readonly EventType[];

export const trackEventSchema = z.object({
  // Parsed as a UUID, not merely "a non-empty string". The route feeds this
  // straight into a Postgres `uuid` column lookup, and an unvalidated value
  // there raises `invalid input syntax for type uuid` — a wasted round trip on
  // an unauthenticated endpoint.
  site_id: z.uuid(),
  event_type: z.enum(EVENT_TYPES),
  meta: z.record(z.string(), z.unknown()).optional(),
});

export type ValidatedSiteContent = z.infer<typeof siteContentSchema>;

export const updateAiDiscoverySchema = z
  .object({
    ai_discovery_enabled: z.boolean().optional(),
    ai_search_crawling_enabled: z.boolean().optional(),
    ai_training_crawling_enabled: z.boolean().optional(),
    llms_txt_enabled: z.boolean().optional(),
    ai_category: shortText(60).optional().nullable(),
    ai_target_audience: shortText(120).optional().nullable(),
    ai_summary: z.string().trim().max(4000).optional().nullable(),
  })
  .strict();

export type ValidatedAiDiscoveryConfig = z.infer<typeof updateAiDiscoverySchema>;

/** Flattens Zod issues into a single client-safe message. */
export function firstIssue(error: z.ZodError): string {
  return error.issues[0]?.message ?? "Invalid request body";
}

