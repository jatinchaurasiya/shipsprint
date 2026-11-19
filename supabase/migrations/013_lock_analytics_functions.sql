-- ===========================================================================
-- 013_lock_analytics_functions.sql
--
-- C2 fix: analytics maintenance functions must not be callable by clients.
--
-- prune_analytics(integer) and rollup_telemetry(integer) are SECURITY DEFINER
-- functions: they run as their owner and bypass RLS. PostgreSQL grants EXECUTE
-- on functions to PUBLIC by default, and Supabase exposes public-schema
-- functions over PostgREST RPC, so anyone holding the public anon key could
-- call:
--
--   POST /rest/v1/rpc/prune_analytics  {"p_days": 100000}
--
-- and delete every analytics event for every tenant, or poison
-- telemetry_daily via rollup_telemetry. Only the service-role client (the
-- maintenance cron) may run them.
--
-- get_platform_metrics() stays public: it returns only aggregate counts and is
-- used by the marketing homepage with the anon client.
--
-- This migration is idempotent and safe to re-run.
-- ===========================================================================

-- 1. Lock the mutating analytics functions. -------------------------------
revoke execute on function public.prune_analytics(integer)  from public, anon, authenticated;
revoke execute on function public.rollup_telemetry(integer) from public, anon, authenticated;

grant execute on function public.prune_analytics(integer)  to service_role;
grant execute on function public.rollup_telemetry(integer) to service_role;

-- 2. Defence in depth: trigger functions are internal. ----------------------
--    They can only be called in a trigger context anyway, but clients have no
--    reason to be able to invoke them via RPC.
revoke execute on function public.set_updated_at()        from public, anon, authenticated;
revoke execute on function public.guard_profile_plan()    from public, anon, authenticated;
revoke execute on function public.enforce_site_limit()    from public, anon, authenticated;
revoke execute on function public.reject_reserved_slug()  from public, anon, authenticated;
revoke execute on function public.handle_new_user()       from public, anon, authenticated;

grant execute on function public.set_updated_at()       to service_role;
grant execute on function public.guard_profile_plan()   to service_role;
grant execute on function public.enforce_site_limit()   to service_role;
grant execute on function public.reject_reserved_slug() to service_role;
grant execute on function public.handle_new_user()      to service_role;

-- 3. Self-verification: fail the migration if the lock is incomplete. -------
do $$
declare
  v_prune   oid := to_regprocedure('public.prune_analytics(integer)');
  v_rollup  oid := to_regprocedure('public.rollup_telemetry(integer)');
  v_metrics oid := to_regprocedure('public.get_platform_metrics()');
  v_role    text;
begin
  if v_prune is null or v_rollup is null or v_metrics is null then
    raise exception 'C2: analytics functions are missing';
  end if;

  foreach v_role in array array['anon', 'authenticated'] loop
    if has_function_privilege(v_role, v_prune, 'EXECUTE') then
      raise exception 'C2: % can still execute prune_analytics(integer)', v_role;
    end if;
    if has_function_privilege(v_role, v_rollup, 'EXECUTE') then
      raise exception 'C2: % can still execute rollup_telemetry(integer)', v_role;
    end if;
  end loop;

  if not has_function_privilege('service_role', v_prune, 'EXECUTE') then
    raise exception 'C2: service_role cannot execute prune_analytics(integer)';
  end if;
  if not has_function_privilege('service_role', v_rollup, 'EXECUTE') then
    raise exception 'C2: service_role cannot execute rollup_telemetry(integer)';
  end if;

  if not has_function_privilege('anon', v_metrics, 'EXECUTE') then
    raise exception 'C2: get_platform_metrics() must stay callable by anon';
  end if;

  if not exists (
    select 1 from pg_proc where oid = v_prune and proconfig::text like '%search_path%'
  ) then
    raise exception 'C2: prune_analytics(integer) search_path is not pinned';
  end if;
  if not exists (
    select 1 from pg_proc where oid = v_rollup and proconfig::text like '%search_path%'
  ) then
    raise exception 'C2: rollup_telemetry(integer) search_path is not pinned';
  end if;
end;
$$;

-- 4. Tell PostgREST to refresh its schema cache so the revoked privileges
--    take effect immediately (no restart needed).
notify pgrst, 'reload schema';

-- ---------------------------------------------------------------------------
-- Post-apply verification (run manually after the migration):
--
--   -- must be false for anon/authenticated, true for service_role
--   select has_function_privilege('anon', 'public.prune_analytics(integer)', 'EXECUTE');
--   select has_function_privilege('authenticated', 'public.rollup_telemetry(integer)', 'EXECUTE');
--   select has_function_privilege('service_role', 'public.prune_analytics(integer)', 'EXECUTE');
--
--   -- must be true (marketing homepage uses the anon client)
--   select has_function_privilege('anon', 'public.get_platform_metrics()', 'EXECUTE');
--
--   -- the attack must fail (as a normal user, devtools):
--   POST /rest/v1/rpc/prune_analytics  {"p_days": 100000}  ->  401/403
-- ---------------------------------------------------------------------------