  -- Zama custom box builder
  -- Run this in the Supabase SQL editor AFTER supabase/inventory-schema.sql.
  --
  -- The public "Customize your box" page (src/pages/customize-box-page.tsx)
  -- lists the stockable inventory_items so customers can build a box of their
  -- own choosing. The admin-only policy in inventory-schema.sql would otherwise
  -- block anonymous reads, so this grants a read-only select policy. Only the
  -- catalog fields are exposed; all writes stay admin-only.
  --
  -- Until this is applied, the public page falls back to the isolated example
  -- data (see src/data/commerce-dev.ts and src/checkout/inventory-catalog.ts).

  drop policy if exists "inventory items public read" on public.inventory_items;
  create policy "inventory items public read" on public.inventory_items
    for select to anon, authenticated
    using (true);
