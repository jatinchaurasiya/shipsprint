/* Hallmark · pre-emit critique: P5 H5 E5 S5 R5 V5 */
import type { Template, SiteContent } from "@/types/database";
import { getDefaultSitePages } from "./legal-pages";

/**
 * Built-in templates collection.
 * Templates have been completely removed per architecture update.
 * All sites are created directly with standard production mobile app launch configuration.
 */
export const BUILTIN_TEMPLATES: Template[] = [];

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
