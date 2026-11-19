-- ===========================================================================
-- 012_lock_profile_plan.sql
--
-- C1 fix: a user must never be able to change their own plan.
--
-- Before this migration, `authenticated` held a table-wide UPDATE grant on
-- public.profiles plus a permissive "Users can update own profile" policy.
-- Because the Supabase anon key is public and every user receives a session
-- JWT, any signed-up user could run:
--
--   PATCH /rest/v1/profiles?id=eq.<uid>  {"plan_id":"pro"}
--
-- and grant themselves Pro (10 sites, custom domains, analytics, AI
-- discovery) without paying.
--
-- The app never updates profiles with the user client — every legitimate
-- write (checkout, billing webhook, dev simulator) uses the service-role
-- client — so the fix is to make profiles read-only for clients and to
-- enforce plan immutability in the database.
--
-- This migration is idempotent and safe to re-run.
-- ===========================================================================

-- 1. Clients may read their own profile, but never write any column. -------
--    RLS still restricts SELECT to the owner's row.
revoke insert, update, delete on public.profiles from anon, authenticated;
-- Also revoke any column-level UPDATE grants, if a project ever added them.
revoke update (id, plan_id, dodo_customer_id, created_at, updated_at)
  on public.profiles from anon, authenticated;
-- anon has no legitimate use for profiles; keep it fully locked out.
revoke select on public.profiles from anon;
grant select on public.profiles to authenticated;

-- The UPDATE policy is now inert (no grant), but drop it so the schema does
-- not advertise a capability that cannot be used.
drop policy if exists "Users can update own profile" on public.profiles;

-- 2. Defence in depth: even if a grant is re-added by mistake, the trigger
--    refuses plan/customer changes from any untrusted session role. --------
create or replace function public.guard_profile_plan()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  -- Two identities matter, and neither alone is sufficient:
  --   * current_setting('role') is the effective role set by PostgREST
  --     (SET ROLE service_role / authenticated) or by SET ROLE. A plain
  --     superuser session reports 'none'.
  --   * session_user is the original login role, unchanged by SET ROLE or
  --     SECURITY DEFINER. The Supabase SQL editor and migrations run as
  --     postgres/supabase_admin with role = 'none'.
  -- Trusted billing/ops access is allowed; clients are not. current_user is
  -- deliberately NOT used: inside this SECURITY DEFINER function it would be
  -- the function owner (postgres) for every caller, making the guard a no-op.
  if coalesce(current_setting('role', true), 'none') not in
       ('service_role', 'postgres', 'supabase_admin')
     and session_user not in ('service_role', 'postgres', 'supabase_admin') then
    if new.plan_id is distinct from old.plan_id then
      raise exception 'Plan changes are managed by billing'
        using errcode = 'insufficient_privilege';
    end if;

    if new.dodo_customer_id is distinct from old.dodo_customer_id then
      raise exception 'Billing identifiers are managed by billing'
        using errcode = 'insufficient_privilege';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_guard_profile_plan on public.profiles;
create trigger trg_guard_profile_plan
  before update on public.profiles
  for each row execute function public.guard_profile_plan();

-- Trigger functions are internal; clients have no reason to call them via RPC.
revoke execute on function public.guard_profile_plan() from anon, authenticated;

-- 3. Self-verification: fail the migration if the hole is still open. ------
--    This runs as the migration owner (postgres) and asserts the properties
--    that make C1 safe: no client UPDATE grant (table- or column-level), no
--    permissive UPDATE policy, and a present guard trigger.
do $$
declare
  v_role text;
begin
  foreach v_role in array array['anon', 'authenticated'] loop
    if has_table_privilege(v_role, 'public.profiles', 'UPDATE') then
      raise exception
        'C1: % still holds a table-wide UPDATE grant on public.profiles', v_role;
    end if;

    if exists (
      select 1
      from information_schema.column_privileges
      where table_schema = 'public'
        and table_name = 'profiles'
        and grantee = v_role
        and privilege_type = 'UPDATE'
    ) then
      raise exception
        'C1: % still holds a column-level UPDATE grant on public.profiles', v_role;
    end if;
  end loop;

  if exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'profiles'
      and policyname = 'Users can update own profile'
  ) then
    raise exception 'C1: the permissive profiles UPDATE policy still exists';
  end if;

  if not exists (
    select 1
    from pg_trigger
    where tgname = 'trg_guard_profile_plan'
      and tgrelid = 'public.profiles'::regclass
  ) then
    raise exception 'C1: trg_guard_profile_plan is missing';
  end if;
end;
$$;

-- ---------------------------------------------------------------------------
-- Post-apply verification (run manually after the migration):
--
--   -- must return false / no rows
--   select has_table_privilege('authenticated', 'public.profiles', 'UPDATE');
--   select * from pg_policies where tablename = 'profiles';
--   select tgname from pg_trigger where tgrelid = 'public.profiles'::regclass;
--
--   -- must fail: permission denied (no grant)
--   set role authenticated;
--   update public.profiles set plan_id = 'pro' where id = '<your-uid>';
--   reset role;
--
--   -- must fail: "Plan changes are managed by billing" (trigger), even if a
--   -- grant is accidentally re-added
--   grant update on public.profiles to authenticated;
--   set role authenticated;
--   update public.profiles set plan_id = 'pro' where id = '<your-uid>';
--   reset role;
--   revoke update on public.profiles from authenticated;
-- ---------------------------------------------------------------------------