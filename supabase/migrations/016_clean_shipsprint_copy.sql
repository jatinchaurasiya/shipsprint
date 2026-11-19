-- ===========================================================================
-- 016_clean_shipsprint_copy.sql
--
-- H2 follow-up: remove ShipSprint's own marketing copy / feature list /
-- onboarding steps from existing sites that were created with the old default.
--
-- New sites now start neutral (lib/templates.ts), but sites created before
-- the fix still contain ShipSprint's copy in `sites.content`:
--
--   hero.badge_text        = 'Built for indie app makers'
--   hero.header            = 'Launch your app page. Without the code.'
--   hero.short_description = 'Build a high-converting App Store landing page ...'
--   features[]             = 'Zero-drift page builder' / 'Store buttons that convert'
--                            / 'Domains, TLS & reminders'
--   how_it_works[]         = 'Set up your brand' / 'Verified milestones & proof'
--                            / 'Publish & track installs'
--   impacts.title          = 'Built for your launch.'
--   footer.tagline         = 'Designed for indie apps shipping worldwide.'
--
-- Each update matches the **exact combination** of the old defaults, so a
-- customer who edited any of these fields is left alone. The migration is
-- idempotent: after the first run the WHERE clauses no longer match.
--
-- This migration is safe to re-run.
-- ===========================================================================

begin;

-- 1. Hero: ShipSprint marketing copy -> neutral (app name as headline,
--    empty badge and description).
update public.sites
set content = jsonb_set(
      jsonb_set(
        jsonb_set(
          content,
          '{hero,badge_text}',
          '""'::jsonb
        ),
        '{hero,short_description}',
        '""'::jsonb
      ),
      '{hero,header}',
      to_jsonb(coalesce(
        content->'brand'->>'name',
        content->'hero'->>'app_name',
        'App'
      ))
    ),
    updated_at = now()
where content #>> '{hero,badge_text}' = 'Built for indie app makers'
  and content #>> '{hero,header}' = 'Launch your app page. Without the code.'
  and content #>> '{hero,short_description}' =
      'Build a high-converting App Store landing page without frontend code. Connect store links, preview on real device frames, and publish to your custom domain.';

-- 2. Features: ShipSprint's own feature list -> removed.
update public.sites
set content = content #- '{features}',
    updated_at = now()
where content #>> '{features,0,title}' = 'Zero-drift page builder'
  and content #>> '{features,1,title}' = 'Store buttons that convert'
  and content #>> '{features,2,title}' = 'Domains, TLS & reminders';

-- 3. How it works: ShipSprint's onboarding steps -> removed.
update public.sites
set content = content #- '{how_it_works}',
    updated_at = now()
where content #>> '{how_it_works,0,title}' = 'Set up your brand'
  and content #>> '{how_it_works,1,title}' = 'Verified milestones & proof'
  and content #>> '{how_it_works,2,title}' = 'Publish & track installs';

-- 4. Impacts: seeded generic block -> removed.
update public.sites
set content = content #- '{impacts}',
    updated_at = now()
where content #>> '{impacts,title}' = 'Built for your launch.';

-- 5. Footer tagline: ShipSprint copy -> removed.
update public.sites
set content = content #- '{footer,tagline}',
    updated_at = now()
where content #>> '{footer,tagline}' = 'Designed for indie apps shipping worldwide.';

commit;

-- ---------------------------------------------------------------------------
-- Preview (run BEFORE applying — read-only):
--
--   select
--     count(*) filter (where content #>> '{hero,header}' = 'Launch your app page. Without the code.') as hero,
--     count(*) filter (where content #>> '{features,0,title}' = 'Zero-drift page builder') as features,
--     count(*) filter (where content #>> '{how_it_works,0,title}' = 'Set up your brand') as how_it_works,
--     count(*) filter (where content #>> '{impacts,title}' = 'Built for your launch.') as impacts,
--     count(*) filter (where content #>> '{footer,tagline}' = 'Designed for indie apps shipping worldwide.') as footer
--   from public.sites;
--
-- Post-apply verification (must return 0 rows):
--
--   select id, slug from public.sites
--   where content #>> '{hero,header}' = 'Launch your app page. Without the code.'
--      or content #>> '{features,0,title}' = 'Zero-drift page builder'
--      or content #>> '{how_it_works,0,title}' = 'Set up your brand'
--      or content #>> '{impacts,title}' = 'Built for your launch.'
--      or content #>> '{footer,tagline}' = 'Designed for indie apps shipping worldwide.';
-- ---------------------------------------------------------------------------