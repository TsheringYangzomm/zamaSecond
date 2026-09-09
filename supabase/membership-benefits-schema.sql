-- Zama+ exclusive benefits, saved-box delivery cycles, freebies, and product
-- early access. Apply after membership-schema.sql, customer-notifications-schema.sql,
-- admin-notifications-schema.sql, account-rewards-schema.sql, coupons-schema.sql,
-- commerce-schema.sql, and checkout-schema.sql.
--
-- All dates and cutoffs are evaluated in Asia/Thimphu. The cron job is optional:
-- admins can use the “Process due cycles” control when pg_cron is unavailable.

alter table public.membership_plans
  add column if not exists delivery_tiers jsonb not null default '[
    {"id":"standard","label":"Standard delivery","description":"Reliable delivery on the scheduled date.","fee":60,"enabled":true},
    {"id":"low_cost","label":"Low-cost delivery","description":"A lower-cost route when timing is flexible.","fee":30,"enabled":true},
    {"id":"priority","label":"Priority delivery","description":"First available fulfillment for your scheduled box.","fee":0,"enabled":true}
  ]'::jsonb,
  add column if not exists scheduled_delivery_enabled boolean not null default true,
  add column if not exists early_access_enabled boolean not null default true,
  add column if not exists freebie_enabled boolean not null default true;

alter table public.products
  add column if not exists member_early_access_starts_at timestamptz,
  add column if not exists member_early_access_ends_at timestamptz;

alter table public.orders
  add column if not exists membership_delivery_cycle_id uuid,
  add column if not exists membership_delivery_fee numeric(12, 2) not null default 0;

create table if not exists public.membership_delivery_profiles (
  id uuid primary key default gen_random_uuid(),
  customer_id text not null references public.customers (id) on delete cascade,
  subscription_id text not null references public.subscriptions (id) on delete cascade,
  plan_id text not null references public.membership_plans (id) on delete restrict,
  items jsonb not null default '[]'::jsonb,
  cadence text not null check (cadence in ('weekly', 'fortnightly', 'monthly')),
  delivery_tier text not null check (delivery_tier in ('standard', 'low_cost', 'priority')),
  delivery_area text not null default '',
  delivery_address text not null default '',
  next_delivery_date date not null,
  status text not null default 'active' check (status in ('active', 'paused', 'cancelled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists membership_delivery_profiles_open_customer_idx
  on public.membership_delivery_profiles (customer_id)
  where status in ('active', 'paused');
create index if not exists membership_delivery_profiles_due_idx
  on public.membership_delivery_profiles (status, next_delivery_date);

create table if not exists public.membership_freebie_campaigns (
  id uuid primary key default gen_random_uuid(),
  plan_id text not null references public.membership_plans (id) on delete cascade,
  product_id text not null references public.products (id) on delete restrict,
  starts_at timestamptz not null,
  ends_at timestamptz,
  status text not null default 'draft' check (status in ('draft', 'active', 'archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_at is null or ends_at > starts_at)
);

create unique index if not exists membership_freebie_campaigns_open_plan_idx
  on public.membership_freebie_campaigns (plan_id)
  where status <> 'archived';
create index if not exists membership_freebie_campaigns_active_idx
  on public.membership_freebie_campaigns (plan_id, status, starts_at, ends_at);

create table if not exists public.membership_delivery_cycles (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.membership_delivery_profiles (id) on delete cascade,
  customer_id text not null references public.customers (id) on delete cascade,
  subscription_id text not null references public.subscriptions (id) on delete restrict,
  delivery_date date not null,
  invoice_created_at timestamptz not null default now(),
  payment_due_at timestamptz not null,
  status text not null default 'invoice_ready'
    check (status in ('invoice_ready', 'payment_submitted', 'paid', 'skipped', 'needs_admin_resolution', 'cancelled')),
  items jsonb not null default '[]'::jsonb,
  subtotal numeric(12, 2) not null default 0 check (subtotal >= 0),
  delivery_fee numeric(12, 2) not null default 0 check (delivery_fee >= 0),
  total numeric(12, 2) not null default 0 check (total >= 0),
  payment_reference text,
  payment_proof_path text,
  payment_submitted_at timestamptz,
  paid_at timestamptz,
  reviewed_at timestamptz,
  reviewed_by text,
  order_id text references public.orders (id) on delete set null,
  delivery_id text references public.deliveries (id) on delete set null,
  freebie_product_id text references public.products (id) on delete set null,
  freebie_product_name text,
  admin_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (profile_id, delivery_date)
);

alter table public.orders
  drop constraint if exists orders_membership_delivery_cycle_id_fkey;
alter table public.orders
  add constraint orders_membership_delivery_cycle_id_fkey
  foreign key (membership_delivery_cycle_id) references public.membership_delivery_cycles (id) on delete set null;

create index if not exists membership_delivery_cycles_customer_idx
  on public.membership_delivery_cycles (customer_id, delivery_date desc);
create index if not exists membership_delivery_cycles_status_idx
  on public.membership_delivery_cycles (status, payment_due_at);

alter table public.membership_delivery_profiles enable row level security;
alter table public.membership_delivery_cycles enable row level security;
alter table public.membership_freebie_campaigns enable row level security;

drop policy if exists "membership delivery profiles owner or admin" on public.membership_delivery_profiles;
create policy "membership delivery profiles owner or admin" on public.membership_delivery_profiles
  for select to authenticated
  using (customer_id = public.account_customer_id() or public.is_admin());
drop policy if exists "membership delivery profiles admin write" on public.membership_delivery_profiles;
create policy "membership delivery profiles admin write" on public.membership_delivery_profiles
  for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

drop policy if exists "membership delivery cycles owner or admin" on public.membership_delivery_cycles;
create policy "membership delivery cycles owner or admin" on public.membership_delivery_cycles
  for select to authenticated
  using (customer_id = public.account_customer_id() or public.is_admin());
drop policy if exists "membership delivery cycles admin write" on public.membership_delivery_cycles;
create policy "membership delivery cycles admin write" on public.membership_delivery_cycles
  for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

drop policy if exists "membership freebie campaigns read" on public.membership_freebie_campaigns;
create policy "membership freebie campaigns read" on public.membership_freebie_campaigns
  for select to authenticated
  using (public.is_admin() or status = 'active');
drop policy if exists "membership freebie campaigns admin write" on public.membership_freebie_campaigns;
create policy "membership freebie campaigns admin write" on public.membership_freebie_campaigns
  for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

drop trigger if exists membership_delivery_profiles_set_updated_at on public.membership_delivery_profiles;
create trigger membership_delivery_profiles_set_updated_at
  before update on public.membership_delivery_profiles
  for each row execute function public.set_updated_at();
drop trigger if exists membership_delivery_cycles_set_updated_at on public.membership_delivery_cycles;
create trigger membership_delivery_cycles_set_updated_at
  before update on public.membership_delivery_cycles
  for each row execute function public.set_updated_at();
drop trigger if exists membership_freebie_campaigns_set_updated_at on public.membership_freebie_campaigns;
create trigger membership_freebie_campaigns_set_updated_at
  before update on public.membership_freebie_campaigns
  for each row execute function public.set_updated_at();

-- Return the new plan configuration from all existing membership APIs.
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
    'delivery_tiers', plan.delivery_tiers,
    'scheduled_delivery_enabled', plan.scheduled_delivery_enabled,
    'early_access_enabled', plan.early_access_enabled,
    'freebie_enabled', plan.freebie_enabled,
    'status', plan.status,
    'display_order', plan.display_order,
    'created_at', plan.created_at,
    'updated_at', plan.updated_at
  ) end
  from public.membership_plans plan
  where plan.id = p_plan_id;
$$;

create or replace function public.membership_delivery_profile_payload(p_profile public.membership_delivery_profiles)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'id', p_profile.id,
    'customer_id', p_profile.customer_id,
    'subscription_id', p_profile.subscription_id,
    'plan_id', p_profile.plan_id,
    'items', p_profile.items,
    'cadence', p_profile.cadence,
    'delivery_tier', p_profile.delivery_tier,
    'delivery_area', p_profile.delivery_area,
    'delivery_address', p_profile.delivery_address,
    'next_delivery_date', p_profile.next_delivery_date,
    'status', p_profile.status,
    'created_at', p_profile.created_at,
    'updated_at', p_profile.updated_at
  );
$$;

create or replace function public.membership_delivery_cycle_payload(p_cycle public.membership_delivery_cycles)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'id', p_cycle.id,
    'profile_id', p_cycle.profile_id,
    'customer_id', p_cycle.customer_id,
    'subscription_id', p_cycle.subscription_id,
    'delivery_date', p_cycle.delivery_date,
    'invoice_created_at', p_cycle.invoice_created_at,
    'payment_due_at', p_cycle.payment_due_at,
    'status', p_cycle.status,
    'items', p_cycle.items,
    'subtotal', p_cycle.subtotal,
    'delivery_fee', p_cycle.delivery_fee,
    'total', p_cycle.total,
    'payment_reference', p_cycle.payment_reference,
    'payment_proof_path', p_cycle.payment_proof_path,
    'payment_submitted_at', p_cycle.payment_submitted_at,
    'paid_at', p_cycle.paid_at,
    'reviewed_at', p_cycle.reviewed_at,
    'reviewed_by', p_cycle.reviewed_by,
    'order_id', p_cycle.order_id,
    'delivery_id', p_cycle.delivery_id,
    'freebie_product_id', p_cycle.freebie_product_id,
    'freebie_product_name', p_cycle.freebie_product_name,
    'admin_note', p_cycle.admin_note,
    'created_at', p_cycle.created_at,
    'updated_at', p_cycle.updated_at
  );
$$;

create or replace function public.membership_freebie_campaign_payload(p_campaign public.membership_freebie_campaigns)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'id', p_campaign.id,
    'plan_id', p_campaign.plan_id,
    'product_id', p_campaign.product_id,
    'product_name', product.name,
    'starts_at', p_campaign.starts_at,
    'ends_at', p_campaign.ends_at,
    'status', p_campaign.status,
    'created_at', p_campaign.created_at,
    'updated_at', p_campaign.updated_at
  )
  from public.products product where product.id = p_campaign.product_id;
$$;

create or replace function public.get_my_membership_delivery()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_customer_id text := public.account_customer_id();
  v_profile public.membership_delivery_profiles;
  v_campaign public.membership_freebie_campaigns;
begin
  if v_customer_id is null then
    return jsonb_build_object('profile', null, 'cycles', '[]'::jsonb, 'freebie_campaign', null);
  end if;
  select profile.* into v_profile
  from public.membership_delivery_profiles profile
  where profile.customer_id = v_customer_id and profile.status <> 'cancelled'
  order by profile.updated_at desc
  limit 1;
  if v_profile.id is not null then
    select campaign.* into v_campaign
    from public.membership_freebie_campaigns campaign
    where campaign.plan_id = v_profile.plan_id
      and campaign.status = 'active'
      and campaign.starts_at <= now()
      and (campaign.ends_at is null or campaign.ends_at > now())
    order by campaign.starts_at desc
    limit 1;
  end if;
  return jsonb_build_object(
    'profile', case when v_profile.id is null then null else public.membership_delivery_profile_payload(v_profile) end,
    'cycles', coalesce((
      select jsonb_agg(public.membership_delivery_cycle_payload(cycle) order by cycle.delivery_date desc)
      from public.membership_delivery_cycles cycle
      where cycle.customer_id = v_customer_id
    ), '[]'::jsonb),
    'freebie_campaign', case when v_campaign.id is null then null else public.membership_freebie_campaign_payload(v_campaign) end
  );
end;
$$;

create or replace function public.save_my_membership_delivery_profile(
  p_items jsonb,
  p_cadence text,
  p_delivery_tier text,
  p_delivery_area text,
  p_delivery_address text,
  p_next_delivery_date date
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_customer_id text := public.account_customer_id();
  v_subscription public.subscriptions;
  v_plan public.membership_plans;
  v_profile public.membership_delivery_profiles;
  v_open_cycle public.membership_delivery_cycles;
  v_item jsonb;
  v_product public.products;
  v_quantity integer;
  v_items jsonb := '[]'::jsonb;
  v_effective_next_delivery_date date;
begin
  if v_customer_id is null then return jsonb_build_object('status', 'not_authenticated', 'error', 'Sign in to create a saved box.'); end if;
  if p_cadence not in ('weekly', 'fortnightly', 'monthly') then return jsonb_build_object('status', 'invalid_cadence'); end if;
  if p_delivery_tier not in ('standard', 'low_cost', 'priority') then return jsonb_build_object('status', 'invalid_delivery_tier'); end if;
  if p_next_delivery_date is null then return jsonb_build_object('status', 'invalid_delivery_date', 'error', 'Choose a delivery date in Bhutan time.'); end if;
  if char_length(trim(coalesce(p_delivery_area, ''))) = 0 or char_length(trim(coalesce(p_delivery_address, ''))) = 0 then return jsonb_build_object('status', 'invalid_delivery_address', 'error', 'Add a delivery area and address.'); end if;
  if jsonb_typeof(coalesce(p_items, '[]'::jsonb)) <> 'array' or jsonb_array_length(coalesce(p_items, '[]'::jsonb)) = 0 then return jsonb_build_object('status', 'invalid_items', 'error', 'Add at least one product to your saved box.'); end if;

  select subscription.* into v_subscription
  from public.subscriptions subscription
  join public.membership_plans plan on plan.id = subscription.plan_id
  where subscription.customer_id = v_customer_id
    and subscription.status = 'active'
    and plan.status = 'active'
    and plan.scheduled_delivery_enabled
  order by subscription.created_at desc
  limit 1;
  if v_subscription.id is null then return jsonb_build_object('status', 'membership_required', 'error', 'An active membership with saved-box delivery is required.'); end if;
  select * into v_plan from public.membership_plans where id = v_subscription.plan_id;
  if not exists (
    select 1 from jsonb_array_elements(v_plan.delivery_tiers) tier
    where tier ->> 'id' = p_delivery_tier and coalesce((tier ->> 'enabled')::boolean, false)
  ) then return jsonb_build_object('status', 'delivery_tier_unavailable', 'error', 'That delivery option is not included with your plan.'); end if;

  for v_item in select value from jsonb_array_elements(p_items)
  loop
    if nullif(trim(v_item ->> 'product_id'), '') is null
       or coalesce(v_item ->> 'quantity', '') !~ '^[1-9][0-9]*$'
       or (v_item ->> 'quantity')::numeric > 20 then
      return jsonb_build_object('status', 'invalid_items', 'error', 'Choose valid product quantities.');
    end if;
    v_quantity := (v_item ->> 'quantity')::integer;
    select * into v_product from public.products
      where id = v_item ->> 'product_id'
        and published
        and category <> 'Custom boxes'
        and price_amount is not null;
    if v_product.id is null then return jsonb_build_object('status', 'ineligible_product', 'error', 'Saved boxes can include only active catalog products.'); end if;
    v_items := v_items || jsonb_build_array(jsonb_build_object(
      'product_id', v_product.id, 'name', v_product.name,
      'quantity', v_quantity, 'unit_price', v_product.price_amount
    ));
  end loop;

  select * into v_profile from public.membership_delivery_profiles
  where customer_id = v_customer_id and status <> 'cancelled'
  order by updated_at desc limit 1;
  v_effective_next_delivery_date := p_next_delivery_date;
  if v_profile.id is not null then
    select * into v_open_cycle from public.membership_delivery_cycles
    where profile_id = v_profile.id
      and delivery_date = v_profile.next_delivery_date
      and status in ('invoice_ready', 'payment_submitted', 'needs_admin_resolution')
    order by created_at desc
    limit 1;
    if v_open_cycle.id is not null then
      v_effective_next_delivery_date := public.membership_delivery_next_date(v_open_cycle.delivery_date, p_cadence);
    end if;
  end if;
  if v_open_cycle.id is null and p_next_delivery_date < ((now() at time zone 'Asia/Thimphu')::date + 3) then
    return jsonb_build_object('status', 'invalid_delivery_date', 'error', 'Choose a first delivery date at least three calendar days from today in Bhutan time.');
  end if;
  if v_profile.id is null then
    insert into public.membership_delivery_profiles (
      customer_id, subscription_id, plan_id, items, cadence, delivery_tier,
      delivery_area, delivery_address, next_delivery_date, status
    ) values (
      v_customer_id, v_subscription.id, v_plan.id, v_items, p_cadence, p_delivery_tier,
      trim(p_delivery_area), trim(p_delivery_address), v_effective_next_delivery_date, 'active'
    ) returning * into v_profile;
  else
    update public.membership_delivery_profiles
    set subscription_id = v_subscription.id, plan_id = v_plan.id, items = v_items,
        cadence = p_cadence, delivery_tier = p_delivery_tier,
        delivery_area = trim(p_delivery_area), delivery_address = trim(p_delivery_address),
        next_delivery_date = v_effective_next_delivery_date, status = 'active'
    where id = v_profile.id
    returning * into v_profile;
  end if;
  if v_open_cycle.id is not null then
    perform public.emit_customer_notification(
      v_profile.customer_id, 'membership_delivery_updated', 'Saved-box changes scheduled',
      'Your changes will start with the next unbilled cycle after the ' || to_char(v_open_cycle.delivery_date, 'DD Mon') || ' delivery.',
      v_profile.status, '#/account/membership', 'membership_delivery_changes:' || v_profile.id::text || ':' || v_profile.updated_at::text
    );
  end if;
  return jsonb_build_object('status', 'ok', 'profile', public.membership_delivery_profile_payload(v_profile));
end;
$$;

create or replace function public.update_my_membership_delivery_profile(
  p_profile_id uuid,
  p_status text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_customer_id text := public.account_customer_id();
  v_profile public.membership_delivery_profiles;
begin
  if p_status not in ('active', 'paused', 'cancelled') then return jsonb_build_object('status', 'invalid_status'); end if;
  select * into v_profile from public.membership_delivery_profiles
  where id = p_profile_id and customer_id = v_customer_id;
  if v_profile.id is null then return jsonb_build_object('status', 'not_found'); end if;
  if p_status = 'active' and not exists (
    select 1 from public.subscriptions where id = v_profile.subscription_id and customer_id = v_customer_id and status = 'active'
  ) then return jsonb_build_object('status', 'membership_inactive', 'error', 'Reactivate your membership before resuming a saved box.'); end if;
  update public.membership_delivery_profiles set status = p_status where id = v_profile.id returning * into v_profile;
  perform public.emit_customer_notification(
    v_profile.customer_id, 'membership_delivery_updated',
    case when p_status = 'paused' then 'Scheduled delivery paused' when p_status = 'cancelled' then 'Scheduled delivery cancelled' else 'Scheduled delivery resumed' end,
    'Your future unbilled saved-box cycles are now ' || p_status || '.',
    p_status, '#/account/membership', 'membership_delivery_profile:' || v_profile.id::text || ':' || p_status || ':' || v_profile.updated_at::text
  );
  return jsonb_build_object('status', 'ok', 'profile', public.membership_delivery_profile_payload(v_profile));
end;
$$;

create or replace function public.membership_delivery_next_date(p_date date, p_cadence text)
returns date
language sql
immutable
as $$
  select case p_cadence
    when 'weekly' then p_date + 7
    when 'fortnightly' then p_date + 14
    else p_date + 28
  end;
$$;

create or replace function public.process_membership_due_cycles()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_local_today date := (now() at time zone 'Asia/Thimphu')::date;
  v_profile public.membership_delivery_profiles;
  v_plan public.membership_plans;
  v_cycle public.membership_delivery_cycles;
  v_item jsonb;
  v_product public.products;
  v_items jsonb;
  v_subtotal numeric(12,2);
  v_fee numeric(12,2);
  v_freebie public.membership_freebie_campaigns;
  v_freebie_product public.products;
  v_note text;
  v_created integer := 0;
  v_skipped integer := 0;
  v_urgent integer := 0;
  v_product_row public.products;
  v_subscription public.subscriptions;
begin
  -- A signed-in caller must be an admin; the no-auth path is used by pg_cron.
  if auth.uid() is not null and not public.is_admin() then
    return jsonb_build_object('status', 'forbidden');
  end if;

  for v_profile in
    select profile.*
    from public.membership_delivery_profiles profile
    join public.subscriptions subscription on subscription.id = profile.subscription_id and subscription.status = 'active'
    join public.membership_plans plan on plan.id = profile.plan_id and plan.status = 'active' and plan.scheduled_delivery_enabled
    where profile.status = 'active'
      and profile.next_delivery_date <= v_local_today + 3
      and not exists (
        select 1 from public.membership_delivery_cycles cycle
        where cycle.profile_id = profile.id and cycle.delivery_date = profile.next_delivery_date
      )
  loop
    select * into v_plan from public.membership_plans where id = v_profile.plan_id;
    v_items := '[]'::jsonb;
    v_subtotal := 0;
    v_note := null;
    for v_item in select value from jsonb_array_elements(v_profile.items)
    loop
      select * into v_product from public.products
      where id = v_item ->> 'product_id' and published and price_amount is not null and category <> 'Custom boxes';
      if v_product.id is null then
        v_note := 'One or more saved-box products are unavailable. Resolve the box before payment can be verified.';
      else
        v_items := v_items || jsonb_build_array(jsonb_build_object(
          'product_id', v_product.id, 'name', v_product.name,
          'quantity', (v_item ->> 'quantity')::integer, 'unit_price', v_product.price_amount
        ));
        v_subtotal := v_subtotal + v_product.price_amount * (v_item ->> 'quantity')::integer;
      end if;
    end loop;
    select coalesce((tier ->> 'fee')::numeric, 0) into v_fee
    from jsonb_array_elements(v_plan.delivery_tiers) tier
    where tier ->> 'id' = v_profile.delivery_tier and coalesce((tier ->> 'enabled')::boolean, false)
    limit 1;
    if v_fee is null then v_note := coalesce(v_note || ' ', '') || 'The selected delivery tier is no longer available.'; v_fee := 0; end if;
    select * into v_freebie from public.membership_freebie_campaigns campaign
    where campaign.plan_id = v_profile.plan_id and campaign.status = 'active'
      and campaign.starts_at <= now() and (campaign.ends_at is null or campaign.ends_at > now())
    order by campaign.starts_at desc limit 1;
    if v_freebie.id is not null then
      select * into v_freebie_product from public.products where id = v_freebie.product_id and published;
      if v_freebie_product.id is null then
        v_note := coalesce(v_note || ' ', '') || 'The configured freebie is unavailable and needs admin resolution.';
      end if;
    end if;
    insert into public.membership_delivery_cycles (
      profile_id, customer_id, subscription_id, delivery_date, invoice_created_at,
      payment_due_at, status, items, subtotal, delivery_fee, total,
      freebie_product_id, freebie_product_name, admin_note
    ) values (
      v_profile.id, v_profile.customer_id, v_profile.subscription_id, v_profile.next_delivery_date,
      now(), ((v_profile.next_delivery_date - 1)::timestamp + interval '18 hours') at time zone 'Asia/Thimphu',
      case when v_note is null then 'invoice_ready' else 'needs_admin_resolution' end,
      v_items, round(v_subtotal, 2), round(v_fee, 2), round(v_subtotal + v_fee, 2),
      case when v_freebie_product.id is null then null else v_freebie_product.id end,
      case when v_freebie_product.id is null then null else v_freebie_product.name end,
      v_note
    ) returning * into v_cycle;
    if v_cycle.status = 'invoice_ready' then
      perform public.emit_customer_notification(
        v_cycle.customer_id, 'membership_delivery_invoice', 'Your scheduled box is ready to pay',
        'Your ' || to_char(v_cycle.delivery_date, 'DD Mon') || ' saved-box invoice is Nu. ' || trim(to_char(v_cycle.total, 'FM999999990D00')) || '. Submit your bank-transfer reference by 18:00 Bhutan time on the day before delivery.',
        v_cycle.status, '#/account/membership', 'membership_delivery_invoice:' || v_cycle.id::text
      );
    else
      perform public.emit_customer_notification(
        v_cycle.customer_id, 'membership_delivery_updated', 'Scheduled box needs attention',
        coalesce(v_cycle.admin_note, 'Your scheduled box needs admin review before it can be invoiced.'),
        v_cycle.status, '#/account/membership', 'membership_delivery_attention:' || v_cycle.id::text
      );
    end if;
    perform public.emit_admin_notification(
      'membership_delivery_invoice', 'Scheduled box invoice created',
      'A saved-box invoice for ' || to_char(v_cycle.delivery_date, 'DD Mon YYYY') || ' is ' || replace(v_cycle.status, '_', ' ') || '.',
      '#/admin?tab=subscriptions', 'membership_delivery_invoice:' || v_cycle.id::text
    );
    v_created := v_created + 1;
  end loop;

  for v_cycle in
    select * from public.membership_delivery_cycles
    where status in ('invoice_ready', 'payment_submitted') and payment_due_at < now()
  loop
    if v_cycle.status = 'invoice_ready' then
      update public.membership_delivery_cycles
      set status = 'skipped', admin_note = 'Skipped because no payment reference was submitted by the 18:00 Bhutan-time cutoff.'
      where id = v_cycle.id;
      update public.membership_delivery_profiles
      set next_delivery_date = public.membership_delivery_next_date(v_cycle.delivery_date, cadence)
      where id = v_cycle.profile_id and next_delivery_date = v_cycle.delivery_date;
      perform public.emit_customer_notification(
        v_cycle.customer_id, 'membership_delivery_skipped', 'Scheduled delivery skipped',
        'We did not receive a payment reference by the 18:00 Bhutan-time cutoff, so the ' || to_char(v_cycle.delivery_date, 'DD Mon') || ' delivery was skipped.',
        'skipped', '#/account/membership', 'membership_delivery_skipped:' || v_cycle.id::text
      );
      perform public.emit_admin_notification(
        'membership_delivery_skipped', 'Scheduled box skipped',
        'The ' || to_char(v_cycle.delivery_date, 'DD Mon YYYY') || ' saved-box cycle was skipped because no payment reference was submitted.',
        '#/admin?tab=subscriptions', 'membership_delivery_skipped:' || v_cycle.id::text
      );
      v_skipped := v_skipped + 1;
    else
      update public.membership_delivery_cycles
      set status = 'needs_admin_resolution', admin_note = 'Payment reference was submitted before the cutoff and needs urgent verification.'
      where id = v_cycle.id;
      perform public.emit_customer_notification(
        v_cycle.customer_id, 'membership_delivery_updated', 'Saved-box payment needs verification',
        'Your payment reference was received and is being checked. This delivery will not be skipped automatically.',
        'needs_admin_resolution', '#/account/membership', 'membership_delivery_urgent_customer:' || v_cycle.id::text
      );
      perform public.emit_admin_notification(
        'membership_delivery_payment_submitted', 'Urgent scheduled-box payment review',
        'A payment reference was submitted for the ' || to_char(v_cycle.delivery_date, 'DD Mon YYYY') || ' saved-box cycle and needs verification.',
        '#/admin?tab=subscriptions', 'membership_delivery_urgent_admin:' || v_cycle.id::text
      );
      v_urgent := v_urgent + 1;
    end if;
  end loop;

  -- Member first-access notices. The dedupe key preserves one notice per
  -- customer/product/window even though this function runs hourly.
  for v_product_row in
    select * from public.products
    where published and member_early_access_starts_at <= now()
      and member_early_access_ends_at > now()
  loop
    for v_subscription in
      select subscription.* from public.subscriptions subscription
      join public.membership_plans plan on plan.id = subscription.plan_id
      where subscription.status = 'active' and plan.status = 'active' and plan.early_access_enabled
    loop
      perform public.emit_customer_notification(
        v_subscription.customer_id, 'member_early_access', 'Early access is open',
        v_product_row.name || ' is available to Zama+ members before public release.',
        'active', '#/shop/' || v_product_row.id,
        'member_early_access:' || v_product_row.id || ':' || v_product_row.member_early_access_starts_at::text || ':' || v_subscription.customer_id
      );
    end loop;
  end loop;

  -- The public launch notification is emitted at the end of the member-only
  -- window (rather than when the product was first created). Dedupe keys in
  -- the helper make this safe for the hourly job and the manual fallback.
  perform public.notify_public_product_release();

  return jsonb_build_object('status', 'ok', 'invoices_created', v_created, 'cycles_skipped', v_skipped, 'urgent_reviews', v_urgent);
end;
$$;

-- Notify public customers when the early-access window opens to everyone.
-- This helper is deliberately separate from the generic product trigger so
-- a product marked for a future Zama+ window does not announce itself early.
create or replace function public.notify_public_product_release()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_product public.products;
  v_customer public.customers;
begin
  for v_product in select * from public.products where published and member_early_access_ends_at is not null and member_early_access_ends_at <= now()
  loop
    for v_customer in select * from public.customers where status = 'active'
    loop
      perform public.emit_customer_notification(
        v_customer.id, 'product_available', 'New product available',
        v_product.name || ' is now available in the Zama shop.',
        null, '#/shop/' || v_product.id,
        'product_public_release:' || v_product.id || ':' || v_product.member_early_access_ends_at::text || ':' || v_customer.id
      );
    end loop;
  end loop;
end;
$$;

create or replace function public.submit_membership_delivery_cycle_payment(
  p_cycle_id uuid,
  p_payment_reference text,
  p_proof_path text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_customer_id text := public.account_customer_id();
  v_cycle public.membership_delivery_cycles;
begin
  if char_length(trim(coalesce(p_payment_reference, ''))) = 0 then return jsonb_build_object('status', 'invalid_reference', 'error', 'Enter the bank-transfer reference before submitting payment.'); end if;
  select * into v_cycle from public.membership_delivery_cycles where id = p_cycle_id and customer_id = v_customer_id;
  if v_cycle.id is null then return jsonb_build_object('status', 'not_found'); end if;
  if v_cycle.status <> 'invoice_ready' then return jsonb_build_object('status', 'invalid_cycle_status', 'error', 'This invoice is no longer accepting a payment reference.'); end if;
  if v_cycle.payment_due_at < now() then return jsonb_build_object('status', 'cutoff_passed', 'error', 'The payment cutoff has passed for this delivery.'); end if;
  if p_proof_path is not null and p_proof_path not like v_customer_id || '/%' then return jsonb_build_object('status', 'invalid_proof'); end if;
  update public.membership_delivery_cycles
  set status = 'payment_submitted', payment_reference = trim(p_payment_reference),
      payment_proof_path = p_proof_path, payment_submitted_at = now()
  where id = v_cycle.id returning * into v_cycle;
  perform public.emit_customer_notification(
    v_cycle.customer_id, 'membership_delivery_payment_submitted', 'Saved-box payment submitted',
    'Your bank-transfer reference for the ' || to_char(v_cycle.delivery_date, 'DD Mon') || ' delivery was sent for verification.',
    v_cycle.status, '#/account/membership', 'membership_delivery_payment_submitted:' || v_cycle.id::text
  );
  perform public.emit_admin_notification(
    'membership_delivery_payment_submitted', 'Saved-box payment needs verification',
    'A bank-transfer reference was submitted for the ' || to_char(v_cycle.delivery_date, 'DD Mon YYYY') || ' scheduled box.',
    '#/admin?tab=subscriptions', 'membership_delivery_payment_submitted:' || v_cycle.id::text
  );
  return jsonb_build_object('status', 'ok', 'cycle', public.membership_delivery_cycle_payload(v_cycle));
end;
$$;

create or replace function public.get_admin_membership_delivery()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then return jsonb_build_object('profiles', '[]'::jsonb, 'cycles', '[]'::jsonb, 'freebie_campaigns', '[]'::jsonb); end if;
  return jsonb_build_object(
    'profiles', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', profile.id, 'customer_id', profile.customer_id,
        'subscription_id', profile.subscription_id, 'plan_id', profile.plan_id,
        'items', profile.items, 'cadence', profile.cadence, 'delivery_tier', profile.delivery_tier,
        'delivery_area', profile.delivery_area, 'delivery_address', profile.delivery_address,
        'next_delivery_date', profile.next_delivery_date, 'status', profile.status,
        'created_at', profile.created_at, 'updated_at', profile.updated_at,
        'customer_name', customer.name, 'customer_email', customer.email, 'plan_name', plan.name
      ) order by profile.updated_at desc)
      from public.membership_delivery_profiles profile
      join public.customers customer on customer.id = profile.customer_id
      join public.membership_plans plan on plan.id = profile.plan_id
    ), '[]'::jsonb),
    'cycles', coalesce((
      select jsonb_agg(public.membership_delivery_cycle_payload(cycle) || jsonb_build_object(
        'customer_name', customer.name, 'customer_email', customer.email,
        'plan_name', plan.name,
        'delivery_tier_label', coalesce((select tier ->> 'label' from jsonb_array_elements(plan.delivery_tiers) tier where tier ->> 'id' = profile.delivery_tier limit 1), 'Scheduled delivery')
      ) order by cycle.delivery_date desc)
      from public.membership_delivery_cycles cycle
      join public.membership_delivery_profiles profile on profile.id = cycle.profile_id
      join public.customers customer on customer.id = cycle.customer_id
      join public.membership_plans plan on plan.id = profile.plan_id
    ), '[]'::jsonb),
    'freebie_campaigns', coalesce((
      select jsonb_agg(public.membership_freebie_campaign_payload(campaign) order by campaign.updated_at desc)
      from public.membership_freebie_campaigns campaign
    ), '[]'::jsonb)
  );
end;
$$;

create or replace function public.admin_review_membership_delivery_cycle(
  p_cycle_id uuid,
  p_status text,
  p_admin_note text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_cycle public.membership_delivery_cycles;
  v_profile public.membership_delivery_profiles;
  v_product public.products;
  v_order_id text;
  v_delivery_id text;
  v_items jsonb;
begin
  if not public.is_admin() then return jsonb_build_object('status', 'forbidden'); end if;
  if p_status not in ('paid', 'skipped', 'needs_admin_resolution', 'cancelled') then return jsonb_build_object('status', 'invalid_status'); end if;
  select * into v_cycle from public.membership_delivery_cycles where id = p_cycle_id;
  if v_cycle.id is null then return jsonb_build_object('status', 'not_found'); end if;
  if v_cycle.status in ('paid', 'skipped', 'cancelled') then return jsonb_build_object('status', 'already_finalized'); end if;
  select * into v_profile from public.membership_delivery_profiles where id = v_cycle.profile_id;

  if p_status = 'paid' then
    if char_length(trim(coalesce(v_cycle.payment_reference, ''))) = 0 then return jsonb_build_object('status', 'missing_payment_reference', 'error', 'Verify a submitted bank-transfer reference before marking this cycle paid.'); end if;
    if v_cycle.freebie_product_id is not null then
      select * into v_product from public.products where id = v_cycle.freebie_product_id and published;
      if v_product.id is null then return jsonb_build_object('status', 'freebie_unavailable', 'error', 'The configured freebie is unavailable. Resolve it before payment is verified.'); end if;
      if v_product.stock_quantity is not null and v_product.stock_quantity <= 0 then
        return jsonb_build_object('status', 'freebie_out_of_stock', 'error', 'The configured freebie is out of stock. Resolve it before payment is verified.');
      end if;
      v_items := v_cycle.items || jsonb_build_array(jsonb_build_object('product_id', v_product.id, 'name', v_product.name || ' (Zama+ freebie)', 'quantity', 1, 'price', 0));
    else
      v_items := v_cycle.items;
    end if;
    v_order_id := 'ZAM-' || to_char(now(), 'YYYY') || '-' || lpad(nextval('public.order_number_seq')::text, 4, '0');
    v_delivery_id := 'DEL-' || v_order_id;
    insert into public.orders (
      id, customer_id, status, items, subtotal, total, payment_status, payment_method,
      payment_reference, delivery_date, delivery_area, notes, created_at, history,
      membership_plan_id, membership_delivery_cycle_id, membership_delivery_fee
    ) values (
      v_order_id, v_cycle.customer_id, 'confirmed', v_items, v_cycle.subtotal, v_cycle.total,
      'paid', 'Bank transfer', v_cycle.payment_reference, v_cycle.delivery_date::text,
      v_profile.delivery_area, 'Zama+ saved box · ' || v_profile.delivery_address, now(),
      jsonb_build_array(jsonb_build_object('status', 'confirmed', 'at', now())),
      v_profile.plan_id, v_cycle.id, v_cycle.delivery_fee
    );
    insert into public.payments (id, order_id, customer_id, amount, status, date, reference, method)
    values ('PAY-' || v_order_id, v_order_id, v_cycle.customer_id, v_cycle.total, 'paid', to_char(now(), 'YYYY-MM-DD'), v_cycle.payment_reference, 'Bank transfer');
    insert into public.deliveries (id, order_id, customer_id, area, delivery_date, status, driver)
    values (v_delivery_id, v_order_id, v_cycle.customer_id, v_profile.delivery_area, v_cycle.delivery_date::text, 'preparing', null);
    update public.membership_delivery_cycles
    set status = 'paid', paid_at = now(), reviewed_at = now(), reviewed_by = auth.email(),
        order_id = v_order_id, delivery_id = v_delivery_id, admin_note = coalesce(nullif(trim(p_admin_note), ''), admin_note)
    where id = v_cycle.id returning * into v_cycle;
    update public.membership_delivery_profiles
    set next_delivery_date = public.membership_delivery_next_date(v_cycle.delivery_date, cadence)
    where id = v_profile.id and next_delivery_date = v_cycle.delivery_date;
    perform public.emit_customer_notification(
      v_cycle.customer_id, 'membership_delivery_paid', 'Scheduled delivery payment verified',
      'Your payment was verified and order ' || v_order_id || ' is now being prepared for ' || to_char(v_cycle.delivery_date, 'DD Mon') || '.',
      'paid', '#/account/orders', 'membership_delivery_paid:' || v_cycle.id::text
    );
    if v_cycle.freebie_product_name is not null then
      perform public.emit_customer_notification(
        v_cycle.customer_id, 'membership_freebie', 'A Zama+ freebie was added',
        v_cycle.freebie_product_name || ' was added to your paid scheduled delivery at no extra cost.',
        'paid', '#/account/orders', 'membership_delivery_freebie:' || v_cycle.id::text
      );
    end if;
  else
    update public.membership_delivery_cycles
    set status = p_status, reviewed_at = now(), reviewed_by = auth.email(),
        admin_note = coalesce(nullif(trim(p_admin_note), ''), admin_note)
    where id = v_cycle.id returning * into v_cycle;
    if p_status in ('skipped', 'cancelled') then
      update public.membership_delivery_profiles
      set next_delivery_date = public.membership_delivery_next_date(v_cycle.delivery_date, cadence)
      where id = v_profile.id and next_delivery_date = v_cycle.delivery_date;
      perform public.emit_customer_notification(
        v_cycle.customer_id, 'membership_delivery_skipped',
        case when p_status = 'cancelled' then 'Scheduled delivery cancelled' else 'Scheduled delivery skipped' end,
        coalesce(nullif(trim(p_admin_note), ''), 'Your ' || to_char(v_cycle.delivery_date, 'DD Mon') || ' scheduled delivery was ' || p_status || '.'),
        p_status, '#/account/membership', 'membership_delivery_closed:' || v_cycle.id::text || ':' || p_status
      );
    end if;
  end if;
  return jsonb_build_object('status', 'ok', 'cycle', public.membership_delivery_cycle_payload(v_cycle));
end;
$$;

create or replace function public.admin_save_membership_freebie_campaign(
  p_plan_id text,
  p_product_id text,
  p_starts_at timestamptz,
  p_ends_at timestamptz default null,
  p_status text default 'draft'
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_campaign public.membership_freebie_campaigns;
begin
  if not public.is_admin() then return jsonb_build_object('status', 'forbidden'); end if;
  if p_status not in ('draft', 'active', 'archived') or p_starts_at is null or (p_ends_at is not null and p_ends_at <= p_starts_at) then return jsonb_build_object('status', 'invalid_campaign'); end if;
  if not exists (select 1 from public.membership_plans where id = p_plan_id and freebie_enabled) then return jsonb_build_object('status', 'invalid_plan'); end if;
  if not exists (
    select 1 from public.products
    where id = p_product_id and published and category <> 'Custom boxes' and price_amount is not null
      and (stock_quantity is null or stock_quantity > 0)
  ) then return jsonb_build_object('status', 'invalid_product', 'error', 'Freebies must use an in-stock catalog product.'); end if;
  select * into v_campaign from public.membership_freebie_campaigns where plan_id = p_plan_id and status <> 'archived' order by updated_at desc limit 1;
  if v_campaign.id is null then
    insert into public.membership_freebie_campaigns (plan_id, product_id, starts_at, ends_at, status)
    values (p_plan_id, p_product_id, p_starts_at, p_ends_at, p_status) returning * into v_campaign;
  else
    update public.membership_freebie_campaigns
    set product_id = p_product_id, starts_at = p_starts_at, ends_at = p_ends_at, status = p_status
    where id = v_campaign.id returning * into v_campaign;
  end if;
  return jsonb_build_object('status', 'ok', 'campaign', public.membership_freebie_campaign_payload(v_campaign));
end;
$$;

create or replace function public.admin_archive_membership_freebie_campaign(p_campaign_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_campaign public.membership_freebie_campaigns;
begin
  if not public.is_admin() then return jsonb_build_object('status', 'forbidden'); end if;
  update public.membership_freebie_campaigns
  set status = 'archived'
  where id = p_campaign_id
  returning * into v_campaign;
  if v_campaign.id is null then return jsonb_build_object('status', 'not_found'); end if;
  return jsonb_build_object('status', 'ok', 'campaign', public.membership_freebie_campaign_payload(v_campaign));
end;
$$;

-- Product visibility: public after its early window; active plans with the
-- early-access benefit can view it during the configured window. Admins retain
-- normal access. Checkout repeats the same check below.
drop policy if exists "products public read" on public.products;
create policy "products public read" on public.products
  for select to anon, authenticated
  using (
    public.is_admin()
    or (
      published and (
        member_early_access_starts_at is null
        or member_early_access_ends_at is null
        or now() >= member_early_access_ends_at
        or (
          now() >= member_early_access_starts_at
          and now() < member_early_access_ends_at
          and exists (
            select 1 from public.subscriptions subscription
            join public.membership_plans plan on plan.id = subscription.plan_id
            where subscription.customer_id = public.account_customer_id()
              and subscription.status = 'active'
              and plan.status = 'active'
              and plan.early_access_enabled
          )
        )
      )
    )
  );

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
  -- A product with any configured early-access end time is announced by the
  -- scheduled release helper. This avoids an all-customer notification when
  -- an admin edits the product during its member-only window.
  if new.member_early_access_ends_at is not null then return new; end if;
  if tg_op = 'UPDATE'
     and old.published is not distinct from new.published
     and old.member_early_access_ends_at is not distinct from new.member_early_access_ends_at then
    return new;
  end if;
  for v_customer in select * from public.customers where status = 'active'
  loop
    perform public.emit_customer_notification(
      v_customer.id, 'product_available', 'New product available',
      coalesce(nullif(new.name, ''), 'A new product') || ' is now available in the Zama shop.',
      null, '#/shop/' || new.id,
      'product_available:' || new.id || ':' || coalesce(new.member_early_access_ends_at::text, new.created_at::text) || ':' || v_customer.id
    );
  end loop;
  return new;
end;
$$;

drop trigger if exists customer_notification_products on public.products;
create trigger customer_notification_products
  after insert or update of published, member_early_access_starts_at, member_early_access_ends_at on public.products
  for each row execute function public.notify_customer_product_event();

-- Enforce member-only product windows in the security-definer checkout RPC.
-- The actual price still always comes from public.products, never the client.
create or replace function public.assert_member_product_access(p_customer_id text, p_product public.products)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_product.member_early_access_starts_at is null or p_product.member_early_access_ends_at is null then return; end if;
  if now() >= p_product.member_early_access_ends_at then return; end if;
  if now() < p_product.member_early_access_starts_at then
    raise exception 'This product is not available yet.';
  end if;
  if not exists (
    select 1 from public.subscriptions subscription
    join public.membership_plans plan on plan.id = subscription.plan_id
    where subscription.customer_id = p_customer_id and subscription.status = 'active'
      and plan.status = 'active' and plan.early_access_enabled
  ) then
    raise exception 'This product is currently available only to active Zama+ members.';
  end if;
end;
$$;

-- Reapply the checkout RPC after adding the early-access columns. The UI hides
-- member-only products, but this keeps direct API calls from bypassing that
-- rule. Prices, discounts, points, and membership eligibility remain fully
-- server-calculated.
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
  v_membership_eligible_subtotal numeric(12, 2) := 0;
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
    select * from jsonb_to_recordset(coalesce(p_items, '[]'::jsonb))
      as item(product_id text, name text, quantity numeric, price numeric)
  loop
    select * into v_product from public.products where id = v_item.product_id and published;
    if v_product.id is null or v_product.price_amount is null or v_item.quantity is null or v_item.quantity <= 0 then
      return jsonb_build_object('status', 'pricing_unavailable');
    end if;
    perform public.assert_member_product_access(p_customer_id, v_product);
    v_subtotal := v_subtotal + (v_product.price_amount * v_item.quantity);
    if coalesce(v_product.category, '') <> 'Custom boxes' then
      v_membership_eligible_subtotal := v_membership_eligible_subtotal + (v_product.price_amount * v_item.quantity);
    end if;
    v_items := v_items || jsonb_build_array(jsonb_build_object(
      'product_id', v_product.id,
      'name', v_product.name,
      'quantity', v_item.quantity,
      'price', v_product.price_amount
    ));
  end loop;
  v_subtotal := round(v_subtotal, 2);
  v_membership_eligible_subtotal := round(v_membership_eligible_subtotal, 2);

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
    order by subscription.created_at desc
    limit 1;
  end if;
  if v_subscription.id is not null then
    select * into v_membership_plan from public.membership_plans where id = v_subscription.plan_id;
    v_membership_plan_id := v_membership_plan.id;
    v_membership_discount := least(
      v_membership_eligible_subtotal,
      round(v_membership_eligible_subtotal * v_membership_plan.discount_percent / 100, 2)
    );
  end if;
  -- Coupon and automatic membership savings do not stack; use the larger one.
  if v_membership_discount >= v_coupon_discount then
    v_coupon_discount := 0;
    v_coupon_id := null;
  else
    v_membership_discount := 0;
    v_membership_plan_id := null;
  end if;

  if v_requested_points > 0 then
    select * into v_settings from public.reward_settings where id = 'default';
    select coalesce(sum(points_delta), 0) into v_points_balance
    from public.customer_points_ledger where customer_id = p_customer_id;
    if v_requested_points > v_points_balance then
      return jsonb_build_object('status', 'invalid_points', 'error', 'You cannot redeem more points than your available balance.');
    end if;
    if v_settings.points_per_ngultrum <= 0 then
      return jsonb_build_object('status', 'invalid_points', 'error', 'Point redemption is not available right now.');
    end if;
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
  values (
    'PAY-' || v_order_id, v_order_id, p_customer_id,
    greatest(0, v_subtotal - v_coupon_discount - v_membership_discount - v_points_discount),
    'pending', to_char(v_now, 'YYYY-MM-DD'), '', coalesce(p_payment_method, '')
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
    'couponDiscount', v_coupon_discount, 'membershipDiscount', v_membership_discount,
    'pointsRedeemed', v_points, 'pointsDiscount', v_points_discount,
    'total', greatest(0, v_subtotal - v_coupon_discount - v_membership_discount - v_points_discount)
  );
end;
$$;

-- Keep membership-plan change notifications inclusive of new benefits.
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
     and old.delivery_tiers is not distinct from new.delivery_tiers
     and old.scheduled_delivery_enabled is not distinct from new.scheduled_delivery_enabled
     and old.early_access_enabled is not distinct from new.early_access_enabled
     and old.freebie_enabled is not distinct from new.freebie_enabled
     and old.status is not distinct from new.status then return new; end if;
  for v_subscription in select * from public.subscriptions where plan_id = new.id and status = 'active'
  loop
    perform public.emit_customer_notification(
      v_subscription.customer_id, 'membership_updated', 'Membership plan updated',
      new.name || ' was updated. Your account now shows the latest member benefits and delivery options.',
      'active', '#/account/membership', 'membership_plan_updated:' || new.id || ':' || new.updated_at::text || ':' || v_subscription.customer_id
    );
  end loop;
  return new;
end;
$$;

drop trigger if exists customer_membership_plan_changes on public.membership_plans;
create trigger customer_membership_plan_changes
  after update of name, price, cadence, benefits, discount_percent, delivery_tiers,
    scheduled_delivery_enabled, early_access_enabled, freebie_enabled, status
  on public.membership_plans
  for each row execute function public.notify_customer_membership_plan_change();

alter table public.customer_notifications drop constraint if exists customer_notifications_type_check;
alter table public.customer_notifications add constraint customer_notifications_type_check check (type in (
  'return_submitted', 'return_approved', 'return_rejected', 'return_refunded', 'return_cancelled', 'pickup_schedule_updated',
  'order_placed', 'order_status_updated', 'payment_status_updated', 'coupon_available', 'product_available',
  'membership_request', 'membership_approved', 'membership_rejected', 'membership_updated',
  'membership_delivery_invoice', 'membership_delivery_payment_submitted', 'membership_delivery_paid',
  'membership_delivery_skipped', 'membership_delivery_updated', 'membership_freebie', 'member_early_access'
));

-- Restore the default plan's editable operational benefits for existing installs.
update public.membership_plans
set delivery_tiers = coalesce(delivery_tiers, '[
  {"id":"standard","label":"Standard delivery","description":"Reliable delivery on the scheduled date.","fee":60,"enabled":true},
  {"id":"low_cost","label":"Low-cost delivery","description":"A lower-cost route when timing is flexible.","fee":30,"enabled":true},
  {"id":"priority","label":"Priority delivery","description":"First available fulfillment for your scheduled box.","fee":0,"enabled":true}
]'::jsonb)
where id = 'zama-plus-monthly';

revoke all on function public.get_my_membership_delivery() from public;
revoke all on function public.save_my_membership_delivery_profile(jsonb, text, text, text, text, date) from public;
revoke all on function public.update_my_membership_delivery_profile(uuid, text) from public;
revoke all on function public.submit_membership_delivery_cycle_payment(uuid, text, text) from public;
revoke all on function public.get_admin_membership_delivery() from public;
revoke all on function public.admin_review_membership_delivery_cycle(uuid, text, text) from public;
revoke all on function public.admin_save_membership_freebie_campaign(text, text, timestamptz, timestamptz, text) from public;
revoke all on function public.admin_archive_membership_freebie_campaign(uuid) from public;
revoke all on function public.process_membership_due_cycles() from public;
grant execute on function public.get_my_membership_delivery() to authenticated;
grant execute on function public.save_my_membership_delivery_profile(jsonb, text, text, text, text, date) to authenticated;
grant execute on function public.update_my_membership_delivery_profile(uuid, text) to authenticated;
grant execute on function public.submit_membership_delivery_cycle_payment(uuid, text, text) to authenticated;
grant execute on function public.get_admin_membership_delivery() to authenticated;
grant execute on function public.admin_review_membership_delivery_cycle(uuid, text, text) to authenticated;
grant execute on function public.admin_save_membership_freebie_campaign(text, text, timestamptz, timestamptz, text) to authenticated;
grant execute on function public.admin_archive_membership_freebie_campaign(uuid) to authenticated;
grant execute on function public.process_membership_due_cycles() to authenticated;

-- pg_cron is optional in Supabase projects. The admin UI remains the fallback.
do $$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    if not exists (select 1 from cron.job where jobname = 'zama-membership-benefits-hourly') then
      perform cron.schedule('zama-membership-benefits-hourly', '0 * * * *', 'select public.process_membership_due_cycles();');
    end if;
  end if;
end;
$$;

notify pgrst, 'reload schema';
