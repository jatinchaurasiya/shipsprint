-- ===========================================================================
-- ShipSprint — 010_ai_search_llm_discoverability.sql
--
-- Adds AI Search & LLM Discoverability capabilities to plans and sites.
-- Follows the convergent pattern: idempotent ALTERs and backfills.
-- ===========================================================================

begin;

-- 1. Extend public.plans with the feature capability flag
alter table public.plans add column if not exists has_ai_discovery boolean not null default false;

update public.plans set has_ai_discovery = false where id in ('free', 'basic');
update public.plans set has_ai_discovery = true  where id = 'pro';

-- 2. Extend public.sites with discoverability configuration and health telemetry
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

create index if not exists idx_sites_ai_discovery on public.sites (ai_discovery_enabled) where ai_discovery_enabled = true;

commit;
