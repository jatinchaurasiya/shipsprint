-- ===========================================================================
-- 015_clean_fabricated_metrics.sql
--
-- H2 data migration: remove the fabricated metrics that the old
-- getFlagshipDefaultContent() seeded into every site created before the fix.
--
-- The app fix (H2) stops *new* sites from getting fake numbers, and the
-- homepage no longer shows them. But existing sites still have the old
-- defaults stored in `sites.content`:
--
--   impacts.metric_stat            = '1,200+'
--   impacts.metric_label           = 'Live app landing pages published worldwide'
--   impacts.rating_score           = 4.9
--   impacts.rating_reviews_label   = 'Average indie maker rating across launches'
--   impacts.sla_stat               = '99.9%'
--   impacts.sla_label              = 'Uptime SLA via Caddy edge & automated TLS'
--   impacts.speed_stat             = '< 2 min'
--   impacts.speed_label            = 'From setup to live custom domain'
--   impacts.trust_headline         = 'Trusted by indie makers'
--   impacts.trust_avatars          = ["ZH","FF","SA"]
--   hero.rating_stars              = 5
--   hero.rating_text               = 'Built for App Store launches'
--   features[].proof_meta.chart_stat.value = '14,820 installs'
--   features[].proof_meta.chart_stat.ctr   = '+24.8% CTR'
--   features[].proof_meta.checklist_items[0].date = 'Feb 19'
--   features[].proof_meta.readiness_items[0].value = '12 / 12 items verified'
--
-- Each update matches the **exact combination** of the old defaults, so a
-- customer's own content is never touched: a site that happens to use
-- "1,200+" with a different label, or a 4.9 rating with a different
-- subtitle, is left alone. The migration is idempotent: after the first run
-- the WHERE clauses no longer match.
--
-- This migration is safe to re-run.
-- ===========================================================================

begin;

-- 1. Impacts — trust & volume tile (metric + trust headline + avatars).
update public.sites
set content = content
      #- '{impacts,metric_stat}'
      #- '{impacts,metric_label}'
      #- '{impacts,trust_headline}'
      #- '{impacts,trust_avatars}',
    updated_at = now()
where content #>> '{impacts,metric_stat}' = '1,200+'
  and content #>> '{impacts,metric_label}' = 'Live app landing pages published worldwide'
  and content #>> '{impacts,trust_headline}' = 'Trusted by indie makers';

-- 2. Impacts — rating tile.
update public.sites
set content = content
      #- '{impacts,rating_score}'
      #- '{impacts,rating_reviews_label}',
    updated_at = now()
where content #>> '{impacts,rating_score}' = '4.9'
  and content #>> '{impacts,rating_reviews_label}' = 'Average indie maker rating across launches';

-- 3. Impacts — SLA tile.
update public.sites
set content = content
      #- '{impacts,sla_stat}'
      #- '{impacts,sla_label}',
    updated_at = now()
where content #>> '{impacts,sla_stat}' = '99.9%'
  and content #>> '{impacts,sla_label}' = 'Uptime SLA via Caddy edge & automated TLS';

-- 4. Impacts — speed tile.
update public.sites
set content = content
      #- '{impacts,speed_stat}'
      #- '{impacts,speed_label}',
    updated_at = now()
where content #>> '{impacts,speed_stat}' = '< 2 min'
  and content #>> '{impacts,speed_label}' = 'From setup to live custom domain';

-- 5. Hero — fabricated 5-star rating.
update public.sites
set content = content
      #- '{hero,rating_stars}'
      #- '{hero,rating_text}',
    updated_at = now()
where content #>> '{hero,rating_stars}' = '5'
  and content #>> '{hero,rating_text}' = 'Built for App Store launches';

-- 6. Features — remove fake proof graphics from any feature that still has
--    the old defaults, regardless of array position (handles reordering).
update public.sites
set content = jsonb_set(
      content,
      '{features}',
      (
        select jsonb_agg(
          case
            when item->'proof_meta'->'chart_stat'->>'value' = '14,820 installs'
             and item->'proof_meta'->'chart_stat'->>'ctr' = '+24.8% CTR'
              then item #- '{proof_meta,chart_stat}'
            when item->'proof_meta'->'checklist_items'->0->>'date' = 'Feb 19'
              then item #- '{proof_meta,checklist_items}'
            when item->'proof_meta'->'readiness_items'->0->>'value' = '12 / 12 items verified'
              then item #- '{proof_meta,readiness_items}'
            else item
          end
          order by t.ord
        )
        from jsonb_array_elements(content->'features') with ordinality as t(item, ord)
      )
    ),
    updated_at = now()
where content->'features' is not null
  and exists (
    select 1
    from jsonb_array_elements(content->'features') as item
    where (item->'proof_meta'->'chart_stat'->>'value' = '14,820 installs'
           and item->'proof_meta'->'chart_stat'->>'ctr' = '+24.8% CTR')
       or item->'proof_meta'->'checklist_items'->0->>'date' = 'Feb 19'
       or item->'proof_meta'->'readiness_items'->0->>'value' = '12 / 12 items verified'
  );

-- 7. Report (does not fail the migration on a legitimate lookalike).
do $$
declare
  v_count integer;
begin
  select count(*) into v_count
  from public.sites
  where (content #>> '{impacts,metric_stat}' = '1,200+'
         and content #>> '{impacts,metric_label}' = 'Live app landing pages published worldwide')
     or (content #>> '{impacts,rating_score}' = '4.9'
         and content #>> '{impacts,rating_reviews_label}' = 'Average indie maker rating across launches')
     or (content #>> '{impacts,sla_stat}' = '99.9%'
         and content #>> '{impacts,sla_label}' = 'Uptime SLA via Caddy edge & automated TLS')
     or (content #>> '{features,0,proof_meta,chart_stat,value}' = '14,820 installs');

  if v_count > 0 then
    raise notice 'H2: % site(s) still contain the old fabricated defaults', v_count;
  else
    raise notice 'H2: no fabricated defaults remain';
  end if;
end;
$$;

commit;

-- ---------------------------------------------------------------------------
-- Preview (run BEFORE applying — read-only):
--
--   select
--     count(*) filter (where content #>> '{impacts,metric_stat}' = '1,200+'
--       and content #>> '{impacts,metric_label}' = 'Live app landing pages published worldwide') as metric_tile,
--     count(*) filter (where content #>> '{impacts,rating_score}' = '4.9'
--       and content #>> '{impacts,rating_reviews_label}' = 'Average indie maker rating across launches') as rating_tile,
--     count(*) filter (where content #>> '{impacts,sla_stat}' = '99.9%'
--       and content #>> '{impacts,sla_label}' = 'Uptime SLA via Caddy edge & automated TLS') as sla_tile,
--     count(*) filter (where content #>> '{features,0,proof_meta,chart_stat,value}' = '14,820 installs') as chart
--   from public.sites;
--
-- Post-apply verification (run manually after the migration):
--
--   -- must return 0 rows
--   select id, slug from public.sites
--   where content #>> '{impacts,metric_stat}' = '1,200+'
--      or content #>> '{impacts,rating_score}' = '4.9'
--      or content #>> '{impacts,sla_stat}' = '99.9%'
--      or content #>> '{features,0,proof_meta,chart_stat,value}' = '14,820 installs';
--
--   -- spot-check a site that had the defaults:
--   select content->'impacts', content->'hero'->'rating_stars'
--   from public.sites where slug = '<a-slug>';
-- ---------------------------------------------------------------------------