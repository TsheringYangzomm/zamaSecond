import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { FarmerRow, InventoryItemRow } from "../../cms/types";

const apiMocks = vi.hoisted(() => ({
  addInventoryStock: vi.fn(),
  nextSlugId: vi.fn(),
  slugify: vi.fn((value: string) => value.toLowerCase().replace(/[^a-z0-9]+/g, "-")),
  upsertFarmer: vi.fn(),
  upsertInventoryItem: vi.fn(),
}));

vi.mock("../../admin/admin-api", () => apiMocks);

import { AddStockModal } from "./add-stock-modal";

const items: InventoryItemRow[] = [
  { id: "potato", name: "Potato", category: "Fresh produce", unit: "kg", supplier: "Pema Dorji", stock_quantity: 20, stock_alert_at: 5 },
  { id: "chicken-breast", name: "Chicken Breast", category: "Meat & protein", unit: "kg", supplier: "", stock_quantity: 3, stock_alert_at: 5 },
];

const farmers: FarmerRow[] = [
  { id: "pema-dorji", name: "Pema Dorji", location: "Paro, Bhutan", dzongkhag: "Paro", products: [], tags: [], years_farming: 10, bio: "", verified: true, partner_since: "2025-03-14", image: "", sort_order: 0, published: true },
  { id: "karchung", name: "Karchung", location: "Bumthang, Bhutan", dzongkhag: "Bumthang", products: [], tags: [], years_farming: 8, bio: "", verified: true, partner_since: "2024-05-20", image: "", sort_order: 1, published: true },
];

const lot = (itemId: string, supplier: string, quantity: number) => ({
  id: "lot-1",
  item_id: itemId,
  supplier,
  quantity,
  remaining: quantity,
  received_date: "2026-08-13",
  unit_cost: null,
  batch_reference: "",
  notes: "",
  created_at: "2026-08-13T06:00:00Z",
});

function renderModal(props: Partial<Parameters<typeof AddStockModal>[0]> = {}) {
  const onClose = props.onClose ?? vi.fn();
  const onSaved = props.onSaved ?? vi.fn();
  const utils = render(
    <AddStockModal
      open
      items={items}
      farmers={farmers}
      adminEmail="admin@zama.bt"
      onClose={onClose}
      onSaved={onSaved}
      {...props}
    />,
  );
  return { ...utils, onClose, onSaved };
}

describe("AddStockModal", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    apiMocks.slugify.mockImplementation((value: string) => value.toLowerCase().replace(/[^a-z0-9]+/g, "-"));
  });

  it("renders the add stock form fields", () => {
    renderModal();

    expect(screen.getByRole("heading", { name: "Add stock" })).toBeVisible();
    expect(screen.getByLabelText("Product")).toBeVisible();
    expect(screen.getByLabelText("Supplier / Farmer")).toBeVisible();
    expect(screen.getByLabelText("Quantity received")).toBeVisible();
    expect(screen.getByLabelText("Received date")).toBeVisible();
    expect(screen.getByLabelText("Unit cost (optional)")).toBeVisible();
    expect(screen.getByLabelText("Batch / reference (optional)")).toBeVisible();
    expect(screen.getByLabelText("Notes (optional)")).toBeVisible();
  });

  it("preselects a product when one is passed in", () => {
    renderModal({ product: items[0] });

    expect(screen.getByLabelText("Product")).toHaveValue("Potato");
  });

  it("shows validation errors when required fields are missing", () => {
    renderModal();

    fireEvent.click(screen.getByRole("button", { name: "Add stock" }));

    expect(screen.getByRole("alert")).toHaveTextContent("Product, supplier, and quantity received are required.");
    expect(apiMocks.addInventoryStock).not.toHaveBeenCalled();
  });

  it("adds stock to an existing product without creating a new item", async () => {
    apiMocks.addInventoryStock.mockResolvedValue(lot("potato", "Karchung", 30));
    const { onSaved } = renderModal();

    fireEvent.change(screen.getByLabelText("Product"), { target: { value: "Potato" } });
    fireEvent.change(screen.getByLabelText("Supplier / Farmer"), { target: { value: "Karchung" } });
    fireEvent.change(screen.getByLabelText("Quantity received"), { target: { value: "30" } });
    fireEvent.change(screen.getByLabelText("Batch / reference (optional)"), { target: { value: "BATCH-014" } });
    fireEvent.click(screen.getByRole("button", { name: "Add stock" }));

    await waitFor(() => expect(apiMocks.addInventoryStock).toHaveBeenCalledTimes(1));
    expect(apiMocks.upsertInventoryItem).not.toHaveBeenCalled();
    expect(apiMocks.addInventoryStock).toHaveBeenCalledWith({
      item_id: "potato",
      supplier: "Karchung",
      quantity: 30,
      received_date: expect.any(String),
      unit_cost: null,
      batch_reference: "BATCH-014",
      notes: "",
      admin_email: "admin@zama.bt",
    });
    expect(onSaved).toHaveBeenCalledWith(expect.objectContaining({ createdNewItem: false }));
  });

  it("creates a new product once and adds stock to it", async () => {
    apiMocks.upsertInventoryItem.mockResolvedValue({
      id: "onion",
      name: "Onion",
      category: "Fresh produce",
      unit: "kg",
      supplier: "",
      stock_quantity: null,
      stock_alert_at: null,
      updated_at: "",
    });
    apiMocks.addInventoryStock.mockResolvedValue(lot("onion", "Pema Dorji", 40));
    const { onSaved } = renderModal();

    fireEvent.change(screen.getByLabelText("Product"), { target: { value: "__new__" } });
    fireEvent.change(screen.getByLabelText("New product name"), { target: { value: "Onion" } });
    fireEvent.change(screen.getByLabelText("Category"), { target: { value: "Fresh produce" } });
    fireEvent.change(screen.getByLabelText("Unit"), { target: { value: "kg" } });
    fireEvent.change(screen.getByLabelText("Supplier / Farmer"), { target: { value: "Pema Dorji" } });
    fireEvent.change(screen.getByLabelText("Quantity received"), { target: { value: "40" } });
    fireEvent.click(screen.getByRole("button", { name: "Add stock" }));

    await waitFor(() => expect(apiMocks.upsertInventoryItem).toHaveBeenCalledTimes(1));
    expect(apiMocks.upsertInventoryItem).toHaveBeenCalledWith(expect.objectContaining({ name: "Onion", category: "Fresh produce", unit: "kg" }));
    expect(apiMocks.addInventoryStock).toHaveBeenCalledWith(expect.objectContaining({ item_id: "onion", quantity: 40 }));
    expect(onSaved).toHaveBeenCalledWith(expect.objectContaining({ createdNewItem: true }));
  });

  it("creates a new farmer when a new supplier is entered", async () => {
    apiMocks.nextSlugId.mockResolvedValue("tashi-dorji");
    apiMocks.addInventoryStock.mockResolvedValue(lot("potato", "Tashi Dorji", 5));
    renderModal();

    fireEvent.change(screen.getByLabelText("Product"), { target: { value: "Potato" } });
    fireEvent.change(screen.getByLabelText("Supplier / Farmer"), { target: { value: "__new__" } });
    fireEvent.change(screen.getByLabelText("New supplier name"), { target: { value: "Tashi Dorji" } });
    fireEvent.change(screen.getByLabelText("Quantity received"), { target: { value: "5" } });
    fireEvent.click(screen.getByRole("button", { name: "Add stock" }));

    await waitFor(() => expect(apiMocks.upsertFarmer).toHaveBeenCalledTimes(1));
    expect(apiMocks.upsertFarmer).toHaveBeenCalledWith(expect.objectContaining({ name: "Tashi Dorji" }));
  });

  it("surfaces errors from the stock write", async () => {
    apiMocks.addInventoryStock.mockRejectedValue(new Error("Could not connect to inventory."));
    renderModal();

    fireEvent.change(screen.getByLabelText("Product"), { target: { value: "Potato" } });
    fireEvent.change(screen.getByLabelText("Supplier / Farmer"), { target: { value: "Pema Dorji" } });
    fireEvent.change(screen.getByLabelText("Quantity received"), { target: { value: "10" } });
    fireEvent.click(screen.getByRole("button", { name: "Add stock" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Could not connect to inventory.");
  });
});
