-- ===========================================================================
-- 003_analytics_and_templates
--
-- Analytics aggregation moved out of the browser, and the template system that
-- the product differentiation depends on.
-- ===========================================================================

begin;

-- ===========================================================================
-- 1. Server-side analytics aggregation
--
-- The dashboard previously fetched up to 1000 raw events and aggregated them
-- in a React useMemo. That produced two failures at once: metrics were
-- silently wrong past the cap, and the entire event set was serialized into
-- the RSC payload. This view does the grouping in Postgres and returns ~20 rows.
-- ===========================================================================

create or replace view public.site_analytics_summary
with (security_invoker = true) as
select
  ev.site_id,
  -- UTC day. The client previously seeded day buckets with local-time Dates
  -- converted via toISOString(), which skewed buckets by up to 14 hours.
  (ev.created_at at time zone 'utc')::date as day,
  count(*) filter (where ev.event_type = 'page_view') as page_views,
  count(*) filter (where ev.event_type = 'button_click') as button_clicks,
  count(*) filter (where ev.meta->>'device' = 'mobile') as mobile,
  count(*) filter (where ev.meta->>'device' = 'tablet') as tablet,
  count(*) filter (where ev.meta->>'device' = 'desktop') as desktop
from public.analytics_events ev
group by ev.site_id, (ev.created_at at time zone 'utc')::date;

comment on view public.site_analytics_summary is
  'Per-site, per-UTC-day event counts. security_invoker means the caller''s RLS applies.';

-- Traffic sources.
--
-- The dashboard previously grouped by referrer across ALL events, but only
-- page_view events carry a referrer, so every button_click was counted as
-- "Direct" and the panel systematically overstated direct traffic. This view
-- scopes the grouping to page_view.
create or replace view public.site_analytics_sources
with (security_invoker = true) as
select
  ev.site_id,
  (ev.created_at at time zone 'utc')::date as day,
  case
    when ev.meta->>'referrer' is null
      or ev.meta->>'referrer' = ''
      or ev.meta->>'referrer' = 'Direct'
      then 'Direct'
    else regexp_replace(
      regexp_replace(ev.meta->>'referrer', '^https?://(www\.)?', ''),
      '/.*$', ''
    )
  end as source,
  count(*) as views
from public.analytics_events ev
where ev.event_type = 'page_view'
group by
  ev.site_id,
  (ev.created_at at time zone 'utc')::date,
  case
    when ev.meta->>'referrer' is null
      or ev.meta->>'referrer' = ''
      or ev.meta->>'referrer' = 'Direct'
      then 'Direct'
    else regexp_replace(
      regexp_replace(ev.meta->>'referrer', '^https?://(www\.)?', ''),
      '/.*$', ''
    )
  end;

comment on view public.site_analytics_sources is
  'Page-view traffic sources only. Excluding clicks is what makes "Direct" correct.';

-- Store-button performance, also page_view-scoped for the same reason.
create or replace view public.site_analytics_cta
with (security_invoker = true) as
select
  ev.site_id,
  coalesce(nullif(ev.meta->>'button_type', ''), 'unknown') as button_type,
  count(*) as clicks
from public.analytics_events ev
where ev.event_type = 'button_click'
group by ev.site_id, coalesce(nullif(ev.meta->>'button_type', ''), 'unknown');

-- ===========================================================================
-- 2. Daily rollup
--
-- Keeps the dashboard query O(1) as raw events accumulate, and gives the
-- retention job something to prune against.
-- ===========================================================================

create or replace function public.rollup_telemetry(p_days integer default 3)
returns integer as $$
declare
  v_rows integer;
begin
  insert into public.telemetry_daily (
    site_id, day, page_views, button_clicks, mobile, tablet, desktop, referrers
  )
  select
    site_id,
    day,
    sum(page_views)::integer,
    sum(button_clicks)::integer,
    sum(mobile)::integer,
    sum(tablet)::integer,
    sum(desktop)::integer,
    jsonb_object_agg(source, views)
  from public.site_analytics_summary s
  left join public.site_analytics_sources src
    on src.site_id = s.site_id and src.day = s.day
  where s.day >= (current_date - p_days)
  group by site_id, day
  on conflict (site_id, day) do update
    set page_views = excluded.page_views,
        button_clicks = excluded.button_clicks,
        mobile = excluded.mobile,
        tablet = excluded.tablet,
        desktop = excluded.desktop,
        referrers = excluded.referrers;

  get diagnostics v_rows = row_count;
  return v_rows;
end;
$$ language plpgsql security definer set search_path = public, pg_temp;

-- Retention. Raw events are only useful for short-window debugging; the
-- rollup is the durable record.
create or replace function public.prune_analytics(p_days integer default 90)
returns integer as $$
declare
  v_rows integer;
begin
  delete from public.analytics_events
  where created_at < now() - make_interval(days => p_days);
  get diagnostics v_rows = row_count;
  return v_rows;
end;
$$ language plpgsql security definer set search_path = public, pg_temp;

-- ===========================================================================
-- 3. Templates
--
-- The product's stated differentiator is depth of customization plus templates,
-- and no template system existed. The only starting content was a hardcoded
-- object in the site-creation route.
--
-- `content` uses the same shape as sites.content, so a template can be written
-- straight into a new site and the editor needs no changes. That is what keeps
-- the zero-drift guarantee intact: a template renders through exactly the same
-- site-renderer component as an edited page.
-- ===========================================================================

create table if not exists public.templates (
  id text primary key,
  name text not null,
  tagline text not null default '',
  category text not null default 'general',
  content jsonb not null,
  preview_image_url text,
  is_active boolean not null default true,
  sort_order integer not null default 100,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint templates_category_check
    check (category in ('general', 'productivity', 'developer', 'social', 'finance', 'health', 'gaming', 'saas'))
);

create index if not exists idx_templates_active
  on public.templates (is_active, sort_order);

alter table public.templates enable row level security;

-- Templates are public catalogue entries, readable by the anon key so the
-- gallery can render before signup.
drop policy if exists "Templates are viewable by everyone" on public.templates;
create policy "Templates are viewable by everyone"
  on public.templates for select
  using (is_active);

-- Only service role writes templates. No client-side insert policy, otherwise
-- anyone with the anon key could inject a template that other users then
-- render.
revoke insert, update, delete on public.templates from anon, authenticated;

drop trigger if exists trg_templates_updated_at on public.templates;
create trigger trg_templates_updated_at
  before update on public.templates
  for each row execute function public.set_updated_at();

-- Record which template a site started from, so template performance can be
-- measured and so a site can be re-seeded later.
alter table public.sites
  add column if not exists template_id text references public.templates (id) on delete set null;

-- ===========================================================================
-- 4. Content size guard
--
-- The API enforces a 256KB ceiling, but a direct PostgREST write bypasses the
-- API. Enforce it in the database too, since sites.content is a jsonb column
-- with no constraint of any kind.
-- ===========================================================================

alter table public.sites
  drop constraint if exists sites_content_size_check;
alter table public.sites
  add constraint sites_content_size_check
  check (pg_column_size(content) <= 262144);

-- ===========================================================================
-- 5. Slug format guard
--
-- The API validates slugs, but a direct PostgREST insert bypasses it, and the
-- slug becomes a DNS hostname.
-- ===========================================================================

alter table public.sites
  drop constraint if exists sites_slug_format_check;
alter table public.sites
  add constraint sites_slug_format_check
  check (slug ~ '^[a-z0-9](?:[a-z0-9-]{0,46}[a-z0-9])?$');

-- ===========================================================================
-- 6. Subscription integrity
-- ===========================================================================

alter table public.subscriptions
  drop constraint if exists subscriptions_dodo_id_present;
alter table public.subscriptions
  add constraint subscriptions_dodo_id_present
  check (dodo_subscription_id is not null and length(dodo_subscription_id) > 0);

commit;
