-- ===========================================================================
-- 004_platform_metrics
--
-- Anonymous, privacy-preserving aggregate telemetry for landing page social proof.
-- Enables real-time verification of published sites, active templates, and
-- platform-wide telemetry without leaking user or draft data.
-- ===========================================================================

begin;

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

grant execute on function public.get_platform_metrics() to anon, authenticated;

comment on function public.get_platform_metrics() is
  'Returns public, anonymous aggregate platform counts for the landing page without revealing user or tenant data.';

commit;
