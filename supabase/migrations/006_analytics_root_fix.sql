-- ===========================================================================
-- 006_analytics_root_fix.sql
--
-- Production root fix for analytics:
--   1. Fix site_analytics_cta: add `day` column so time windows filter properly
--   2. Fix site_analytics_sources: case-insensitive Direct grouping
--   3. Fix site_analytics_summary: scope device breakdown to page_view events
-- ===========================================================================

begin;

-- Drop existing views to permit column order and type updates without 42P16 errors
drop view if exists public.site_analytics_cta cascade;
drop view if exists public.site_analytics_sources cascade;
drop view if exists public.site_analytics_summary cascade;

-- 1. Scoped device breakdown and unified day aggregation
create or replace view public.site_analytics_summary
with (security_invoker = true) as
select
  ev.site_id,
  (ev.created_at at time zone 'utc')::date as day,
  count(*) filter (where ev.event_type = 'page_view')   as page_views,
  count(*) filter (where ev.event_type = 'button_click') as button_clicks,
  count(*) filter (where ev.event_type = 'page_view' and ev.meta->>'device' = 'mobile')  as mobile,
  count(*) filter (where ev.event_type = 'page_view' and ev.meta->>'device' = 'tablet')  as tablet,
  count(*) filter (where ev.event_type = 'page_view' and ev.meta->>'device' = 'desktop') as desktop
from public.analytics_events ev
group by ev.site_id, (ev.created_at at time zone 'utc')::date;

comment on view public.site_analytics_summary is
  'Per-site, per-UTC-day event counts with unique visitor devices scoped to page_view events.';

-- 2. Case-insensitive Direct detection and clean domain parsing
create or replace view public.site_analytics_sources
with (security_invoker = true) as
select
  ev.site_id,
  (ev.created_at at time zone 'utc')::date as day,
  case
    when ev.meta->>'referrer' is null
      or lower(trim(ev.meta->>'referrer')) in ('', 'direct')
      then 'Direct'
    else regexp_replace(regexp_replace(ev.meta->>'referrer', '^https?://(www\.)?', ''), '/.*$', '')
  end as source,
  count(*) as views
from public.analytics_events ev
where ev.event_type = 'page_view'
group by
  ev.site_id,
  (ev.created_at at time zone 'utc')::date,
  case
    when ev.meta->>'referrer' is null
      or lower(trim(ev.meta->>'referrer')) in ('', 'direct')
      then 'Direct'
    else regexp_replace(regexp_replace(ev.meta->>'referrer', '^https?://(www\.)?', ''), '/.*$', '')
  end;

comment on view public.site_analytics_sources is
  'Traffic source breakdown per day with case-insensitive Direct grouping.';

-- 3. Time-windowable CTA click breakdown with day column
create or replace view public.site_analytics_cta
with (security_invoker = true) as
select
  ev.site_id,
  (ev.created_at at time zone 'utc')::date as day,
  coalesce(nullif(ev.meta->>'button_type', ''), 'unknown') as button_type,
  count(*) as clicks
from public.analytics_events ev
where ev.event_type = 'button_click'
group by
  ev.site_id,
  (ev.created_at at time zone 'utc')::date,
  coalesce(nullif(ev.meta->>'button_type', ''), 'unknown');

comment on view public.site_analytics_cta is
  'CTA button clicks grouped by site, UTC day, and button type for time-windowed conversion tracking.';

-- Ensure permissions
grant select on public.site_analytics_summary, public.site_analytics_sources, public.site_analytics_cta to authenticated;

commit;
