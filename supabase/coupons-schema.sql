-- Zama coupons
-- Run this in the Supabase SQL editor AFTER cms-schema.sql,
-- commerce-schema.sql, and checkout-schema.sql.
-- It adds coupon campaigns, customer claims, redemptions, and the secure
-- checkout functions used by the public site.

create table if not exists public.coupons (
  id text primary key default ('coupon-' || gen_random_uuid()::text),
  code text not null unique,
  title text not null default '',
  description text not null default '',
  discount_type text not null check (discount_type in ('percentage', 'fixed')),
  discount_value numeric(12, 2) not null check (discount_value > 0),
  maximum_discount_amount numeric(12, 2),
  minimum_order_amount numeric(12, 2) not null default 0 check (minimum_order_amount >= 0),
  starts_at timestamptz not null default now(),
  expires_at timestamptz,
  usage_limit integer check (usage_limit is null or usage_limit > 0),
  per_customer_limit integer not null default 1 check (per_customer_limit > 0),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint coupons_date_order check (expires_at is null or expires_at > starts_at),
  constraint coupons_code_normalized check (code <> '' and code = upper(trim(code))),
  constraint coupons_percentage_cap check (maximum_discount_amount is null or (discount_type = 'percentage' and maximum_discount_amount > 0)),
  constraint coupons_percentage_value check (discount_type <> 'percentage' or discount_value <= 100)
);

create unique index if not exists coupons_code_upper_unique_idx on public.coupons (upper(code));

create table if not exists public.coupon_product_targets (
  coupon_id text not null references public.coupons (id) on delete cascade,
  product_id text not null references public.products (id) on delete cascade,
  primary key (coupon_id, product_id)
);

create table if not exists public.coupon_category_targets (
  coupon_id text not null references public.coupons (id) on delete cascade,
  category text not null,
  primary key (coupon_id, category)
);

create table if not exists public.coupon_claims (
  coupon_id text not null references public.coupons (id) on delete cascade,
  customer_id text not null references public.customers (id) on delete cascade,
  claimed_at timestamptz not null default now(),
  primary key (coupon_id, customer_id)
);

create table if not exists public.coupon_redemptions (
  id uuid primary key default gen_random_uuid(),
  coupon_id text not null references public.coupons (id) on delete restrict,
  customer_id text not null references public.customers (id) on delete restrict,
  order_id text not null unique references public.orders (id) on delete cascade,
  discount_amount numeric(12, 2) not null check (discount_amount >= 0),
  status text not null default 'redeemed' check (status in ('redeemed', 'restored')),
  redeemed_at timestamptz not null default now(),
  restored_at timestamptz
);

create index if not exists coupon_claims_customer_idx on public.coupon_claims (customer_id);
create index if not exists coupon_redemptions_coupon_idx on public.coupon_redemptions (coupon_id, status);
create index if not exists coupon_redemptions_customer_idx on public.coupon_redemptions (customer_id, status);

alter table public.orders
  add column if not exists subtotal numeric(12, 2) not null default 0,
  add column if not exists coupon_id text references public.coupons (id) on delete set null,
  add column if not exists coupon_code text,
  add column if not exists coupon_discount numeric(12, 2) not null default 0;

alter table public.coupons enable row level security;
alter table public.coupon_product_targets enable row level security;
alter table public.coupon_category_targets enable row level security;
alter table public.coupon_claims enable row level security;
alter table public.coupon_redemptions enable row level security;

drop policy if exists "coupons admin all" on public.coupons;
create policy "coupons admin all" on public.coupons
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "coupon product targets admin all" on public.coupon_product_targets;
create policy "coupon product targets admin all" on public.coupon_product_targets
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "coupon category targets admin all" on public.coupon_category_targets;
create policy "coupon category targets admin all" on public.coupon_category_targets
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "coupon claims admin all" on public.coupon_claims;
create policy "coupon claims admin all" on public.coupon_claims
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "coupon redemptions admin all" on public.coupon_redemptions;
create policy "coupon redemptions admin all" on public.coupon_redemptions
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop trigger if exists coupons_set_updated_at on public.coupons;
create trigger coupons_set_updated_at
  before update on public.coupons
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Internal helpers. These never expose the raw tables to customers.
-- ---------------------------------------------------------------------------

create or replace function public.coupon_payload(p_coupon_id text)
returns jsonb
language sql
security definer
set search_path = public
stable
as $$
  select jsonb_build_object(
    'id', c.id,
    'code', upper(c.code),
    'title', c.title,
    'description', c.description,
    'discount_type', c.discount_type,
    'discount_value', c.discount_value,
    'maximum_discount_amount', c.maximum_discount_amount,
    'minimum_order_amount', c.minimum_order_amount,
    'starts_at', c.starts_at,
    'expires_at', c.expires_at,
    'usage_limit', c.usage_limit,
    'per_customer_limit', c.per_customer_limit,
    'active', c.active,
    'created_at', c.created_at,
    'updated_at', c.updated_at,
    'targets',
      coalesce((
        select jsonb_agg(jsonb_build_object('type', 'product', 'value', p.id, 'label', p.name) order by p.name)
        from public.coupon_product_targets t
        join public.products p on p.id = t.product_id
        where t.coupon_id = c.id
      ), '[]'::jsonb)
      || coalesce((
        select jsonb_agg(jsonb_build_object('type', 'category', 'value', t.category, 'label', t.category) order by t.category)
        from public.coupon_category_targets t
        where t.coupon_id = c.id
      ), '[]'::jsonb)
  )
  from public.coupons c
  where c.id = p_coupon_id;
$$;

create or replace function public.coupon_public_available(p_coupon_id text)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.coupons c
    where c.id = p_coupon_id
      and c.active
      and c.starts_at <= now()
      and (c.expires_at is null or c.expires_at > now())
      and (
        c.usage_limit is null
        or (
          select count(*)
          from public.coupon_redemptions r
          where r.coupon_id = c.id and r.status = 'redeemed'
        ) < c.usage_limit
      )
      and (
        exists (
          select 1
          from public.coupon_product_targets t
          join public.products p on p.id = t.product_id
          where t.coupon_id = c.id and p.published
        )
        or exists (
          select 1
          from public.coupon_category_targets t
          join public.products p on p.category = t.category
          where t.coupon_id = c.id and p.published
        )
      )
  );
$$;

create or replace function public.list_public_coupons()
returns jsonb
language sql
security definer
set search_path = public
stable
as $$
  select coalesce(jsonb_agg(public.coupon_payload(c.id) order by c.expires_at nulls last, c.created_at desc), '[]'::jsonb)
  from public.coupons c
  where public.coupon_public_available(c.id);
$$;

create or replace function public.get_my_coupons()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_customer_id text;
begin
  if auth.email() is null then
    return '[]'::jsonb;
  end if;

  select id into v_customer_id
  from public.customers
  where lower(email) = lower(auth.email());

  if v_customer_id is null then
    return '[]'::jsonb;
  end if;

  return coalesce((
    select jsonb_agg(
      public.coupon_payload(c.id)
      || jsonb_build_object(
        'collected', true,
        'redeemed_count_for_customer', (
          select count(*) from public.coupon_redemptions r
          where r.coupon_id = c.id and r.customer_id = v_customer_id and r.status = 'redeemed'
        ),
        'last_redeemed_at', (
          select max(r.redeemed_at) from public.coupon_redemptions r
          where r.coupon_id = c.id and r.customer_id = v_customer_id and r.status = 'redeemed'
        ),
        'can_use', (
          public.coupon_public_available(c.id)
          and (
            select count(*) from public.coupon_redemptions r
            where r.coupon_id = c.id and r.customer_id = v_customer_id and r.status = 'redeemed'
          ) < c.per_customer_limit
        )
      )
      order by cc.claimed_at desc
    )
    from public.coupon_claims cc
    join public.coupons c on c.id = cc.coupon_id
    where cc.customer_id = v_customer_id
  ), '[]'::jsonb);
end;
$$;

create or replace function public.claim_coupon(p_coupon_id text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_customer_id text;
begin
  if auth.email() is null then
    return jsonb_build_object('status', 'not_authenticated', 'error', 'Sign in to collect coupons.');
  end if;

  select id into v_customer_id
  from public.customers
  where lower(email) = lower(auth.email());

  if v_customer_id is null then
    return jsonb_build_object('status', 'customer_not_found', 'error', 'Your customer account could not be found.');
  end if;

  if not public.coupon_public_available(p_coupon_id) then
    return jsonb_build_object('status', 'unavailable', 'error', 'That coupon is no longer available.');
  end if;

  if exists (select 1 from public.coupon_claims where coupon_id = p_coupon_id and customer_id = v_customer_id) then
    return jsonb_build_object('status', 'already_claimed');
  end if;

  insert into public.coupon_claims (coupon_id, customer_id)
  values (p_coupon_id, v_customer_id);

  return jsonb_build_object('status', 'ok');
end;
$$;

create or replace function public.calculate_coupon(
  p_code text,
  p_customer_id text,
  p_items jsonb
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_coupon public.coupons;
  v_item record;
  v_product public.products;
  v_subtotal numeric(12, 2) := 0;
  v_eligible numeric(12, 2) := 0;
  v_discount numeric(12, 2) := 0;
  v_customer_redemptions integer := 0;
  v_total_redemptions integer := 0;
  v_raw_discount numeric(12, 2);
begin
  if trim(coalesce(p_code, '')) = '' then
    return jsonb_build_object('status', 'not_found', 'error_code', 'not_found', 'error', 'Enter a coupon code.');
  end if;

  select * into v_coupon
  from public.coupons
  where upper(code) = upper(trim(p_code))
  for update;

  if v_coupon.id is null then
    return jsonb_build_object('status', 'not_found', 'error_code', 'not_found', 'error', 'That coupon code could not be found.');
  end if;
  if not v_coupon.active then
    return jsonb_build_object('status', 'invalid', 'error_code', 'inactive', 'error', 'That coupon is no longer active.');
  end if;
  if v_coupon.starts_at > now() then
    return jsonb_build_object('status', 'invalid', 'error_code', 'not_started', 'error', 'That coupon is not available yet.');
  end if;
  if v_coupon.expires_at is not null and v_coupon.expires_at <= now() then
    return jsonb_build_object('status', 'invalid', 'error_code', 'expired', 'error', 'That coupon has expired.');
  end if;

  select count(*) into v_total_redemptions
  from public.coupon_redemptions
  where coupon_id = v_coupon.id and status = 'redeemed';
  if v_coupon.usage_limit is not null and v_total_redemptions >= v_coupon.usage_limit then
    return jsonb_build_object('status', 'invalid', 'error_code', 'usage_limit', 'error', 'That coupon has reached its usage limit.');
  end if;

  if p_customer_id is not null then
    select count(*) into v_customer_redemptions
    from public.coupon_redemptions
    where coupon_id = v_coupon.id and customer_id = p_customer_id and status = 'redeemed';
    if v_customer_redemptions >= v_coupon.per_customer_limit then
      return jsonb_build_object('status', 'invalid', 'error_code', 'customer_limit', 'error', 'You have already used that coupon the maximum number of times.');
    end if;
  end if;

  for v_item in
    select * from jsonb_to_recordset(coalesce(p_items, '[]'::jsonb)) as item(product_id text, quantity numeric, price numeric)
  loop
    select * into v_product
    from public.products
    where id = v_item.product_id and published;

    if v_product.id is null or v_product.price_amount is null or v_item.quantity is null or v_item.quantity <= 0 then
      return jsonb_build_object('status', 'invalid', 'error_code', 'invalid', 'error', 'Some order items are not available for coupon pricing.');
    end if;

    v_subtotal := v_subtotal + (v_product.price_amount * v_item.quantity);
    if exists (select 1 from public.coupon_product_targets t where t.coupon_id = v_coupon.id and t.product_id = v_product.id)
       or exists (select 1 from public.coupon_category_targets t where t.coupon_id = v_coupon.id and t.category = v_product.category) then
      v_eligible := v_eligible + (v_product.price_amount * v_item.quantity);
    end if;
  end loop;

  v_subtotal := round(v_subtotal, 2);
  v_eligible := round(v_eligible, 2);
  if v_eligible <= 0 then
    return jsonb_build_object('status', 'invalid', 'error_code', 'ineligible', 'error', 'This coupon does not apply to the items in your order.', 'eligible_subtotal', v_eligible, 'final_total', v_subtotal);
  end if;
  if v_eligible < v_coupon.minimum_order_amount then
    return jsonb_build_object('status', 'invalid', 'error_code', 'minimum_spend', 'error', 'Your eligible items do not meet the minimum spend for this coupon.', 'eligible_subtotal', v_eligible, 'final_total', v_subtotal);
  end if;

  v_raw_discount := case
    when v_coupon.discount_type = 'percentage' then v_eligible * v_coupon.discount_value / 100
    else v_coupon.discount_value
  end;
  if v_coupon.maximum_discount_amount is not null then
    v_raw_discount := least(v_raw_discount, v_coupon.maximum_discount_amount);
  end if;
  v_discount := round(least(v_eligible, greatest(0, v_raw_discount)), 2);

  return jsonb_build_object(
    'status', 'ok',
    'coupon', public.coupon_payload(v_coupon.id),
    'eligible_subtotal', v_eligible,
    'discount_amount', v_discount,
    'final_total', greatest(0, v_subtotal - v_discount)
  );
end;
$$;

create or replace function public.preview_coupon(p_code text, p_items jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_customer_id text;
begin
  if auth.email() is null then
    return jsonb_build_object('status', 'not_authenticated', 'error_code', 'not_authenticated', 'error', 'Sign in to use coupons.');
  end if;
  select id into v_customer_id from public.customers where lower(email) = lower(auth.email());
  if v_customer_id is null then
    return jsonb_build_object('status', 'customer_not_found', 'error_code', 'customer_not_found', 'error', 'Your customer account could not be found.');
  end if;
  return public.calculate_coupon(p_code, v_customer_id, p_items);
end;
$$;

-- Replace the old seven-argument function with the coupon-aware version.
drop function if exists public.place_order(text, jsonb, numeric, text, text, text, text);

create or replace function public.place_order(
  p_customer_id text,
  p_items jsonb,
  p_total numeric,
  p_delivery_area text,
  p_payment_method text,
  p_delivery_date text,
  p_notes text,
  p_coupon_code text default null
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order_id text;
  v_now timestamptz := now();
  v_item record;
  v_product public.products;
  v_items jsonb := '[]'::jsonb;
  v_subtotal numeric(12, 2) := 0;
  v_discount numeric(12, 2) := 0;
  v_coupon_id text;
  v_coupon_result jsonb;
begin
  if p_customer_id is null or not exists (select 1 from public.customers where id = p_customer_id) then
    return jsonb_build_object('status', 'customer_not_found');
  end if;
  if trim(coalesce(p_coupon_code, '')) <> '' and auth.email() is null then
    return jsonb_build_object('status', 'not_authenticated', 'error_code', 'not_authenticated', 'error', 'Sign in to use coupons.');
  end if;
  if auth.email() is not null and not exists (
    select 1 from public.customers where id = p_customer_id and lower(email) = lower(auth.email())
  ) then
    return jsonb_build_object('status', 'customer_not_authorized');
  end if;

  for v_item in
    select * from jsonb_to_recordset(coalesce(p_items, '[]'::jsonb)) as item(product_id text, name text, quantity numeric, price numeric)
  loop
    select * into v_product from public.products where id = v_item.product_id and published;
    if v_product.id is null or v_product.price_amount is null or v_item.quantity is null or v_item.quantity <= 0 then
      return jsonb_build_object('status', 'pricing_unavailable');
    end if;
    v_subtotal := v_subtotal + (v_product.price_amount * v_item.quantity);
    v_items := v_items || jsonb_build_array(jsonb_build_object(
      'product_id', v_product.id,
      'name', v_product.name,
      'quantity', v_item.quantity,
      'price', v_product.price_amount
    ));
  end loop;
  v_subtotal := round(v_subtotal, 2);

  if trim(coalesce(p_coupon_code, '')) <> '' then
    v_coupon_result := public.calculate_coupon(p_coupon_code, p_customer_id, v_items);
    if v_coupon_result ->> 'status' <> 'ok' then
      return v_coupon_result;
    end if;
    v_discount := coalesce((v_coupon_result ->> 'discount_amount')::numeric, 0);
    v_coupon_id := v_coupon_result -> 'coupon' ->> 'id';
  end if;

  v_order_id := 'ZAM-' || to_char(v_now, 'YYYY') || '-' || lpad(nextval('public.order_number_seq')::text, 4, '0');

  insert into public.orders (
    id, customer_id, status, items, subtotal, total, coupon_id, coupon_code, coupon_discount,
    payment_status, payment_method, payment_reference, delivery_date, delivery_area, notes, created_at, history
  )
  values (
    v_order_id,
    p_customer_id,
    'pending',
    v_items,
    v_subtotal,
    greatest(0, v_subtotal - v_discount),
    v_coupon_id,
    case when v_coupon_id is null then null else upper(trim(p_coupon_code)) end,
    v_discount,
    'pending',
    coalesce(p_payment_method, ''),
    null,
    coalesce(p_delivery_date, ''),
    coalesce(p_delivery_area, ''),
    coalesce(p_notes, ''),
    v_now,
    jsonb_build_array(jsonb_build_object('status', 'pending', 'at', v_now))
  );

  insert into public.payments (id, order_id, customer_id, amount, status, date, reference, method)
  values (
    'PAY-' || v_order_id,
    v_order_id,
    p_customer_id,
    greatest(0, v_subtotal - v_discount),
    'pending',
    to_char(v_now, 'YYYY-MM-DD'),
    '',
    coalesce(p_payment_method, '')
  );

  if v_coupon_id is not null then
    insert into public.coupon_redemptions (coupon_id, customer_id, order_id, discount_amount)
    values (v_coupon_id, p_customer_id, v_order_id, v_discount);
  end if;

  if p_delivery_date is not null and p_delivery_date <> '' then
    insert into public.deliveries (id, order_id, customer_id, area, delivery_date, status, driver)
    values ('DEL-' || v_order_id, v_order_id, p_customer_id, coalesce(p_delivery_area, ''), p_delivery_date, 'preparing', null);
  end if;

  return jsonb_build_object(
    'status', 'ok',
    'orderId', v_order_id,
    'subtotal', v_subtotal,
    'discountAmount', v_discount,
    'total', greatest(0, v_subtotal - v_discount)
  );
end;
$$;

create or replace function public.restore_coupon_redemption_on_order_close()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if (new.status = 'cancelled' and old.status is distinct from 'cancelled')
     or (new.payment_status = 'refunded' and old.payment_status is distinct from 'refunded') then
    update public.coupon_redemptions
    set status = 'restored', restored_at = now()
    where order_id = new.id and status = 'redeemed';
  end if;
  return new;
end;
$$;

drop trigger if exists orders_restore_coupon_redemption on public.orders;
create trigger orders_restore_coupon_redemption
  after update of status, payment_status on public.orders
  for each row execute function public.restore_coupon_redemption_on_order_close();

-- The admin Payments section updates payments directly. Keep the parent order
-- in sync so refunds restore coupon availability through the same trigger path.
drop trigger if exists payments_restore_coupon_redemption on public.payments;
create or replace function public.sync_order_payment_status_on_refund()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status = 'refunded' and old.status is distinct from 'refunded' then
    update public.orders
    set payment_status = 'refunded'
    where id = new.order_id and payment_status is distinct from 'refunded';
  end if;
  return new;
end;
$$;

create trigger payments_restore_coupon_redemption
  after update of status on public.payments
  for each row execute function public.sync_order_payment_status_on_refund();

revoke all on function public.coupon_payload(text) from public;
revoke all on function public.coupon_public_available(text) from public;
revoke all on function public.calculate_coupon(text, text, jsonb) from public;
revoke all on function public.list_public_coupons() from public;
revoke all on function public.get_my_coupons() from public;
revoke all on function public.claim_coupon(text) from public;
revoke all on function public.preview_coupon(text, jsonb) from public;
revoke all on function public.place_order(text, jsonb, numeric, text, text, text, text, text) from public;

grant execute on function public.list_public_coupons() to anon, authenticated;
grant execute on function public.get_my_coupons() to authenticated;
grant execute on function public.claim_coupon(text) to authenticated;
grant execute on function public.preview_coupon(text, jsonb) to authenticated;
grant execute on function public.place_order(text, jsonb, numeric, text, text, text, text, text) to anon, authenticated;

notify pgrst, 'reload schema';
