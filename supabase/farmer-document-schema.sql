-- Zama: farmer documents (admin only)
-- Run this in the Supabase SQL editor after supabase/cms-schema.sql.
--
-- Stores links to documents Zama keeps for each farmer (signed / made
-- agreements, contracts, certificates, etc.). Documents are never shown on the
-- public site; the storage bucket defaults to private and the metadata table
-- uses admin-only RLS, so only admins can view or manage them.
--
-- The uploaded files themselves live in the private storage bucket
--   farmer-docs/<farmer_id>/<timestamp>.<ext>
-- which is created by this migration. Because the bucket is private, the file
-- URL is only resolvable by an admin using the Supabase signed-URL flow
-- (BucketClient / getSignedUrl). Until then, admins can still open documents
-- through the signed URL generated at runtime by the admin portal.

create table if not exists public.farmer_documents (
  id uuid primary key default gen_random_uuid(),
  farmer_id text not null references public.farmers (id) on delete cascade,
  title text not null default '',
  file_type text not null default '',
  url text not null default '',
  size_bytes bigint,
  created_at timestamptz not null default now()
);

create index if not exists farmer_documents_farmer_idx on public.farmer_documents (farmer_id);

alter table public.farmer_documents enable row level security;

create policy "farmer_documents admin all" on public.farmer_documents
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- Private storage bucket for farmer documents (not publicly readable).
insert into storage.buckets (id, name, public)
values ('farmer-docs', 'farmer-docs', false)
on conflict (id) do nothing;

drop policy if exists "farmer-docs admin select" on storage.objects;
create policy "farmer-docs admin select" on storage.objects
  for select using (bucket_id = 'farmer-docs' and public.is_admin());

drop policy if exists "farmer-docs admin insert" on storage.objects;
create policy "farmer-docs admin insert" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'farmer-docs' and public.is_admin());

drop policy if exists "farmer-docs admin update" on storage.objects;
create policy "farmer-docs admin update" on storage.objects
  for update to authenticated
  using (bucket_id = 'farmer-docs' and public.is_admin())
  with check (bucket_id = 'farmer-docs' and public.is_admin());

drop policy if exists "farmer-docs admin delete" on storage.objects;
create policy "farmer-docs admin delete" on storage.objects
  for delete to authenticated
  using (bucket_id = 'farmer-docs' and public.is_admin());
