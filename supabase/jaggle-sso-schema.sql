-- Zama Jaggle SSO bridge
-- Run after the CMS and commerce schemas. The tables below are server-only:
-- browser clients receive only a short-lived, single-use handoff token.

create table if not exists public.jaggle_identities (
  jaggle_user_id text primary key,
  email text not null unique,
  customer_id text references public.customers (id) on delete set null,
  first_name text not null default '',
  last_name text not null default '',
  created_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now()
);

create index if not exists jaggle_identities_customer_idx
  on public.jaggle_identities (customer_id);

create table if not exists public.jaggle_sso_handoffs (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  audience text not null check (audience in ('customer', 'admin')),
  supabase_token_hash text not null,
  expires_at timestamptz not null default (now() + interval '1 minute'),
  consumed_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists jaggle_sso_handoffs_expiry_idx
  on public.jaggle_sso_handoffs (expires_at)
  where consumed_at is null;

alter table public.jaggle_identities enable row level security;
alter table public.jaggle_sso_handoffs enable row level security;

-- No public or authenticated policies are intentional. The Netlify function
-- uses the Supabase service role, while the service role bypasses RLS.
revoke all on public.jaggle_identities from public, anon, authenticated;
revoke all on public.jaggle_sso_handoffs from public, anon, authenticated;

create or replace function public.consume_jaggle_sso_handoff(
  p_handoff_id uuid,
  p_audience text
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_handoff public.jaggle_sso_handoffs;
begin
  update public.jaggle_sso_handoffs
  set consumed_at = now()
  where id = p_handoff_id
    and audience = p_audience
    and consumed_at is null
    and expires_at > now()
  returning * into v_handoff;

  if v_handoff.id is null then
    return jsonb_build_object('status', 'invalid_or_expired');
  end if;

  return jsonb_build_object(
    'status', 'ok',
    'email', v_handoff.email,
    'tokenHash', v_handoff.supabase_token_hash
  );
end;
$$;

revoke all on function public.consume_jaggle_sso_handoff(uuid, text) from public, anon, authenticated;
grant execute on function public.consume_jaggle_sso_handoff(uuid, text) to service_role;

notify pgrst, 'reload schema';

