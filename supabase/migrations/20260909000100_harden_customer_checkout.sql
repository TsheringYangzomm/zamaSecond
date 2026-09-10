-- Bind customer reads and writes to the authenticated JWT. Guest checkout is
-- handled by the first-party server function using the service role.

revoke all on function public.upsert_customer(text, text, text, text, text, text) from anon, authenticated;
revoke all on function public.get_customer(text) from anon, authenticated;
revoke all on function public.get_customer_orders(text) from anon, authenticated;
grant execute on function public.upsert_customer(text, text, text, text, text, text) to service_role;

create or replace function public.upsert_my_customer(
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
  v_email text := lower(trim(coalesce(auth.email(), '')));
begin
  if v_email = '' then
    return jsonb_build_object('status', 'not_authenticated');
  end if;
  if char_length(coalesce(p_name, '')) > 120
     or char_length(coalesce(p_phone, '')) > 40
     or char_length(coalesce(p_area, '')) > 120
     or char_length(coalesce(p_dzongkhag, '')) > 120
     or char_length(coalesce(p_address, '')) > 500 then
    return jsonb_build_object('status', 'invalid_profile');
  end if;
  return public.upsert_customer(v_email, p_name, p_phone, p_area, p_dzongkhag, p_address);
end;
$$;

create or replace function public.get_my_customer()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.customers;
begin
  if auth.email() is null then
    return jsonb_build_object('status', 'not_authenticated');
  end if;
  select * into v_row from public.customers where lower(email) = lower(auth.email());
  if v_row.id is null then return jsonb_build_object('status', 'not_found'); end if;
  return jsonb_build_object('status', 'ok', 'customer', to_jsonb(v_row));
end;
$$;

create or replace function public.get_my_orders()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_customer_id text;
begin
  if auth.email() is null then return '[]'::jsonb; end if;
  select id into v_customer_id from public.customers where lower(email) = lower(auth.email());
  if v_customer_id is null then return '[]'::jsonb; end if;
  return coalesce(
    (select jsonb_agg(to_jsonb(o) order by o.created_at desc)
       from public.orders o where o.customer_id = v_customer_id),
    '[]'::jsonb
  );
end;
$$;

revoke all on function public.place_order(text, jsonb, numeric, text, text, text, text, text, integer) from anon, authenticated;
grant execute on function public.place_order(text, jsonb, numeric, text, text, text, text, text, integer) to service_role;

create or replace function public.place_my_order(
  p_items jsonb,
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
  v_customer_id text;
begin
  if auth.email() is null then
    return jsonb_build_object('status', 'not_authenticated');
  end if;
  if jsonb_typeof(coalesce(p_items, 'null'::jsonb)) <> 'array'
     or jsonb_array_length(p_items) < 1
     or jsonb_array_length(p_items) > 30
     or char_length(coalesce(p_delivery_area, '')) > 120
     or char_length(coalesce(p_payment_method, '')) > 80
     or char_length(coalesce(p_delivery_date, '')) > 40
     or char_length(coalesce(p_notes, '')) > 1000
     or char_length(coalesce(p_coupon_code, '')) > 80
     or coalesce(p_points_to_redeem, 0) < 0 then
    return jsonb_build_object('status', 'invalid_order');
  end if;
  if exists (
    select 1 from jsonb_to_recordset(p_items) as item(quantity numeric)
    where item.quantity is null or item.quantity < 1 or item.quantity > 99 or item.quantity <> trunc(item.quantity)
  ) then
    return jsonb_build_object('status', 'invalid_order');
  end if;
  select id into v_customer_id from public.customers where lower(email) = lower(auth.email());
  if v_customer_id is null then
    return jsonb_build_object('status', 'customer_not_found');
  end if;
  return public.place_order(
    v_customer_id, p_items, 0, p_delivery_area, p_payment_method,
    p_delivery_date, p_notes, p_coupon_code, p_points_to_redeem
  );
end;
$$;

revoke all on function public.upsert_my_customer(text, text, text, text, text) from public;
revoke all on function public.get_my_customer() from public;
revoke all on function public.get_my_orders() from public;
revoke all on function public.place_my_order(jsonb, text, text, text, text, text, integer) from public;
grant execute on function public.upsert_my_customer(text, text, text, text, text) to authenticated;
grant execute on function public.get_my_customer() to authenticated;
grant execute on function public.get_my_orders() to authenticated;
grant execute on function public.place_my_order(jsonb, text, text, text, text, text, integer) to authenticated;

create table if not exists public.api_rate_limits (
  bucket text not null,
  key_hash text not null,
  window_start timestamptz not null,
  request_count integer not null default 1,
  primary key (bucket, key_hash, window_start)
);
alter table public.api_rate_limits enable row level security;
revoke all on public.api_rate_limits from anon, authenticated;

create or replace function public.check_api_rate_limit(
  p_bucket text,
  p_key_hash text,
  p_limit integer,
  p_window_seconds integer
) returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_window timestamptz;
  v_count integer;
begin
  if p_limit < 1 or p_window_seconds < 1 or char_length(p_bucket) > 80 or char_length(p_key_hash) > 128 then
    return false;
  end if;
  v_window := to_timestamp(floor(extract(epoch from now()) / p_window_seconds) * p_window_seconds);
  insert into public.api_rate_limits(bucket, key_hash, window_start, request_count)
  values (p_bucket, p_key_hash, v_window, 1)
  on conflict (bucket, key_hash, window_start)
  do update set request_count = public.api_rate_limits.request_count + 1
  returning request_count into v_count;
  delete from public.api_rate_limits where window_start < now() - interval '2 days';
  return v_count <= p_limit;
end;
$$;

revoke all on function public.check_api_rate_limit(text, text, integer, integer) from public;
grant execute on function public.check_api_rate_limit(text, text, integer, integer) to service_role;

-- Apply catalog order changes atomically so a failed request cannot leave a
-- partially reordered list behind.
create or replace function public.reorder_catalog_rows(
  p_table text,
  p_ordered_ids text[]
) returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  if p_table not in ('products', 'farmers', 'dieticians')
     or coalesce(cardinality(p_ordered_ids), 0) < 1
     or cardinality(p_ordered_ids) > 500
     or cardinality(p_ordered_ids) <> (
       select count(distinct item_id)
       from unnest(p_ordered_ids) as requested(item_id)
     ) then
    raise exception 'invalid_reorder_request' using errcode = '22023';
  end if;

  case p_table
    when 'products' then
      update public.products as target
      set sort_order = requested.position - 1
      from unnest(p_ordered_ids) with ordinality as requested(item_id, position)
      where target.id = requested.item_id;
    when 'farmers' then
      update public.farmers as target
      set sort_order = requested.position - 1
      from unnest(p_ordered_ids) with ordinality as requested(item_id, position)
      where target.id = requested.item_id;
    when 'dieticians' then
      update public.dieticians as target
      set sort_order = requested.position - 1
      from unnest(p_ordered_ids) with ordinality as requested(item_id, position)
      where target.id = requested.item_id;
  end case;
end;
$$;

revoke all on function public.reorder_catalog_rows(text, text[]) from public;
grant execute on function public.reorder_catalog_rows(text, text[]) to authenticated;

-- Public submissions now pass through first-party functions that validate,
-- throttle, and verify the bot challenge before using the service role.
drop policy if exists "contact messages public insert" on public.contact_messages;
revoke insert on public.contact_messages from anon, authenticated;
revoke all on function public.create_launch_interest(text, text, text, text, jsonb) from anon, authenticated;
revoke all on function public.create_partnership_request(text, text, text, text, text, text, text, text) from anon, authenticated;
grant execute on function public.create_launch_interest(text, text, text, text, jsonb) to service_role;
grant execute on function public.create_partnership_request(text, text, text, text, text, text, text, text) to service_role;
