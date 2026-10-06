-- ===========================================================================
-- 009_seed_20_hallmark_templates
--
-- Remove legacy templates. Templates are discontinued in favor of standard
-- mobile app launch setup directly configured for each created site.
-- ===========================================================================

begin;

-- Clear all templates
delete from public.templates;

commit;