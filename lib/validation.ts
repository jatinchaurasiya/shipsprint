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
  image_url: httpUrl.optional(),
});

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
        logo_url: httpUrl,
      })
      .strict(),
    hero: z
      .object({
        app_name: shortText(80),
        badge_text: shortText(120),
        header: shortText(200),
        short_description: shortText(500),
        email_capture_enabled: z.boolean().optional(),
        email_placeholder: shortText(80).optional(),
        email_cta_label: shortText(40).optional(),
        email_success_message: shortText(200).optional(),
      })
      .strict(),
    features: z.array(featureSchema).max(24),
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
        image_url: httpUrl,
      })
      .strict()
      .optional(),
    store_links: z
      .object({
        app_store_url: httpUrl,
        play_store_url: httpUrl,
      })
      .strict(),
    screenshots: z.array(httpUrl).max(20),
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
  })
  .refine((value) => value.content !== undefined || value.status !== undefined, {
    message: "Provide at least one of content or status",
  });

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

/** Flattens Zod issues into a single client-safe message. */
export function firstIssue(error: z.ZodError): string {
  return error.issues[0]?.message ?? "Invalid request body";
}
