-- 001_initial_schema.sql
-- ShipSprint Initial Production Database Schema

-- 1. Plans Table
create table if not exists public.plans (
  id text primary key, -- 'free' | 'basic' | 'pro'
  name text not null,
  price_cents int not null,
  site_limit int not null,
  has_branding boolean not null,     -- true = watermark/badge shown
  has_custom_domain boolean not null,
  has_analytics_dashboard boolean not null
);

-- Seed Plans
insert into public.plans (id, name, price_cents, site_limit, has_branding, has_custom_domain, has_analytics_dashboard)
values
  ('free', 'Free', 0, 1, true, false, false),
  ('basic', 'Basic', 499, 3, false, false, false),
  ('pro', 'Pro', 999, 10, false, true, true)
on conflict (id) do update set
  name = excluded.name,
  price_cents = excluded.price_cents,
  site_limit = excluded.site_limit,
  has_branding = excluded.has_branding,
  has_custom_domain = excluded.has_custom_domain,
  has_analytics_dashboard = excluded.has_analytics_dashboard;

-- 2. Profiles Table (extends auth.users)
create table if not exists public.profiles (
  id uuid references auth.users on delete cascade primary key,
  plan_id text references public.plans(id) default 'free' not null,
  dodo_customer_id text,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

-- 3. Sites Table
create table if not exists public.sites (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade not null,
  slug text unique not null,
  custom_domain text unique,
  status text not null default 'draft', -- 'draft' | 'published'
  content jsonb not null default '{}'::jsonb,   -- hero, features, store_links, screenshots, footer
  theme text not null default 'v1',
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null,
  published_at timestamptz
);

-- 4. Subscriptions Table
create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade not null,
  dodo_subscription_id text unique not null,
  plan_id text references public.plans(id) not null,
  status text not null, -- 'active' | 'cancelled' | 'expired' | 'on_hold'
  current_period_end timestamptz,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

-- 5. Analytics Events Table
create table if not exists public.analytics_events (
  id uuid primary key default gen_random_uuid(),
  site_id uuid references public.sites(id) on delete cascade not null,
  event_type text not null, -- 'page_view' | 'button_click'
  meta jsonb default '{}'::jsonb,
  created_at timestamptz default now() not null
);

create index if not exists idx_analytics_site_created on public.analytics_events (site_id, created_at);

-- 6. Domain Verifications Table
create table if not exists public.domain_verifications (
  id uuid primary key default gen_random_uuid(),
  site_id uuid references public.sites(id) on delete cascade not null,
  cloudflare_hostname_id text,
  ownership_verification jsonb,
  ssl_status text default 'pending_validation', -- 'pending_validation' | 'active' | 'failed'
  status text default 'pending', -- 'pending' | 'verified' | 'failed'
  checked_at timestamptz,
  created_at timestamptz default now() not null
);

-- Enable Row Level Security (RLS) on all tables
alter table public.plans enable row level security;
alter table public.profiles enable row level security;
alter table public.sites enable row level security;
alter table public.subscriptions enable row level security;
alter table public.analytics_events enable row level security;
alter table public.domain_verifications enable row level security;

-- Policies for plans
create policy "Plans are viewable by everyone" 
  on public.plans for select 
  using (true);

-- Policies for profiles
create policy "Users can view own profile" 
  on public.profiles for select 
  using (auth.uid() = id);

create policy "Users can update own profile" 
  on public.profiles for update 
  using (auth.uid() = id);

-- Policies for sites
create policy "Users can view own sites" 
  on public.sites for select 
  using (auth.uid() = user_id);

create policy "Public can view published sites" 
  on public.sites for select 
  using (status = 'published');

create policy "Users can create own sites" 
  on public.sites for insert 
  with check (auth.uid() = user_id);

create policy "Users can update own sites" 
  on public.sites for update 
  using (auth.uid() = user_id);

create policy "Users can delete own sites" 
  on public.sites for delete 
  using (auth.uid() = user_id);

-- Policies for subscriptions
create policy "Users can view own subscriptions" 
  on public.subscriptions for select 
  using (auth.uid() = user_id);

-- Policies for analytics_events
-- Insert is allowed only via Service Role in /api/track endpoint.
create policy "Users can view analytics for their sites" 
  on public.analytics_events for select 
  using (
    exists (
      select 1 from public.sites 
      where sites.id = analytics_events.site_id 
      and sites.user_id = auth.uid()
    )
  );

-- Policies for domain_verifications
create policy "Users can view domain verifications for their sites" 
  on public.domain_verifications for select 
  using (
    exists (
      select 1 from public.sites 
      where sites.id = domain_verifications.site_id 
      and sites.user_id = auth.uid()
    )
  );

create policy "Users can manage domain verifications for their sites" 
  on public.domain_verifications for all 
  using (
    exists (
      select 1 from public.sites 
      where sites.id = domain_verifications.site_id 
      and sites.user_id = auth.uid()
    )
  );

-- Trigger to automatically create a profile for every new user in auth.users
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, plan_id)
  values (new.id, 'free')
  on conflict (id) do nothing;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
