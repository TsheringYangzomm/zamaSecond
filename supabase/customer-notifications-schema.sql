-- Zama customer notifications
-- Run after cms-schema.sql, commerce-schema.sql, checkout-schema.sql,
-- coupons-schema.sql, account-rewards-schema.sql, and returns-schema.sql.
-- This extends the account-only notification feed beyond return updates.

create table if not exists public.customer_notifications (
  id uuid primary key default gen_random_uuid(),
  customer_id text not null references public.customers (id) on delete cascade,
  return_id uuid references public.order_returns (id) on delete cascade,
  order_id text references public.orders (id) on delete cascade,
  type text not null,
  title text not null,
  message text not null,
  status text,
  link text,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.customer_notifications
  add column if not exists link text,
  add column if not exists dedupe_key text;

-- Older returns-schema installations constrained this column to return-only
-- values. Status is now a display value shared by orders, payments, and returns.
alter table public.customer_notifications
  drop constraint if exists customer_notifications_type_check,
  drop constraint if exists customer_notifications_status_check;

alter table public.customer_notifications
  add constraint customer_notifications_type_check check (type in (
    'return_submitted', 'return_approved', 'return_rejected',
    'return_refunded', 'return_cancelled', 'pickup_schedule_updated',
    'order_placed', 'order_status_updated', 'payment_status_updated',
    'coupon_available', 'product_available'
  ));

create unique index if not exists customer_notifications_dedupe_idx
  on public.customer_notifications (dedupe_key)
  where dedupe_key is not null;

create index if not exists customer_notifications_customer_idx
  on public.customer_notifications (customer_id, created_at desc);
create index if not exists customer_notifications_unread_idx
  on public.customer_notifications (customer_id, read_at)
  where read_at is null;

alter table public.customer_notifications enable row level security;

drop policy if exists "customer notifications owner or admin" on public.customer_notifications;
create policy "customer notifications owner or admin" on public.customer_notifications
  for select to authenticated
  using (customer_id = public.account_customer_id() or public.is_admin());

drop policy if exists "customer notifications update own read state" on public.customer_notifications;
create policy "customer notifications update own read state" on public.customer_notifications
  for update to authenticated
  using (customer_id = public.account_customer_id() or public.is_admin())
  with check (customer_id = public.account_customer_id() or public.is_admin());

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
      'link', n.link,
      'read_at', n.read_at,
      'created_at', n.created_at
    ) order by n.created_at desc)
    from (
      select *
      from public.customer_notifications
      where customer_id = v_customer_id
      order by created_at desc
      limit 100
    ) n
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

-- Only trusted trigger functions use this helper. The dedupe key is scoped to
-- the customer because each customer must receive their own copy.
create or replace function public.emit_customer_notification(
  p_customer_id text,
  p_type text,
  p_title text,
  p_message text,
  p_status text default null,
  p_link text default null,
  p_dedupe_key text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.customer_notifications (
    customer_id, type, title, message, status, link, dedupe_key
  )
  select p_customer_id, p_type, p_title, p_message, p_status, p_link, p_dedupe_key
  where p_dedupe_key is null
     or not exists (
       select 1
       from public.customer_notifications existing
       where existing.dedupe_key = p_dedupe_key
     );
end;
$$;

create or replace function public.notify_customer_order_event()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    perform public.emit_customer_notification(
      new.customer_id,
      'order_placed',
      'Order placed',
      'Your order ' || new.id || ' was placed successfully.',
      new.status,
      '#/account/orders',
      'order_placed:' || new.id || ':' || new.customer_id
    );
    return new;
  end if;

  if new.status is distinct from old.status then
    perform public.emit_customer_notification(
      new.customer_id,
      'order_status_updated',
      'Order status updated',
      'Your order ' || new.id || ' is now ' || replace(new.status, '_', ' ') || '.',
      new.status,
      '#/account/orders',
      'order_status:' || new.id || ':' || new.status || ':' || clock_timestamp()::text
    );
  end if;

  if new.payment_status is distinct from old.payment_status then
    perform public.emit_customer_notification(
      new.customer_id,
      'payment_status_updated',
      'Payment status updated',
      'Payment for order ' || new.id || ' is now ' || replace(new.payment_status, '_', ' ') || '.',
      new.payment_status,
      '#/account/orders',
      'order_payment_status:' || new.id || ':' || new.payment_status || ':' || clock_timestamp()::text
    );
  end if;
  return new;
end;
$$;

create or replace function public.notify_customer_payment_event()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status is distinct from old.status then
    perform public.emit_customer_notification(
      new.customer_id,
      'payment_status_updated',
      'Payment status updated',
      'Payment for order ' || new.order_id || ' is now ' || replace(new.status, '_', ' ') || '.',
      new.status,
      '#/account/orders',
      'payment_status:' || new.id || ':' || new.status || ':' || clock_timestamp()::text
    );
  end if;
  return new;
end;
$$;

create or replace function public.notify_customer_coupon_event()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_customer public.customers;
  v_discount text;
begin
  if not new.active
     or new.starts_at > now()
     or (new.expires_at is not null and new.expires_at <= now())
  then return new; end if;
  if tg_op = 'UPDATE' and old.active is not distinct from new.active and old.starts_at is not distinct from new.starts_at then
    return new;
  end if;

  v_discount := case
    when new.discount_type = 'percentage' then trim(to_char(new.discount_value, 'FM999999990D##')) || '% off'
    else 'Nu. ' || trim(to_char(new.discount_value, 'FM999999990D##')) || ' off'
  end;

  for v_customer in
    select * from public.customers where status = 'active'
  loop
    perform public.emit_customer_notification(
      v_customer.id,
      'coupon_available',
      coalesce(nullif(new.title, ''), 'New coupon available'),
      'Use code ' || upper(new.code) || ' for ' || v_discount || ' on your next order.',
      null,
      '#/coupons',
      'coupon_available:' || new.id || ':' || v_customer.id
    );
  end loop;
  return new;
end;
$$;

create or replace function public.notify_customer_product_event()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_customer public.customers;
begin
  if not new.published then return new; end if;
  if tg_op = 'UPDATE' and old.published is not distinct from new.published then
    return new;
  end if;

  for v_customer in
    select * from public.customers where status = 'active'
  loop
    perform public.emit_customer_notification(
      v_customer.id,
      'product_available',
      'New product available',
      coalesce(nullif(new.name, ''), 'A new product') || ' is now available in the Zama shop.',
      null,
      '#/shop/' || new.id,
      'product_available:' || new.id || ':' || v_customer.id
    );
  end loop;
  return new;
end;
$$;

drop trigger if exists customer_notification_orders on public.orders;
create trigger customer_notification_orders
  after insert or update of status, payment_status on public.orders
  for each row execute function public.notify_customer_order_event();

drop trigger if exists customer_notification_payments on public.payments;
create trigger customer_notification_payments
  after update of status on public.payments
  for each row execute function public.notify_customer_payment_event();

drop trigger if exists customer_notification_coupons on public.coupons;
create trigger customer_notification_coupons
  after insert or update of active, starts_at, expires_at on public.coupons
  for each row execute function public.notify_customer_coupon_event();

drop trigger if exists customer_notification_products on public.products;
create trigger customer_notification_products
  after insert or update of published on public.products
  for each row execute function public.notify_customer_product_event();

revoke all on function public.get_my_notifications() from public;
revoke all on function public.mark_notification_read(uuid) from public;
revoke all on function public.mark_all_notifications_read() from public;
revoke all on function public.emit_customer_notification(text, text, text, text, text, text, text) from public;
grant execute on function public.get_my_notifications() to authenticated;
grant execute on function public.mark_notification_read(uuid) to authenticated;
grant execute on function public.mark_all_notifications_read() to authenticated;

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'customer_notifications'
  ) then
    alter publication supabase_realtime add table public.customer_notifications;
  end if;
exception when undefined_object then
  null;
end;
$$;

notify pgrst, 'reload schema';
