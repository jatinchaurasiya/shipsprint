/* Hallmark · pre-emit critique: P5 H5 E5 S5 R5 V5 */
import type { Template, SiteContent } from "@/types/database";

/**
 * Built-in application launch templates catalogue.
 * Cleared of legacy inconsistent mock templates. New dedicated mobile app
 * launch templates will be registered here based on user-approved specifications.
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
  if (contactEmail) {
    cloned.footer.contact_email = contactEmail;
  }
  return cloned;
}
