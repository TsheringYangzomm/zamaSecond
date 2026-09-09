import type { InventoryItemRow, InventoryStockLotRow } from "../../cms/types";

export type StockLevel = "in" | "low" | "out" | "untracked";

export type LevelCounts = Record<StockLevel, number>;

export function emptyLevelCounts(): LevelCounts {
  return { in: 0, low: 0, out: 0, untracked: 0 };
}

export function countLevels(levels: StockLevel[]): LevelCounts {
  const counts = emptyLevelCounts();
  for (const level of levels) {
    counts[level] += 1;
  }
  return counts;
}

export const inventoryCategoryDefaults = [
  "Fresh produce",
  "Meat & protein",
  "Dairy & poultry",
  "Dairy & pantry",
  "Pantry",
  "Snacks",
  "Frozen",
  "Other",
];

export const inventoryUnitDefaults = [
  "kg",
  "g",
  "pack",
  "tray",
  "bunch",
  "bottle",
  "piece",
  "carton",
];

export function uniqueValues(existing: string[], defaults: string[]): string[] {
  const values = [...defaults];
  for (const value of existing) {
    const trimmed = value.trim();
    if (trimmed && !values.includes(trimmed)) values.push(trimmed);
  }
  return values;
}

export function findInventoryItemByName(items: InventoryItemRow[], name: string): InventoryItemRow | null {
  const key = name.trim().toLowerCase();
  if (!key) return null;
  return items.find((item) => item.name.trim().toLowerCase() === key) ?? null;
}

export function lotTotal(lots: InventoryStockLotRow[]): number {
  return lots.reduce((sum, lot) => sum + (lot.remaining ?? 0), 0);
}

export function lotSuppliers(lots: InventoryStockLotRow[]): string[] {
  const suppliers = new Set<string>();
  for (const lot of lots) {
    const supplier = lot.supplier.trim();
    if (supplier) suppliers.add(supplier);
  }
  return [...suppliers];
}

export type InventoryItemView = {
  item: InventoryItemRow;
  lots: InventoryStockLotRow[];
  total: number | null;
  suppliers: string[];
  lastUpdated: string | null;
};

export function buildInventoryView(items: InventoryItemRow[], lots: InventoryStockLotRow[]): InventoryItemView[] {
  return items.map((item) => {
    const itemLots = lots.filter((lot) => lot.item_id === item.id);
    const suppliers = lotSuppliers(itemLots);
    const legacySupplier = item.supplier.trim();
    if (legacySupplier && !suppliers.includes(legacySupplier)) suppliers.push(legacySupplier);
    const total =
      itemLots.length > 0
        ? lotTotal(itemLots)
        : item.stock_quantity == null
          ? null
          : item.stock_quantity;
    return {
      item,
      lots: itemLots,
      total,
      suppliers,
      lastUpdated: item.updated_at ?? null,
    };
  });
}
