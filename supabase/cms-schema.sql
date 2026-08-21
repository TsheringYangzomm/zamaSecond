-- Zama content CMS
-- Run this in the Supabase SQL editor AFTER supabase/schema.sql (waitlist).
-- It creates the content tables, an admin allowlist, storage bucket, and all
-- row-level-security policies. Public visitors can read published content;
-- only allowlisted admin users can create, edit, delete, or unpublish.

-- ---------------------------------------------------------------------------
-- Admin allowlist (only these emails can manage content)
-- ---------------------------------------------------------------------------
create table if not exists public.admin_users (
  email text primary key,
  created_at timestamptz not null default now()
);

-- Add yourself once, e.g.:
-- insert into public.admin_users (email) values ('you@example.com');

-- ---------------------------------------------------------------------------
-- Content tables
-- ---------------------------------------------------------------------------
create table if not exists public.products (
  id text primary key,
  sku text not null unique,
  name text not null,
  eyebrow text not null default '',
  description text not null default '',
  image text not null default '',
  alt text not null default '',
  category text not null default '',
  price_amount numeric,
  price_unit text not null default '',
  servings text not null default '',
  availability text not null default '',
  delivery_estimate text not null default '',
  cooking_time text not null default '',
  ingredients text not null default '',
  allergen_notice text not null default '',
  storage text not null default '',
  source text not null default '',
  nutrition text not null default '',
  tags text[] not null default '{}',
  collections text[] not null default '{}',
  sort_order integer not null default 0,
  published boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.farmers (
  id text primary key,
  name text not null,
  location text not null default '',
  dzongkhag text not null default '',
  products text[] not null default '{}',
  tags text[] not null default '{}',
  years_farming integer not null default 0,
  bio text not null default '',
  verified boolean not null default false,
  partner_since integer,
  image text not null default '',
  sort_order integer not null default 0,
  published boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.reviews (
  id text primary key,
  product_id text not null references public.products (id) on delete cascade,
  author text not null default '',
  location text not null default '',
  rating integer not null default 5,
  date text not null default '',
  title text not null default '',
  body text not null default '',
  verified boolean not null default false,
  sort_order integer not null default 0,
  published boolean not null default true,
  created_at timestamptz not null default now()
);

create index if not exists reviews_product_id_idx on public.reviews (product_id);

create table if not exists public.meal_kit_trust_details (
  slug text primary key,
  title text not null,
  image text not null default '',
  alt text not null default '',
  consultant_note text not null default '',
  dietician_note text not null default '',
  health_benefits text[] not null default '{}',
  allergens text[] not null default '{}',
  sourcing text not null default '',
  storage_advice text not null default '',
  sort_order integer not null default 0,
  published boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Generic landing copy: key -> JSON value (hero, footer, faqs, policies, ...)
create table if not exists public.content_blocks (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------
create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.admin_users
    where email = auth.email()
  );
$$;

revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to anon, authenticated;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- Row-level security
-- ---------------------------------------------------------------------------
alter table public.products enable row level security;
alter table public.farmers enable row level security;
alter table public.reviews enable row level security;
alter table public.content_blocks enable row level security;
alter table public.meal_kit_trust_details enable row level security;

drop policy if exists "products public read" on public.products;
create policy "products public read" on public.products
  for select using (published = true or public.is_admin());

drop policy if exists "products admin write" on public.products;
create policy "products admin write" on public.products
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "farmers public read" on public.farmers;
create policy "farmers public read" on public.farmers
  for select using (published = true or public.is_admin());

drop policy if exists "farmers admin write" on public.farmers;
create policy "farmers admin write" on public.farmers
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "reviews public read" on public.reviews;
create policy "reviews public read" on public.reviews
  for select using (published = true or public.is_admin());

drop policy if exists "reviews admin write" on public.reviews;
create policy "reviews admin write" on public.reviews
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "content_blocks public read" on public.content_blocks;
create policy "content_blocks public read" on public.content_blocks
  for select using (true);

drop policy if exists "content_blocks admin write" on public.content_blocks;
create policy "content_blocks admin write" on public.content_blocks
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "meal_kit_trust_details public read" on public.meal_kit_trust_details;
create policy "meal_kit_trust_details public read" on public.meal_kit_trust_details
  for select using (published = true or public.is_admin());

drop policy if exists "meal_kit_trust_details admin write" on public.meal_kit_trust_details;
create policy "meal_kit_trust_details admin write" on public.meal_kit_trust_details
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- Admin access to the waitlist (keeps anonymous writes locked to the RPC).
do $$
begin
  if to_regclass('public.launch_interests') is not null then
    execute $sql$
      drop policy if exists "launch_interests admin read" on public.launch_interests;
      create policy "launch_interests admin read" on public.launch_interests
        for select to authenticated using (public.is_admin());

      drop policy if exists "launch_interests admin delete" on public.launch_interests;
      create policy "launch_interests admin delete" on public.launch_interests
        for delete to authenticated using (public.is_admin());
    $sql$;
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- updated_at triggers
-- ---------------------------------------------------------------------------
drop trigger if exists products_set_updated_at on public.products;
create trigger products_set_updated_at
  before update on public.products
  for each row execute function public.set_updated_at();

drop trigger if exists farmers_set_updated_at on public.farmers;
create trigger farmers_set_updated_at
  before update on public.farmers
  for each row execute function public.set_updated_at();

drop trigger if exists content_blocks_set_updated_at on public.content_blocks;
create trigger content_blocks_set_updated_at
  before update on public.content_blocks
  for each row execute function public.set_updated_at();

drop trigger if exists meal_kit_trust_details_set_updated_at on public.meal_kit_trust_details;
create trigger meal_kit_trust_details_set_updated_at
  before update on public.meal_kit_trust_details
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Image storage bucket (public-read; admin upload)
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('catalog', 'catalog', true)
on conflict (id) do nothing;

drop policy if exists "catalog public read" on storage.objects;
create policy "catalog public read" on storage.objects
  for select using (bucket_id = 'catalog');

drop policy if exists "catalog admin upload" on storage.objects;
create policy "catalog admin upload" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'catalog' and public.is_admin());

drop policy if exists "catalog admin update" on storage.objects;
create policy "catalog admin update" on storage.objects
  for update to authenticated
  using (bucket_id = 'catalog' and public.is_admin());

drop policy if exists "catalog admin delete" on storage.objects;
create policy "catalog admin delete" on storage.objects
  for delete to authenticated
  using (bucket_id = 'catalog' and public.is_admin());
  