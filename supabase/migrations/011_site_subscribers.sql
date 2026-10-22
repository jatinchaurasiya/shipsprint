-- ===========================================================================
-- ShipSprint — 011_site_subscribers.sql
--
-- Email capture and waitlist lead collection table, indexes, and RLS policies.
-- Follows the convergent idempotent pattern.
-- ===========================================================================

begin;

-- 1. Create table if not exists
create table if not exists public.site_subscribers (
  id         uuid primary key default gen_random_uuid(),
  site_id    uuid not null references public.sites (id) on delete cascade,
  email      text not null,
  created_at timestamptz not null default now()
);

-- Converge any existing table
alter table public.site_subscribers add column if not exists site_id    uuid not null references public.sites (id) on delete cascade;
alter table public.site_subscribers add column if not exists email      text not null;
alter table public.site_subscribers add column if not exists created_at timestamptz not null default now();

-- 2. Indexes: Case-insensitive unique constraint per site
create unique index if not exists idx_site_subscribers_unique
  on public.site_subscribers (site_id, lower(email));

create index if not exists idx_site_subscribers_site_created
  on public.site_subscribers (site_id, created_at desc);

-- 3. Row Level Security
alter table public.site_subscribers enable row level security;

-- Policy: Authenticated site owners can read their own site's subscribers
drop policy if exists "Owners can view subscribers" on public.site_subscribers;
create policy "Owners can view subscribers" on public.site_subscribers
  for select
  using (
    (select auth.uid()) is not null
    and exists (
      select 1 from public.sites
      where sites.id = site_subscribers.site_id
        and sites.user_id = (select auth.uid())
    )
  );

-- Policy: Authenticated site owners can delete their own site's subscribers
drop policy if exists "Owners can delete subscribers" on public.site_subscribers;
create policy "Owners can delete subscribers" on public.site_subscribers
  for delete
  using (
    (select auth.uid()) is not null
    and exists (
      select 1 from public.sites
      where sites.id = site_subscribers.site_id
        and sites.user_id = (select auth.uid())
    )
  );

-- Grant select and delete permissions to authenticated role
grant select, delete on public.site_subscribers to authenticated;

comment on table public.site_subscribers is
  'Email addresses captured via landing page waitlist/newsletter forms with site-owner RLS isolation.';

commit;
