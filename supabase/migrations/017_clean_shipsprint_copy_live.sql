-- ===========================================================================
-- 017_clean_shipsprint_copy_live.sql
--
-- H2 follow-up #2: remove ShipSprint's own marketing copy / feature list /
-- onboarding steps from existing sites that were created with the
-- `bc9c2a5` / `d343b06`-era default content.
--
-- Background: the earlier 016 migration targeted the `79a169a`-era default
-- strings ("Built for your launch.", "Set up your brand", ...). The three
-- sites created before H2 actually carry a DIFFERENT generation of the old
-- defaults:
--
--   hero.badge_text        = 'Built for indie app makers'
--   hero.header            = 'Launch your app page. Without the code.'
--   hero.short_description = 'Plan, prioritize, and publish your App Store
--                             landing page in one simple workspace. ...'
--   hero.primary_cta_label = 'Start building'
--   hero.secondary_cta_label = 'See How It Works'
--   hero.device_screenshot_url(_secondary) = '/shipsprint-phone-mockup.png'
--   brand.categories       = ['Habit','Focus','Productivity','Health',
--                             'Design','Life']
--   impacts.eyebrow        = 'Our impacts'
--   impacts.title          = 'Real results. Real impact.'
--   impacts.description    = 'See how indie makers turn visitors into
--                             installs. From faster launches to calmer
--                             workflows, <App> helps you ship more — every
--                             single day.'
--   how_it_works[]         = 'Craft your identity' / 'Showcase verified
--                             proof' / 'Publish & track installs'
--
-- The fabricated numeric tiles (1,200+ / 4.9 / 99.9% / 14,820 installs)
-- were already removed by 015 and are NOT touched here.
--
-- Each update matches the **exact ShipSprint seed string** so a customer
-- who edited any of these fields keeps their own value. The migration is
-- idempotent: after the first run the WHERE clauses no longer match.
--
-- This migration is safe to re-run.
-- ===========================================================================

begin;

-- 1. Hero — ShipSprint marketing copy -> neutral.
--    The ShipSprint header+description are a unique, recognizable pair
--    (only the old default content ever produced them), so they are the
--    gate — not the badge, which a user might have edited. The app name
--    stays as the headline; user screenshots, store links, email and any
--    user-edited badge are preserved.
update public.sites
set content = jsonb_set(
      jsonb_set(
        content,
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
where content #>> '{hero,header}' = 'Launch your app page. Without the code.'
  and content #>> '{hero,short_description}' =
      'Plan, prioritize, and publish your App Store landing page in one simple workspace. Stay on-brand, track every install, and never touch frontend code again.';

-- 2. Hero — ShipSprint badge pill ("Built for indie app makers") -> "".
--    Removed independently of 1, so a user who edited the header still
--    gets the ShipSprint badge cleaned if it was untouched.
update public.sites
set content = jsonb_set(
      content,
      '{hero,badge_text}',
      '""'::jsonb
    ),
    updated_at = now()
where content #>> '{hero,badge_text}' = 'Built for indie app makers';

-- 3. Hero — ShipSprint CTA labels -> "". Removed independently of 1, so
--    a user who edited the header still gets the ShipSprint CTAs cleaned.
update public.sites
set content = jsonb_set(
      content,
      '{hero,primary_cta_label}',
      '""'::jsonb
    ),
    updated_at = now()
where content #>> '{hero,primary_cta_label}' = 'Start building';

update public.sites
set content = jsonb_set(
      content,
      '{hero,secondary_cta_label}',
      '""'::jsonb
    ),
    updated_at = now()
where content #>> '{hero,secondary_cta_label}' = 'See How It Works';

-- 4. Hero — ShipSprint mockup screenshot (/shipsprint-phone-mockup.png) ->
--    cleared field-by-field, so the hero shows an honest placeholder until
--    the user uploads their own. A user-uploaded screenshot in the other
--    slot (e.g. an assets.shipsprint.site URL) is NOT touched.
update public.sites
set content = jsonb_set(
      content,
      '{hero,device_screenshot_url}',
      '""'::jsonb
    ),
    updated_at = now()
where content #>> '{hero,device_screenshot_url}' = '/shipsprint-phone-mockup.png';

update public.sites
set content = jsonb_set(
      content,
      '{hero,device_screenshot_url_secondary}',
      '""'::jsonb
    ),
    updated_at = now()
where content #>> '{hero,device_screenshot_url_secondary}' = '/shipsprint-phone-mockup.png';

-- 5. Brand — ShipSprint category chips -> removed.
--    Compared as jsonb (order-independent) so key order does not matter.
update public.sites
set content = content #- '{brand,categories}',
    updated_at = now()
where content -> 'brand' -> 'categories' =
      '["Habit", "Focus", "Productivity", "Health", "Design", "Life"]'::jsonb;

-- 6. Impacts — ShipSprint seed copy -> removed entirely (the block is
--    gated on real, owner-provided data; empty impacts renders nothing).
update public.sites
set content = content #- '{impacts}',
    updated_at = now()
where content #>> '{impacts,title}' = 'Real results. Real impact.'
  and content #>> '{impacts,eyebrow}' = 'Our impacts';

-- 7. How it works — ShipSprint onboarding steps -> removed.
update public.sites
set content = content #- '{how_it_works}',
    updated_at = now()
where content #>> '{how_it_works,0,title}' = 'Craft your identity'
  and content #>> '{how_it_works,1,title}' = 'Showcase verified proof'
  and content #>> '{how_it_works,2,title}' = 'Publish & track installs';

commit;

-- ---------------------------------------------------------------------------
-- Preview (run BEFORE applying — read-only):
--
--   select
--     count(*) filter (where content #>> '{hero,header}' = 'Launch your app page. Without the code.'
--       and content #>> '{hero,short_description}' = 'Plan, prioritize, and publish your App Store landing page in one simple workspace. Stay on-brand, track every install, and never touch frontend code again.') as hero_copy,
--     count(*) filter (where content #>> '{hero,badge_text}' = 'Built for indie app makers') as badge,
--     count(*) filter (where content #>> '{hero,primary_cta_label}' = 'Start building'
--       or content #>> '{hero,secondary_cta_label}' = 'See How It Works') as ctas,
--     count(*) filter (where content #>> '{hero,device_screenshot_url}' = '/shipsprint-phone-mockup.png'
--       or content #>> '{hero,device_screenshot_url_secondary}' = '/shipsprint-phone-mockup.png') as mockup,
--     count(*) filter (where content -> 'brand' -> 'categories' = '["Habit", "Focus", "Productivity", "Health", "Design", "Life"]'::jsonb) as categories,
--     count(*) filter (where content #>> '{impacts,title}' = 'Real results. Real impact.') as impacts,
--     count(*) filter (where content #>> '{how_it_works,0,title}' = 'Craft your identity') as how_it_works
--   from public.sites;
--
-- Post-apply verification (must return 0 rows):
--
--   select id, slug from public.sites
--   where (content #>> '{hero,header}' = 'Launch your app page. Without the code.'
--          and content #>> '{hero,short_description}' = 'Plan, prioritize, and publish your App Store landing page in one simple workspace. Stay on-brand, track every install, and never touch frontend code again.')
--      or content #>> '{hero,badge_text}' = 'Built for indie app makers'
--      or content #>> '{hero,primary_cta_label}' = 'Start building'
--      or content #>> '{hero,secondary_cta_label}' = 'See How It Works'
--      or content #>> '{hero,device_screenshot_url}' = '/shipsprint-phone-mockup.png'
--      or content #>> '{hero,device_screenshot_url_secondary}' = '/shipsprint-phone-mockup.png'
--      or content -> 'brand' -> 'categories' = '["Habit", "Focus", "Productivity", "Health", "Design", "Life"]'::jsonb
--      or content #>> '{impacts,title}' = 'Real results. Real impact.'
--      or content #>> '{how_it_works,0,title}' = 'Craft your identity';
-- ---------------------------------------------------------------------------