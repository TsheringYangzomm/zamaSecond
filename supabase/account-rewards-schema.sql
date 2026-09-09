-- Zama customer accounts and rewards
-- Run in Supabase SQL editor AFTER cms-schema.sql, commerce-schema.sql,
-- checkout-schema.sql, and coupons-schema.sql.

create table if not exists public.reward_settings (
  id text primary key default 'default',
  daily_check_in_rewards integer[] not null default '{1,5,5,10,10,15,15}',
  review_reward_points integer not null default 20 check (review_reward_points > 0),
  points_per_ngultrum numeric(12, 2) not null default 10 check (points_per_ngultrum > 0),
  minimum_redemption_points integer not null default 100 check (minimum_redemption_points > 0),
  updated_at timestamptz not null default now()
);

insert into public.reward_settings (id)
values ('default')
on conflict (id) do nothing;

create table if not exists public.customer_points_ledger (
  id uuid primary key default gen_random_uuid(),
  customer_id text not null references public.customers (id) on delete cascade,
  points_delta integer not null check (points_delta <> 0),
  source text not null check (source in ('daily_check_in', 'customer_review', 'admin_adjustment', 'redemption_hold', 'redemption_release')),
  source_id text,
  reason text not null default '',
  created_at timestamptz not null default now(),
  created_by text
);

create unique index if not exists customer_points_automatic_source_idx
  on public.customer_points_ledger (customer_id, source, source_id)
  where source_id is not null;
create index if not exists customer_points_customer_idx
  on public.customer_points_ledger (customer_id, created_at desc);

create table if not exists public.customer_check_ins (
  customer_id text not null references public.customers (id) on delete cascade,
  check_in_date date not null,
  streak_day integer not null check (streak_day > 0),
  points_awarded integer not null check (points_awarded > 0),
  created_at timestamptz not null default now(),
  primary key (customer_id, check_in_date)
);

create table if not exists public.customer_saved_items (
  customer_id text not null references public.customers (id) on delete cascade,
  product_id text not null references public.products (id) on delete cascade,
  kind text not null check (kind in ('wishlist', 'history')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (customer_id, product_id, kind)
);

create index if not exists customer_saved_items_customer_idx
  on public.customer_saved_items (customer_id, kind, updated_at desc);

create table if not exists public.points_redemptions (
  id uuid primary key default gen_random_uuid(),
  customer_id text not null references public.customers (id) on delete cascade,
  points integer not null check (points > 0),
  wallet_amount numeric(12, 2) not null check (wallet_amount > 0),
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  reason text not null default '',
  requested_at timestamptz not null default now(),
  reviewed_at timestamptz,
  reviewed_by text
);

create index if not exists points_redemptions_customer_idx
  on public.points_redemptions (customer_id, requested_at desc);

create table if not exists public.wallet_ledger (
  id uuid primary key default gen_random_uuid(),
  customer_id text not null references public.customers (id) on delete cascade,
  entry_type text not null check (entry_type in ('credit', 'withdrawal', 'hold', 'release')),
  amount numeric(12, 2) not null check (amount > 0),
  source text not null default '',
  source_id text,
  description text not null default '',
  status text not null default 'completed' check (status in ('completed', 'pending', 'failed')),
  created_at timestamptz not null default now(),
  created_by text
);

create index if not exists wallet_ledger_customer_idx
  on public.wallet_ledger (customer_id, created_at desc);

create table if not exists public.customer_bank_accounts (
  id uuid primary key default gen_random_uuid(),
  customer_id text not null references public.customers (id) on delete cascade,
  bank_code text not null,
  bank_name text not null,
  account_name text not null default '',
  account_number text not null,
  is_default boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists customer_bank_accounts_customer_idx
  on public.customer_bank_accounts (customer_id, created_at desc);

create table if not exists public.wallet_withdrawals (
  id uuid primary key default gen_random_uuid(),
  customer_id text not null references public.customers (id) on delete cascade,
  bank_account_id uuid not null references public.customer_bank_accounts (id) on delete restrict,
  amount numeric(12, 2) not null check (amount > 0),
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected', 'paid')),
  otp_verified boolean not null default false,
  requested_at timestamptz not null default now(),
  reviewed_at timestamptz,
  reviewed_by text,
  paid_at timestamptz,
  note text not null default ''
);

create index if not exists wallet_withdrawals_customer_idx
  on public.wallet_withdrawals (customer_id, requested_at desc);

-- Customer-submitted reviews share the existing CMS reviews table so the
-- existing admin Reviews section remains the moderation destination.
alter table public.reviews
  add column if not exists customer_id text,
  add column if not exists order_id text,
  add column if not exists source text not null default 'cms',
  add column if not exists moderation_status text not null default 'approved',
  add column if not exists points_awarded integer not null default 0,
  add column if not exists submitted_at timestamptz;

create unique index if not exists customer_reviews_order_unique_idx
  on public.reviews (order_id)
  where order_id is not null;
create index if not exists customer_reviews_customer_idx
  on public.reviews (customer_id, submitted_at desc)
  where customer_id is not null;

update public.reviews
set source = 'cms', moderation_status = 'approved'
where source is null or source = '' or source = 'cms';

alter table public.reward_settings enable row level security;
alter table public.customer_points_ledger enable row level security;
alter table public.customer_check_ins enable row level security;
alter table public.customer_saved_items enable row level security;
alter table public.points_redemptions enable row level security;
alter table public.wallet_ledger enable row level security;
alter table public.customer_bank_accounts enable row level security;
alter table public.wallet_withdrawals enable row level security;

drop policy if exists "reward settings admin all" on public.reward_settings;
create policy "reward settings admin all" on public.reward_settings
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists "customer points admin all" on public.customer_points_ledger;
create policy "customer points admin all" on public.customer_points_ledger
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists "customer check ins admin all" on public.customer_check_ins;
create policy "customer check ins admin all" on public.customer_check_ins
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists "customer saved items admin all" on public.customer_saved_items;
create policy "customer saved items admin all" on public.customer_saved_items
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists "points redemptions admin all" on public.points_redemptions;
create policy "points redemptions admin all" on public.points_redemptions
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists "wallet ledger admin all" on public.wallet_ledger;
create policy "wallet ledger admin all" on public.wallet_ledger
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists "customer bank accounts admin all" on public.customer_bank_accounts;
create policy "customer bank accounts admin all" on public.customer_bank_accounts
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists "wallet withdrawals admin all" on public.wallet_withdrawals;
create policy "wallet withdrawals admin all" on public.wallet_withdrawals
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

create or replace function public.account_customer_id()
returns text
language sql
security definer
set search_path = public
stable
as $$
  select id from public.customers where lower(email) = lower(auth.email()) limit 1;
$$;

create or replace function public.current_check_in_streak(p_customer_id text)
returns integer
language plpgsql
security definer
set search_path = public
stable
as $$
declare
  v_cursor date := (now() at time zone 'Asia/Thimphu')::date;
  v_streak integer := 0;
begin
  if not exists (select 1 from public.customer_check_ins where customer_id = p_customer_id and check_in_date = v_cursor) then
    v_cursor := v_cursor - 1;
  end if;
  while exists (select 1 from public.customer_check_ins where customer_id = p_customer_id and check_in_date = v_cursor) loop
    v_streak := v_streak + 1;
    v_cursor := v_cursor - 1;
  end loop;
  return v_streak;
end;
$$;

create or replace function public.available_wallet_balance(p_customer_id text)
returns numeric
language sql
security definer
set search_path = public
stable
as $$
  select greatest(0, coalesce(sum(case when entry_type in ('credit', 'release') then amount else -amount end), 0))
  from public.wallet_ledger
  where customer_id = p_customer_id and status = 'completed';
$$;

create or replace function public.account_snapshot_for_customer(p_customer_id text)
returns jsonb
language plpgsql
security definer
set search_path = public
stable
as $$
declare
  v_settings public.reward_settings;
begin
  select * into v_settings from public.reward_settings where id = 'default';
  return jsonb_build_object(
    'customer_id', p_customer_id,
    'points_balance', coalesce((select sum(points_delta) from public.customer_points_ledger where customer_id = p_customer_id), 0),
    'current_streak', public.current_check_in_streak(p_customer_id),
    'points_ledger', coalesce((select jsonb_agg(to_jsonb(entry) order by entry.created_at desc) from public.customer_points_ledger entry where entry.customer_id = p_customer_id), '[]'::jsonb),
    'check_ins', coalesce((select jsonb_agg(to_jsonb(entry) order by entry.check_in_date desc) from public.customer_check_ins entry where entry.customer_id = p_customer_id), '[]'::jsonb),
    'saved_items', coalesce((select jsonb_agg(to_jsonb(entry) order by entry.updated_at desc) from public.customer_saved_items entry where entry.customer_id = p_customer_id), '[]'::jsonb),
    'redemptions', coalesce((select jsonb_agg(to_jsonb(entry) order by entry.requested_at desc) from public.points_redemptions entry where entry.customer_id = p_customer_id), '[]'::jsonb),
    'wallet_balance', public.available_wallet_balance(p_customer_id),
    'wallet_ledger', coalesce((select jsonb_agg(to_jsonb(entry) order by entry.created_at desc) from public.wallet_ledger entry where entry.customer_id = p_customer_id), '[]'::jsonb),
    'bank_accounts', coalesce((select jsonb_agg(jsonb_build_object('id', entry.id, 'customer_id', entry.customer_id, 'bank_code', entry.bank_code, 'bank_name', entry.bank_name, 'account_name', entry.account_name, 'masked_account_number', '•••• ' || right(regexp_replace(entry.account_number, '\s', '', 'g'), 4), 'is_default', entry.is_default, 'created_at', entry.created_at, 'updated_at', entry.updated_at) order by entry.created_at desc) from public.customer_bank_accounts entry where entry.customer_id = p_customer_id), '[]'::jsonb),
    'withdrawals', coalesce((select jsonb_agg(to_jsonb(entry) order by entry.requested_at desc) from public.wallet_withdrawals entry where entry.customer_id = p_customer_id), '[]'::jsonb),
    'reviews', coalesce((select jsonb_agg(jsonb_build_object('id', entry.id, 'customer_id', entry.customer_id, 'order_id', entry.order_id, 'product_id', entry.product_id, 'rating', entry.rating, 'title', entry.title, 'body', entry.body, 'moderation_status', entry.moderation_status, 'points_awarded', entry.points_awarded, 'submitted_at', entry.submitted_at, 'published', entry.published) order by entry.submitted_at desc) from public.reviews entry where entry.customer_id = p_customer_id), '[]'::jsonb),
    'settings', to_jsonb(v_settings)
  );
end;
$$;

create or replace function public.get_my_account_snapshot()
returns jsonb
language plpgsql
security definer
set search_path = public
stable
as $$
declare
  v_customer_id text := public.account_customer_id();
begin
  if v_customer_id is null then return jsonb_build_object('status', 'customer_not_found'); end if;
  return public.account_snapshot_for_customer(v_customer_id);
end;
$$;

create or replace function public.claim_daily_check_in()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_customer_id text := public.account_customer_id();
  v_date date := (now() at time zone 'Asia/Thimphu')::date;
  v_streak integer;
  v_points integer;
  v_settings public.reward_settings;
begin
  if v_customer_id is null then return jsonb_build_object('status', 'customer_not_found'); end if;
  select * into v_settings from public.reward_settings where id = 'default';
  if exists (select 1 from public.customer_check_ins where customer_id = v_customer_id and check_in_date = v_date) then
    return jsonb_build_object('status', 'already_claimed', 'points_awarded', 0, 'snapshot', public.account_snapshot_for_customer(v_customer_id));
  end if;
  v_streak := public.current_check_in_streak(v_customer_id) + 1;
  v_points := coalesce(v_settings.daily_check_in_rewards[least(v_streak, array_length(v_settings.daily_check_in_rewards, 1))], 0);
  insert into public.customer_check_ins (customer_id, check_in_date, streak_day, points_awarded)
  values (v_customer_id, v_date, v_streak, v_points)
  on conflict do nothing;
  insert into public.customer_points_ledger (customer_id, points_delta, source, source_id, reason)
  values (v_customer_id, v_points, 'daily_check_in', v_date::text, 'Daily check-in')
  on conflict do nothing;
  return jsonb_build_object('status', 'ok', 'points_awarded', v_points, 'snapshot', public.account_snapshot_for_customer(v_customer_id));
end;
$$;

create or replace function public.toggle_saved_item(p_product_id text, p_kind text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_customer_id text := public.account_customer_id();
begin
  if v_customer_id is null then return jsonb_build_object('status', 'customer_not_found'); end if;
  if p_kind not in ('wishlist', 'history') then return jsonb_build_object('status', 'invalid_kind'); end if;
  if exists (select 1 from public.customer_saved_items where customer_id = v_customer_id and product_id = p_product_id and kind = p_kind) then
    delete from public.customer_saved_items where customer_id = v_customer_id and product_id = p_product_id and kind = p_kind;
  else
    insert into public.customer_saved_items (customer_id, product_id, kind) values (v_customer_id, p_product_id, p_kind);
  end if;
  return public.account_snapshot_for_customer(v_customer_id);
end;
$$;

create or replace function public.record_saved_item(p_product_id text, p_kind text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_customer_id text := public.account_customer_id();
begin
  if v_customer_id is null then return jsonb_build_object('status', 'customer_not_found'); end if;
  insert into public.customer_saved_items (customer_id, product_id, kind)
  values (v_customer_id, p_product_id, p_kind)
  on conflict (customer_id, product_id, kind) do update set updated_at = now();
  return public.account_snapshot_for_customer(v_customer_id);
end;
$$;

create or replace function public.submit_customer_review(p_order_id text, p_rating integer, p_body text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_customer_id text := public.account_customer_id();
  v_order public.orders;
  v_product_id text;
  v_review_id text;
  v_points integer;
  v_settings public.reward_settings;
begin
  if v_customer_id is null then return jsonb_build_object('status', 'customer_not_found'); end if;
  if p_rating < 1 or p_rating > 5 or length(trim(coalesce(p_body, ''))) > 2000 then return jsonb_build_object('status', 'invalid_review'); end if;
  select * into v_order from public.orders where id = p_order_id and customer_id = v_customer_id;
  if v_order.id is null or v_order.status <> 'delivered' then return jsonb_build_object('status', 'order_not_reviewable'); end if;
  if exists (select 1 from public.reviews where order_id = p_order_id) then return jsonb_build_object('status', 'already_reviewed'); end if;
  select item ->> 'product_id' into v_product_id from jsonb_array_elements(v_order.items) item limit 1;
  if v_product_id is null or not exists (select 1 from public.products where id = v_product_id) then return jsonb_build_object('status', 'product_not_found'); end if;
  select * into v_settings from public.reward_settings where id = 'default';
  v_review_id := 'customer-review-' || gen_random_uuid()::text;
  insert into public.reviews (id, product_id, customer_id, order_id, source, moderation_status, author, location, rating, date, title, body, verified, sort_order, published, points_awarded, submitted_at)
  select v_review_id, v_product_id, v_customer_id, p_order_id, 'customer', 'pending', c.name, c.area, p_rating, to_char(now() at time zone 'Asia/Thimphu', 'DD Mon YYYY'), 'Order review', trim(coalesce(p_body, '')), true, 0, false, v_settings.review_reward_points, now()
  from public.customers c where c.id = v_customer_id;
  v_points := v_settings.review_reward_points;
  insert into public.customer_points_ledger (customer_id, points_delta, source, source_id, reason)
  values (v_customer_id, v_points, 'customer_review', v_review_id, 'Review for order ' || p_order_id)
  on conflict do nothing;
  return jsonb_build_object('status', 'ok', 'points_awarded', v_points, 'review', (select to_jsonb(r) from public.reviews r where r.id = v_review_id), 'snapshot', public.account_snapshot_for_customer(v_customer_id));
end;
$$;

create or replace function public.request_points_redemption(p_points integer)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_customer_id text := public.account_customer_id();
  v_settings public.reward_settings;
  v_balance integer;
  v_amount numeric;
  v_id uuid;
begin
  if v_customer_id is null then return jsonb_build_object('status', 'customer_not_found'); end if;
  select * into v_settings from public.reward_settings where id = 'default';
  select coalesce(sum(points_delta), 0) into v_balance from public.customer_points_ledger where customer_id = v_customer_id;
  if p_points < v_settings.minimum_redemption_points or p_points > v_balance then return jsonb_build_object('status', 'invalid_amount', 'error', 'Choose a valid points amount for redemption.'); end if;
  v_amount := floor(p_points / v_settings.points_per_ngultrum);
  v_id := gen_random_uuid();
  insert into public.points_redemptions (id, customer_id, points, wallet_amount, reason)
  values (v_id, v_customer_id, p_points, v_amount, 'Customer requested wallet credit');
  insert into public.customer_points_ledger (customer_id, points_delta, source, source_id, reason)
  values (v_customer_id, -p_points, 'redemption_hold', v_id::text, 'Points redemption pending admin approval');
  return jsonb_build_object('status', 'ok', 'redemption_id', v_id, 'snapshot', public.account_snapshot_for_customer(v_customer_id));
end;
$$;

create or replace function public.save_customer_bank_account(p_bank_code text, p_account_name text, p_account_number text, p_is_default boolean default false)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_customer_id text := public.account_customer_id();
  v_bank_name text := case p_bank_code when 'bob' then 'Bank of Bhutan' when 'bnb' then 'Bhutan National Bank' when 'druk-pnb' then 'Druk PNB Bank' when 't-bank' then 'T-Bank' when 'bdbl' then 'Bhutan Development Bank' else p_bank_code end;
begin
  if v_customer_id is null then return jsonb_build_object('status', 'customer_not_found'); end if;
  if length(regexp_replace(coalesce(p_account_number, ''), '\s', '', 'g')) < 4 or trim(coalesce(p_account_name, '')) = '' then return jsonb_build_object('status', 'invalid_bank_account'); end if;
  if p_is_default then update public.customer_bank_accounts set is_default = false where customer_id = v_customer_id; end if;
  insert into public.customer_bank_accounts (customer_id, bank_code, bank_name, account_name, account_number, is_default)
  values (v_customer_id, p_bank_code, v_bank_name, trim(p_account_name), trim(p_account_number), p_is_default or not exists (select 1 from public.customer_bank_accounts where customer_id = v_customer_id));
  return public.account_snapshot_for_customer(v_customer_id);
end;
$$;

create or replace function public.request_withdrawal_otp(p_bank_account_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_customer_id text := public.account_customer_id();
begin
  if v_customer_id is null or not exists (select 1 from public.customer_bank_accounts where id = p_bank_account_id and customer_id = v_customer_id) then return jsonb_build_object('status', 'invalid_bank_account'); end if;
  return jsonb_build_object('status', 'otp_provider_not_configured', 'message', 'OTP delivery needs an SMS provider configuration.');
end;
$$;

create or replace function public.request_wallet_withdrawal(p_bank_account_id uuid, p_amount numeric, p_otp text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_customer_id text := public.account_customer_id();
  v_balance numeric;
  v_id uuid;
begin
  if v_customer_id is null or not exists (select 1 from public.customer_bank_accounts where id = p_bank_account_id and customer_id = v_customer_id) then return jsonb_build_object('status', 'invalid_bank_account'); end if;
  -- The site currently has no production SMS provider. Keep the RPC closed until
  -- the provider-backed challenge flow is configured; the client-side fallback is
  -- only used when Supabase is not configured for local development.
  if coalesce(current_setting('app.settings.sms_provider_configured', true), 'false') <> 'true' then return jsonb_build_object('status', 'otp_provider_not_configured', 'message', 'OTP delivery needs an SMS provider configuration.'); end if;
  if p_otp !~ '^[0-9]{6}$' then return jsonb_build_object('status', 'invalid_otp', 'error', 'Enter the 6-digit OTP sent to your registered phone number.'); end if;
  select public.available_wallet_balance(v_customer_id) into v_balance;
  if p_amount <= 0 or p_amount > v_balance then return jsonb_build_object('status', 'insufficient_wallet_balance'); end if;
  v_id := gen_random_uuid();
  insert into public.wallet_withdrawals (id, customer_id, bank_account_id, amount, otp_verified, note)
  values (v_id, v_customer_id, p_bank_account_id, p_amount, true, 'Awaiting admin approval');
  insert into public.wallet_ledger (customer_id, entry_type, amount, source, source_id, description, status)
  values (v_customer_id, 'hold', p_amount, 'wallet_withdrawal', v_id::text, 'Withdrawal reserved pending admin approval', 'completed');
  return jsonb_build_object('status', 'ok', 'withdrawal_id', v_id, 'snapshot', public.account_snapshot_for_customer(v_customer_id));
end;
$$;

create or replace function public.get_admin_account_snapshot(p_customer_id text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then return jsonb_build_object('status', 'forbidden'); end if;
  return jsonb_build_object('status', 'ok', 'customer', (select to_jsonb(c) from public.customers c where c.id = p_customer_id), 'snapshot', public.account_snapshot_for_customer(p_customer_id));
end;
$$;

create or replace function public.admin_adjust_points(p_customer_id text, p_points_delta integer, p_reason text, p_admin_email text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then return jsonb_build_object('status', 'forbidden'); end if;
  if p_points_delta = 0 or trim(coalesce(p_reason, '')) = '' then return jsonb_build_object('status', 'invalid_adjustment'); end if;
  if p_points_delta < 0 and abs(p_points_delta) > coalesce((select sum(points_delta) from public.customer_points_ledger where customer_id = p_customer_id), 0) then return jsonb_build_object('status', 'insufficient_points'); end if;
  insert into public.customer_points_ledger (customer_id, points_delta, source, reason, created_by)
  values (p_customer_id, p_points_delta, 'admin_adjustment', trim(p_reason), p_admin_email);
  return jsonb_build_object('status', 'ok', 'snapshot', public.account_snapshot_for_customer(p_customer_id));
end;
$$;

create or replace function public.admin_save_reward_settings(p_daily_check_in_rewards integer[], p_review_reward_points integer, p_points_per_ngultrum numeric, p_minimum_redemption_points integer)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then return jsonb_build_object('status', 'forbidden'); end if;
  if array_length(p_daily_check_in_rewards, 1) is null or p_review_reward_points <= 0 or p_points_per_ngultrum <= 0 or p_minimum_redemption_points <= 0 then return jsonb_build_object('status', 'invalid_settings'); end if;
  update public.reward_settings set daily_check_in_rewards = p_daily_check_in_rewards, review_reward_points = p_review_reward_points, points_per_ngultrum = p_points_per_ngultrum, minimum_redemption_points = p_minimum_redemption_points where id = 'default';
  return jsonb_build_object('status', 'ok');
end;
$$;

create or replace function public.admin_approve_points_redemption(p_redemption_id uuid, p_admin_email text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.points_redemptions;
begin
  if not public.is_admin() then return jsonb_build_object('status', 'forbidden'); end if;
  select * into v_row from public.points_redemptions where id = p_redemption_id for update;
  if v_row.id is null or v_row.status <> 'pending' then return jsonb_build_object('status', 'already_reviewed'); end if;
  update public.points_redemptions set status = 'approved', reviewed_at = now(), reviewed_by = p_admin_email where id = p_redemption_id;
  insert into public.wallet_ledger (customer_id, entry_type, amount, source, source_id, description, status, created_by)
  values (v_row.customer_id, 'credit', v_row.wallet_amount, 'points_redemption', v_row.id::text, 'Points redemption', 'completed', p_admin_email);
  return jsonb_build_object('status', 'ok');
end;
$$;

create or replace function public.admin_reject_points_redemption(p_redemption_id uuid, p_admin_email text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.points_redemptions;
begin
  if not public.is_admin() then return jsonb_build_object('status', 'forbidden'); end if;
  select * into v_row from public.points_redemptions where id = p_redemption_id for update;
  if v_row.id is null or v_row.status <> 'pending' then return jsonb_build_object('status', 'already_reviewed'); end if;
  update public.points_redemptions set status = 'rejected', reviewed_at = now(), reviewed_by = p_admin_email where id = p_redemption_id;
  insert into public.customer_points_ledger (customer_id, points_delta, source, source_id, reason, created_by)
  values (v_row.customer_id, v_row.points, 'redemption_release', v_row.id::text, 'Rejected points redemption restored', p_admin_email);
  return jsonb_build_object('status', 'ok');
end;
$$;

create or replace function public.admin_review_withdrawal(p_withdrawal_id uuid, p_action text, p_admin_email text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.wallet_withdrawals;
begin
  if not public.is_admin() then return jsonb_build_object('status', 'forbidden'); end if;
  select * into v_row from public.wallet_withdrawals where id = p_withdrawal_id for update;
  if v_row.id is null then return jsonb_build_object('status', 'not_found'); end if;
  if p_action = 'reject' and v_row.status in ('pending', 'approved') then
    update public.wallet_withdrawals set status = 'rejected', reviewed_at = now(), reviewed_by = p_admin_email, note = 'Rejected by admin' where id = p_withdrawal_id;
    insert into public.wallet_ledger (customer_id, entry_type, amount, source, source_id, description, status, created_by)
    values (v_row.customer_id, 'release', v_row.amount, 'wallet_withdrawal', v_row.id::text, 'Rejected withdrawal released', 'completed', p_admin_email);
  elsif p_action = 'approve' and v_row.status = 'pending' then
    update public.wallet_withdrawals set status = 'approved', reviewed_at = now(), reviewed_by = p_admin_email, note = 'Approved; awaiting payout' where id = p_withdrawal_id;
  elsif p_action = 'paid' and v_row.status = 'approved' then
    update public.wallet_withdrawals set status = 'paid', paid_at = now(), reviewed_at = coalesce(reviewed_at, now()), reviewed_by = coalesce(reviewed_by, p_admin_email), note = 'Marked paid by admin' where id = p_withdrawal_id;
    update public.wallet_ledger set description = 'Bank withdrawal paid', created_by = p_admin_email where source = 'wallet_withdrawal' and source_id = p_withdrawal_id::text and entry_type = 'hold';
  else
    return jsonb_build_object('status', 'invalid_transition');
  end if;
  return jsonb_build_object('status', 'ok');
end;
$$;

create or replace function public.admin_reveal_bank_account(p_bank_account_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then return jsonb_build_object('status', 'forbidden'); end if;
  return (select jsonb_build_object('account_number', account_number) from public.customer_bank_accounts where id = p_bank_account_id);
end;
$$;

create or replace function public.admin_remove_saved_item(p_customer_id text, p_product_id text, p_kind text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then return jsonb_build_object('status', 'forbidden'); end if;
  delete from public.customer_saved_items where customer_id = p_customer_id and product_id = p_product_id and kind = p_kind;
  return jsonb_build_object('status', 'ok');
end;
$$;

revoke all on function public.account_customer_id() from public;
revoke all on function public.current_check_in_streak(text) from public;
revoke all on function public.available_wallet_balance(text) from public;
revoke all on function public.account_snapshot_for_customer(text) from public;
revoke all on function public.get_my_account_snapshot() from public;
revoke all on function public.claim_daily_check_in() from public;
revoke all on function public.toggle_saved_item(text, text) from public;
revoke all on function public.record_saved_item(text, text) from public;
revoke all on function public.submit_customer_review(text, integer, text) from public;
revoke all on function public.request_points_redemption(integer) from public;
revoke all on function public.save_customer_bank_account(text, text, text, boolean) from public;
revoke all on function public.request_withdrawal_otp(uuid) from public;
revoke all on function public.request_wallet_withdrawal(uuid, numeric, text) from public;
revoke all on function public.get_admin_account_snapshot(text) from public;
revoke all on function public.admin_adjust_points(text, integer, text, text) from public;
revoke all on function public.admin_save_reward_settings(integer[], integer, numeric, integer) from public;
revoke all on function public.admin_approve_points_redemption(uuid, text) from public;
revoke all on function public.admin_reject_points_redemption(uuid, text) from public;
revoke all on function public.admin_review_withdrawal(uuid, text, text) from public;
revoke all on function public.admin_reveal_bank_account(uuid) from public;
revoke all on function public.admin_remove_saved_item(text, text, text) from public;

grant execute on function public.get_my_account_snapshot() to authenticated;
grant execute on function public.claim_daily_check_in() to authenticated;
grant execute on function public.toggle_saved_item(text, text) to authenticated;
grant execute on function public.record_saved_item(text, text) to authenticated;
grant execute on function public.submit_customer_review(text, integer, text) to authenticated;
grant execute on function public.request_points_redemption(integer) to authenticated;
grant execute on function public.save_customer_bank_account(text, text, text, boolean) to authenticated;
grant execute on function public.request_withdrawal_otp(uuid) to authenticated;
grant execute on function public.request_wallet_withdrawal(uuid, numeric, text) to authenticated;
grant execute on function public.get_admin_account_snapshot(text) to authenticated;
grant execute on function public.admin_adjust_points(text, integer, text, text) to authenticated;
grant execute on function public.admin_save_reward_settings(integer[], integer, numeric, integer) to authenticated;
grant execute on function public.admin_approve_points_redemption(uuid, text) to authenticated;
grant execute on function public.admin_reject_points_redemption(uuid, text) to authenticated;
grant execute on function public.admin_review_withdrawal(uuid, text, text) to authenticated;
grant execute on function public.admin_reveal_bank_account(uuid) to authenticated;
grant execute on function public.admin_remove_saved_item(text, text, text) to authenticated;

notify pgrst, 'reload schema';
