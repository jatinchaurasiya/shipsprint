-- ===========================================================================
-- ShipSprint — consolidated production schema (CONVERGENT)
--
-- Supabase Dashboard -> SQL Editor -> New query -> paste -> Run.
--
-- ---------------------------------------------------------------------------
-- WHY THIS FILE LOOKS REPEATED
--
-- `CREATE TABLE IF NOT EXISTS` is not idempotent. If the table already exists,
-- Postgres skips the whole statement INCLUDING the column list, so a script
-- built that way fails the moment it meets a table created by an earlier
-- version. The first attempt at this file died with:
--
--   ERROR: 42703: column "tagline" of relation "plans" does not exist
--
-- because `plans` already existed from the initial migration without that
-- column, and the CREATE was silently skipped.
--
-- The fix is the pattern used below for every table:
--
--   1. CREATE TABLE IF NOT EXISTS  ....  full shape, for a fresh database
--   2. ALTER TABLE ADD COLUMN IF NOT EXISTS  ....  for every single column
--
-- Step 2 is what makes this convergent: it adds what is missing and ignores
-- what is already correct, so the script produces the intended schema whether
-- the database is empty, half-built by the old migration, or already current.
--
-- The repetition is deliberate. Do not "tidy" it into bare CREATEs.
-- ---------------------------------------------------------------------------
--
-- BILLING MODEL
--
--   plans    = the TIER (free/basic/pro). Carries the feature flags and is
--              what profiles.plan_id references.
--   products = the BILLED SKU (tier + period + Dodo product id). Four SKUs on
--              three tiers:
--                basic_monthly -> basic    basic_yearly -> basic
--                pro_monthly   -> pro      pro_yearly   -> pro
--
-- Keeping them separate is what makes yearly plans work. A single table
-- conflating tier and period would force every feature check to become a
-- comparison against four string values.
-- ===========================================================================

begin;

-- ===========================================================================
-- 1. PLANS — the tier
-- ===========================================================================

create table if not exists public.plans (
  id                       text primary key,
  name                     text        not null,
  tagline                  text        not null default '',
  site_limit               integer     not null default 1,
  has_branding             boolean     not null default true,
  has_custom_domain        boolean     not null default false,
  has_analytics_dashboard  boolean     not null default false,
  has_email_capture        boolean     not null default false,
  sort_order               integer     not null default 100,
  is_active                boolean     not null default true,
  created_at               timestamptz not null default now(),
  updated_at               timestamptz not null default now()
);

-- Converge an existing table onto the full column set.
alter table public.plans add column if not exists tagline                 text        not null default '';
alter table public.plans add column if not exists has_email_capture       boolean     not null default false;
alter table public.plans add column if not exists sort_order              integer     not null default 100;
alter table public.plans add column if not exists is_active               boolean     not null default true;
alter table public.plans add column if not exists site_limit              integer     not null default 1;
alter table public.plans add column if not exists has_branding            boolean     not null default true;
alter table public.plans add column if not exists has_custom_domain       boolean     not null default false;
alter table public.plans add column if not exists has_analytics_dashboard boolean     not null default false;
alter table public.plans add column if not exists has_ai_discovery       boolean     not null default false;
alter table public.plans add column if not exists created_at              timestamptz not null default now();
alter table public.plans add column if not exists updated_at              timestamptz not null default now();

-- Drop obsolete price_cents column from 001_initial_schema (pricing moved to public.products)
alter table public.plans drop column if exists price_cents cascade;

update public.plans set name = 'Free'  where id = 'free'  and (name is null or name = '');
update public.plans set name = 'Basic' where id = 'basic' and (name is null or name = '');
update public.plans set name = 'Pro'   where id = 'pro'   and (name is null or name = '');

insert into public.plans
  (id, name, tagline, site_limit, has_branding, has_custom_domain,
   has_analytics_dashboard, has_email_capture, has_ai_discovery, sort_order)
values
  ('free',  'Free',  'One landing page to get started.',
   1,  true,  false, false, false, false, 10),
  ('basic', 'Basic', 'For a solo launch with a real domain.',
   3,  false, true,  false, true,  false, 20),
  ('pro',   'Pro',   'Multiple apps with analytics.',
   10, false, true,  true,  true,  true,  30)
on conflict (id) do update
  set name                    = excluded.name,
      tagline                 = excluded.tagline,
      site_limit              = excluded.site_limit,
      has_branding            = excluded.has_branding,
      has_custom_domain       = excluded.has_custom_domain,
      has_analytics_dashboard = excluded.has_analytics_dashboard,
      has_email_capture       = excluded.has_email_capture,
      has_ai_discovery       = excluded.has_ai_discovery,
      sort_order              = excluded.sort_order;

-- ===========================================================================
-- 2. PRODUCTS — the billed SKU
-- ===========================================================================

create table if not exists public.products (
  id               text primary key,
  plan_id          text        not null references public.plans (id),
  billing_period   text        not null,
  name             text        not null,
  price_cents      integer     not null,
  dodo_product_id  text,
  is_active        boolean     not null default true,
  sort_order       integer     not null default 100,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

alter table public.products add column if not exists billing_period   text        not null default 'monthly';
alter table public.products add column if not exists name             text        not null default '';
alter table public.products add column if not exists price_cents      integer     not null default 0;
alter table public.products add column if not exists dodo_product_id  text;
alter table public.products add column if not exists is_active        boolean     not null default true;
alter table public.products add column if not exists sort_order       integer     not null default 100;
alter table public.products add column if not exists created_at       timestamptz not null default now();
alter table public.products add column if not exists updated_at       timestamptz not null default now();

-- Backfill the period for any row created before the column existed.
update public.products
   set billing_period = 'monthly'
 where billing_period is null or billing_period not in ('monthly', 'yearly');

insert into public.products
  (id, plan_id, billing_period, name, price_cents, sort_order)
values
  ('basic_monthly', 'basic', 'monthly', 'Basic - monthly',  399, 10),
  ('basic_yearly',  'basic', 'yearly',  'Basic - yearly',  3599, 11),
  ('pro_monthly',   'pro',   'monthly', 'Pro - monthly',    999, 20),
  ('pro_yearly',    'pro',   'yearly',  'Pro - yearly',   9799, 21)
on conflict (id) do update
  set name           = excluded.name,
      price_cents    = excluded.price_cents,
      billing_period = excluded.billing_period,
      plan_id        = excluded.plan_id,
      sort_order     = excluded.sort_order;

-- ===========================================================================
-- 3. set_updated_at
-- ===========================================================================

create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql set search_path = public, pg_temp;

-- ===========================================================================
-- 4. PROFILES
-- ===========================================================================

create table if not exists public.profiles (
  id                uuid primary key references auth.users (id) on delete cascade,
  plan_id           text        not null default 'free' references public.plans (id),
  dodo_customer_id  text,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

alter table public.profiles add column if not exists dodo_customer_id text;
alter table public.profiles add column if not exists plan_id          text        not null default 'free';
alter table public.profiles add column if not exists created_at       timestamptz not null default now();
alter table public.profiles add column if not exists updated_at       timestamptz not null default now();

create unique index if not exists idx_profiles_dodo_customer
  on public.profiles (dodo_customer_id) where dodo_customer_id is not null;

-- Backfill any existing auth users who lack a profile row
insert into public.profiles (id, plan_id)
select id, 'free' from auth.users
on conflict (id) do nothing;

-- ===========================================================================
-- 5. SITES
-- ===========================================================================

create table if not exists public.sites (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references public.profiles (id) on delete cascade,
  slug            text not null unique,
  custom_domain   text unique,
  status          text not null default 'draft',
  content         jsonb not null default '{}'::jsonb,
  theme           text not null default 'v1',
  template_id     text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  published_at    timestamptz
);

alter table public.sites add column if not exists custom_domain text;
alter table public.sites add column if not exists status        text        not null default 'draft';
alter table public.sites add column if not exists content       jsonb       not null default '{}'::jsonb;
alter table public.sites add column if not exists theme         text        not null default 'v1';
alter table public.sites add column if not exists template_id   text;
alter table public.sites add column if not exists created_at    timestamptz not null default now();
alter table public.sites add column if not exists updated_at    timestamptz not null default now();
alter table public.sites add column if not exists published_at  timestamptz;
alter table public.sites add column if not exists ai_discovery_enabled         boolean not null default false;
alter table public.sites add column if not exists ai_search_crawling_enabled   boolean not null default true;
alter table public.sites add column if not exists ai_training_crawling_enabled boolean not null default false;
alter table public.sites add column if not exists llms_txt_enabled             boolean not null default false;
alter table public.sites add column if not exists ai_category                  text;
alter table public.sites add column if not exists ai_target_audience           text;
alter table public.sites add column if not exists ai_summary                   text;
alter table public.sites add column if not exists ai_score                     integer default null;
alter table public.sites add column if not exists ai_last_scan                 timestamptz default null;
alter table public.sites add column if not exists ai_check_results             jsonb not null default '{}'::jsonb;

create index if not exists idx_sites_user_id     on public.sites (user_id);
create index if not exists idx_sites_user_created on public.sites (user_id, created_at desc);
create index if not exists idx_sites_published   on public.sites (status) where status = 'published';
create index if not exists idx_sites_ai_discovery on public.sites (ai_discovery_enabled) where ai_discovery_enabled = true;

-- ===========================================================================
-- 6. SUBSCRIPTIONS
-- ===========================================================================

create table if not exists public.subscriptions (
  id                     uuid primary key default gen_random_uuid(),
  user_id                uuid not null references public.profiles (id) on delete cascade,
  dodo_subscription_id   text not null unique,
  plan_id                text not null references public.plans (id),
  product_id             text references public.products (id),
  status                 text not null default 'active',
  current_period_end     timestamptz,
  cancel_at_period_end   boolean not null default false,
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now()
);

alter table public.subscriptions add column if not exists product_id           text;
alter table public.subscriptions add column if not exists status               text        not null default 'active';
alter table public.subscriptions add column if not exists current_period_end   timestamptz;
alter table public.subscriptions add column if not exists cancel_at_period_end boolean     not null default false;
alter table public.subscriptions add column if not exists created_at           timestamptz not null default now();
alter table public.subscriptions add column if not exists updated_at           timestamptz not null default now();

-- Backfill: a row predating product_id was bought on the monthly SKU.
update public.subscriptions s
   set product_id = s.plan_id || '_monthly'
 where s.product_id is null
   and exists (select 1 from public.products p
                where p.id = s.plan_id || '_monthly');

create index if not exists idx_subscriptions_user  on public.subscriptions (user_id);
create index if not exists idx_subscriptions_status on public.subscriptions (status);
create index if not exists idx_subscriptions_expiring
  on public.subscriptions (current_period_end)
  where status = 'cancelled' and cancel_at_period_end = false;

-- ===========================================================================
-- 7. ANALYTICS EVENTS
-- ===========================================================================

create table if not exists public.analytics_events (
  id         uuid primary key default gen_random_uuid(),
  site_id    uuid not null references public.sites (id) on delete cascade,
  event_type text not null,
  meta       jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.analytics_events add column if not exists meta       jsonb       not null default '{}'::jsonb;
alter table public.analytics_events add column if not exists created_at timestamptz not null default now();

create index if not exists idx_analytics_site_created
  on public.analytics_events (site_id, created_at desc);
create index if not exists idx_analytics_site_type_created
  on public.analytics_events (site_id, event_type, created_at desc);

-- ===========================================================================
-- 8. DOMAIN VERIFICATIONS
-- ===========================================================================

create table if not exists public.domain_verifications (
  id                      uuid primary key default gen_random_uuid(),
  site_id                 uuid not null references public.sites (id) on delete cascade,
  cloudflare_hostname_id  text,
  ownership_verification  jsonb,
  ssl_status              text not null default 'pending',
  status                  text not null default 'pending_dns',
  checked_at              timestamptz,
  created_at              timestamptz not null default now()
);

alter table public.domain_verifications add column if not exists cloudflare_hostname_id text;
alter table public.domain_verifications add column if not exists ownership_verification jsonb;
alter table public.domain_verifications add column if not exists ssl_status             text not null default 'pending';
alter table public.domain_verifications add column if not exists status                 text not null default 'pending_dns';
alter table public.domain_verifications add column if not exists checked_at             timestamptz;
alter table public.domain_verifications add column if not exists created_at             timestamptz not null default now();

create unique index if not exists idx_domain_verifications_site
  on public.domain_verifications (site_id);

-- ===========================================================================
-- 9. BILLING SUPPORT TABLES
-- ===========================================================================

create table if not exists public.checkout_intents (
  id                        uuid primary key default gen_random_uuid(),
  user_id                   uuid not null references public.profiles (id) on delete cascade,
  product_id                text not null references public.products (id),
  plan_id                   text not null references public.plans (id),
  dodo_checkout_session_id  text unique,
  dodo_subscription_id      text,
  status                    text not null default 'pending',
  created_at                timestamptz not null default now()
);

alter table public.checkout_intents add column if not exists product_id               text;
alter table public.checkout_intents add column if not exists plan_id                  text;
alter table public.checkout_intents add column if not exists dodo_checkout_session_id text;
alter table public.checkout_intents add column if not exists dodo_subscription_id     text;
alter table public.checkout_intents add column if not exists status                  text not null default 'pending';
alter table public.checkout_intents add column if not exists created_at               timestamptz not null default now();

update public.checkout_intents ci
   set product_id = ci.plan_id || '_monthly'
 where ci.product_id is null
   and exists (select 1 from public.products p where p.id = ci.plan_id || '_monthly');

update public.checkout_intents ci
   set plan_id = p.plan_id
  from public.products p
 where ci.product_id = p.id
   and ci.plan_id is null;

create index if not exists idx_checkout_intents_user on public.checkout_intents (user_id, created_at desc);
create index if not exists idx_checkout_intents_sub  on public.checkout_intents (dodo_subscription_id)
  where dodo_subscription_id is not null;

create table if not exists public.webhook_events (
  id          bigserial primary key,
  event_type  text not null,
  payload     jsonb not null default '{}'::jsonb,
  processed   boolean not null default false,
  note        text,
  received_at timestamptz not null default now()
);

alter table public.webhook_events add column if not exists payload     jsonb       not null default '{}'::jsonb;
alter table public.webhook_events add column if not exists processed   boolean     not null default false;
alter table public.webhook_events add column if not exists note        text;
alter table public.webhook_events add column if not exists received_at timestamptz not null default now();

create index if not exists idx_webhook_events_type_received
  on public.webhook_events (event_type, received_at desc);

create table if not exists public.audit_log (
  id          bigserial primary key,
  actor_id    uuid references public.profiles (id) on delete set null,
  action      text not null,
  entity_type text not null,
  entity_id   text,
  details     jsonb not null default '{}'::jsonb,
  created_at  timestamptz not null default now()
);

alter table public.audit_log add column if not exists actor_id    uuid;
alter table public.audit_log add column if not exists action      text;
alter table public.audit_log add column if not exists entity_type text;
alter table public.audit_log add column if not exists entity_id   text;
alter table public.audit_log add column if not exists details     jsonb       not null default '{}'::jsonb;
alter table public.audit_log add column if not exists created_at  timestamptz not null default now();

create index if not exists idx_audit_log_actor  on public.audit_log (actor_id, created_at desc);
create index if not exists idx_audit_log_entity on public.audit_log (entity_type, entity_id, created_at desc);

-- ===========================================================================
-- 10. TEMPLATES
-- ===========================================================================

create table if not exists public.templates (
  id                 text primary key,
  name               text not null,
  tagline            text not null default '',
  category           text not null default 'general',
  content            jsonb not null,
  preview_image_url  text,
  is_active          boolean not null default true,
  sort_order         integer not null default 100,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

alter table public.templates add column if not exists tagline           text        not null default '';
alter table public.templates add column if not exists category          text        not null default 'general';
alter table public.templates add column if not exists preview_image_url text;
alter table public.templates add column if not exists is_active         boolean     not null default true;
alter table public.templates add column if not exists sort_order        integer     not null default 100;
alter table public.templates add column if not exists created_at        timestamptz not null default now();
alter table public.templates add column if not exists updated_at        timestamptz not null default now();

create index if not exists idx_templates_active on public.templates (is_active, sort_order);

-- Now that templates exists, make the column a real foreign key.
do $$
begin
  if not exists (
    select 1
      from pg_constraint c
      join pg_attribute a
        on a.attrelid = c.conrelid and a.attnum = any (c.conkey)
     where c.contype = 'f'
       and c.conrelid = 'public.sites'::regclass
       and c.confrelid = 'public.templates'::regclass
       and a.attname = 'template_id'
  ) then
    alter table public.sites
      add constraint sites_template_id_fkey
      foreign key (template_id) references public.templates (id) on delete set null;
  end if;
end $$;

-- ===========================================================================
-- 11. DAILY TELEMETRY
-- ===========================================================================

create table if not exists public.telemetry_daily (
  site_id        uuid not null references public.sites (id) on delete cascade,
  day            date not null,
  page_views     integer not null default 0,
  button_clicks  integer not null default 0,
  mobile         integer not null default 0,
  tablet         integer not null default 0,
  desktop        integer not null default 0,
  referrers      jsonb not null default '{}'::jsonb,
  primary key (site_id, day)
);

alter table public.telemetry_daily add column if not exists page_views    integer not null default 0;
alter table public.telemetry_daily add column if not exists button_clicks integer not null default 0;
alter table public.telemetry_daily add column if not exists mobile        integer not null default 0;
alter table public.telemetry_daily add column if not exists tablet        integer not null default 0;
alter table public.telemetry_daily add column if not exists desktop       integer not null default 0;
alter table public.telemetry_daily add column if not exists referrers     jsonb   not null default '{}'::jsonb;

-- ===========================================================================
-- 12. DATA MIGRATION
--
-- Done BEFORE the new CHECK constraints, because the old status vocabularies
-- contain values the new constraints do not allow. Adding a constraint that
-- existing rows violate fails the whole transaction.
-- ===========================================================================

-- domain_verifications: 'pending' -> 'pending_dns', 'verified' -> 'active'.
update public.domain_verifications
   set status = case status
                  when 'pending'  then 'pending_dns'
                  when 'verified' then 'active'
                  else status
                end
 where status in ('pending', 'verified');

-- The old schema recorded 'pending_validation' for ssl_status, which is not a
-- value the new one allows.
update public.domain_verifications
   set ssl_status = 'pending'
 where ssl_status = 'pending_validation';

-- A site can only be published if it is published. Anything unrecognised
-- becomes a draft, which is the safe direction.
update public.sites set status = 'draft'
 where status is null or status not in ('draft', 'published');

update public.subscriptions set status = 'expired'
 where status is null or status not in (
   'active','trialing','cancelled','expired','on_hold','paused','past_due','failed'
 );

update public.analytics_events set event_type = 'page_view'
 where event_type is null or event_type not in ('page_view', 'button_click');

update public.checkout_intents set status = 'pending'
 where status is null or status not in ('pending','completed','expired','failed');

update public.profiles set plan_id = 'free'
 where plan_id is null or plan_id not in ('free','basic','pro');

-- The old CHECK allowed site_limit to be 0, which made the dashboard usage
-- bar divide by zero.
update public.plans set site_limit = 1 where site_limit is null or site_limit < 1;

-- ===========================================================================
-- 13. CONSTRAINTS
--
-- Each is guarded so re-running is a no-op. Dropped first because an existing
-- constraint with the same name but different semantics blocks the new one.
-- ===========================================================================

do $$
begin
  -- plans
  if not exists (select 1 from pg_constraint where conname='plans_id_check'
                 and conrelid='public.plans'::regclass) then
    alter table public.plans add constraint plans_id_check
      check (id in ('free','basic','pro'));
  end if;
  if not exists (select 1 from pg_constraint where conname='plans_site_limit_check'
                 and conrelid='public.plans'::regclass) then
    alter table public.plans add constraint plans_site_limit_check
      check (site_limit > 0);
  end if;

  -- products
  if not exists (select 1 from pg_constraint where conname='products_period_check'
                 and conrelid='public.products'::regclass) then
    alter table public.products add constraint products_period_check
      check (billing_period in ('monthly','yearly'));
  end if;
  if not exists (select 1 from pg_constraint where conname='products_price_check'
                 and conrelid='public.products'::regclass) then
    alter table public.products add constraint products_price_check
      check (price_cents >= 0);
  end if;
  -- Foreign keys are guarded by the column pair they cover, NOT by constraint
  -- name. `create table ... plan_id text references public.plans (id)` already
  -- creates a constraint named products_plan_id_fkey, so a guard keyed on the
  -- name products_plan_fkey never matched it and this block appended a SECOND
  -- constraint for the same column. PostgREST then refuses to embed `plans`
  -- ("more than one relationship was found"). See also the sites block below.
  if not exists (
    select 1
      from pg_constraint c
      join pg_attribute a
        on a.attrelid = c.conrelid and a.attnum = any (c.conkey)
     where c.contype = 'f'
       and c.conrelid = 'public.products'::regclass
       and c.confrelid = 'public.plans'::regclass
       and a.attname = 'plan_id'
  ) then
    alter table public.products add constraint products_plan_fkey
      foreign key (plan_id) references public.plans (id);
  end if;

  create unique index if not exists idx_products_dodo_id
    on public.products (dodo_product_id) where dodo_product_id is not null;

  -- sites
  if not exists (select 1 from pg_constraint where conname='sites_status_check'
                 and conrelid='public.sites'::regclass) then
    alter table public.sites add constraint sites_status_check
      check (status in ('draft','published'));
  end if;
  if not exists (select 1 from pg_constraint where conname='sites_slug_format_check'
                 and conrelid='public.sites'::regclass) then
    -- The slug becomes a DNS hostname.
    alter table public.sites add constraint sites_slug_format_check
      check (slug ~ '^[a-z0-9](?:[a-z0-9-]{0,46}[a-z0-9])?$');
  end if;
  if not exists (select 1 from pg_constraint where conname='sites_content_size_check'
                 and conrelid='public.sites'::regclass) then
    alter table public.sites add constraint sites_content_size_check
      check (pg_column_size(content) <= 262144);
  end if;
  -- Guarded by column pair, not by name: the inline
  -- `user_id uuid references public.profiles (id)` in the create table above
  -- already produced sites_user_id_fkey, and this block used to add a second
  -- constraint (sites_user_fkey) for the same column. PostgREST then rejected
  -- every `profiles` embed with PGRST201 ("more than one relationship was found
  -- for 'sites' and 'profiles'"), which is what made published landing pages
  -- render as "Page Not Found".
  if not exists (
    select 1
      from pg_constraint c
      join pg_attribute a
        on a.attrelid = c.conrelid and a.attnum = any (c.conkey)
     where c.contype = 'f'
       and c.conrelid = 'public.sites'::regclass
       and c.confrelid = 'public.profiles'::regclass
       and a.attname = 'user_id'
  ) then
    alter table public.sites add constraint sites_user_fkey
      foreign key (user_id) references public.profiles (id) on delete cascade;
  end if;

  -- subscriptions
  if not exists (select 1 from pg_constraint where conname='subscriptions_status_check'
                 and conrelid='public.subscriptions'::regclass) then
    alter table public.subscriptions add constraint subscriptions_status_check
      check (status in ('active','trialing','cancelled','expired','on_hold','paused','past_due','failed'));
  end if;

  -- analytics_events
  if not exists (select 1 from pg_constraint where conname='analytics_events_type_check'
                 and conrelid='public.analytics_events'::regclass) then
    alter table public.analytics_events add constraint analytics_events_type_check
      check (event_type in ('page_view','button_click'));
  end if;

  -- domain_verifications
  if not exists (select 1 from pg_constraint where conname='domain_verifications_site_id_key'
                 and conrelid='public.domain_verifications'::regclass) then
    alter table public.domain_verifications add constraint domain_verifications_site_id_key
      unique (site_id);
  end if;
  if not exists (select 1 from pg_constraint where conname='domain_verifications_status_check'
                 and conrelid='public.domain_verifications'::regclass) then
    alter table public.domain_verifications add constraint domain_verifications_status_check
      check (status in ('pending_dns','pending_validation','active','failed'));
  end if;
  if not exists (select 1 from pg_constraint where conname='domain_verifications_ssl_status_check'
                 and conrelid='public.domain_verifications'::regclass) then
    alter table public.domain_verifications add constraint domain_verifications_ssl_status_check
      check (ssl_status in ('pending','issuing','active','failed'));
  end if;

  -- checkout_intents
  if not exists (select 1 from pg_constraint where conname='checkout_intents_status_check'
                 and conrelid='public.checkout_intents'::regclass) then
    alter table public.checkout_intents add constraint checkout_intents_status_check
      check (status in ('pending','completed','expired','failed'));
  end if;

  -- templates
  if not exists (select 1 from pg_constraint where conname='templates_category_check'
                 and conrelid='public.templates'::regclass) then
    alter table public.templates add constraint templates_category_check
      check (category in ('general','productivity','developer','social','finance','health','gaming','saas'));
  end if;
  if not exists (select 1 from pg_constraint where conname='templates_content_size_check'
                 and conrelid='public.templates'::regclass) then
    alter table public.templates add constraint templates_content_size_check
      check (pg_column_size(content) <= 262144);
  end if;
end $$;

-- THE CONSTRAINT THAT WAS MISSING ORIGINALLY.
--
-- POST /api/domains performs an upsert with { onConflict: "site_id" }. Without
-- a unique constraint Postgres rejects it with error 42P10 on every single
-- call, and because the error was never checked the API still returned
-- success. Every customer has so far "connected" a domain that was never
-- actually recorded.
create unique index if not exists idx_domain_verifications_site
  on public.domain_verifications (site_id);

-- ===========================================================================
-- 14. TRIGGERS
-- ===========================================================================

drop trigger if exists trg_plans_updated_at on public.plans;
create trigger trg_plans_updated_at
  before update on public.plans
  for each row execute function public.set_updated_at();

drop trigger if exists trg_products_updated_at on public.products;
create trigger trg_products_updated_at
  before update on public.products
  for each row execute function public.set_updated_at();

drop trigger if exists trg_profiles_updated_at on public.profiles;
create trigger trg_profiles_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

drop trigger if exists trg_sites_updated_at on public.sites;
create trigger trg_sites_updated_at
  before update on public.sites
  for each row execute function public.set_updated_at();

drop trigger if exists trg_subscriptions_updated_at on public.subscriptions;
create trigger trg_subscriptions_updated_at
  before update on public.subscriptions
  for each row execute function public.set_updated_at();

drop trigger if exists trg_templates_updated_at on public.templates;
create trigger trg_templates_updated_at
  before update on public.templates
  for each row execute function public.set_updated_at();

-- --- Site limit, enforced in the database -----------------------------------
-- The check in POST /api/sites is advisory only. The anon key ships to the
-- browser, and the sites INSERT policy let a user call PostgREST directly to
-- create unlimited sites and set status='published' without ever opening the
-- editor. Application checks cannot prevent that.
create or replace function public.enforce_site_limit()
returns trigger as $$
declare
  v_limit integer;
  v_count integer;
begin
  select pl.site_limit into v_limit
  from public.profiles pr
  join public.plans pl on pl.id = pr.plan_id
  where pr.id = new.user_id;

  -- No profile yet (possible mid-signup): let the row through, the API rejects.
  if v_limit is null then
    return new;
  end if;

  select count(*) into v_count from public.sites s where s.user_id = new.user_id;

  if v_count >= v_limit then
    raise exception 'Site limit reached. Upgrade your plan to create more landing pages.'
      using errcode = 'check_violation';
  end if;

  return new;
end;
$$ language plpgsql security definer set search_path = public, pg_temp;

drop trigger if exists trg_enforce_site_limit on public.sites;
create trigger trg_enforce_site_limit
  before insert on public.sites
  for each row execute function public.enforce_site_limit();

-- --- Reserved slugs ---------------------------------------------------------
-- Otherwise a user could claim `api`, `dashboard` or `admin` and take over the
-- matching subdomain, since *.ROOT points at the app.
create or replace function public.reject_reserved_slug()
returns trigger as $$
begin
  if new.slug = any (array[
    'api','auth','admin','dashboard','login','signup','site','www','app',
    'static','assets','cdn','mail','ftp','support','help','docs','blog',
    'status','root','billing','account','settings','about','legal','privacy',
    'terms','cname','preview','staging','test','dev','ns1','ns2','mx','smtp',
    'imap','webmail','autodiscover','_domainkey'
  ]) then
    raise exception 'That address is reserved. Please choose another.'
      using errcode = 'check_violation';
  end if;

  if new.slug ilike '%shipsprint%' then
    raise exception 'That address is reserved. Please choose another.'
      using errcode = 'check_violation';
  end if;

  return new;
end;
$$ language plpgsql set search_path = public, pg_temp;

drop trigger if exists trg_reject_reserved_slug on public.sites;
create trigger trg_reject_reserved_slug
  before insert or update of slug on public.sites
  for each row execute function public.reject_reserved_slug();

-- --- Profile creation on signup --------------------------------------------
-- SECURITY DEFINER without a pinned search_path can be hijacked by anyone who
-- can create an object in a schema on the path.
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, plan_id)
  values (new.id, 'free')
  on conflict (id) do nothing;
  return new;
end;
$$ language plpgsql security definer set search_path = public, pg_temp;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ===========================================================================
-- 15. ANALYTICS AGGREGATION
--
-- The dashboard used to fetch up to 1000 raw events and aggregate them in a
-- React useMemo: metrics were silently wrong past the cap, and the whole event
-- set was serialised into the RSC payload. These views group in Postgres.
-- ===========================================================================

create or replace view public.site_analytics_summary
with (security_invoker = true) as
select
  ev.site_id,
  -- UTC day. The client previously bucketed with local-time Dates converted
  -- through toISOString(), skewing days by up to 14 hours.
  (ev.created_at at time zone 'utc')::date as day,
  count(*) filter (where ev.event_type = 'page_view')   as page_views,
  count(*) filter (where ev.event_type = 'button_click') as button_clicks,
  count(*) filter (where ev.event_type = 'page_view' and ev.meta->>'device' = 'mobile')  as mobile,
  count(*) filter (where ev.event_type = 'page_view' and ev.meta->>'device' = 'tablet')  as tablet,
  count(*) filter (where ev.event_type = 'page_view' and ev.meta->>'device' = 'desktop') as desktop
from public.analytics_events ev
group by ev.site_id, (ev.created_at at time zone 'utc')::date;

-- Scoped to page_view deliberately. The dashboard previously grouped referrers
-- across ALL events, but only page_view carries a referrer, so every
-- button_click was bucketed as "Direct" and the panel overstated direct
-- traffic.
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
    site_id,
    day,
    button_type,
    case
      -- 1. An explicit store in the button type is authoritative.
      when lower(button_type) ~ '(app_store|ios|apple)' then 'apple'
      when lower(button_type) ~ '(play_store|android|google)' then 'google'
      -- 2. Legacy store-agnostic types ('nav_download') still carry the store
      --    in the destination they opened. Comparing the hostname rather than
      --    the whole URL keeps a lookalike such as
      --    'https://apps.apple.com.evil.example/' out of the Apple total.
      when target_host in ('apps.apple.com', 'itunes.apple.com') then 'apple'
      when target_host in ('play.google.com', 'market.android.com') then 'google'
      -- 3. Anything else is not a store click.
      else 'other'
    end as store
  from (
    select
      ev.site_id,
      (ev.created_at at time zone 'utc')::date as day,
      coalesce(nullif(ev.meta->>'button_type', ''), 'unknown') as button_type,
      -- scheme, then path, then port, leaving the bare hostname
      split_part(
        split_part(
          split_part(lower(coalesce(ev.meta->>'target_url', '')), '://', 2),
          '/', 1
        ),
        ':', 1
      ) as target_host
    from public.analytics_events ev
    where ev.event_type = 'button_click'
  ) with_target
) classified
group by site_id, day, button_type, store;

create or replace function public.rollup_telemetry(p_days integer default 3)
returns integer as $$
declare
  v_rows integer;
begin
  with sources_agg as (
    select
      site_id,
      day,
      jsonb_object_agg(source, views) as referrers
    from public.site_analytics_sources
    where day >= (current_date - p_days)
      and source is not null
    group by site_id, day
  )
  insert into public.telemetry_daily
    (site_id, day, page_views, button_clicks, mobile, tablet, desktop, referrers)
  select
    s.site_id,
    s.day,
    s.page_views,
    s.button_clicks,
    s.mobile,
    s.tablet,
    s.desktop,
    coalesce(sa.referrers, '{}'::jsonb)
  from public.site_analytics_summary s
  left join sources_agg sa
    on sa.site_id = s.site_id and sa.day = s.day
  where s.day >= (current_date - p_days)
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

-- Anonymous platform-wide metrics for marketing social proof
create or replace function public.get_platform_metrics()
returns jsonb as $$
declare
  v_published_sites integer;
  v_active_templates integer;
  v_total_clicks bigint;
begin
  select count(*) into v_published_sites 
  from public.sites 
  where status = 'published';

  select count(*) into v_active_templates 
  from public.templates 
  where is_active = true;

  select coalesce(sum(button_clicks), 0) into v_total_clicks 
  from public.telemetry_daily;

  return jsonb_build_object(
    'published_sites', v_published_sites,
    'active_templates', v_active_templates,
    'total_clicks', v_total_clicks
  );
end;
$$ language plpgsql security definer set search_path = public, pg_temp;

-- ===========================================================================
-- 16. ROW LEVEL SECURITY
--
-- (select auth.uid()) rather than auth.uid() lets the planner evaluate the JWT
-- claim once per statement instead of once per row.
-- ===========================================================================

do $$
declare
  t text;
begin
  foreach t in array array[
    'plans','products','profiles','sites','subscriptions','analytics_events',
    'domain_verifications','checkout_intents','webhook_events','audit_log',
    'templates','telemetry_daily'
  ] loop
    execute format('alter table public.%I enable row level security', t);
  end loop;
end $$;

-- Schema usage
grant usage on schema public to anon, authenticated, service_role;

-- Plans
drop policy if exists "Plans are viewable by everyone" on public.plans;
create policy "Plans are viewable by everyone" on public.plans
  for select using (true);
revoke insert, update, delete on public.plans from anon, authenticated;
grant select on public.plans to anon, authenticated;

-- Products
drop policy if exists "Products are viewable by everyone" on public.products;
create policy "Products are viewable by everyone" on public.products
  for select using (is_active);
revoke insert, update, delete on public.products from anon, authenticated;
grant select on public.products to anon, authenticated;

-- Templates
-- The template gallery renders before signup, so templates are anon-readable.
drop policy if exists "Templates are viewable by everyone" on public.templates;
create policy "Templates are viewable by everyone" on public.templates
  for select using (is_active);
revoke insert, update, delete on public.templates from anon, authenticated;
grant select on public.templates to anon, authenticated;

-- Profiles
drop policy if exists "Users can view own profile" on public.profiles;
create policy "Users can view own profile" on public.profiles
  for select using ((select auth.uid()) = id);

drop policy if exists "Users can update own profile" on public.profiles;
create policy "Users can update own profile" on public.profiles
  for update using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

revoke insert, delete on public.profiles from anon, authenticated;
grant select, update on public.profiles to authenticated;

-- Sites
drop policy if exists "Users can view own sites" on public.sites;
create policy "Users can view own sites" on public.sites
  for select using ((select auth.uid()) = user_id);

-- Permissive policies OR together, so this also matches the public policy.
-- Intentional: an owner sees drafts, the world sees published pages.
drop policy if exists "Public can view published sites" on public.sites;
create policy "Public can view published sites" on public.sites
  for select using (status = 'published');

drop policy if exists "Users can create own sites" on public.sites;
create policy "Users can create own sites" on public.sites
  for insert with check ((select auth.uid()) = user_id);

drop policy if exists "Users can update own sites" on public.sites;
create policy "Users can update own sites" on public.sites
  for update using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "Users can delete own sites" on public.sites;
create policy "Users can delete own sites" on public.sites
  for delete using ((select auth.uid()) = user_id);

grant select on public.sites to anon;
grant select, insert, update, delete on public.sites to authenticated;

-- Subscriptions
drop policy if exists "Users can view own subscriptions" on public.subscriptions;
create policy "Users can view own subscriptions" on public.subscriptions
  for select using ((select auth.uid()) = user_id);

-- No INSERT policy: entitlements change only via the service role, after a
-- verified webhook.
revoke insert, update, delete on public.subscriptions from anon, authenticated;
grant select on public.subscriptions to authenticated;

-- Checkout Intents
drop policy if exists "Users can view own checkout intents" on public.checkout_intents;
create policy "Users can view own checkout intents" on public.checkout_intents
  for select using ((select auth.uid()) = user_id);

revoke insert, update, delete on public.checkout_intents from anon, authenticated;
grant select on public.checkout_intents to authenticated;

-- Analytics Events
drop policy if exists "Users can view analytics for their sites" on public.analytics_events;
create policy "Users can view analytics for their sites" on public.analytics_events
  for select using (exists (
    select 1 from public.sites
    where sites.id = analytics_events.site_id
      and sites.user_id = (select auth.uid())
  ));

revoke insert, update, delete on public.analytics_events from anon, authenticated;
grant select on public.analytics_events to authenticated;

-- Domain Verifications
-- Read-only for the owner. Verification rows are written by the service role
-- after a real DNS check. The original policy was FOR ALL with no WITH CHECK,
-- which let a user fabricate a row and bypass the Pro plan gate.
drop policy if exists "Users can view domain verifications" on public.domain_verifications;
create policy "Users can view domain verifications" on public.domain_verifications
  for select using (exists (
    select 1 from public.sites
    where sites.id = domain_verifications.site_id
      and sites.user_id = (select auth.uid())
  ));

revoke insert, update, delete on public.domain_verifications from anon, authenticated;
grant select on public.domain_verifications to authenticated;

-- Telemetry Daily
drop policy if exists "Users can view own telemetry" on public.telemetry_daily;
create policy "Users can view own telemetry" on public.telemetry_daily
  for select using (exists (
    select 1 from public.sites
    where sites.id = telemetry_daily.site_id
      and sites.user_id = (select auth.uid())
  ));

revoke insert, update, delete on public.telemetry_daily from anon, authenticated;
grant select on public.telemetry_daily to authenticated;

-- Internal tables
revoke all on public.webhook_events, public.audit_log from anon, authenticated;

-- Views permissions
grant select on public.site_analytics_summary, public.site_analytics_sources, public.site_analytics_cta to authenticated;
grant execute on function public.get_platform_metrics() to anon, authenticated;

-- service_role bypasses RLS, which the webhook, the public renderer and the
-- analytics beacon rely on.
grant usage on all sequences in schema public to authenticated;
grant all on all tables in schema public to service_role;
grant all on all sequences in schema public to service_role;
grant all on all routines in schema public to service_role;
grant usage on schema public to service_role;
alter default privileges in schema public grant all on tables to service_role;
alter default privileges in schema public grant all on sequences to service_role;
alter default privileges in schema public grant all on routines to service_role;

commit;

-- ===========================================================================
-- 17. LINK YOUR DODO PRODUCTS
--
-- Run AFTER the block above, and after creating the four products in the Dodo
-- dashboard. Dodo -> Products -> click one -> the id looks like pdt_8fKq2mNpQ4rT7vXw
--
--   basic_monthly  ->  Basic $3.99 / month
--   basic_yearly   ->  Basic $35.99 / year
--   pro_monthly    ->  Pro   $9.99 / month
--   pro_yearly     ->  Pro   $97.99 / year
--
-- Left NULL in the seed on purpose: a product with no id fails loudly at
-- checkout ("That plan is not available right now") rather than silently
-- charging a stale or wrong amount.
-- ===========================================================================

-- update public.products set dodo_product_id = 'pdt_XXXX' where id = 'basic_monthly';
-- update public.products set dodo_product_id = 'pdt_XXXX' where id = 'basic_yearly';
-- update public.products set dodo_product_id = 'pdt_XXXX' where id = 'pro_monthly';
-- update public.products set dodo_product_id = 'pdt_XXXX' where id = 'pro_yearly';

-- ===========================================================================
-- 18. VERIFY
-- ===========================================================================

select 'plans'    as object, count(*) as rows from public.plans
union all select 'products',         count(*) from public.products
union all select 'templates',        count(*) from public.templates
union all select 'profiles',         count(*) from public.profiles
union all select 'sites',            count(*) from public.sites
union all select 'analytics views',  count(*) from information_schema.views
  where table_schema = 'public' and table_name like 'site_analytics%';

-- Expected: plans 3, products 4, analytics views 3.
select id, plan_id, billing_period, price_cents, dodo_product_id
from public.products order by sort_order;
