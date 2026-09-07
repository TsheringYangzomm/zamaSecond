-- Zama checkout points redemption
-- Run after account-rewards-schema.sql and coupons-schema.sql.

alter table public.orders
  add column if not exists points_redeemed integer not null default 0,
  add column if not exists points_discount numeric(12, 2) not null default 0;

alter table public.customer_points_ledger
  drop constraint if exists customer_points_ledger_source_check;

alter table public.customer_points_ledger
  add constraint customer_points_ledger_source_check
  check (source in ('daily_check_in', 'customer_review', 'admin_adjustment', 'redemption_hold', 'redemption_release', 'checkout_redemption'));

drop function if exists public.place_order(text, jsonb, numeric, text, text, text, text, text);

create or replace function public.place_order(
  p_customer_id text,
  p_items jsonb,
  p_total numeric,
  p_delivery_area text,
  p_payment_method text,
  p_delivery_date text,
  p_notes text,
  p_coupon_code text default null,
  p_points_to_redeem integer default 0
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
  v_coupon_discount numeric(12, 2) := 0;
  v_points_discount numeric(12, 2) := 0;
  v_coupon_id text;
  v_coupon_result jsonb;
  v_settings public.reward_settings;
  v_points_balance integer := 0;
  v_requested_points integer := greatest(0, coalesce(p_points_to_redeem, 0));
  v_points integer := greatest(0, coalesce(p_points_to_redeem, 0));
  v_remaining_total numeric(12, 2) := 0;
begin
  if p_customer_id is null or not exists (select 1 from public.customers where id = p_customer_id) then
    return jsonb_build_object('status', 'customer_not_found');
  end if;
  if (trim(coalesce(p_coupon_code, '')) <> '' or v_points > 0) and auth.email() is null then
    return jsonb_build_object('status', 'not_authenticated', 'error', 'Sign in to use coupons or points.');
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
    if v_coupon_result ->> 'status' <> 'ok' then return v_coupon_result; end if;
    v_coupon_discount := coalesce((v_coupon_result ->> 'discount_amount')::numeric, 0);
    v_coupon_id := v_coupon_result -> 'coupon' ->> 'id';
  end if;

  if v_requested_points > 0 then
    select * into v_settings from public.reward_settings where id = 'default';
    select coalesce(sum(points_delta), 0) into v_points_balance from public.customer_points_ledger where customer_id = p_customer_id;
    if v_requested_points > v_points_balance then
      return jsonb_build_object('status', 'invalid_points', 'error', 'You cannot redeem more points than your available balance.');
    end if;
    if v_settings.points_per_ngultrum <= 0 then
      return jsonb_build_object('status', 'invalid_points', 'error', 'Point redemption is not available right now.');
    end if;
    v_remaining_total := greatest(0, v_subtotal - v_coupon_discount);
    v_points := least(v_requested_points, floor(v_remaining_total * v_settings.points_per_ngultrum)::integer);
    v_points_discount := least(v_remaining_total, round(v_points / v_settings.points_per_ngultrum, 2));
  end if;

  v_order_id := 'ZAM-' || to_char(v_now, 'YYYY') || '-' || lpad(nextval('public.order_number_seq')::text, 4, '0');

  insert into public.orders (
    id, customer_id, status, items, subtotal, total, coupon_id, coupon_code, coupon_discount,
    points_redeemed, points_discount, payment_status, payment_method, payment_reference,
    delivery_date, delivery_area, notes, created_at, history
  )
  values (
    v_order_id, p_customer_id, 'pending', v_items, v_subtotal,
    greatest(0, v_subtotal - v_coupon_discount - v_points_discount), v_coupon_id,
    case when v_coupon_id is null then null else upper(trim(p_coupon_code)) end, v_coupon_discount,
    v_points, v_points_discount, 'pending', coalesce(p_payment_method, ''), null,
    coalesce(p_delivery_date, ''), coalesce(p_delivery_area, ''), coalesce(p_notes, ''), v_now,
    jsonb_build_array(jsonb_build_object('status', 'pending', 'at', v_now))
  );

  insert into public.payments (id, order_id, customer_id, amount, status, date, reference, method)
  values (
    'PAY-' || v_order_id, v_order_id, p_customer_id,
    greatest(0, v_subtotal - v_coupon_discount - v_points_discount), 'pending',
    to_char(v_now, 'YYYY-MM-DD'), '', coalesce(p_payment_method, '')
  );

  if v_coupon_id is not null then
    insert into public.coupon_redemptions (coupon_id, customer_id, order_id, discount_amount)
    values (v_coupon_id, p_customer_id, v_order_id, v_coupon_discount);
  end if;

  if v_points > 0 then
    insert into public.customer_points_ledger (customer_id, points_delta, source, source_id, reason)
    values (p_customer_id, -v_points, 'checkout_redemption', v_order_id, 'Points used at checkout for order ' || v_order_id);
  end if;

  if p_delivery_date is not null and p_delivery_date <> '' then
    insert into public.deliveries (id, order_id, customer_id, area, delivery_date, status, driver)
    values ('DEL-' || v_order_id, v_order_id, p_customer_id, coalesce(p_delivery_area, ''), p_delivery_date, 'preparing', null);
  end if;

  return jsonb_build_object(
    'status', 'ok', 'orderId', v_order_id, 'subtotal', v_subtotal,
    'couponDiscount', v_coupon_discount, 'pointsRedeemed', v_points,
    'pointsDiscount', v_points_discount,
    'total', greatest(0, v_subtotal - v_coupon_discount - v_points_discount)
  );
end;
$$;

revoke all on function public.place_order(text, jsonb, numeric, text, text, text, text, text, integer) from public;
grant execute on function public.place_order(text, jsonb, numeric, text, text, text, text, text, integer) to anon, authenticated;

notify pgrst, 'reload schema';
