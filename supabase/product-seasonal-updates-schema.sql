-- Product seasonal updates
-- Apply after supabase/farmer-story-schema.sql.
-- Existing farmer_seasonal_updates rows are intentionally preserved as legacy data.

create table if not exists public.product_seasonal_updates (
  product_id text not null references public.products (id) on delete cascade,
  season text not null,
  content text not null default '',
  published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (product_id, season)
);

create index if not exists product_seasonal_updates_product_idx
  on public.product_seasonal_updates (product_id, season desc);

alter table public.product_seasonal_updates enable row level security;

drop policy if exists "product seasonal updates public read" on public.product_seasonal_updates;
create policy "product seasonal updates public read"
  on public.product_seasonal_updates
  for select
  using (published = true or public.is_admin());

drop policy if exists "product seasonal updates admin all" on public.product_seasonal_updates;
create policy "product seasonal updates admin all"
  on public.product_seasonal_updates
  for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop trigger if exists set_product_seasonal_updates_updated_at on public.product_seasonal_updates;
create trigger set_product_seasonal_updates_updated_at
  before update on public.product_seasonal_updates
  for each row execute function public.set_updated_at();
