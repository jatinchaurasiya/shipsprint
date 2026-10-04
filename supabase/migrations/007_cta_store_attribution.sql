-- CTA store attribution.
--
-- The navbar "Get the app" button used to report button_type = 'nav_download',
-- which names neither store. Two CTAs collapse into that one label, and the
-- dashboard could only classify a click by matching the button type against
-- 'app_store' / 'play_store', so every header download click landed in
-- "Other Buttons" instead of iOS or Android.
--
-- The renderer now emits a store-specific type (app_store_nav / play_store_nav),
-- but that only affects clicks from now on. analytics_events is an append-only
-- record of what visitors actually did, so the correct fix is to resolve the
-- store when reading, not to rewrite history: every legacy 'nav_download' row
-- also recorded the destination it opened in meta.target_url, which names the
-- store unambiguously.
--
-- The view therefore gains a `store` column with a closed domain
-- ('apple' | 'google' | 'other') that every consumer can rely on:
--   1. an explicit store in button_type wins;
--   2. otherwise the recorded target_url decides;
--   3. otherwise 'other'.
--
-- Rows are grouped by store as well as button_type so that a single day of
-- legacy header clicks splits correctly across the two stores.

begin;

-- A new column cannot be added to an existing view with create or replace.
drop view if exists public.site_analytics_cta cascade;

create or replace view public.site_analytics_cta
with (security_invoker = true) as
select
  site_id,
  day,
  button_type,
  store,
  count(*) as clicks
from (
  select
    ev.site_id,
    (ev.created_at at time zone 'utc')::date as day,
    coalesce(nullif(ev.meta->>'button_type', ''), 'unknown') as button_type,
    case
      -- 1. An explicit store in the button type is authoritative.
      when lower(coalesce(ev.meta->>'button_type', ''))
           ~ '(app_store|ios|apple)'
        then 'apple'
      when lower(coalesce(ev.meta->>'button_type', ''))
           ~ '(play_store|android|google)'
        then 'google'
      -- 2. Legacy store-agnostic types ('nav_download') still carry the store
      --    in the destination they opened.
      when lower(coalesce(ev.meta->>'target_url', ''))
           ~ '(apps\.apple\.com|itunes\.apple\.com)'
        then 'apple'
      when lower(coalesce(ev.meta->>'target_url', ''))
           ~ '(play\.google\.com|market\.android\.com)'
        then 'google'
      -- 3. Anything else is not a store click.
      else 'other'
    end as store
  from public.analytics_events ev
  where ev.event_type = 'button_click'
) classified
group by site_id, day, button_type, store;

comment on view public.site_analytics_cta is
  'CTA clicks per site, UTC day, button type and canonical store (apple|google|other). Store is resolved from button_type, falling back to the recorded target_url so legacy nav_download clicks are attributed to the store they actually opened.';

grant select on public.site_analytics_summary, public.site_analytics_sources, public.site_analytics_cta to authenticated;

commit;