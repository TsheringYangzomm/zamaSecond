-- Zama+ Membership Account Hub
-- Apply after cms-schema.sql, commerce-schema.sql, checkout-schema.sql,
-- coupons-schema.sql, account-rewards-schema.sql, returns-schema.sql, and
-- customer-notifications-schema.sql.
--
-- Membership is manually verified through bank transfer. Payment proof is
-- optional, private, and never exposed to customers.

create table if not exists public.membership_plans (
  id text primary key default ('membership-' || gen_random_uuid()::text),
  name text not null,
  description text not null default '',
  price numeric(12, 2) not null default 0 check (price >= 0),
  cadence text not null default 'monthly' check (cadence in ('monthly', 'annual', 'one_time')),
  benefits jsonb not null default '[]'::jsonb,
  discount_percent numeric(5, 2) not null default 0 check (discount_percent >= 0 and discount_percent <= 100),
  status text not null default 'draft' check (status in ('draft', 'active', 'archived')),
  display_order integer not null default 0 check (display_order >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists membership_plans_public_idx
  on public.membership_plans (status, display_order, created_at);

create table if not exists public.membership_requests (
  id uuid primary key default gen_random_uuid(),
  customer_id text not null references public.customers (id) on delete cascade,
  plan_id text not null references public.membership_plans (id) on delete restrict,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected', 'cancelled')),
  payment_method text not null default 'Bank transfer',
  payment_reference text not null,
  proof_path text,
  submitted_at timestamptz not null default now(),
  reviewed_at timestamptz,
  reviewed_by text,
  rejection_reason text
);

create unique index if not exists membership_requests_open_customer_idx
  on public.membership_requests (customer_id)
  where status in ('pending', 'approved');
create index if not exists membership_requests_created_idx
  on public.membership_requests (submitted_at desc);

alter table public.subscriptions
  add column if not exists plan_id text,
  add column if not exists payment_method text,
  add column if not exists payment_reference text,
  add column if not exists next_renewal_date text;

alter table public.orders
  add column if not exists membership_discount numeric(12, 2) not null default 0,
  add column if not exists membership_plan_id text;

alter table public.coupons
  add column if not exists member_only boolean not null default false;

alter table public.orders
  drop constraint if exists orders_membership_plan_id_fkey;
alter table public.orders
  add constraint orders_membership_plan_id_fkey
  foreign key (membership_plan_id) references public.membership_plans (id) on delete set null;

alter table public.membership_plans enable row level security;
alter table public.membership_requests enable row level security;

drop policy if exists "membership plans public active read" on public.membership_plans;
create policy "membership plans public active read" on public.membership_plans
  for select to anon, authenticated
  using (status = 'active' or public.is_admin());

drop policy if exists "membership plans admin write" on public.membership_plans;
create policy "membership plans admin write" on public.membership_plans
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "membership requests admin all" on public.membership_requests;
create policy "membership requests admin all" on public.membership_requests
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop trigger if exists membership_plans_set_updated_at on public.membership_plans;
create trigger membership_plans_set_updated_at
  before update on public.membership_plans
  for each row execute function public.set_updated_at();

-- Older notification migrations constrained the feed to return/order events.
-- Keep all previously supported values and add membership events.
alter table public.customer_notifications
  drop constraint if exists customer_notifications_type_check;
alter table public.customer_notifications
  add constraint customer_notifications_type_check check (type in (
    'return_submitted', 'return_approved', 'return_rejected',
    'return_refunded', 'return_cancelled', 'pickup_schedule_updated',
    'order_placed', 'order_status_updated', 'payment_status_updated',
    'coupon_available', 'product_available',
    'membership_request', 'membership_approved', 'membership_rejected',
    'membership_updated'
  ));

-- Private proof storage. If Storage is not enabled in a project, the customer
-- request still works with its transfer reference alone.
insert into storage.buckets (id, name, public)
values ('membership-payment-proofs', 'membership-payment-proofs', false)
on conflict (id) do update set public = false;

drop policy if exists "membership proof admin read" on storage.objects;
create policy "membership proof admin read" on storage.objects
  for select to authenticated
  using (bucket_id = 'membership-payment-proofs' and public.is_admin());
drop policy if exists "membership proof admin insert" on storage.objects;
create policy "membership proof admin insert" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'membership-payment-proofs' and public.is_admin());
drop policy if exists "membership proof customer insert" on storage.objects;
create policy "membership proof customer insert" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'membership-payment-proofs'
    and name like public.account_customer_id() || '/%'
  );
drop policy if exists "membership proof admin delete" on storage.objects;
create policy "membership proof admin delete" on storage.objects
  for delete to authenticated
  using (bucket_id = 'membership-payment-proofs' and public.is_admin());

create or replace function public.membership_plan_payload(p_plan_id text)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select case when plan.id is null then null else jsonb_build_object(
    'id', plan.id,
    'name', plan.name,
    'description', plan.description,
    'price', plan.price,
    'cadence', plan.cadence,
    'benefits', plan.benefits,
    'discount_percent', plan.discount_percent,
    'status', plan.status,
    'display_order', plan.display_order,
    'created_at', plan.created_at,
    'updated_at', plan.updated_at
  ) end
  from public.membership_plans plan
  where plan.id = p_plan_id;
$$;

create or replace function public.get_membership_plans()
returns setof jsonb
language sql
stable
security definer
set search_path = public
as $$
  select public.membership_plan_payload(plan.id)
  from public.membership_plans plan
  where plan.status = 'active'
  order by plan.display_order, plan.created_at;
$$;

create or replace function public.get_admin_membership_plans()
returns setof jsonb
language sql
stable
security definer
set search_path = public
as $$
  select public.membership_plan_payload(plan.id)
  from public.membership_plans plan
  where public.is_admin()
  order by plan.display_order, plan.created_at;
$$;

create or replace function public.get_my_membership()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_customer_id text := public.account_customer_id();
  v_subscription public.subscriptions;
  v_request public.membership_requests;
  v_status text := 'none';
  v_plan_id text;
  v_savings numeric(12, 2) := 0;
begin
  if v_customer_id is null then
    return jsonb_build_object('status', 'none', 'plan', null, 'subscription', null, 'request', null, 'member_discount_percent', 0, 'savings_total', 0);
  end if;

  select subscription.* into v_subscription
  from public.subscriptions subscription
  where subscription.customer_id = v_customer_id
    and subscription.status in ('active', 'paused', 'cancelled')
    and subscription.plan_id is not null
  order by case subscription.status when 'active' then 0 when 'paused' then 1 else 2 end, subscription.created_at desc
  limit 1;

  select request.* into v_request
  from public.membership_requests request
  where request.customer_id = v_customer_id
  order by request.submitted_at desc
  limit 1;

  if v_subscription.id is not null then
    v_status := v_subscription.status;
    v_plan_id := v_subscription.plan_id;
  elsif v_request.id is not null then
    v_status := v_request.status;
    v_plan_id := v_request.plan_id;
  end if;

  select coalesce(sum(order_row.membership_discount), 0) into v_savings
  from public.orders order_row
  where order_row.customer_id = v_customer_id;

  return jsonb_build_object(
    'status', v_status,
    'plan', public.membership_plan_payload(v_plan_id),
    'subscription', case when v_subscription.id is null then null else jsonb_build_object(
      'id', v_subscription.id,
      'customer_id', v_subscription.customer_id,
      'plan_id', v_subscription.plan_id,
      'status', v_subscription.status,
      'price', v_subscription.price,
      'cadence', coalesce((select plan.cadence from public.membership_plans plan where plan.id = v_subscription.plan_id), 'monthly'),
      'start_date', v_subscription.start_date,
      'next_renewal_date', coalesce(v_subscription.next_renewal_date, v_subscription.next_delivery_date),
      'payment_method', coalesce(v_subscription.payment_method, 'Bank transfer'),
      'payment_reference', coalesce(v_subscription.payment_reference, ''),
      'history', v_subscription.history
    ) end,
    'request', case when v_request.id is null then null else jsonb_build_object(
      'id', v_request.id,
      'customer_id', v_request.customer_id,
      'plan_id', v_request.plan_id,
      'status', v_request.status,
      'payment_method', v_request.payment_method,
      'payment_reference', v_request.payment_reference,
      'proof_path', v_request.proof_path,
      'submitted_at', v_request.submitted_at,
      'reviewed_at', v_request.reviewed_at,
      'reviewed_by', v_request.reviewed_by,
      'rejection_reason', v_request.rejection_reason
    ) end,
    'member_discount_percent', case when v_subscription.status = 'active' then coalesce((select plan.discount_percent from public.membership_plans plan where plan.id = v_subscription.plan_id), 0) else 0 end,
    'savings_total', v_savings
  );
end;
$$;

create or replace function public.request_membership(
  p_plan_id text,
  p_payment_method text default 'Bank transfer',
  p_payment_reference text default '',
  p_proof_path text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_customer_id text := public.account_customer_id();
  v_plan public.membership_plans;
  v_request public.membership_requests;
begin
  if v_customer_id is null then return jsonb_build_object('status', 'not_authenticated', 'error', 'Sign in before joining Zama+.'); end if;
  if char_length(trim(coalesce(p_payment_reference, ''))) = 0 then return jsonb_build_object('status', 'invalid_reference', 'error', 'Enter the bank-transfer reference before submitting.'); end if;
  if p_proof_path is not null and p_proof_path not like v_customer_id || '/%' then return jsonb_build_object('status', 'invalid_proof', 'error', 'The payment proof could not be attached to this account.'); end if;
  select * into v_plan from public.membership_plans where id = p_plan_id and status = 'active';
  if v_plan.id is null then return jsonb_build_object('status', 'plan_unavailable', 'error', 'That membership plan is no longer available.'); end if;
  if exists (select 1 from public.membership_requests where customer_id = v_customer_id and status in ('pending', 'approved'))
     or exists (select 1 from public.subscriptions where customer_id = v_customer_id and status = 'active' and plan_id is not null) then
    return jsonb_build_object('status', 'already_enrolled', 'error', 'You already have an active or pending membership.');
  end if;

  insert into public.membership_requests (customer_id, plan_id, payment_method, payment_reference, proof_path)
  values (v_customer_id, v_plan.id, coalesce(nullif(trim(p_payment_method), ''), 'Bank transfer'), trim(p_payment_reference), p_proof_path)
  returning * into v_request;

  perform public.emit_customer_notification(
    v_customer_id, 'membership_request', 'Membership request received',
    'Your request to join ' || v_plan.name || ' is waiting for payment verification.',
    'pending', '#/account/membership', 'membership_request:' || v_request.id::text
  );
  return jsonb_build_object('status', 'ok', 'snapshot', public.get_my_membership());
end;
$$;

create or replace function public.get_admin_membership_requests()
returns setof jsonb
language sql
stable
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'id', request.id,
    'customer_id', request.customer_id,
    'customer_name', customer.name,
    'customer_email', customer.email,
    'plan_id', request.plan_id,
    'plan', public.membership_plan_payload(request.plan_id),
    'status', request.status,
    'payment_method', request.payment_method,
    'payment_reference', request.payment_reference,
    'proof_path', request.proof_path,
    'submitted_at', request.submitted_at,
    'reviewed_at', request.reviewed_at,
    'reviewed_by', request.reviewed_by,
    'rejection_reason', request.rejection_reason
  )
  from public.membership_requests request
  join public.customers customer on customer.id = request.customer_id
  where public.is_admin()
  order by request.submitted_at desc;
$$;

create or replace function public.admin_review_membership_request(
  p_request_id uuid,
  p_status text,
  p_admin_email text default null,
  p_rejection_reason text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_request public.membership_requests;
  v_plan public.membership_plans;
  v_start timestamptz := now();
  v_next text;
  v_subscription_id text;
begin
  if not public.is_admin() then return jsonb_build_object('status', 'forbidden'); end if;
  if p_status not in ('approved', 'rejected') then return jsonb_build_object('status', 'invalid_status'); end if;
  if p_status = 'rejected' and char_length(trim(coalesce(p_rejection_reason, ''))) = 0 then return jsonb_build_object('status', 'invalid_rejection_reason', 'error', 'Add a reason before rejecting this request.'); end if;
  select * into v_request from public.membership_requests where id = p_request_id;
  if v_request.id is null then return jsonb_build_object('status', 'not_found'); end if;
  if v_request.status <> 'pending' then return jsonb_build_object('status', 'already_reviewed'); end if;
  select * into v_plan from public.membership_plans where id = v_request.plan_id;
  if v_plan.id is null then return jsonb_build_object('status', 'plan_not_found'); end if;

  if p_status = 'rejected' then
    update public.membership_requests
    set status = 'rejected', reviewed_at = now(), reviewed_by = coalesce(nullif(trim(p_admin_email), ''), auth.email()), rejection_reason = trim(p_rejection_reason)
    where id = p_request_id;
    perform public.emit_customer_notification(
      v_request.customer_id, 'membership_rejected', 'Membership request rejected',
      'Your request to join ' || v_plan.name || ' was rejected: ' || trim(p_rejection_reason),
      'rejected', '#/account/membership', 'membership_rejected:' || v_request.id::text
    );
    return jsonb_build_object('status', 'ok');
  end if;

  v_next := case
    when v_plan.cadence = 'monthly' then (v_start + interval '1 month')::text
    when v_plan.cadence = 'annual' then (v_start + interval '1 year')::text
    else null
  end;
  v_subscription_id := 'SUB-' || replace(gen_random_uuid()::text, '-', '');
  insert into public.subscriptions (
    id, customer_id, plan, plan_id, price, status, start_date, next_delivery_date,
    payment_method, payment_reference, next_renewal_date, created_at, history
  ) values (
    v_subscription_id, v_request.customer_id, v_plan.name, v_plan.id, v_plan.price,
    'active', v_start::text, v_next, v_request.payment_method, v_request.payment_reference,
    v_next, v_start, jsonb_build_array(jsonb_build_object('status', 'active', 'at', v_start))
  );

  update public.membership_requests
  set status = 'approved', reviewed_at = now(), reviewed_by = coalesce(nullif(trim(p_admin_email), ''), auth.email())
  where id = p_request_id;
  perform public.emit_customer_notification(
    v_request.customer_id, 'membership_approved', 'Zama+ membership approved',
    'Your ' || v_plan.name || ' membership is active. You can now use your member benefits and automatic savings.',
    'approved', '#/account/membership', 'membership_approved:' || v_request.id::text
  );
  return jsonb_build_object('status', 'ok', 'subscription_id', v_subscription_id);
end;
$$;

create or replace function public.notify_admin_membership_request()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_customer public.customers;
  v_plan public.membership_plans;
begin
  select * into v_customer from public.customers where id = new.customer_id;
  select * into v_plan from public.membership_plans where id = new.plan_id;
  perform public.emit_admin_notification(
    'membership_request',
    'New Zama+ membership request',
    coalesce(v_customer.name, 'A customer') || ' submitted a bank-transfer request for ' || coalesce(v_plan.name, 'a membership plan') || '.',
    '#/admin?tab=subscriptions',
    'membership_request:' || new.id::text
  );
  return new;
end;
$$;

drop trigger if exists admin_notification_membership_requests on public.membership_requests;
create trigger admin_notification_membership_requests
  after insert on public.membership_requests
  for each row execute function public.notify_admin_membership_request();

create or replace function public.notify_customer_membership_plan_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_subscription public.subscriptions;
begin
  if old.name is not distinct from new.name
     and old.price is not distinct from new.price
     and old.cadence is not distinct from new.cadence
     and old.benefits is not distinct from new.benefits
     and old.discount_percent is not distinct from new.discount_percent
     and old.status is not distinct from new.status then
    return new;
  end if;
  for v_subscription in
    select * from public.subscriptions
    where plan_id = new.id and status = 'active'
  loop
    perform public.emit_customer_notification(
      v_subscription.customer_id,
      'membership_updated',
      'Membership plan updated',
      new.name || ' was updated. Your account now shows the latest member benefits and plan details.',
      'active',
      '#/account/membership',
      'membership_plan_updated:' || new.id || ':' || new.updated_at::text || ':' || v_subscription.customer_id
    );
  end loop;
  return new;
end;
$$;

drop trigger if exists customer_membership_plan_changes on public.membership_plans;
create trigger customer_membership_plan_changes
  after update of name, price, cadence, benefits, discount_percent, status on public.membership_plans
  for each row execute function public.notify_customer_membership_plan_change();

create or replace function public.notify_customer_membership_subscription_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.plan_id is null
     or (new.status is not distinct from old.status
       and new.plan_id is not distinct from old.plan_id
       and new.next_renewal_date is not distinct from old.next_renewal_date) then
    return new;
  end if;
  perform public.emit_customer_notification(
    new.customer_id,
    'membership_updated',
    'Membership status updated',
    case
      when new.status is distinct from old.status then 'Your Zama+ membership is now ' || replace(new.status, '_', ' ') || '.'
      when new.next_renewal_date is distinct from old.next_renewal_date then 'Your Zama+ membership renewal date was updated to ' || coalesce(new.next_renewal_date, 'one-time') || '.'
      else 'Your Zama+ membership plan was updated.'
    end,
    new.status,
    '#/account/membership',
    'membership_status:' || new.id || ':' || new.status || ':' || clock_timestamp()::text
  );
  return new;
end;
$$;

drop trigger if exists customer_membership_subscription_changes on public.subscriptions;
create trigger customer_membership_subscription_changes
  after update of status, plan_id, next_renewal_date on public.subscriptions
  for each row execute function public.notify_customer_membership_subscription_change();

-- Membership savings are server-authoritative. Coupon and membership discounts
-- do not stack: the larger eligible discount wins.
drop function if exists public.place_order(text, jsonb, numeric, text, text, text, text, text);
drop function if exists public.place_order(text, jsonb, numeric, text, text, text, text, text, integer);

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
  v_membership_discount numeric(12, 2) := 0;
  v_points_discount numeric(12, 2) := 0;
  v_coupon_id text;
  v_membership_plan_id text;
  v_coupon_result jsonb;
  v_settings public.reward_settings;
  v_subscription public.subscriptions;
  v_membership_plan public.membership_plans;
  v_points_balance integer := 0;
  v_requested_points integer := greatest(0, coalesce(p_points_to_redeem, 0));
  v_points integer := greatest(0, coalesce(p_points_to_redeem, 0));
  v_remaining_total numeric(12, 2) := 0;
begin
  if p_customer_id is null or not exists (select 1 from public.customers where id = p_customer_id) then return jsonb_build_object('status', 'customer_not_found'); end if;
  if (trim(coalesce(p_coupon_code, '')) <> '' or v_points > 0) and auth.email() is null then return jsonb_build_object('status', 'not_authenticated', 'error', 'Sign in to use coupons or points.'); end if;
  if auth.email() is not null and not exists (select 1 from public.customers where id = p_customer_id and lower(email) = lower(auth.email())) then return jsonb_build_object('status', 'customer_not_authorized'); end if;

  for v_item in select * from jsonb_to_recordset(coalesce(p_items, '[]'::jsonb)) as item(product_id text, name text, quantity numeric, price numeric) loop
    select * into v_product from public.products where id = v_item.product_id and published;
    if v_product.id is null or v_product.price_amount is null or v_item.quantity is null or v_item.quantity <= 0 then return jsonb_build_object('status', 'pricing_unavailable'); end if;
    v_subtotal := v_subtotal + (v_product.price_amount * v_item.quantity);
    v_items := v_items || jsonb_build_array(jsonb_build_object('product_id', v_product.id, 'name', v_product.name, 'quantity', v_item.quantity, 'price', v_product.price_amount));
  end loop;
  v_subtotal := round(v_subtotal, 2);

  if trim(coalesce(p_coupon_code, '')) <> '' then
    v_coupon_result := public.calculate_coupon(p_coupon_code, p_customer_id, v_items);
    if v_coupon_result ->> 'status' <> 'ok' then return v_coupon_result; end if;
    v_coupon_discount := coalesce((v_coupon_result ->> 'discount_amount')::numeric, 0);
    v_coupon_id := v_coupon_result -> 'coupon' ->> 'id';
  end if;

  if auth.email() is not null then
    select subscription.* into v_subscription
    from public.subscriptions subscription
    join public.membership_plans plan on plan.id = subscription.plan_id and plan.status = 'active'
    where subscription.customer_id = p_customer_id and subscription.status = 'active'
    order by subscription.created_at desc limit 1;
  end if;
  if v_subscription.id is not null then
    select * into v_membership_plan from public.membership_plans where id = v_subscription.plan_id;
    v_membership_plan_id := v_membership_plan.id;
    v_membership_discount := least(v_subtotal, round(v_subtotal * v_membership_plan.discount_percent / 100, 2));
  end if;
  if v_membership_discount >= v_coupon_discount then
    v_coupon_discount := 0;
    v_coupon_id := null;
  else
    v_membership_discount := 0;
    v_membership_plan_id := null;
  end if;

  if v_requested_points > 0 then
    select * into v_settings from public.reward_settings where id = 'default';
    select coalesce(sum(points_delta), 0) into v_points_balance from public.customer_points_ledger where customer_id = p_customer_id;
    if v_requested_points > v_points_balance then return jsonb_build_object('status', 'invalid_points', 'error', 'You cannot redeem more points than your available balance.'); end if;
    if v_settings.points_per_ngultrum <= 0 then return jsonb_build_object('status', 'invalid_points', 'error', 'Point redemption is not available right now.'); end if;
    v_remaining_total := greatest(0, v_subtotal - v_coupon_discount - v_membership_discount);
    v_points := least(v_requested_points, floor(v_remaining_total * v_settings.points_per_ngultrum)::integer);
    v_points_discount := least(v_remaining_total, round(v_points / v_settings.points_per_ngultrum, 2));
  end if;

  v_order_id := 'ZAM-' || to_char(v_now, 'YYYY') || '-' || lpad(nextval('public.order_number_seq')::text, 4, '0');
  insert into public.orders (
    id, customer_id, status, items, subtotal, total, coupon_id, coupon_code, coupon_discount,
    membership_discount, membership_plan_id, points_redeemed, points_discount, payment_status,
    payment_method, payment_reference, delivery_date, delivery_area, notes, created_at, history
  ) values (
    v_order_id, p_customer_id, 'pending', v_items, v_subtotal,
    greatest(0, v_subtotal - v_coupon_discount - v_membership_discount - v_points_discount),
    v_coupon_id, case when v_coupon_id is null then null else upper(trim(p_coupon_code)) end,
    v_coupon_discount, v_membership_discount, v_membership_plan_id, v_points, v_points_discount,
    'pending', coalesce(p_payment_method, ''), null, coalesce(p_delivery_date, ''),
    coalesce(p_delivery_area, ''), coalesce(p_notes, ''), v_now,
    jsonb_build_array(jsonb_build_object('status', 'pending', 'at', v_now))
  );

  insert into public.payments (id, order_id, customer_id, amount, status, date, reference, method)
  values ('PAY-' || v_order_id, v_order_id, p_customer_id,
    greatest(0, v_subtotal - v_coupon_discount - v_membership_discount - v_points_discount),
    'pending', to_char(v_now, 'YYYY-MM-DD'), '', coalesce(p_payment_method, ''));
  if v_coupon_id is not null then insert into public.coupon_redemptions (coupon_id, customer_id, order_id, discount_amount) values (v_coupon_id, p_customer_id, v_order_id, v_coupon_discount); end if;
  if v_points > 0 then insert into public.customer_points_ledger (customer_id, points_delta, source, source_id, reason) values (p_customer_id, -v_points, 'checkout_redemption', v_order_id, 'Points used at checkout for order ' || v_order_id); end if;
  if p_delivery_date is not null and p_delivery_date <> '' then insert into public.deliveries (id, order_id, customer_id, area, delivery_date, status, driver) values ('DEL-' || v_order_id, v_order_id, p_customer_id, coalesce(p_delivery_area, ''), p_delivery_date, 'preparing', null); end if;

  return jsonb_build_object(
    'status', 'ok', 'orderId', v_order_id, 'subtotal', v_subtotal,
    'couponDiscount', v_coupon_discount, 'membershipDiscount', v_membership_discount,
    'pointsRedeemed', v_points, 'pointsDiscount', v_points_discount,
    'total', greatest(0, v_subtotal - v_coupon_discount - v_membership_discount - v_points_discount)
  );
end;
$$;

revoke all on function public.get_membership_plans() from public;
revoke all on function public.get_admin_membership_plans() from public;
revoke all on function public.get_my_membership() from public;
revoke all on function public.request_membership(text, text, text, text) from public;
revoke all on function public.get_admin_membership_requests() from public;
revoke all on function public.admin_review_membership_request(uuid, text, text, text) from public;
revoke all on function public.place_order(text, jsonb, numeric, text, text, text, text, text, integer) from public;

grant execute on function public.get_membership_plans() to anon, authenticated;
grant execute on function public.get_admin_membership_plans() to authenticated;
grant execute on function public.get_my_membership() to authenticated;
grant execute on function public.request_membership(text, text, text, text) to authenticated;
grant execute on function public.get_admin_membership_requests() to authenticated;
grant execute on function public.admin_review_membership_request(uuid, text, text, text) to authenticated;
grant execute on function public.place_order(text, jsonb, numeric, text, text, text, text, text, integer) to anon, authenticated;

insert into public.membership_plans (
  id, name, description, price, cadence, benefits, discount_percent, status, display_order
) values (
  'zama-plus-monthly',
  'Zama+ Membership',
  'A monthly membership for easier meal planning, better value, and first access to seasonal Zama drops.',
  3500,
  'monthly',
  '[
    {"title":"Member savings","description":"Get an automatic discount on eligible catalog products at checkout."},
    {"title":"Exclusive offers","description":"See member-only coupons and limited seasonal offers in your account."},
    {"title":"Early access","description":"Hear about selected new products and seasonal boxes before everyone else."},
    {"title":"Reward boosts","description":"Keep your points, check-ins, and review rewards together in one account."}
  ]'::jsonb,
  10,
  'active',
  0
)
on conflict (id) do nothing;

-- Preserve existing development/live subscription rows where the old plan
-- label already identifies Zama+.
update public.subscriptions
set plan_id = 'zama-plus-monthly',
    payment_method = coalesce(nullif(payment_method, ''), 'Bank transfer'),
    next_renewal_date = coalesce(next_renewal_date, next_delivery_date)
where plan_id is null
  and lower(trim(plan)) = lower('Zama+ Membership');

notify pgrst, 'reload schema';
