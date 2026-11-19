-- ===========================================================================
-- 014_lock_custom_domain_plan.sql
--
-- H1 fix: custom domains are a Pro capability, enforced in the database.
--
-- The only plan gate was in app/api/domains/route.ts. Because the anon key is
-- public and `sites` has an owner INSERT/UPDATE policy, any free user could
-- call PostgREST directly:
--
--   PATCH /rest/v1/sites?id=eq.<site-uid>  {"custom_domain":"myapp.com"}
--
-- and get a custom domain + automatic TLS for free. Once the row exists,
-- /api/caddy/ask authorizes on-demand TLS for that hostname, so the same hole
-- also allows Let's Encrypt rate-limit exhaustion (the PRDD's R2 attack).
--
-- This trigger enforces the plan, blocks hijacking ShipSprint's own domains,
-- and validates the hostname for direct writes that never pass through
-- lib/redirect.ts normalizeHostname().
--
-- Disconnecting (custom_domain = NULL) is always allowed.
--
-- This migration is idempotent and safe to re-run.
-- ===========================================================================

create or replace function public.guard_custom_domain()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_has_domain boolean;
  v_root       text;
begin
  -- Normalize: lower-case, trim, treat blank as NULL (disconnect).
  if new.custom_domain is not null then
    new.custom_domain := trim(lower(new.custom_domain));
    if new.custom_domain = '' then
      new.custom_domain := null;
    end if;
  end if;

  -- Disconnecting (or an insert/update that does not set a domain) is always
  -- allowed.
  if new.custom_domain is null then
    return new;
  end if;

  -- 1. Plan gate: custom domains require plans.has_custom_domain (Pro).
  --    Fail closed when the profile is missing.
  select pl.has_custom_domain
    into v_has_domain
  from public.profiles pr
  join public.plans pl on pl.id = pr.plan_id
  where pr.id = new.user_id;

  if coalesce(v_has_domain, false) = false then
    raise exception 'Custom domains require the Pro plan'
      using errcode = 'insufficient_privilege';
  end if;

  -- 2. Platform-domain hijack protection. The configurable root can be
  --    overridden per database without a redeploy:
  --      ALTER DATABASE <db> SET app.root_domain = 'example.com';
  --    The real platform domain is ALSO hard-coded so a session-level
  --    SET app.root_domain cannot be used to bypass the check.
  v_root := coalesce(
    nullif(current_setting('app.root_domain', true), ''),
    'shipsprint.site'
  );

  if new.custom_domain = 'shipsprint.site'
     or new.custom_domain like '%.shipsprint.site'
     or new.custom_domain = v_root
     or new.custom_domain like ('%.' || v_root) then
    raise exception 'You cannot use a ShipSprint domain as a custom domain'
      using errcode = 'check_violation';
  end if;

  -- 3. Hostname validation (defence in depth for direct PostgREST writes).
  if length(new.custom_domain) > 253 then
    raise exception 'Domain name is too long'
      using errcode = 'check_violation';
  end if;

  if new.custom_domain !~
     '^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?(\.[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?)+$' then
    raise exception 'Invalid domain name'
      using errcode = 'check_violation';
  end if;

  if new.custom_domain ~ '^[0-9.]+$' then
    raise exception 'IP addresses cannot be used as custom domains'
      using errcode = 'check_violation';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_guard_custom_domain on public.sites;
create trigger trg_guard_custom_domain
  before insert or update of custom_domain on public.sites
  for each row execute function public.guard_custom_domain();

-- Trigger functions are internal; clients have no reason to call them via RPC.
revoke execute on function public.guard_custom_domain() from public, anon, authenticated;
grant execute on function public.guard_custom_domain() to service_role;

-- ---------------------------------------------------------------------------
-- Self-verification: fail the migration if the guard is incomplete.
-- ---------------------------------------------------------------------------
do $$
declare
  v_fn oid := to_regprocedure('public.guard_custom_domain()');
  v_def text;
begin
  if v_fn is null then
    raise exception 'H1: guard_custom_domain() is missing';
  end if;

  if not exists (
    select 1
    from pg_trigger
    where tgname = 'trg_guard_custom_domain'
      and tgrelid = 'public.sites'::regclass
  ) then
    raise exception 'H1: trg_guard_custom_domain is missing';
  end if;

  if not exists (
    select 1 from pg_proc where oid = v_fn and prosecdef
  ) then
    raise exception 'H1: guard_custom_domain() must be SECURITY DEFINER';
  end if;

  if not exists (
    select 1 from pg_proc where oid = v_fn and proconfig::text like '%search_path%'
  ) then
    raise exception 'H1: guard_custom_domain() search_path is not pinned';
  end if;

  v_def := pg_get_functiondef(v_fn);
  if v_def not like '%has_custom_domain%' then
    raise exception 'H1: guard_custom_domain() does not check has_custom_domain';
  end if;
  if v_def not like '%app.root_domain%' then
    raise exception 'H1: guard_custom_domain() does not check the root domain';
  end if;
end;
$$;

-- Refresh PostgREST's schema cache so the new trigger is active immediately.
notify pgrst, 'reload schema';

-- ---------------------------------------------------------------------------
-- Post-apply verification (run manually after the migration):
--
--   -- a free user's direct write must fail:
--   PATCH /rest/v1/sites?id=eq.<free-site-uid>  {"custom_domain":"myapp.com"}
--   -- -> 400/403 "Custom domains require the Pro plan"
--
--   -- a Pro user's write must succeed:
--   PATCH /rest/v1/sites?id=eq.<pro-site-uid>   {"custom_domain":"myapp.com"}
--
--   -- hijack attempts must fail:
--   PATCH ... {"custom_domain":"shipsprint.site"}
--   PATCH ... {"custom_domain":"evil.shipsprint.site"}
--
--   -- check the trigger exists:
--   select tgname from pg_trigger where tgrelid = 'public.sites'::regclass;
-- ---------------------------------------------------------------------------