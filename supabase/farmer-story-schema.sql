-- Zama: farmer stories and seasonal updates
-- Run this in the Supabase SQL editor after supabase/farmer-private-schema.sql.
--
-- Farmer Story is the longer evergreen narrative a partner shares with the
-- public. Seasonal Updates are short per-season quotes that appear on the
-- landing page. Both live in separate tables with admin-only write policies
-- and published-only public read policies, so drafts saved by an admin are
-- never exposed until they are explicitly published.

create table if not exists public.farmer_stories (
  farmer_id text primary key references public.farmers (id) on delete cascade,
  content text not null default '',
  published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.farmer_stories enable row level security;

drop policy if exists "farmer_stories public read" on public.farmer_stories;
create policy "farmer_stories public read" on public.farmer_stories
  for select using (published = true or public.is_admin());

drop policy if exists "farmer_stories admin all" on public.farmer_stories;
create policy "farmer_stories admin all" on public.farmer_stories
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop trigger if exists farmer_stories_set_updated_at on public.farmer_stories;
create trigger farmer_stories_set_updated_at
  before update on public.farmer_stories
  for each row execute function public.set_updated_at();

create table if not exists public.farmer_seasonal_updates (
  farmer_id text not null references public.farmers (id) on delete cascade,
  season text not null,
  content text not null default '',
  published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (farmer_id, season)
);

alter table public.farmer_seasonal_updates enable row level security;

drop policy if exists "farmer_seasonal_updates public read" on public.farmer_seasonal_updates;
create policy "farmer_seasonal_updates public read" on public.farmer_seasonal_updates
  for select using (published = true or public.is_admin());

drop policy if exists "farmer_seasonal_updates admin all" on public.farmer_seasonal_updates;
create policy "farmer_seasonal_updates admin all" on public.farmer_seasonal_updates
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop trigger if exists farmer_seasonal_updates_set_updated_at on public.farmer_seasonal_updates;
create trigger farmer_seasonal_updates_set_updated_at
  before update on public.farmer_seasonal_updates
  for each row execute function public.set_updated_at();
