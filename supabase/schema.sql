-- Zama waitlist storage
-- Run this in the Supabase SQL editor for the project that will hold launch-interest emails.
-- Emails are collected through create_launch_interest() (see below); anonymous users get
-- no direct table access. The team reads rows through the Supabase dashboard, which uses
-- the postgres role and bypasses row-level security.

create table if not exists public.launch_interests (
  id bigint generated always as identity primary key,
  email text not null,
  source text not null default 'hero-waitlist',
  area text,
  full_name text,
  items jsonb,
  created_at timestamptz not null default now(),
  unique (email)
);

create index if not exists launch_interests_created_at_idx
  on public.launch_interests (created_at desc);

alter table public.launch_interests enable row level security;

-- No select policy: inserts flow through create_launch_interest() below, and the team
-- reads rows from the dashboard.

create or replace function public.create_launch_interest(
  p_email text,
  p_source text default 'hero-waitlist',
  p_area text default null,
  p_full_name text default null,
  p_items jsonb default null
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id bigint;
begin
  if p_email is null or p_email = '' or char_length(p_email) > 254
     or p_email !~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$' then
    return jsonb_build_object('status', 'invalid_email');
  end if;

  if p_source = 'membership' and (p_full_name is null or btrim(p_full_name) = '') then
    return jsonb_build_object('status', 'invalid_name');
  end if;

  insert into public.launch_interests (email, source, area, full_name, items)
  values (lower(p_email), p_source, p_area, p_full_name, p_items)
  on conflict (email) do nothing
  returning id into v_id;

  if v_id is null then
    return jsonb_build_object('status', 'duplicate');
  end if;

  return jsonb_build_object('status', 'ok', 'submissionId', v_id::text);
end;
$$;

revoke all on function public.create_launch_interest(text, text, text, text, jsonb) from public;
grant execute on function public.create_launch_interest(text, text, text, text, jsonb) to anon;
