-- ===========================================================================
-- 002_hardening
--
-- Fixes data-integrity and security defects found in the initial schema:
--   * domain_verifications had no unique constraint on site_id, so
--     `upsert(..., { onConflict: "site_id" })` failed with Postgres 42P10 on
--     every single custom-domain connection while the API reported success.
--   * sites / subscriptions / domain_verifications had no index on the
--     foreign keys that every dashboard, analytics and billing query filters on.
--   * status columns were free text, so a typo could permanently brick a site.
--   * the sites INSERT policy let any authenticated user bypass plan site
--     limits and self-publish by calling PostgREST directly with the anon key.
--   * handle_new_user() was SECURITY DEFINER without a pinned search_path.
-- ===========================================================================

begin;

-- --- 1. Unique constraint that makes the domain upsert work ---------------
alter table public.domain_verifications
  drop constraint if exists domain_verifications_site_id_key;
alter table public.domain_verifications
  add constraint domain_verifications_site_id_key unique (site_id);

alter table public.domain_verifications
  drop constraint if exists domain_verifications_status_check;
alter table public.domain_verifications
  add constraint domain_verifications_status_check
  check (status in ('pending_dns', 'pending_validation', 'active', 'failed'));

alter table public.domain_verifications
  drop constraint if exists domain_verifications_ssl_status_check;
alter table public.domain_verifications
  add constraint domain_verifications_ssl_status_check
  check (ssl_status in ('pending', 'issuing', 'active', 'failed'));

-- --- 2. Missing indexes on hot foreign keys --------------------------------
create index if not exists idx_sites_user_id on public.sites (user_id);
create index if not exists idx_sites_user_created on public.sites (user_id, created_at desc);
create index if not exists idx_subscriptions_user_id on public.subscriptions (user_id);
create index if not exists idx_subscriptions_status on public.subscriptions (status);
create index if not exists idx_subscriptions_period_end
  on public.subscriptions (current_period_end)
  where status = 'cancelled';
create index if not exists idx_analytics_event_type_created
  on public.analytics_events (site_id, event_type, created_at desc);

-- --- 3. Constrain free-text status columns --------------------------------
alter table public.sites
  drop constraint if exists sites_status_check;
alter table public.sites
  add constraint sites_status_check check (status in ('draft', 'published'));

alter table public.subscriptions
  drop constraint if exists subscriptions_status_check;
alter table public.subscriptions
  add constraint subscriptions_status_check
  check (status in ('active', 'cancelled', 'expired', 'on_hold', 'paused', 'past_due', 'failed'));

alter table public.plans
  drop constraint if exists plans_id_check;
alter table public.plans
  add constraint plans_id_check check (id in ('free', 'basic', 'pro'));

alter table public.profiles
  drop constraint if exists profiles_plan_id_check;
alter table public.profiles
  add constraint profiles_plan_id_check
  check (plan_id in ('free', 'basic', 'pro'));

-- `dodo_customer_id` had no unique constraint, so two profiles could share a
-- billing customer and the portal lookup would be ambiguous.
create unique index if not exists idx_profiles_dodo_customer
  on public.profiles (dodo_customer_id)
  where dodo_customer_id is not null;

-- --- 4. updated_at maintenance -------------------------------------------
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_sites_updated_at on public.sites;
create trigger trg_sites_updated_at
  before update on public.sites
  for each row execute function public.set_updated_at();

drop trigger if exists trg_subscriptions_updated_at on public.subscriptions;
create trigger trg_subscriptions_updated_at
  before update on public.subscriptions
  for each row execute function public.set_updated_at();

drop trigger if exists trg_profiles_updated_at on public.profiles;
create trigger trg_profiles_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- --- 5. Enforce the plan site limit in the database ------------------------
-- The quota check in /api/sites is advisory: the anon key ships to the
-- browser, and the sites INSERT policy below allowed a direct PostgREST call
-- to create unlimited sites and set status='published' without ever opening
-- the editor. Application-level checks cannot prevent this, so the limit is
-- enforced by a trigger on the table itself.
create or replace function public.enforce_site_limit()
returns trigger as $$
declare
  v_limit integer;
  v_count integer;
begin
  select p.site_limit into v_limit
  from public.profiles p
  where p.id = new.user_id;

  -- No profile yet (possible during signup): the API layer will catch this.
  if v_limit is null then
    return new;
  end if;

  select count(*) into v_count
  from public.sites s
  where s.user_id = new.user_id;

  if v_count >= v_limit then
    raise exception 'site limit reached for plan (%, used %, allowed %)'
      using errcode = 'check_violation';
  end if;

  return new;
end;
$$ language plpgsql security definer set search_path = public, pg_temp;

drop trigger if exists trg_enforce_site_limit on public.sites;
create trigger trg_enforce_site_limit
  before insert on public.sites
  for each row execute function public.enforce_site_limit();

-- --- 6. Reserved slugs ----------------------------------------------------
-- Without this, a user could claim `api`, `dashboard`, `admin` or `www` and
-- take over the corresponding subdomain, since the wildcard DNS record points
-- every *.root host at the app.
create or replace function public.reject_reserved_slug()
returns trigger as $$
begin
  if new.slug = any (array[
    'api', 'auth', 'admin', 'dashboard', 'login', 'signup', 'site', 'www',
    'app', 'static', 'assets', 'cdn', 'mail', 'ftp', 'support', 'help',
    'docs', 'blog', 'status', 'root', 'billing', 'account', 'settings',
    'about', 'legal', 'privacy', 'terms', 'cname', 'preview', 'staging'
  ]) then
    raise exception 'slug "%" is reserved', new.slug
      using errcode = 'check_violation';
  end if;
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_reject_reserved_slug on public.sites;
create trigger trg_reject_reserved_slug
  before insert or update of slug on public.sites
  for each row execute function public.reject_reserved_slug();

-- --- 7. Pin the search_path on SECURITY DEFINER functions ------------------
-- Without this, an attacker who can create an object in a schema on the
-- search path can hijack the function body.
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, plan_id)
  values (new.id, 'free')
  on conflict (id) do nothing;
  return new;
end;
$$ language plpgsql security definer set search_path = public, pg_temp;

-- --- 8. Optimise the RLS policies -----------------------------------------
-- auth.uid() reads a claim from the JWT. Wrapping it in (select ...) lets the
-- planner evaluate it once per statement instead of once per row, and is the
-- form Supabase's linter requires.
drop policy if exists "Users can view own profile" on public.profiles;
create policy "Users can view own profile"
  on public.profiles for select
  using ((select auth.uid()) = id);

drop policy if exists "Users can update own profile" on public.profiles;
create policy "Users can update own profile"
  on public.profiles for update
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

drop policy if exists "Users can view own sites" on public.sites;
create policy "Users can view own sites"
  on public.sites for select
  using ((select auth.uid()) = user_id);

drop policy if exists "Users can create own sites" on public.sites;
create policy "Users can create own sites"
  on public.sites for insert
  with check ((select auth.uid()) = user_id);

drop policy if exists "Users can update own sites" on public.sites;
create policy "Users can update own sites"
  on public.sites for update
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "Users can delete own sites" on public.sites;
create policy "Users can delete own sites"
  on public.sites for delete
  using ((select auth.uid()) = user_id);

drop policy if exists "Users can view own subscriptions" on public.subscriptions;
create policy "Users can view own subscriptions"
  on public.subscriptions for select
  using ((select auth.uid()) = user_id);

drop policy if exists "Users can view analytics for their sites" on public.analytics_events;
create policy "Users can view analytics for their sites"
  on public.analytics_events for select
  using (exists (
    select 1 from public.sites
    where sites.id = analytics_events.site_id
      and sites.user_id = (select auth.uid())
  ));

drop policy if exists "Users can view domain verifications" on public.domain_verifications;
create policy "Users can view domain verifications"
  on public.domain_verifications for select
  using (exists (
    select 1 from public.sites
    where sites.id = domain_verifications.site_id
      and sites.user_id = (select auth.uid())
  ));

-- The previous policy was FOR ALL with no WITH CHECK, and it allowed a user to
-- INSERT arbitrary verification rows, bypassing the Pro plan gate that the API
-- enforces. Verification rows are written by the service role only.
drop policy if exists "Users can manage domain verifications" on public.domain_verifications;

-- --- 9. Billing support tables --------------------------------------------
-- Records the user and plan behind a checkout before the customer is sent to
-- Dodo, so the webhook can resolve the subscription without depending on
-- metadata propagating from the checkout session.
create table if not exists public.checkout_intents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  plan_id text not null references public.plans (id),
  dodo_checkout_session_id text unique,
  dodo_subscription_id text,
  status text not null default 'pending'
    check (status in ('pending', 'completed', 'expired')),
  created_at timestamptz not null default now()
);

create index if not exists idx_checkout_intents_user
  on public.checkout_intents (user_id, created_at desc);
create index if not exists idx_checkout_intents_subscription
  on public.checkout_intents (dodo_subscription_id)
  where dodo_subscription_id is not null;

alter table public.checkout_intents enable row level security;

drop policy if exists "Users can view own checkout intents" on public.checkout_intents;
create policy "Users can view own checkout intents"
  on public.checkout_intents for select
  using ((select auth.uid()) = user_id);

-- Every webhook delivery is recorded, whether or not it was handled. Dodo
-- retries on a non-2xx response, and without this table there is no way to
-- answer "did the upgrade event arrive?" or to debug an unhandled event type.
create table if not exists public.webhook_events (
  id bigserial primary key,
  event_type text not null,
  payload jsonb not null default '{}'::jsonb,
  received_at timestamptz not null default now()
);

create index if not exists idx_webhook_events_type_received
  on public.webhook_events (event_type, received_at desc);

alter table public.webhook_events enable row level security;
revoke all on public.webhook_events from anon, authenticated;

-- --- 10. Audit log --------------------------------------------------------
-- There was no way to answer "who changed this plan?" or "when was this domain
-- connected?" after the fact.
create table if not exists public.audit_log (
  id bigserial primary key,
  actor_id uuid references public.profiles (id) on delete set null,
  action text not null,
  entity_type text not null,
  entity_id text,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_audit_log_actor
  on public.audit_log (actor_id, created_at desc);
create index if not exists idx_audit_log_entity
  on public.audit_log (entity_type, entity_id, created_at desc);

alter table public.audit_log enable row level security;
revoke all on public.audit_log from anon, authenticated;

-- --- 11. Daily analytics rollup -------------------------------------------
-- The dashboard previously aggregated up to 1000 raw events in the browser,
-- which silently produced wrong numbers past that cap and shipped the whole
-- event set into the RSC payload.
create table if not exists public.telemetry_daily (
  site_id uuid not null references public.sites (id) on delete cascade,
  day date not null,
  page_views integer not null default 0,
  button_clicks integer not null default 0,
  mobile integer not null default 0,
  tablet integer not null default 0,
  desktop integer not null default 0,
  referrers jsonb not null default '{}'::jsonb,
  primary key (site_id, day)
);

alter table public.telemetry_daily enable row level security;

drop policy if exists "Users can view own telemetry" on public.telemetry_daily;
create policy "Users can view own telemetry"
  on public.telemetry_daily for select
  using (exists (
    select 1 from public.sites
    where sites.id = telemetry_daily.site_id
      and sites.user_id = (select auth.uid())
  ));

commit;
