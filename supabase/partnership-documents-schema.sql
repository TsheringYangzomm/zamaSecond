-- Zama partnership request documents (admin only)
-- Apply after supabase/partnerships-schema.sql.
--
-- Files are stored in a private bucket. They are never included in the
-- public partnership page, farmer profile, or any customer-visible API.

create table if not exists public.partnership_documents (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.partnership_requests (id) on delete cascade,
  title text not null default '',
  file_type text not null default '',
  storage_path text not null unique,
  size_bytes bigint,
  created_at timestamptz not null default now()
);

create index if not exists partnership_documents_request_idx
  on public.partnership_documents (request_id, created_at desc);

alter table public.partnership_documents enable row level security;

drop policy if exists "partnership documents admin all" on public.partnership_documents;
create policy "partnership documents admin all" on public.partnership_documents
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

insert into storage.buckets (id, name, public)
values ('partnership-docs', 'partnership-docs', false)
on conflict (id) do nothing;

drop policy if exists "partnership-docs admin select" on storage.objects;
create policy "partnership-docs admin select" on storage.objects
  for select to authenticated
  using (bucket_id = 'partnership-docs' and public.is_admin());

drop policy if exists "partnership-docs admin insert" on storage.objects;
create policy "partnership-docs admin insert" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'partnership-docs' and public.is_admin());

drop policy if exists "partnership-docs admin update" on storage.objects;
create policy "partnership-docs admin update" on storage.objects
  for update to authenticated
  using (bucket_id = 'partnership-docs' and public.is_admin())
  with check (bucket_id = 'partnership-docs' and public.is_admin());

drop policy if exists "partnership-docs admin delete" on storage.objects;
create policy "partnership-docs admin delete" on storage.objects
  for delete to authenticated
  using (bucket_id = 'partnership-docs' and public.is_admin());
