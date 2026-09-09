-- Zama customer returns and refund requests
-- Run after commerce-schema.sql, checkout-schema.sql, and account-rewards-schema.sql.

alter table public.orders
  add column if not exists delivered_at timestamptz;

update public.orders
set delivered_at = (
  select (entry->>'at')::timestamptz
  from jsonb_array_elements(history) entry
  where entry->>'status' = 'delivered'
  order by (entry->>'at')::timestamptz desc
  limit 1
)
where status = 'delivered' and delivered_at is null;

create table if not exists public.order_returns (
  id uuid primary key default gen_random_uuid(),
  customer_id text not null references public.customers (id) on delete restrict,
  order_id text not null references public.orders (id) on delete restrict,
  status text not null default 'pending'
    check (status in ('pending', 'approved', 'rejected', 'refunded', 'cancelled')),
  reason text not null
    check (reason in ('damaged', 'incorrect_item', 'missing_item', 'quality_issue', 'not_as_expected', 'other')),
  note text not null default '',
  refund_amount numeric,
  refund_method text,
  requested_at timestamptz not null default now(),
  reviewed_at timestamptz,
  reviewed_by text,
  updated_at timestamptz not null default now()
);

alter table public.order_returns
  add column if not exists pickup_window_start timestamptz,
  add column if not exists pickup_window_end timestamptz,
  add column if not exists rejection_reason text;

create table if not exists public.customer_notifications (
  id uuid primary key default gen_random_uuid(),
  customer_id text not null references public.customers (id) on delete cascade,
  return_id uuid references public.order_returns (id) on delete cascade,
  order_id text references public.orders (id) on delete cascade,
  type text not null check (type in ('return_submitted', 'return_approved', 'return_rejected', 'return_refunded', 'return_cancelled', 'pickup_schedule_updated')),
  title text not null,
  message text not null,
  status text check (status in ('pending', 'approved', 'rejected', 'refunded', 'cancelled')),
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.order_return_items (
  id uuid primary key default gen_random_uuid(),
  return_id uuid not null references public.order_returns (id) on delete cascade,
  product_id text not null,
  name text not null default '',
  unit_price numeric not null default 0,
  quantity integer not null check (quantity > 0)
);

create index if not exists order_returns_customer_idx on public.order_returns (customer_id, requested_at desc);
create index if not exists order_returns_order_idx on public.order_returns (order_id, requested_at desc);
create index if not exists order_returns_status_idx on public.order_returns (status, requested_at desc);
create index if not exists order_return_items_return_idx on public.order_return_items (return_id);
create index if not exists customer_notifications_customer_idx on public.customer_notifications (customer_id, created_at desc);
create index if not exists customer_notifications_unread_idx on public.customer_notifications (customer_id, read_at) where read_at is null;

alter table public.order_returns enable row level security;
alter table public.order_return_items enable row level security;
alter table public.customer_notifications enable row level security;

drop policy if exists "customer returns owner or admin" on public.order_returns;
create policy "customer returns owner or admin" on public.order_returns
  for all to authenticated
  using (customer_id = public.account_customer_id() or public.is_admin())
  with check (customer_id = public.account_customer_id() or public.is_admin());

drop policy if exists "customer return items owner or admin" on public.order_return_items;
create policy "customer return items owner or admin" on public.order_return_items
  for all to authenticated
  using (
    exists (
      select 1 from public.order_returns r
      where r.id = return_id
        and (r.customer_id = public.account_customer_id() or public.is_admin())
    )
  )
  with check (
    exists (
      select 1 from public.order_returns r
      where r.id = return_id
        and (r.customer_id = public.account_customer_id() or public.is_admin())
    )
  );

drop policy if exists "customer notifications owner or admin" on public.customer_notifications;
create policy "customer notifications owner or admin" on public.customer_notifications
  for select to authenticated
  using (customer_id = public.account_customer_id() or public.is_admin());

drop policy if exists "customer notifications update own read state" on public.customer_notifications;
create policy "customer notifications update own read state" on public.customer_notifications
  for update to authenticated
  using (customer_id = public.account_customer_id() or public.is_admin())
  with check (customer_id = public.account_customer_id() or public.is_admin());

create or replace function public.return_items_json(p_return_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(jsonb_agg(jsonb_build_object(
    'product_id', item.product_id,
    'name', item.name,
    'unit_price', item.unit_price,
    'quantity', item.quantity
  ) order by item.name), '[]'::jsonb)
  from public.order_return_items item
  where item.return_id = p_return_id;
$$;

create or replace function public.get_my_returns()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_customer_id text := public.account_customer_id();
begin
  if v_customer_id is null then return '[]'::jsonb; end if;
  return coalesce((
    select jsonb_agg(jsonb_build_object(
      'id', r.id,
      'customer_id', r.customer_id,
      'order_id', r.order_id,
      'status', r.status,
      'reason', r.reason,
      'note', r.note,
      'items', public.return_items_json(r.id),
      'refund_amount', r.refund_amount,
      'refund_method', r.refund_method,
      'pickup_window_start', r.pickup_window_start,
      'pickup_window_end', r.pickup_window_end,
      'rejection_reason', r.rejection_reason,
      'requested_at', r.requested_at,
      'reviewed_at', r.reviewed_at,
      'reviewed_by', r.reviewed_by,
      'updated_at', r.updated_at
    ) order by r.requested_at desc)
    from public.order_returns r
    where r.customer_id = v_customer_id
  ), '[]'::jsonb);
end;
$$;

create or replace function public.get_my_notifications()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_customer_id text := public.account_customer_id();
begin
  if v_customer_id is null then return '[]'::jsonb; end if;
  return coalesce((
    select jsonb_agg(jsonb_build_object(
      'id', n.id,
      'customer_id', n.customer_id,
      'return_id', n.return_id,
      'order_id', n.order_id,
      'type', n.type,
      'title', n.title,
      'message', n.message,
      'status', n.status,
      'read_at', n.read_at,
      'created_at', n.created_at
    ) order by n.created_at desc)
    from public.customer_notifications n
    where n.customer_id = v_customer_id
  ), '[]'::jsonb);
end;
$$;

create or replace function public.mark_notification_read(p_notification_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_customer_id text := public.account_customer_id();
begin
  update public.customer_notifications
  set read_at = coalesce(read_at, now())
  where id = p_notification_id and customer_id = v_customer_id;
  return jsonb_build_object('status', 'ok');
end;
$$;

create or replace function public.mark_all_notifications_read()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_customer_id text := public.account_customer_id();
begin
  update public.customer_notifications
  set read_at = coalesce(read_at, now())
  where customer_id = v_customer_id and read_at is null;
  return jsonb_build_object('status', 'ok');
end;
$$;

create or replace function public.request_order_return(
  p_order_id text,
  p_items jsonb,
  p_reason text,
  p_note text default ''
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_customer_id text := public.account_customer_id();
  v_order public.orders;
  v_return_id uuid;
  v_item jsonb;
  v_product_id text;
  v_requested_quantity integer;
  v_order_quantity integer;
  v_returned_quantity integer;
  v_refund_amount numeric := 0;
  v_note text := trim(coalesce(p_note, ''));
  v_window_end timestamp;
begin
  if v_customer_id is null then return jsonb_build_object('status', 'customer_not_found'); end if;
  if p_reason not in ('damaged', 'incorrect_item', 'missing_item', 'quality_issue', 'not_as_expected', 'other') then return jsonb_build_object('status', 'invalid_reason', 'error', 'Choose a return reason.'); end if;
  if length(v_note) > 1000 then return jsonb_build_object('status', 'invalid_note', 'error', 'Your return note is too long.'); end if;
  if jsonb_typeof(coalesce(p_items, '[]'::jsonb)) <> 'array' or jsonb_array_length(coalesce(p_items, '[]'::jsonb)) = 0 then return jsonb_build_object('status', 'no_items', 'error', 'Choose at least one item to return.'); end if;

  select * into v_order from public.orders where id = p_order_id and customer_id = v_customer_id;
  if v_order.id is null then return jsonb_build_object('status', 'order_not_found'); end if;
  if v_order.status <> 'delivered' then return jsonb_build_object('status', 'not_delivered', 'error', 'Returns are available after delivery.'); end if;
  if v_order.delivered_at is null then return jsonb_build_object('status', 'missing_delivery_time', 'error', 'This order does not have a recorded delivery time.'); end if;

  v_window_end := ((v_order.delivered_at at time zone 'Asia/Thimphu')::date + 3)::timestamp;
  if (now() at time zone 'Asia/Thimphu') >= v_window_end then return jsonb_build_object('status', 'window_closed', 'error', 'The return window for this order has closed.'); end if;

  for v_item in select value from jsonb_array_elements(p_items)
  loop
    v_product_id := nullif(trim(v_item->>'product_id'), '');
    if v_product_id is null or coalesce(v_item->>'quantity', '') !~ '^[1-9][0-9]*$' or (v_item->>'quantity')::numeric > 2147483647 then return jsonb_build_object('status', 'invalid_items', 'error', 'Choose valid item quantities.'); end if;
  end loop;

  for v_product_id, v_requested_quantity in
    select item->>'product_id', sum((item->>'quantity')::integer)::integer
    from jsonb_array_elements(p_items) item
    group by item->>'product_id'
  loop
    select coalesce(sum((item->>'quantity')::integer), 0) into v_order_quantity
    from jsonb_array_elements(v_order.items) item
    where item->>'product_id' = v_product_id;
    select coalesce(sum(item.quantity), 0) into v_returned_quantity
    from public.order_return_items item
    join public.order_returns r on r.id = item.return_id
    where r.order_id = p_order_id and r.status in ('pending', 'approved', 'refunded') and item.product_id = v_product_id;
    if v_order_quantity = 0 or v_requested_quantity > v_order_quantity - v_returned_quantity then return jsonb_build_object('status', 'invalid_items', 'error', 'Some selected quantities are no longer available for return.'); end if;
  end loop;

  v_return_id := gen_random_uuid();
  insert into public.order_returns (id, customer_id, order_id, reason, note, refund_amount, refund_method)
  values (
    v_return_id,
    v_customer_id,
    p_order_id,
    p_reason,
    v_note,
    (select coalesce(sum((requested.quantity)::numeric * (source.item->>'price')::numeric), 0)
     from (
       select item->>'product_id' as product_id, sum((item->>'quantity')::integer) as quantity
       from jsonb_array_elements(p_items) item
       group by item->>'product_id'
     ) requested
     join lateral (
       select item
       from jsonb_array_elements(v_order.items) item
       where item->>'product_id' = requested.product_id
       limit 1
     ) source on true),
    case when v_order.payment_method = '' then null else 'Original ' || v_order.payment_method end
  );

  insert into public.order_return_items (return_id, product_id, name, unit_price, quantity)
  select v_return_id, requested.product_id, source.item->>'name', (source.item->>'price')::numeric, requested.quantity
  from (
    select item->>'product_id' as product_id, sum((item->>'quantity')::integer) as quantity
    from jsonb_array_elements(p_items) item
    group by item->>'product_id'
  ) requested
  join lateral (
    select item
    from jsonb_array_elements(v_order.items) item
    where item->>'product_id' = requested.product_id
    limit 1
  ) source on true;

  begin
    insert into public.customer_notifications (customer_id, return_id, order_id, type, title, message, status)
    values (
      v_customer_id,
      v_return_id,
      p_order_id,
      'return_submitted',
      'Return request received',
      'Your return request for order ' || p_order_id || ' was submitted and is being reviewed.',
      'pending'
    );
  exception when others then
    -- A notification failure must not prevent a valid return request.
    null;
  end;

  return jsonb_build_object('status', 'ok', 'return', (
    select jsonb_build_object(
      'id', r.id, 'customer_id', r.customer_id, 'order_id', r.order_id,
      'status', r.status, 'reason', r.reason, 'note', r.note,
      'items', public.return_items_json(r.id), 'refund_amount', r.refund_amount,
      'refund_method', r.refund_method, 'pickup_window_start', r.pickup_window_start,
      'pickup_window_end', r.pickup_window_end, 'rejection_reason', r.rejection_reason,
      'requested_at', r.requested_at,
      'reviewed_at', r.reviewed_at, 'reviewed_by', r.reviewed_by, 'updated_at', r.updated_at
    ) from public.order_returns r where r.id = v_return_id
  ));
end;
$$;

drop function if exists public.admin_update_return(uuid, text, numeric, text, text);

create or replace function public.admin_update_return(
  p_return_id uuid,
  p_status text,
  p_refund_amount numeric default null,
  p_refund_method text default null,
  p_pickup_window_start timestamptz default null,
  p_pickup_window_end timestamptz default null,
  p_rejection_reason text default null,
  p_admin_email text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_return public.order_returns;
  v_schedule_changed boolean := false;
  v_notification_type text;
  v_notification_title text;
  v_notification_message text;
  v_notification_status text := 'created';
  v_notification_error text;
begin
  if not public.is_admin() then return jsonb_build_object('status', 'forbidden'); end if;
  if p_status not in ('approved', 'rejected', 'refunded', 'cancelled') then return jsonb_build_object('status', 'invalid_status'); end if;
  if p_status = 'approved' and (p_pickup_window_start is null or p_pickup_window_end is null) then return jsonb_build_object('status', 'invalid_pickup_window', 'error', 'Choose a pickup date and time window before approving.'); end if;
  if p_status = 'approved' and p_pickup_window_start >= p_pickup_window_end then return jsonb_build_object('status', 'invalid_pickup_window', 'error', 'Pickup start time must be earlier than the end time.'); end if;
  if p_status = 'approved' and p_pickup_window_end <= now() then return jsonb_build_object('status', 'invalid_pickup_window', 'error', 'Pickup window must be in the future.'); end if;
  if p_status = 'rejected' and trim(coalesce(p_rejection_reason, '')) = '' then return jsonb_build_object('status', 'invalid_rejection_reason', 'error', 'Add a reason before rejecting this return.'); end if;
  select * into v_return from public.order_returns where id = p_return_id;
  if v_return.id is null then return jsonb_build_object('status', 'not_found'); end if;
  if v_return.status in ('rejected', 'refunded', 'cancelled') then return jsonb_build_object('status', 'already_closed'); end if;

  v_schedule_changed := p_status = 'approved' and (
    v_return.status <> 'approved'
    or v_return.pickup_window_start is distinct from p_pickup_window_start
    or v_return.pickup_window_end is distinct from p_pickup_window_end
  );

  update public.order_returns
  set status = p_status,
      refund_amount = coalesce(p_refund_amount, refund_amount),
      refund_method = coalesce(nullif(trim(p_refund_method), ''), refund_method),
      pickup_window_start = case when p_status = 'approved' then p_pickup_window_start when p_status = 'rejected' then null else pickup_window_start end,
      pickup_window_end = case when p_status = 'approved' then p_pickup_window_end when p_status = 'rejected' then null else pickup_window_end end,
      rejection_reason = case when p_status = 'rejected' then trim(p_rejection_reason) when p_status = 'approved' then null else rejection_reason end,
      reviewed_at = now(),
      reviewed_by = coalesce(nullif(trim(p_admin_email), ''), reviewed_by),
      updated_at = now()
  where id = p_return_id;

  if p_status = 'approved' and v_schedule_changed then
    v_notification_type := case when v_return.status = 'approved' then 'pickup_schedule_updated' else 'return_approved' end;
    v_notification_title := case when v_return.status = 'approved' then 'Pickup schedule updated' else 'Return approved' end;
    v_notification_message := case when v_return.status = 'approved'
      then 'The pickup for order ' || v_return.order_id || ' is now scheduled for ' || to_char(p_pickup_window_start at time zone 'Asia/Thimphu', 'DD FMMonth YYYY, HH24:MI') || '–' || to_char(p_pickup_window_end at time zone 'Asia/Thimphu', 'HH24:MI') || ' Bhutan time.'
      else 'Your return for order ' || v_return.order_id || ' was approved. Pickup is scheduled for ' || to_char(p_pickup_window_start at time zone 'Asia/Thimphu', 'DD FMMonth YYYY, HH24:MI') || '–' || to_char(p_pickup_window_end at time zone 'Asia/Thimphu', 'HH24:MI') || ' Bhutan time.'
    end;
  elsif p_status = 'rejected' then
    v_notification_type := 'return_rejected';
    v_notification_title := 'Return rejected';
    v_notification_message := 'Your return for order ' || v_return.order_id || ' was rejected: ' || trim(p_rejection_reason);
  elsif p_status = 'refunded' then
    v_notification_type := 'return_refunded';
    v_notification_title := 'Refund processed';
    v_notification_message := 'Your refund for order ' || v_return.order_id || ' has been processed' || case when coalesce(p_refund_amount, v_return.refund_amount) is null then '' else ' for Nu. ' || coalesce(p_refund_amount, v_return.refund_amount)::text end || case when coalesce(nullif(trim(p_refund_method), ''), v_return.refund_method) is null then '.' else ' via ' || coalesce(nullif(trim(p_refund_method), ''), v_return.refund_method) || '.' end;
  elsif p_status = 'cancelled' then
    v_notification_type := 'return_cancelled';
    v_notification_title := 'Return cancelled';
    v_notification_message := 'Your return request for order ' || v_return.order_id || ' was cancelled.';
  end if;

  if v_notification_type is not null then
    begin
      insert into public.customer_notifications (customer_id, return_id, order_id, type, title, message, status)
      values (v_return.customer_id, v_return.id, v_return.order_id, v_notification_type, v_notification_title, v_notification_message, p_status);
    exception when others then
      v_notification_status := 'failed';
      v_notification_error := SQLERRM;
      raise warning 'return notification creation failed for %: %', v_return.id, v_notification_error;
    end;
  end if;

  if p_status = 'refunded' and not exists (
    select 1
    from jsonb_array_elements((select items from public.orders where id = v_return.order_id)) order_item
    where coalesce((order_item->>'quantity')::integer, 0) > (
      select coalesce(sum(item.quantity), 0)
      from public.order_return_items item
      join public.order_returns r on r.id = item.return_id
      where r.order_id = v_return.order_id and r.status = 'refunded' and item.product_id = order_item->>'product_id'
    )
  ) then
    update public.payments
    set status = 'refunded', refund_method = coalesce(nullif(trim(p_refund_method), ''), refund_method)
    where order_id = v_return.order_id;
  end if;

  return jsonb_build_object('status', 'ok', 'notification_status', v_notification_status, 'notification_error', v_notification_error);
end;
$$;

revoke all on function public.return_items_json(uuid) from public;
revoke all on function public.get_my_returns() from public;
revoke all on function public.get_my_notifications() from public;
revoke all on function public.mark_notification_read(uuid) from public;
revoke all on function public.mark_all_notifications_read() from public;
revoke all on function public.request_order_return(text, jsonb, text, text) from public;
revoke all on function public.admin_update_return(uuid, text, numeric, text, timestamptz, timestamptz, text, text) from public;

grant execute on function public.get_my_returns() to authenticated;
grant execute on function public.get_my_notifications() to authenticated;
grant execute on function public.mark_notification_read(uuid) to authenticated;
grant execute on function public.mark_all_notifications_read() to authenticated;
grant execute on function public.request_order_return(text, jsonb, text, text) to authenticated;
grant execute on function public.admin_update_return(uuid, text, numeric, text, timestamptz, timestamptz, text, text) to authenticated;

notify pgrst, 'reload schema';
