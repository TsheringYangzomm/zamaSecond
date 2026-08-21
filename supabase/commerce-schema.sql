-- Zama commerce admin
-- Run this in the Supabase SQL editor AFTER supabase/cms-schema.sql.
-- It creates the commerce tables (customers, orders, subscriptions, deliveries,
-- payments), adds product stock columns, and row-level-security policies.
-- Until this file is applied, the admin commerce sections run on isolated
-- example data (see src/data/commerce-dev.ts) with writes disabled.

-- ---------------------------------------------------------------------------
-- Customers
-- ---------------------------------------------------------------------------
create table if not exists public.customers (
  id text primary key,
  name text not null default '',
  email text not null default '',
  phone text not null default '',
  area text not null default '',
  dzongkhag text not null default '',
  address text not null default '',
  status text not null default 'active'
    check (status in ('active', 'suspended')),
  created_at timestamptz not null default now()
);

create index if not exists customers_email_idx on public.customers (email);

-- ---------------------------------------------------------------------------
-- Orders
-- ---------------------------------------------------------------------------
create table if not exists public.orders (
  id text primary key,
  customer_id text not null references public.customers (id) on delete restrict,
  status text not null default 'pending'
    check (status in ('pending', 'confirmed', 'preparing', 'out_for_delivery', 'delivered', 'cancelled')),
  items jsonb not null default '[]',
  total numeric not null default 0,
  payment_status text not null default 'pending'
    check (payment_status in ('paid', 'pending', 'failed', 'refunded')),
  payment_method text not null default '',
  payment_reference text,
  delivery_date text,
  delivery_area text not null default '',
  notes text not null default '',
  created_at timestamptz not null default now(),
  history jsonb not null default '[]'
);

create index if not exists orders_customer_id_idx on public.orders (customer_id);
create index if not exists orders_created_at_idx on public.orders (created_at desc);

-- ---------------------------------------------------------------------------
-- Subscriptions
-- ---------------------------------------------------------------------------
create table if not exists public.subscriptions (
  id text primary key,
  customer_id text not null references public.customers (id) on delete restrict,
  plan text not null default '',
  price numeric not null default 0,
  status text not null default 'active'
    check (status in ('active', 'paused', 'cancelled')),
  start_date text not null default '',
  next_delivery_date text,
  created_at timestamptz not null default now(),
  history jsonb not null default '[]'
);

create index if not exists subscriptions_customer_id_idx on public.subscriptions (customer_id);

-- ---------------------------------------------------------------------------
-- Deliveries
-- ---------------------------------------------------------------------------
create table if not exists public.deliveries (
  id text primary key,
  order_id text not null references public.orders (id) on delete cascade,
  customer_id text not null references public.customers (id) on delete restrict,
  area text not null default '',
  delivery_date text not null default '',
  status text not null default 'preparing'
    check (status in ('preparing', 'out_for_delivery', 'delivered', 'failed', 'cancelled')),
  driver text
);

create index if not exists deliveries_order_id_idx on public.deliveries (order_id);

-- ---------------------------------------------------------------------------
-- Payments
-- ---------------------------------------------------------------------------
create table if not exists public.payments (
  id text primary key,
  order_id text not null references public.orders (id) on delete cascade,
  customer_id text not null references public.customers (id) on delete restrict,
  amount numeric not null default 0,
  status text not null default 'pending'
    check (status in ('paid', 'pending', 'failed', 'refunded')),
  date text not null default '',
  reference text not null default '',
  method text not null default '',
  created_at timestamptz not null default now()
);

create index if not exists payments_order_id_idx on public.payments (order_id);

-- ---------------------------------------------------------------------------
-- Product stock (inventory)
-- ---------------------------------------------------------------------------
alter table public.products
  add column if not exists stock_quantity integer,
  add column if not exists stock_alert_at integer;

-- ---------------------------------------------------------------------------
-- Row-level security (admin-only; nothing commerce is public)
-- ---------------------------------------------------------------------------
alter table public.customers enable row level security;
alter table public.orders enable row level security;
alter table public.subscriptions enable row level security;
alter table public.deliveries enable row level security;
alter table public.payments enable row level security;

drop policy if exists "customers admin all" on public.customers;
create policy "customers admin all" on public.customers
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "orders admin all" on public.orders;
create policy "orders admin all" on public.orders
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "subscriptions admin all" on public.subscriptions;
create policy "subscriptions admin all" on public.subscriptions
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "deliveries admin all" on public.deliveries;
create policy "deliveries admin all" on public.deliveries
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "payments admin all" on public.payments;
create policy "payments admin all" on public.payments
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- ---------------------------------------------------------------------------
-- Optional example rows (comment these in to preview live-mode admin data).
-- You will probably want to remove them before real orders start arriving.
-- ---------------------------------------------------------------------------
-- insert into public.customers (id, name, email, phone, area, dzongkhag, address, status)
-- values
--   ('cus-karma', 'Karma Dema', 'karma.dema@gmail.com', '+975 17 123 456', 'Thimphu', 'Thimphu', 'Changangkha, Thimphu', 'active'),
--   ('cus-yeshey', 'Yeshey Wangmo', 'yeshey.wangmo@gmail.com', '+975 17 234 567', 'Paro', 'Paro', 'Khangkhu, Paro', 'active'),
--   ('cus-sangay', 'Sangay Choden', 'sangay.choden@gmail.com', '+975 17 456 789', 'Punakha', 'Punakha', 'Khuruthang, Punakha', 'active'),
--   ('cus-pema', 'Pema Dorji', 'pema.dorji@gmail.com', '+975 17 567 890', 'Thimphu', 'Thimphu', 'Motithang, Thimphu', 'suspended');
--
-- insert into public.orders (id, customer_id, status, items, total, payment_status, payment_method, payment_reference, delivery_date, delivery_area, notes, history)
-- values
--   ('ZAM-2026-0141', 'cus-karma', 'delivered',
--    '[{"product_id":"meal-kit-box","name":"Meal Kit Box","quantity":1,"price":1200},{"product_id":"seasonal-vegetable-box","name":"Seasonal Vegetable Box","quantity":1,"price":500}]',
--    1700, 'paid', 'Card', 'PAY-2026-00141', '2026-08-04', 'Thimphu', '',
--    '[{"status":"pending","at":"2026-08-03T07:20:00Z"},{"status":"confirmed","at":"2026-08-03T08:05:00Z"},{"status":"preparing","at":"2026-08-03T09:00:00Z"},{"status":"out_for_delivery","at":"2026-08-04T08:30:00Z"},{"status":"delivered","at":"2026-08-04T11:45:00Z"}]'),
--   ('ZAM-2026-0143', 'cus-yeshey', 'out_for_delivery',
--    '[{"product_id":"meal-kit-box","name":"Meal Kit Box","quantity":1,"price":1200}]',
--    1200, 'paid', 'COD', null, '2026-08-10', 'Paro', '',
--    '[{"status":"pending","at":"2026-08-09T16:25:00Z"},{"status":"confirmed","at":"2026-08-09T17:00:00Z"},{"status":"preparing","at":"2026-08-10T06:30:00Z"},{"status":"out_for_delivery","at":"2026-08-10T09:15:00Z"}]');
