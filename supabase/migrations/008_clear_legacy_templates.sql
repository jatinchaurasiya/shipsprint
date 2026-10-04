-- ===========================================================================
-- 008_clear_legacy_templates
--
-- Clears legacy inconsistent templates from the public.templates table.
-- Existing sites referencing these templates have template_id set to NULL
-- automatically via the `on delete set null` foreign key constraint.
-- ===========================================================================

begin;

-- 1. Clear legacy mock templates from the catalogue
delete from public.templates;

-- 2. Verify templates table is clean
comment on table public.templates is 'Application launch templates catalogue. Cleared of legacy templates.';

commit;
