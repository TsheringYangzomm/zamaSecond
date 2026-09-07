-- Zama admin notifications
-- Run after cms-schema.sql, commerce-schema.sql, account-rewards-schema.sql,
-- coupons-schema.sql, and returns-schema.sql.

create table if not exists public.admin_notifications (
  id uuid primary key default gen_random_uuid(),
  type text not null,
  title text not null,
  message text not null,
  link text,
  dedupe_key text unique,
  created_at timestamptz not null default now()
);

create table if not exists public.admin_notification_reads (
  notification_id uuid not null references public.admin_notifications (id) on delete cascade,
  admin_email text not null,
  read_at timestamptz not null default now(),
  primary key (notification_id, admin_email)
);

create index if not exists admin_notifications_created_idx
  on public.admin_notifications (created_at desc);
create index if not exists admin_notification_reads_admin_idx
  on public.admin_notification_reads (lower(admin_email), read_at desc);

alter table public.admin_notifications enable row level security;
alter table public.admin_notification_reads enable row level security;

drop policy if exists "admin notifications admin read" on public.admin_notifications;
create policy "admin notifications admin read" on public.admin_notifications
  for select to authenticated
  using (public.is_admin());

drop policy if exists "admin notification reads admin read" on public.admin_notification_reads;
create policy "admin notification reads admin read" on public.admin_notification_reads
  for select to authenticated
  using (public.is_admin() and lower(admin_email) = lower(coalesce(auth.email(), '')));

drop policy if exists "admin notification reads admin insert" on public.admin_notification_reads;
create policy "admin notification reads admin insert" on public.admin_notification_reads
  for insert to authenticated
  with check (public.is_admin() and lower(admin_email) = lower(coalesce(auth.email(), '')));

drop policy if exists "admin notification reads admin update" on public.admin_notification_reads;
create policy "admin notification reads admin update" on public.admin_notification_reads
  for update to authenticated
  using (public.is_admin() and lower(admin_email) = lower(coalesce(auth.email(), '')))
  with check (public.is_admin() and lower(admin_email) = lower(coalesce(auth.email(), '')));

create or replace function public.get_admin_notifications()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() or auth.email() is null then return '[]'::jsonb; end if;
  return coalesce((
    select jsonb_agg(jsonb_build_object(
      'id', notification.id,
      'type', notification.type,
      'title', notification.title,
      'message', notification.message,
      'link', notification.link,
      'created_at', notification.created_at,
      'read_at', reads.read_at
    ) order by notification.created_at desc)
    from (
      select *
      from public.admin_notifications
      order by created_at desc
      limit 100
    ) notification
    left join public.admin_notification_reads reads
      on reads.notification_id = notification.id
     and lower(reads.admin_email) = lower(auth.email())
  ), '[]'::jsonb);
end;
$$;

create or replace function public.mark_admin_notification_read(p_notification_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() or auth.email() is null then
    return jsonb_build_object('status', 'forbidden');
  end if;
  insert into public.admin_notification_reads (notification_id, admin_email, read_at)
  values (p_notification_id, lower(auth.email()), now())
  on conflict (notification_id, admin_email) do update set read_at = least(public.admin_notification_reads.read_at, excluded.read_at);
  return jsonb_build_object('status', 'ok');
end;
$$;

create or replace function public.mark_all_admin_notifications_read()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() or auth.email() is null then
    return jsonb_build_object('status', 'forbidden');
  end if;
  insert into public.admin_notification_reads (notification_id, admin_email, read_at)
  select notification.id, lower(auth.email()), now()
  from public.admin_notifications notification
  on conflict (notification_id, admin_email) do nothing;
  return jsonb_build_object('status', 'ok');
end;
$$;

-- Only trusted trigger functions call this helper. The dedupe key prevents
-- duplicate notifications when one customer action updates related tables.
create or replace function public.emit_admin_notification(
  p_type text,
  p_title text,
  p_message text,
  p_link text,
  p_dedupe_key text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.admin_notifications (type, title, message, link, dedupe_key)
  values (p_type, p_title, p_message, p_link, p_dedupe_key)
  on conflict (dedupe_key) do nothing;
end;
$$;

create or replace function public.notify_admin_order_event()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    perform public.emit_admin_notification(
      'order_created',
      'New order received',
      'Order ' || new.id || ' was placed.',
      '#/admin?tab=orders',
      'order_created:' || new.id
    );
  elsif new.status is distinct from old.status then
    if public.is_admin() then return new; end if;
    perform public.emit_admin_notification(
      'order_updated',
      'Order status updated',
      'Order ' || new.id || ' is now ' || replace(new.status, '_', ' ') || '.',
      '#/admin?tab=orders',
      'order_status:' || new.id || ':' || new.status || ':' || clock_timestamp()::text
    );
  end if;
  return new;
end;
$$;

create or replace function public.notify_admin_payment_event()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if public.is_admin() or new.status is not distinct from old.status then return new; end if;
  perform public.emit_admin_notification(
    'payment_updated',
    'Payment update',
    'Payment for order ' || new.order_id || ' is now ' || replace(new.status, '_', ' ') || '.',
    '#/admin?tab=orders&view=payments',
    'payment_status:' || new.id || ':' || new.status || ':' || clock_timestamp()::text
  );
  return new;
end;
$$;

create or replace function public.notify_admin_return_event()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.emit_admin_notification(
    'return_requested',
    'New return request',
    'A customer requested a return for order ' || new.order_id || '.',
    '#/admin?tab=orders&view=returns',
    'return_requested:' || new.id
  );
  return new;
end;
$$;

create or replace function public.notify_admin_review_event()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.customer_id is null or coalesce(new.source, '') <> 'customer' then return new; end if;
  perform public.emit_admin_notification(
    'review_submitted',
    'New customer review',
    'A customer submitted a review for order ' || coalesce(new.order_id, 'an order') || '.',
    '#/admin?tab=reviews',
    'review_submitted:' || new.id
  );
  return new;
end;
$$;

create or replace function public.notify_admin_message_event()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.emit_admin_notification(
    'message_received',
    'New customer message',
    new.name || ' sent a message about ' || new.topic || '.',
    '#/admin?tab=messages',
    'message_received:' || new.id
  );
  return new;
end;
$$;

create or replace function public.notify_admin_points_event()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.emit_admin_notification(
    'points_redemption_requested',
    'Points redemption requested',
    'A customer requested Nu. ' || new.wallet_amount || ' in wallet credit.',
    '#/admin?tab=accounts-rewards',
    'points_redemption_requested:' || new.id
  );
  return new;
end;
$$;

create or replace function public.notify_admin_withdrawal_event()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.emit_admin_notification(
    'withdrawal_requested',
    'Wallet withdrawal requested',
    'A customer requested a Nu. ' || new.amount || ' withdrawal.',
    '#/admin?tab=accounts-rewards',
    'withdrawal_requested:' || new.id
  );
  return new;
end;
$$;

create or replace function public.notify_admin_customer_event()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    perform public.emit_admin_notification(
      'customer_created',
      'New customer account',
      coalesce(new.name, 'A customer') || ' created an account.',
      '#/admin?tab=customers',
      'customer_created:' || new.id
    );
  elsif new.name is distinct from old.name
     or new.email is distinct from old.email
     or new.phone is distinct from old.phone
     or new.area is distinct from old.area
     or new.dzongkhag is distinct from old.dzongkhag
     or new.address is distinct from old.address
     or new.status is distinct from old.status then
    if public.is_admin() then return new; end if;
    perform public.emit_admin_notification(
      'customer_updated',
      'Customer account updated',
      coalesce(new.name, 'A customer') || ' updated their account details.',
      '#/admin?tab=customers',
      'customer_updated:' || new.id || ':' || clock_timestamp()::text
    );
  end if;
  return new;
end;
$$;

drop trigger if exists admin_notification_orders on public.orders;
create trigger admin_notification_orders
  after insert or update of status on public.orders
  for each row execute function public.notify_admin_order_event();

drop trigger if exists admin_notification_payments on public.payments;
create trigger admin_notification_payments
  after update of status on public.payments
  for each row execute function public.notify_admin_payment_event();

drop trigger if exists admin_notification_returns on public.order_returns;
create trigger admin_notification_returns
  after insert on public.order_returns
  for each row execute function public.notify_admin_return_event();

drop trigger if exists admin_notification_reviews on public.reviews;
create trigger admin_notification_reviews
  after insert on public.reviews
  for each row execute function public.notify_admin_review_event();

drop trigger if exists admin_notification_messages on public.contact_messages;
create trigger admin_notification_messages
  after insert on public.contact_messages
  for each row execute function public.notify_admin_message_event();

drop trigger if exists admin_notification_points_redemptions on public.points_redemptions;
create trigger admin_notification_points_redemptions
  after insert on public.points_redemptions
  for each row execute function public.notify_admin_points_event();

drop trigger if exists admin_notification_withdrawals on public.wallet_withdrawals;
create trigger admin_notification_withdrawals
  after insert on public.wallet_withdrawals
  for each row execute function public.notify_admin_withdrawal_event();

drop trigger if exists admin_notification_customers on public.customers;
create trigger admin_notification_customers
  after insert or update of name, email, phone, area, dzongkhag, address, status on public.customers
  for each row execute function public.notify_admin_customer_event();

-- Backfill only very recent orders so applying this migration does not hide an
-- order placed just before the notification schema was installed.
insert into public.admin_notifications (type, title, message, link, dedupe_key)
select
  'order_created',
  'New order received',
  'Order ' || orders.id || ' was placed.',
  '#/admin?tab=orders',
  'order_created:' || orders.id
from public.orders
where orders.created_at >= now() - interval '24 hours'
on conflict (dedupe_key) do nothing;

revoke all on function public.get_admin_notifications() from public;
revoke all on function public.mark_admin_notification_read(uuid) from public;
revoke all on function public.mark_all_admin_notifications_read() from public;
revoke all on function public.emit_admin_notification(text, text, text, text, text) from public;
grant execute on function public.get_admin_notifications() to authenticated;
grant execute on function public.mark_admin_notification_read(uuid) to authenticated;
grant execute on function public.mark_all_admin_notifications_read() to authenticated;

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'admin_notifications'
  ) then
    alter publication supabase_realtime add table public.admin_notifications;
  end if;
exception when undefined_object then
  null;
end;
$$;

notify pgrst, 'reload schema';
