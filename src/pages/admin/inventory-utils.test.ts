import { describe, expect, it } from "vitest";
import type { InventoryItemRow, InventoryStockLotRow } from "../../cms/types";
import {
  buildInventoryView,
  countLevels,
  emptyLevelCounts,
  findInventoryItemByName,
  lotSuppliers,
  lotTotal,
  uniqueValues,
} from "./inventory-utils";

function item(id: string, name: string, category = "Fresh produce", unit = "kg", supplier = "Pema Dorji"): InventoryItemRow {
  return {
    id,
    name,
    category,
    unit,
    supplier,
    stock_quantity: 10,
    stock_alert_at: 4,
  };
}

describe("countLevels", () => {
  it("tallies each stock level", () => {
    expect(countLevels(["in", "in", "low", "out", "untracked"])).toEqual({ in: 2, low: 1, out: 1, untracked: 1 });
  });

  it("returns zeros for an empty list", () => {
    expect(countLevels([])).toEqual(emptyLevelCounts());
  });
});

describe("uniqueValues", () => {
  it("keeps the defaults first and appends new values once", () => {
    const result = uniqueValues(["Snacks", "kg", "Snacks", "Speciality"], ["Pantry", "Snacks"]);
    expect(result).toEqual(["Pantry", "Snacks", "kg", "Speciality"]);
  });

  it("skips blank values", () => {
    const result = uniqueValues(["", "  ", "kg"], ["Pantry"]);
    expect(result).toEqual(["Pantry", "kg"]);
  });
});

describe("findInventoryItemByName", () => {
  it("matches an item by name, ignoring case and surrounding whitespace", () => {
    const items = [item("potato", "Potato")];
    expect(findInventoryItemByName(items, "  POTATO ")).toEqual(items[0]);
  });

  it("returns null when nothing matches", () => {
    expect(findInventoryItemByName([item("potato", "Potato")], "Onion")).toBeNull();
  });

  it("returns null for a blank name", () => {
    expect(findInventoryItemByName([item("potato", "Potato")], "   ")).toBeNull();
  });
});

function lot(id: string, itemId: string, supplier: string, remaining: number): InventoryStockLotRow {
  return {
    id,
    item_id: itemId,
    supplier,
    quantity: remaining,
    remaining,
    received_date: "2026-08-10",
    unit_cost: null,
    batch_reference: "",
    notes: "",
    created_at: "",
  };
}

describe("stock lot helpers", () => {
  it("sums the remaining quantities across lots", () => {
    expect(lotTotal([lot("a", "apple", "Pema Farm", 25), lot("b", "apple", "Sonam Farm", 15)])).toBe(40);
  });

  it("ignores empty lots when summing", () => {
    expect(lotTotal([])).toBe(0);
  });

  it("lists distinct suppliers from lots, skipping blanks", () => {
    expect(lotSuppliers([lot("a", "apple", "Pema Farm", 25), lot("b", "apple", "Sonam Farm", 15)])).toEqual(["Pema Farm", "Sonam Farm"]);
    expect(lotSuppliers([lot("a", "apple", "  ", 25)])).toEqual([]);
  });
});

describe("buildInventoryView", () => {
  it("groups lots under their item and derives total, suppliers, and status inputs", () => {
    const apple = { ...item("apple", "Apple"), supplier: "" };
    const views = buildInventoryView(
      [apple],
      [lot("a", "apple", "Pema Farm", 25), lot("b", "apple", "Sonam Farm", 15)],
    );
    expect(views).toHaveLength(1);
    expect(views[0].total).toBe(40);
    expect(views[0].suppliers).toEqual(["Pema Farm", "Sonam Farm"]);
    expect(views[0].lots).toHaveLength(2);
  });

  it("falls back to the item stock when no lots exist", () => {
    const potato = item("potato", "Potato");
    const views = buildInventoryView([potato], []);
    expect(views[0].total).toBe(10);
    expect(views[0].suppliers).toEqual(["Pema Dorji"]);
  });

  it("keeps a null total when the item has no lots and no stock", () => {
    const milk = { ...item("milk", "Milk Powder"), stock_quantity: null };
    const views = buildInventoryView([milk], []);
    expect(views[0].total).toBeNull();
  });

  it("keeps the legacy item supplier in the supplier list", () => {
    const potato = item("potato", "Potato");
    const views = buildInventoryView([potato], [lot("a", "potato", "Karchung", 5)]);
    expect(views[0].total).toBe(5);
    expect(views[0].suppliers).toEqual(["Karchung", "Pema Dorji"]);
  });
});
