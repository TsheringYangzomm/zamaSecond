-- Zama: private farmer details
-- Run this in the Supabase SQL editor after supabase/cms-schema.sql.
--
-- These details (village, farm size, farming practices, and contact
-- information) must never appear on the public site. The public landing page
-- reads the farmers table with select *, so keeping this data in a separate
-- table with admin-only RLS policies guarantees it is never exposed to
-- anonymous visitors or signed-in customers.

create table if not exists public.farmer_private_info (
  farmer_id text primary key references public.farmers (id) on delete cascade,
  village text not null default '',
  farm_size text not null default '',
  farming_practices text not null default '',
  contact_phone text not null default '',
  contact_email text not null default '',
  alternative_contact text not null default '',
  preferred_contact_method text not null default '',
  admin_notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.farmer_private_info enable row level security;

create policy "farmer_private_info admin all" on public.farmer_private_info
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop trigger if exists farmer_private_info_set_updated_at on public.farmer_private_info;
create trigger farmer_private_info_set_updated_at
  before update on public.farmer_private_info
  for each row execute function public.set_updated_at();
