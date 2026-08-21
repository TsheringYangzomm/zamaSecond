import { getSupabaseClient } from "../supabase";
import { itemInventoryDevData } from "../data/commerce-dev";
import type { InventoryItemRow } from "../cms/types";

export function devInventoryItems(): InventoryItemRow[] {
  return Object.entries(itemInventoryDevData).map(([id, row]) => ({
    id,
    name: row.name,
    category: row.category,
    unit: row.unit,
    supplier: row.supplier,
    stock_quantity: row.stock_quantity,
    stock_alert_at: row.stock_alert_at,
  }));
}

async function fetchLiveInventory(): Promise<InventoryItemRow[]> {
  const client = getSupabaseClient();
  if (!client) return devInventoryItems();
  const { data, error } = await client
    .from("inventory_items")
    .select("id, name, category, unit, supplier, stock_quantity, stock_alert_at")
    .order("name", { ascending: true });
  if (error) return devInventoryItems();
  return (data ?? []) as InventoryItemRow[];
}

let catalogPromise: Promise<InventoryItemRow[]> | null = null;

// Shared, memoized list of stockable items for the custom-box builder. Falls
// back to the isolated example data whenever the inventory_items table is not
// reachable from the public site (e.g. before supabase/customize-box-schema.sql
// is applied).
export function loadInventoryCatalog(): Promise<InventoryItemRow[]> {
  if (!catalogPromise) catalogPromise = fetchLiveInventory().catch(() => devInventoryItems());
  return catalogPromise;
}

export function resetInventoryCatalog(): void {
  catalogPromise = null;
}
