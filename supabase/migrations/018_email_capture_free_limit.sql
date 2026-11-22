-- ===========================================================================
-- 018_email_capture_free_limit.sql
--
-- H3 fix: make the database the single source of truth for the plan
-- capabilities that the pricing table promises, and enforce the Free-tier
-- email-capture cap at the durable boundary.
--
-- Changes:
--   1. Free plan  : has_email_capture = true  (email capture is for every
--                   plan; Free is capped at 100 subscribers)
--   2. Basic plan : has_analytics_dashboard = true (limited 7-day dashboard;
--                   the full 7/30/90-day dashboard stays Pro-only — that
--                   depth is enforced in the app, the flag is the capability)
--   3. site_subscribers: trigger `enforce_free_email_capture_cap` rejects
--      the 101st subscriber for a Free owner (23514). Direct SQL inserts are
--      covered too, not just the API.
--
-- The trigger is the authority. The API maps the error to a friendly 403 and
-- the editor shows the count against the cap, so the visitor and the owner
-- both see a clear message instead of a raw constraint violation.
--
-- This migration is safe to re-run.
-- ===========================================================================

begin;

-- 1. Free plan: email capture enabled (capped at 100 subscribers).
update public.plans
set has_email_capture = true,
    updated_at = now()
where id = 'free';

-- 2. Basic plan: limited analytics dashboard enabled (7-day window).
update public.plans
set has_analytics_dashboard = true,
    updated_at = now()
where id = 'basic';

-- 3. Free-tier email cap: reject the 101st subscriber.
--    The cap is counted per site (a Free owner with one site can collect 100
--    emails on it). Paid tiers are unaffected. A trigger, not a check
--    constraint, because the count needs a subquery.
create or replace function public.enforce_free_email_capture_cap()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_is_free boolean;
  v_count   integer;
begin
  select (p.id = 'free') into v_is_free
  from public.sites s
  join public.profiles pr on pr.id = s.user_id
  join public.plans p on p.id = pr.plan_id
  where s.id = new.site_id;

  if v_is_free is not true then
    return new;
  end if;

  select count(*) into v_count
  from public.site_subscribers
  where site_id = new.site_id;

  if v_count >= 100 then
    raise exception 'free plan email capture limit reached (100 subscribers)'
      using errcode = '23514';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_enforce_free_email_capture_cap on public.site_subscribers;
create trigger trg_enforce_free_email_capture_cap
  before insert on public.site_subscribers
  for each row execute function public.enforce_free_email_capture_cap();

commit;

-- ---------------------------------------------------------------------------
-- Post-apply verification:
--
--   select id, has_email_capture, has_analytics_dashboard
--   from public.plans order by sort_order;
--   -- expected: free(true,false) basic(true,true) pro(true,true)
--
--   select tgname from pg_trigger
--   where tgrelid = 'public.site_subscribers'::regclass
--     and not tgisinternal;
--   -- expected: trg_enforce_free_email_capture_cap
-- ---------------------------------------------------------------------------