-- ===========================================================================
-- ShipSprint — Consolidated Production-Ready Schema (CONVERGENT & IDEMPOTENT)
--
-- File: production.sql
-- Destination: Supabase Dashboard -> SQL Editor -> New Query -> Paste -> Run
--
-- Features:
--   - Convergent: Safe to run on brand-new OR existing Supabase databases
--   - Transactional: Enclosed in BEGIN ... COMMIT (rolls back on any error)
--   - Hardened: Pinned search_paths, RLS on all 12 tables, strict CHECK constraints
--   - Multi-tier billing: Plans (tiers) separated from Products (monthly/yearly SKUs)
--   - Production telemetry: Pre-aggregated SQL views with security_invoker
-- ===========================================================================

begin;

-- ===========================================================================
-- 1. PLANS — The Entitlement Tiers (free, basic, pro)
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

-- Converge any existing table onto the full column set
alter table public.plans add column if not exists tagline                 text        not null default '';
alter table public.plans add column if not exists site_limit              integer     not null default 1;
alter table public.plans add column if not exists has_branding            boolean     not null default true;
alter table public.plans add column if not exists has_custom_domain       boolean     not null default false;
alter table public.plans add column if not exists has_analytics_dashboard boolean     not null default false;
alter table public.plans add column if not exists has_email_capture       boolean     not null default false;
alter table public.plans add column if not exists sort_order              integer     not null default 100;
alter table public.plans add column if not exists is_active               boolean     not null default true;
alter table public.plans add column if not exists created_at              timestamptz not null default now();
alter table public.plans add column if not exists updated_at              timestamptz not null default now();

-- Drop obsolete price_cents column from 001_initial_schema (pricing moved to public.products)
alter table public.plans drop column if exists price_cents cascade;

update public.plans set name = 'Free'  where id = 'free'  and (name is null or name = '');
update public.plans set name = 'Basic' where id = 'basic' and (name is null or name = '');
update public.plans set name = 'Pro'   where id = 'pro'   and (name is null or name = '');

insert into public.plans
  (id, name, tagline, site_limit, has_branding, has_custom_domain,
   has_analytics_dashboard, has_email_capture, sort_order)
values
  ('free',  'Free',  'One landing page to get started.',
   1,  true,  false, false, false, 10),
  ('basic', 'Basic', 'For a solo launch with a real domain.',
   3,  false, true,  false, true,  20),
  ('pro',   'Pro',   'Multiple apps with analytics.',
   10, false, true,  true,  true,  30)
on conflict (id) do update
  set name                    = excluded.name,
      tagline                 = excluded.tagline,
      site_limit              = excluded.site_limit,
      has_branding            = excluded.has_branding,
      has_custom_domain       = excluded.has_custom_domain,
      has_analytics_dashboard = excluded.has_analytics_dashboard,
      has_email_capture       = excluded.has_email_capture,
      sort_order              = excluded.sort_order;

-- ===========================================================================
-- 2. PRODUCTS — The Billed SKUs (Monthly and Yearly)
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

-- Backfill period for existing rows
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
-- 3. HELPER FUNCTIONS: set_updated_at
-- ===========================================================================

create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql set search_path = public, pg_temp;

-- ===========================================================================
-- 4. PROFILES — Extends auth.users
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

-- Backfill any existing auth users into public.profiles
insert into public.profiles (id, plan_id)
select id, 'free' from auth.users
on conflict (id) do nothing;

-- ===========================================================================
-- 5. SITES — Landing Pages
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

create index if not exists idx_sites_user_id     on public.sites (user_id);
create index if not exists idx_sites_user_created on public.sites (user_id, created_at desc);
create index if not exists idx_sites_published   on public.sites (status) where status = 'published';

-- ===========================================================================
-- 6. SUBSCRIPTIONS — Subscriptions from Dodo Payments
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

update public.subscriptions s
   set product_id = s.plan_id || '_monthly'
 where s.product_id is null
   and exists (select 1 from public.products p
                where p.id = s.plan_id || '_monthly');

create index if not exists idx_subscriptions_user    on public.subscriptions (user_id);
create index if not exists idx_subscriptions_status  on public.subscriptions (status);
create index if not exists idx_subscriptions_expiring
  on public.subscriptions (current_period_end)
  where status = 'cancelled' and cancel_at_period_end = false;

-- ===========================================================================
-- 7. ANALYTICS EVENTS — Telemetry
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
-- 8. DOMAIN VERIFICATIONS — Custom Domain DNS / TLS
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
-- 9. BILLING SUPPORT TABLES (Checkout Intents, Webhook Events, Audit Log)
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

do $$
begin
  if not exists (
    select 1 from pg_constraint
     where conname = 'sites_template_id_fkey' and conrelid = 'public.sites'::regclass
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
-- Executed BEFORE adding CHECK constraints to prevent historical value failures.
-- ===========================================================================

update public.domain_verifications
   set status = case status
                  when 'pending'  then 'pending_dns'
                  when 'verified' then 'active'
                  else status
                end
 where status in ('pending', 'verified');

update public.domain_verifications
   set ssl_status = 'pending'
 where ssl_status = 'pending_validation';

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

update public.plans set site_limit = 1 where site_limit is null or site_limit < 1;

-- ===========================================================================
-- 13. CONSTRAINTS
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
  if not exists (select 1 from pg_constraint where conname='products_plan_fkey'
                 and conrelid='public.products'::regclass) then
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
    alter table public.sites add constraint sites_slug_format_check
      check (slug ~ '^[a-z0-9](?:[a-z0-9-]{0,46}[a-z0-9])?$');
  end if;
  if not exists (select 1 from pg_constraint where conname='sites_content_size_check'
                 and conrelid='public.sites'::regclass) then
    alter table public.sites add constraint sites_content_size_check
      check (pg_column_size(content) <= 262144);
  end if;
  if not exists (select 1 from pg_constraint where conname='sites_user_fkey'
                 and conrelid='public.sites'::regclass) then
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

-- ===========================================================================
-- 14. TRIGGERS & BUSINESS LOGIC
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

-- Enforce the plan site limit in the database (joins profiles & plans)
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

  -- No profile yet (possible mid-signup): let the row through, API validates
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

-- Prevent claiming reserved subdomains
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

-- Profile creation on signup (safe and idempotent)
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
-- 15. ANALYTICS AGGREGATION & MAINTENANCE
-- ===========================================================================

create or replace view public.site_analytics_summary
with (security_invoker = true) as
select
  ev.site_id,
  (ev.created_at at time zone 'utc')::date as day,
  count(*) filter (where ev.event_type = 'page_view')   as page_views,
  count(*) filter (where ev.event_type = 'button_click') as button_clicks,
  count(*) filter (where ev.meta->>'device' = 'mobile')  as mobile,
  count(*) filter (where ev.meta->>'device' = 'tablet')  as tablet,
  count(*) filter (where ev.meta->>'device' = 'desktop') as desktop
from public.analytics_events ev
group by ev.site_id, (ev.created_at at time zone 'utc')::date;

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
      or ev.meta->>'referrer' = ''
      or ev.meta->>'referrer' = 'Direct'
      then 'Direct'
    else regexp_replace(regexp_replace(ev.meta->>'referrer', '^https?://(www\.)?', ''), '/.*$', '')
  end;

create or replace view public.site_analytics_cta
with (security_invoker = true) as
select
  ev.site_id,
  coalesce(nullif(ev.meta->>'button_type', ''), 'unknown') as button_type,
  count(*) as clicks
from public.analytics_events ev
where ev.event_type = 'button_click'
group by ev.site_id, coalesce(nullif(ev.meta->>'button_type', ''), 'unknown');

-- Daily rollup without Cartesian multiplication or null-key crashes
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
-- 16. ROW LEVEL SECURITY & PERMISSIONS
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

-- Internal tables (Service role only)
revoke all on public.webhook_events, public.audit_log from anon, authenticated;

-- Views permissions
grant select on public.site_analytics_summary, public.site_analytics_sources, public.site_analytics_cta to authenticated;
grant execute on function public.get_platform_metrics() to anon, authenticated;

-- Sequences & Service Role
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
-- 17. LINK YOUR DODO PRODUCTS (Uncomment with your live Dodo Product IDs)
--
-- Dodo Dashboard -> Products -> click product -> id looks like pdt_8fKq2mNpQ4rT7vXw
--
--   basic_monthly  ->  Basic $3.99 / month
--   basic_yearly   ->  Basic $35.99 / year
--   pro_monthly    ->  Pro   $9.99 / month
--   pro_yearly     ->  Pro   $97.99 / year
-- ===========================================================================

-- update public.products set dodo_product_id = 'pdt_XXXX' where id = 'basic_monthly';
-- update public.products set dodo_product_id = 'pdt_XXXX' where id = 'basic_yearly';
-- update public.products set dodo_product_id = 'pdt_XXXX' where id = 'pro_monthly';
-- update public.products set dodo_product_id = 'pdt_XXXX' where id = 'pro_yearly';

-- ===========================================================================
-- 18. VERIFY (Returns schema object counts and seeded products)
-- ===========================================================================

select 'plans'           as object, count(*) as rows from public.plans
union all select 'products',         count(*) from public.products
union all select 'templates',        count(*) from public.templates
union all select 'profiles',         count(*) from public.profiles
union all select 'sites',            count(*) from public.sites
union all select 'analytics views',  count(*) from information_schema.views
  where table_schema = 'public' and table_name like 'site_analytics%';

select id, plan_id, billing_period, price_cents, dodo_product_id
from public.products order by sort_order;
