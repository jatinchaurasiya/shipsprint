import { z } from "zod";

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

/** A URL that must be present and well-formed. */
export const requiredHttpUrl = httpUrl.refine((v) => v !== "", {
  message: "URL is required",
});

/**
 * Renders only http(s) hrefs. Defence in depth for rows written before these
 * schemas existed, and for any content that arrives from a template.
 */
export function safeHref(value: unknown): string {
  if (typeof value !== "string" || value === "") return "#";
  try {
    const url = new URL(value);
    if (url.protocol === "http:" || url.protocol === "https:") return value;
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
});

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
      })
      .strict(),
    features: z.array(featureSchema).max(24),
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
        legal_links: z
          .array(
            z
              .object({
                label: shortText(60),
                url: httpUrl,
              })
              .strict()
          )
          .max(10),
        contact_email: z.union([z.literal(""), z.email()]),
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

export const trackEventSchema = z.object({
  site_id: z.uuid(),
  event_type: z.enum(["page_view", "button_click"]),
  meta: z.record(z.string(), z.unknown()).optional(),
});

export type ValidatedSiteContent = z.infer<typeof siteContentSchema>;

/** Flattens Zod issues into a single client-safe message. */
export function firstIssue(error: z.ZodError): string {
  return error.issues[0]?.message ?? "Invalid request body";
}
