-- Zama public checkout
-- Run this in the Supabase SQL editor AFTER supabase/commerce-schema.sql.
-- It exposes the security-definer functions the public site uses to sign up
-- customers and place orders. Anonymous users have no direct table access;
-- all writes flow through the RPCs below, mirroring create_launch_interest().

create sequence if not exists public.order_number_seq start 5001;

-- Unique email so upsert_customer() can use `on conflict (email)`.
create unique index if not exists customers_email_unique_idx on public.customers (email);

-- ---------------------------------------------------------------------------
-- Upsert a customer by email and return the customer id.
-- ---------------------------------------------------------------------------
create or replace function public.upsert_customer(
  p_email text,
  p_name text,
  p_phone text,
  p_area text,
  p_dzongkhag text,
  p_address text
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id text;
begin
  if p_email is null or p_email = '' or char_length(p_email) > 254
     or p_email !~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$' then
    return jsonb_build_object('status', 'invalid_email');
  end if;

  insert into public.customers (id, name, email, phone, area, dzongkhag, address, status)
  values (
    'cus-' || substring(regexp_replace(lower(p_email), '[^a-z0-9]', '', 'g') from 1 for 16),
    trim(p_name),
    lower(trim(p_email)),
    trim(coalesce(p_phone, '')),
    trim(coalesce(p_area, '')),
    trim(coalesce(p_dzongkhag, '')),
    trim(coalesce(p_address, '')),
    'active'
  )
  on conflict (email) do update set
    name = case when length(trim(p_name)) > 0 then trim(p_name) else public.customers.name end,
    phone = case when length(trim(coalesce(p_phone, ''))) > 0 then trim(p_phone) else public.customers.phone end,
    area = case when length(trim(coalesce(p_area, ''))) > 0 then trim(p_area) else public.customers.area end,
    dzongkhag = case when length(trim(coalesce(p_dzongkhag, ''))) > 0 then trim(p_dzongkhag) else public.customers.dzongkhag end,
    address = case when length(trim(coalesce(p_address, ''))) > 0 then trim(p_address) else public.customers.address end
  returning id into v_id;

  return jsonb_build_object('status', 'ok', 'customerId', v_id);
end;
$$;

-- ---------------------------------------------------------------------------
-- Fetch a customer profile by email (used to prefill the checkout form).
-- ---------------------------------------------------------------------------
create or replace function public.get_customer(p_email text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.customers;
begin
  select * into v_row
  from public.customers
  where lower(email) = lower(trim(coalesce(p_email, '')));

  if v_row.id is null then
    return jsonb_build_object('status', 'not_found');
  end if;

  return jsonb_build_object('status', 'ok', 'customer', to_jsonb(v_row));
end;
$$;

-- ---------------------------------------------------------------------------
-- Fetch the signed-in customer's order history for the account page.
-- ---------------------------------------------------------------------------
create or replace function public.get_customer_orders(p_email text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_customer_id text;
begin
  select id into v_customer_id
  from public.customers
  where lower(email) = lower(trim(coalesce(p_email, '')));

  if v_customer_id is null then
    return '[]'::jsonb;
  end if;

  return coalesce(
    (select jsonb_agg(to_jsonb(o) order by o.created_at desc)
     from public.orders o
     where o.customer_id = v_customer_id),
    '[]'::jsonb
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- Place an order for a customer. Also records a payment (COD / bank transfer)
-- and, when a delivery date is supplied, a delivery record so the order shows
-- up across the admin Orders, Payments, and Deliveries sections.
-- ---------------------------------------------------------------------------
create or replace function public.place_order(
  p_customer_id text,
  p_items jsonb,
  p_total numeric,
  p_delivery_area text,
  p_payment_method text,
  p_delivery_date text,
  p_notes text
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order_id text;
  v_now timestamptz := now();
  v_items jsonb := coalesce(p_items, '[]'::jsonb);
begin
  if p_customer_id is null or not exists (select 1 from public.customers where id = p_customer_id) then
    return jsonb_build_object('status', 'customer_not_found');
  end if;

  v_order_id := 'ZAM-' || to_char(v_now, 'YYYY') || '-' || lpad(nextval('public.order_number_seq')::text, 4, '0');

  insert into public.orders (
    id, customer_id, status, items, total, payment_status, payment_method,
    payment_reference, delivery_date, delivery_area, notes, created_at, history
  )
  values (
    v_order_id,
    p_customer_id,
    'pending',
    v_items,
    coalesce(p_total, 0),
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
    coalesce(p_total, 0),
    'pending',
    to_char(v_now, 'YYYY-MM-DD'),
    '',
    coalesce(p_payment_method, '')
  );

  if p_delivery_date is not null and p_delivery_date <> '' then
    insert into public.deliveries (id, order_id, customer_id, area, delivery_date, status, driver)
    values (
      'DEL-' || v_order_id,
      v_order_id,
      p_customer_id,
      coalesce(p_delivery_area, ''),
      p_delivery_date,
      'preparing',
      null
    );
  end if;

  return jsonb_build_object('status', 'ok', 'orderId', v_order_id);
end;
$$;

revoke all on function public.upsert_customer(text, text, text, text, text, text) from public;
revoke all on function public.get_customer(text) from public;
revoke all on function public.get_customer_orders(text) from public;
revoke all on function public.place_order(text, jsonb, numeric, text, text, text, text) from public;

grant execute on function public.upsert_customer(text, text, text, text, text, text) to anon, authenticated;
grant execute on function public.get_customer(text) to anon, authenticated;
grant execute on function public.get_customer_orders(text) to authenticated;
grant execute on function public.place_order(text, jsonb, numeric, text, text, text, text) to anon, authenticated;
