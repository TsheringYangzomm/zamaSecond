  -- Zama inventory
  -- Run this in the Supabase SQL editor AFTER supabase/cms-schema.sql.
  -- It creates the inventory tables (one product row, with a stock lot per
  -- supplier), admin-only row-level-security policies, and backfills lots for
  -- every existing product.
  --
  -- Until this file is applied, the admin stock views run on isolated example
  -- data (see src/data/commerce-dev.ts) with writes disabled.
  --
  -- Note: supabase/commerce-schema.sql may still add products.stock_quantity /
  -- stock_alert_at; those columns are no longer read by the app. The inventory
  -- lots are the single source of truth for stock, and inventory_items.
  -- stock_quantity is maintained automatically from them.
  --
  -- Stock levels: each receipt of stock from a supplier is one row in
  -- inventory_stock_lots. A product never gets a duplicate record — adding more
  -- stock for a supplier creates a new lot against the same product instead.

  create table if not exists public.inventory (
    product_id text primary key references public.products (id) on delete cascade,
    stock_quantity integer,
    stock_alert_at integer,
    updated_at timestamptz not null default now()
  );

  create index if not exists inventory_product_id_idx on public.inventory (product_id);

  alter table public.inventory enable row level security;

  drop policy if exists "inventory admin all" on public.inventory;
  create policy "inventory admin all" on public.inventory
    for all to authenticated
    using (public.is_admin())
    with check (public.is_admin());

  -- Backfill: one row per existing product, carrying over any stock values that
  -- were stored on the products table before this file was applied.
  insert into public.inventory (product_id, stock_quantity, stock_alert_at)
  select id, stock_quantity, stock_alert_at
  from public.products
  on conflict (product_id) do nothing;

  -- Individual stockable items (the produce, meat, and grocery goods that make
  -- up each meal kit). The admin tracks stock per item, not per kit.
  create table if not exists public.inventory_items (
    id text primary key,
    name text not null,
    category text not null default '',
    unit text not null default '',
    supplier text not null default '',
    stock_quantity integer,
    stock_alert_at integer,
    updated_at timestamptz not null default now()
  );

  -- Ensure the supplier column exists on databases created before it was added.
  alter table public.inventory_items
    add column if not exists supplier text not null default '';

  create index if not exists inventory_items_name_idx on public.inventory_items (lower(name));

  alter table public.inventory_items enable row level security;

  drop policy if exists "inventory items admin all" on public.inventory_items;
  create policy "inventory items admin all" on public.inventory_items
    for all to authenticated
    using (public.is_admin())
    with check (public.is_admin());

  -- Example items so the Inventory tab is useful immediately. Comment out or
  -- delete rows you do not stock; quantities are editable from the admin.
  insert into public.inventory_items (id, name, category, unit, supplier, stock_quantity, stock_alert_at)
  values
    ('potato', 'Potato', 'Fresh produce', 'kg', 'Pema Dorji', 40, 10),
    ('chilli', 'Chilli', 'Fresh produce', 'kg', 'Yeshey Wangmo', 18, 6),
    ('apple', 'Apple', 'Fresh produce', 'kg', '', 25, 8),
    ('broccoli', 'Broccoli', 'Fresh produce', 'kg', 'Kinley Tshering', 12, 5),
    ('carrot', 'Carrot', 'Fresh produce', 'kg', 'Pema Dorji', 20, 6),
    ('herbs', 'Fresh Herbs', 'Fresh produce', 'bunch', 'Yeshey Wangmo', 9, 4),
    ('eggs', 'Eggs', 'Dairy & poultry', 'tray', '', 30, 8),
    ('chicken-breast', 'Chicken Breast', 'Meat & protein', 'kg', '', 15, 6),
    ('tofu', 'Tofu', 'Meat & protein', 'pack', '', 8, 3),
    ('milk-powder', 'Milk Powder', 'Dairy & pantry', 'pack', '', 12, 5),
    ('oats', 'Oats', 'Pantry', 'pack', '', 16, 6),
    ('brown-rice', 'Brown Rice', 'Pantry', 'kg', '', 22, 8),
    ('lentils', 'Lentils', 'Pantry', 'kg', '', 14, 5),
    ('quinoa', 'Quinoa', 'Pantry', 'kg', '', 10, 4),
    ('cooking-oil', 'Cooking Oil', 'Pantry', 'bottle', '', 11, 5),
    ('spices', 'Spices', 'Pantry', 'pack', '', 13, 5),
    ('chips', 'Chips', 'Snacks', 'pack', '', 0, 6)
  on conflict (id) do nothing;

  -- Stock history: one row per inventory movement. The admin app writes a row
  -- automatically whenever stock is received or consumed by an order (see
  -- src/admin/admin-api.ts and src/pages/admin/add-stock-modal.tsx). Historical
  -- data is only recorded going forward; nothing is backfilled.
  create table if not exists public.inventory_stock_history (
    id uuid primary key default gen_random_uuid(),
    item_id text not null references public.inventory_items (id) on delete cascade,
    quantity_change integer not null,
    reason text not null default '',
    reference text not null default '',
    admin_email text not null default '',
    created_at timestamptz not null default now()
  );

  create index if not exists inventory_stock_history_item_id_idx
    on public.inventory_stock_history (item_id, created_at desc);

  alter table public.inventory_stock_history enable row level security;

  drop policy if exists "inventory stock history admin all" on public.inventory_stock_history;
  create policy "inventory stock history admin all" on public.inventory_stock_history
    for all to authenticated
    using (public.is_admin())
    with check (public.is_admin());

  -- ---------------------------------------------------------------------------
  -- Meal kit recipes: how much of each tracked inventory item ONE unit of a
  -- product consumes. When an order is confirmed (see public.deduct_order_inventory()
  -- below and src/admin/inventory-fulfillment.ts) these quantities are deducted
  -- from inventory_items and each movement is recorded in inventory_stock_history.
  -- Products with no rows here are not stock-tracked and skip deduction.
  -- ---------------------------------------------------------------------------
  create table if not exists public.product_ingredients (
    product_id text not null references public.products (id) on delete cascade,
    item_id text not null references public.inventory_items (id) on delete cascade,
    quantity numeric not null default 0 check (quantity >= 0),
    created_at timestamptz not null default now(),
    primary key (product_id, item_id)
  );

  create index if not exists product_ingredients_product_id_idx on public.product_ingredients (product_id);

  alter table public.product_ingredients enable row level security;

  drop policy if exists "product ingredients admin all" on public.product_ingredients;
  create policy "product ingredients admin all" on public.product_ingredients
    for all to authenticated
    using (public.is_admin())
    with check (public.is_admin());

  -- Stock can now be fractional (e.g. a kit deducts 0.5 kg of chilli).
  alter table public.inventory_items alter column stock_quantity type numeric;
  alter table public.inventory_stock_history alter column quantity_change type numeric;

  -- Example recipes so the seeded kits deduct stock immediately. Quantities are
  -- per single kit; the app multiplies by the ordered quantity.
  insert into public.product_ingredients (product_id, item_id, quantity)
  values
    ('meal-kit-box', 'potato', 2),
    ('meal-kit-box', 'carrot', 1),
    ('meal-kit-box', 'chilli', 0.5),
    ('breakfast-kit', 'eggs', 2),
    ('breakfast-kit', 'oats', 1),
    ('breakfast-kit', 'herbs', 1),
    ('high-protein-kit', 'chicken-breast', 0.4),
    ('high-protein-kit', 'brown-rice', 0.5),
    ('high-protein-kit', 'broccoli', 0.3),
    ('high-protein-kit', 'carrot', 0.5)
  on conflict (product_id, item_id) do nothing;

  -- ---------------------------------------------------------------------------
  -- Stock lots: one row per receipt of stock for an inventory item. A product
  -- can be supplied by multiple farmers/suppliers; each delivery becomes its
  -- own lot so the supplier, received date, unit cost, batch, and notes are
  -- preserved independently. inventory_items.stock_quantity is derived from the
  -- sum of remaining lot quantities via the trigger below, so totals always
  -- update automatically and no duplicate product records are ever created.
  -- ---------------------------------------------------------------------------
  create table if not exists public.inventory_stock_lots (
    id uuid primary key default gen_random_uuid(),
    item_id text not null references public.inventory_items (id) on delete cascade,
    supplier text not null default '',
    quantity numeric not null default 0 check (quantity >= 0),
    remaining numeric not null default 0 check (remaining >= 0),
    received_date text not null default '',
    unit_cost numeric,
    batch_reference text not null default '',
    notes text not null default '',
    created_at timestamptz not null default now()
  );

  create index if not exists inventory_stock_lots_item_id_idx
    on public.inventory_stock_lots (item_id, received_date, created_at);

  alter table public.inventory_stock_lots enable row level security;

  drop policy if exists "inventory stock lots admin all" on public.inventory_stock_lots;
  create policy "inventory stock lots admin all" on public.inventory_stock_lots
    for all to authenticated
    using (public.is_admin())
    with check (public.is_admin());

  -- Keep inventory_items.stock_quantity in sync with the sum of remaining lot
  -- quantities whenever a lot is inserted, updated, or deleted.
  create or replace function public.refresh_inventory_item_stock()
  returns trigger
  language plpgsql
  security definer
  set search_path = public
  as $$
  declare
    v_item_id text;
  begin
    v_item_id := coalesce(new.item_id, old.item_id);
    update public.inventory_items
    set stock_quantity = (
        select coalesce(sum(l.remaining), 0)
        from public.inventory_stock_lots l
        where l.item_id = v_item_id
      ),
      updated_at = now()
    where id = v_item_id;
    return coalesce(new, old);
  end;
  $$;

  drop trigger if exists inventory_stock_lots_stock_sync on public.inventory_stock_lots;
  create trigger inventory_stock_lots_stock_sync
    after insert or update or delete on public.inventory_stock_lots
    for each row execute function public.refresh_inventory_item_stock();

  -- Backfill one lot per existing item so current stock levels are preserved as
  -- the first lot (quantities become editable per supplier going forward).
  insert into public.inventory_stock_lots (item_id, supplier, quantity, remaining, received_date)
  select
    i.id,
    i.supplier,
    i.stock_quantity,
    i.stock_quantity,
    (now() at time zone 'Asia/Thimphu')::date::text
  from public.inventory_items i
  where coalesce(i.stock_quantity, 0) > 0
    and not exists (
      select 1 from public.inventory_stock_lots l where l.item_id = i.id
    );

  -- ---------------------------------------------------------------------------
  -- Add stock: creates a new lot for an item + supplier, records the movement,
  -- and (via the trigger above) bumps the item's total automatically.
  -- Admin-only. Returns the created lot row or { error } when validation fails.
  -- ---------------------------------------------------------------------------
  create or replace function public.add_inventory_stock(
    p_item_id text,
    p_supplier text,
    p_quantity numeric,
    p_received_date text,
    p_unit_cost numeric,
    p_batch_reference text,
    p_notes text,
    p_admin_email text
  ) returns jsonb
  language plpgsql
  security definer
  set search_path = public
  as $$
  declare
    v_lot public.inventory_stock_lots;
    v_received_date text;
  begin
    if not public.is_admin() then
      return jsonb_build_object('error', 'forbidden');
    end if;

    if p_quantity is null or p_quantity <= 0 then
      return jsonb_build_object('error', 'Quantity received must be greater than zero.');
    end if;

    v_received_date := coalesce(nullif(p_received_date, ''), (now() at time zone 'Asia/Thimphu')::date::text);

    insert into public.inventory_stock_lots (
      item_id, supplier, quantity, remaining, received_date, unit_cost, batch_reference, notes
    ) values (
      p_item_id,
      coalesce(p_supplier, ''),
      p_quantity,
      p_quantity,
      v_received_date,
      p_unit_cost,
      coalesce(p_batch_reference, ''),
      coalesce(p_notes, '')
    )
    returning * into v_lot;

    insert into public.inventory_stock_history (
      item_id, quantity_change, reason, reference, admin_email
    ) values (
      p_item_id,
      p_quantity,
      'Stock received',
      coalesce(p_supplier, ''),
      coalesce(p_admin_email, '')
    );

    return to_jsonb(v_lot);
  end;
  $$;

  revoke all on function public.add_inventory_stock(text, text, numeric, text, numeric, text, text, text) from public;
  grant execute on function public.add_inventory_stock(text, text, numeric, text, numeric, text, text, text) to authenticated;

  -- ---------------------------------------------------------------------------
  -- Deduct inventory for a confirmed order. Atomic: locks the affected lot
  -- rows, rolls back the whole order if any ingredient is short, consumes lots
  -- first-received-first-out, and writes one inventory_stock_history row per
  -- movement in the same transaction. inventory_items.stock_quantity is updated
  -- automatically by the lots trigger.
  -- Admin-only: returns 'forbidden' unless the caller is an allowlisted admin.
  -- Returns 'ok' (with deducted true/false) or 'insufficient' (with shortages).
  -- ---------------------------------------------------------------------------
  create or replace function public.deduct_order_inventory(
    p_order_id text,
    p_items jsonb,
    p_admin_email text
  ) returns jsonb
  language plpgsql
  security definer
  set search_path = public
  as $$
  declare
    v_line jsonb;
    v_entry record;
    v_qty numeric;
    v_item_id text;
    v_required numeric;
    v_take numeric;
    v_available numeric;
    v_lot record;
    v_needed jsonb := '{}'::jsonb;
    v_shortages jsonb := '[]'::jsonb;
  begin
    if not public.is_admin() then
      return jsonb_build_object('status', 'forbidden');
    end if;

    -- Aggregate the required quantity of each inventory item across all lines.
    for v_line in select value from jsonb_array_elements(coalesce(p_items, '[]'::jsonb)) loop
      v_qty := coalesce((v_line ->> 'quantity')::numeric, 0);
      for v_entry in
        select item_id, quantity * v_qty as qty
        from public.product_ingredients
        where product_id = (v_line ->> 'product_id')
      loop
        v_needed := jsonb_set(
          v_needed,
          array[v_entry.item_id],
          to_jsonb(coalesce((v_needed ->> v_entry.item_id)::numeric, 0) + v_entry.qty)
        );
      end loop;
    end loop;

    if jsonb_length(v_needed) = 0 then
      return jsonb_build_object('status', 'ok', 'deducted', false);
    end if;

    -- Lock the stock lots for every ingredient, then report shortages before
    -- touching any stock. Availability is the sum of remaining lot quantities.
    for v_item_id, v_required in
      select key, (value)::numeric from jsonb_each_text(v_needed)
    loop
      for v_lot in
        select id from public.inventory_stock_lots
        where item_id = v_item_id
        for update
      loop
        null;
      end loop;

      select coalesce(sum(remaining), 0) into v_available
      from public.inventory_stock_lots
      where item_id = v_item_id;

      if v_available < v_required then
        v_shortages := v_shortages || jsonb_build_array(jsonb_build_object(
          'itemId', v_item_id,
          'itemName', coalesce((select name from public.inventory_items where id = v_item_id), v_item_id),
          'unit', coalesce((select unit from public.inventory_items where id = v_item_id), ''),
          'required', v_required,
          'available', v_available
        ));
      end if;
    end loop;

    if jsonb_array_length(v_shortages) > 0 then
      return jsonb_build_object('status', 'insufficient', 'shortages', v_shortages);
    end if;

    -- Consume lots first-received-first-out and record history for every
    -- ingredient in one transaction. The stock_quantity aggregate is refreshed
    -- by the inventory_stock_lots_stock_sync trigger.
    for v_item_id, v_required in
      select key, (value)::numeric from jsonb_each_text(v_needed)
    loop
      for v_lot in
        select id, remaining
        from public.inventory_stock_lots
        where item_id = v_item_id and remaining > 0
        order by received_date nulls last, created_at asc
        for update
      loop
        exit when v_required <= 0;
        v_take := least(v_lot.remaining, v_required);
        update public.inventory_stock_lots
        set remaining = remaining - v_take
        where id = v_lot.id;
        v_required := v_required - v_take;
      end loop;

      insert into public.inventory_stock_history (
        item_id, quantity_change, reason, reference, admin_email
      ) values (
        v_item_id,
        -(v_needed ->> v_item_id)::numeric,
        'Order confirmed — ' || p_order_id,
        p_order_id,
        coalesce(p_admin_email, '')
      );
    end loop;

    return jsonb_build_object('status', 'ok', 'deducted', true);
  end;
  $$;

  revoke all on function public.deduct_order_inventory(text, jsonb, text) from public;
  grant execute on function public.deduct_order_inventory(text, jsonb, text) to authenticated;

