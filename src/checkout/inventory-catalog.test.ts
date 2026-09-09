import { beforeEach, describe, expect, it, vi } from "vitest";

const clientState = vi.hoisted(() => ({
  client: undefined as unknown,
}));

vi.mock("../supabase", () => ({
  getSupabaseClient: () => clientState.client,
}));

import { devInventoryItems, loadInventoryCatalog, resetInventoryCatalog } from "./inventory-catalog";

function liveClient(rows: unknown[]) {
  return {
    from: () => ({
      select: () => ({
        order: () => ({ data: rows, error: null }),
      }),
    }),
  };
}

function errorClient() {
  return {
    from: () => ({
      select: () => ({
        order: () => ({ data: null, error: { message: "denied" } }),
      }),
    }),
  };
}

const sampleRow = { id: "potato", name: "Potato", category: "Fresh produce", unit: "kg", supplier: "", stock_quantity: 5, stock_alert_at: 2 };

describe("inventory catalog", () => {
  beforeEach(() => {
    clientState.client = undefined;
    resetInventoryCatalog();
  });

  it("falls back to example items without a Supabase client", async () => {
    expect(await loadInventoryCatalog()).toEqual(devInventoryItems());
  });

  it("uses live inventory rows when the table is reachable", async () => {
    clientState.client = liveClient([sampleRow]);
    expect(await loadInventoryCatalog()).toEqual([sampleRow]);
  });

  it("falls back to example items when the table errors", async () => {
    clientState.client = errorClient();
    expect(await loadInventoryCatalog()).toEqual(devInventoryItems());
  });

  it("memoizes the resolved list", async () => {
    clientState.client = liveClient([sampleRow]);
    const first = await loadInventoryCatalog();
    clientState.client = errorClient();
    expect(await loadInventoryCatalog()).toEqual(first);
  });
});
