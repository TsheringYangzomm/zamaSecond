import { useEffect, useRef, useState } from "react";
import { addInventoryStock, nextSlugId, slugify, upsertFarmer, upsertInventoryItem } from "../../admin/admin-api";
import { btnOutlineSm, btnPrimarySm } from "../../components/ui/styles";
import type { FarmerRow, InventoryItemRow, InventoryStockLotRow } from "../../cms/types";
import { Field, inputClasses, selectClasses } from "./admin-fields";
import { blankFarmer } from "./farmer-form";
import {
  findInventoryItemByName,
  inventoryCategoryDefaults,
  inventoryUnitDefaults,
  uniqueValues,
} from "./inventory-utils";

const NEW_OPTION = "__new__";

type AddStockModalProps = {
  open: boolean;
  items: InventoryItemRow[];
  farmers: FarmerRow[];
  product?: InventoryItemRow | null;
  adminEmail: string | null;
  onClose: () => void;
  onSaved: (result: { item: InventoryItemRow; lot: InventoryStockLotRow; createdNewItem: boolean }) => void;
};

function todayString(): string {
  return new Date().toISOString().slice(0, 10);
}

export function AddStockModal({ open, items, farmers, product = null, adminEmail, onClose, onSaved }: AddStockModalProps) {
  const [productName, setProductName] = useState("");
  const [newProductName, setNewProductName] = useState("");
  const [category, setCategory] = useState("");
  const [unit, setUnit] = useState("");
  const [supplier, setSupplier] = useState("");
  const [newSupplierName, setNewSupplierName] = useState("");
  const [quantity, setQuantity] = useState("");
  const [receivedDate, setReceivedDate] = useState(todayString());
  const [unitCost, setUnitCost] = useState("");
  const [batchReference, setBatchReference] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const productRef = useRef<HTMLSelectElement>(null);
  const newProductRef = useRef<HTMLInputElement>(null);
  const newSupplierRef = useRef<HTMLInputElement>(null);
  const busyRef = useRef(busy);
  busyRef.current = busy;
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!open) return;
    setProductName(product?.name ?? "");
    setNewProductName("");
    setCategory(product?.category ?? "");
    setUnit(product?.unit ?? "");
    setSupplier("");
    setNewSupplierName("");
    setQuantity("");
    setReceivedDate(todayString());
    setUnitCost("");
    setBatchReference("");
    setNotes("");
    setError(null);
    setBusy(false);
    productRef.current?.focus();
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !busyRef.current) onCloseRef.current();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open, product]);

  if (!open) return null;

  const isNewProduct = productName === NEW_OPTION;
  const isNewSupplier = supplier === NEW_OPTION;
  const categories = uniqueValues(items.map((item) => item.category), inventoryCategoryDefaults);
  const units = uniqueValues(items.map((item) => item.unit), inventoryUnitDefaults);

  function handleProductChange(value: string) {
    setProductName(value);
    setError(null);
    if (value === NEW_OPTION) {
      newProductRef.current?.focus();
      return;
    }
    const existing = findInventoryItemByName(items, value);
    if (existing) {
      setCategory(existing.category || "");
      setUnit(existing.unit || "");
    }
  }

  function handleSupplierChange(value: string) {
    setSupplier(value);
    setError(null);
    if (value === NEW_OPTION) {
      newSupplierRef.current?.focus();
    }
  }

  async function handleSubmit() {
    if (busyRef.current) return;
    busyRef.current = true;
    const trimmedProduct = (isNewProduct ? newProductName : productName).trim();
    const trimmedCategory = category.trim();
    const trimmedUnit = unit.trim();
    const trimmedSupplier = (isNewSupplier ? newSupplierName : supplier).trim();
    const parsedQuantity = quantity.trim() === "" ? Number.NaN : Number(quantity.trim());
    const parsedCost = unitCost.trim() === "" ? null : Number(unitCost.trim());
    const invalidQuantity = !Number.isFinite(parsedQuantity) || parsedQuantity <= 0;
    const invalidCost = parsedCost !== null && (!Number.isFinite(parsedCost) || parsedCost < 0);

    if (!trimmedProduct || !trimmedSupplier || invalidQuantity) {
      setError("Product, supplier, and quantity received are required.");
      return;
    }
    if (isNewProduct && (!trimmedCategory || !trimmedUnit)) {
      setError("Category and unit are required for a new product.");
      return;
    }
    if (!receivedDate.trim()) {
      setError("Received date is required.");
      return;
    }
    if (invalidCost) {
      setError("Unit cost must be a number of 0 or more.");
      return;
    }

    setBusy(true);
    setError(null);
    try {
      if (isNewSupplier) {
        const maxSort = farmers.reduce((max, farmer) => Math.max(max, farmer.sort_order), -1);
        const farmer = blankFarmer(await nextSlugId(trimmedSupplier, "farmers"));
        farmer.name = trimmedSupplier;
        farmer.sort_order = maxSort + 1;
        await upsertFarmer(farmer);
      }

      const existing = findInventoryItemByName(items, trimmedProduct);
      let item: InventoryItemRow;
      let createdNewItem = false;
      if (existing) {
        item = existing;
      } else {
        item = await upsertInventoryItem({
          id: slugify(trimmedProduct),
          name: trimmedProduct,
          category: trimmedCategory,
          unit: trimmedUnit,
          supplier: "",
          stock_quantity: null,
          stock_alert_at: null,
          updated_at: new Date().toISOString(),
        });
        createdNewItem = true;
      }

      const lot = await addInventoryStock({
        item_id: item.id,
        supplier: trimmedSupplier,
        quantity: parsedQuantity,
        received_date: receivedDate.trim(),
        unit_cost: parsedCost,
        batch_reference: batchReference.trim(),
        notes: notes.trim(),
        admin_email: adminEmail ?? "",
      });
      onSaved({ item, lot, createdNewItem });
    } catch (submitError) {
      console.error("Failed to add stock:", submitError);
      setError(submitError instanceof Error ? submitError.message : "Could not add stock.");
    } finally {
      setBusy(false);
      busyRef.current = false;
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-brand-black/60 px-4 py-10"
      role="dialog"
      aria-modal="true"
      aria-labelledby="add-stock-title"
    >
      <div className="grid w-full max-w-150 gap-5 rounded-[30px_40px_26px_36px/36px_26px_40px_30px] border-3 border-brand-forest bg-brand-warm-white p-6 shadow-brand-big sm:p-7">
        <h2 id="add-stock-title" className="font-primary text-[clamp(1.4rem,3vw,1.9rem)] font-bold leading-[1.05] text-brand-green-ink">
          Add stock
        </h2>

        <div className="grid gap-4 sm:grid-cols-2 sm:items-start">
          <div className="grid gap-1.5 sm:col-span-2">
            <label htmlFor="add-stock-product" className="text-xs font-bold uppercase tracking-[0.1em] text-brand-green-ink">Product</label>
            <select
              ref={productRef}
              id="add-stock-product"
              className={selectClasses}
              value={productName}
              onChange={(event) => handleProductChange(event.target.value)}
            >
              <option value="">Select product</option>
              {items.map((item) => <option key={item.id} value={item.name}>{item.name}</option>)}
              <option value={NEW_OPTION}>+ Add a new product…</option>
            </select>
            {isNewProduct ? (
              <>
                <div className="grid gap-1.5">
                  <label htmlFor="add-stock-new-product" className="text-xs font-bold uppercase tracking-[0.1em] text-brand-green-ink">New product name</label>
                  <input
                    ref={newProductRef}
                    id="add-stock-new-product"
                    className={inputClasses}
                    type="text"
                    value={newProductName}
                    onChange={(event) => setNewProductName(event.target.value)}
                    placeholder="e.g., Onion"
                  />
                </div>
                <Field label="Category" htmlFor="add-stock-category">
                  <select id="add-stock-category" className={selectClasses} value={category} onChange={(event) => setCategory(event.target.value)}>
                    <option value="">Select category</option>
                    {categories.map((option) => <option key={option} value={option}>{option}</option>)}
                  </select>
                </Field>
                <Field label="Unit" htmlFor="add-stock-unit">
                  <select id="add-stock-unit" className={selectClasses} value={unit} onChange={(event) => setUnit(event.target.value)}>
                    <option value="">Select unit</option>
                    {units.map((option) => <option key={option} value={option}>{option}</option>)}
                  </select>
                </Field>
              </>
            ) : null}
          </div>

          <div className="grid gap-1.5 sm:col-span-2">
            <label htmlFor="add-stock-supplier" className="text-xs font-bold uppercase tracking-[0.1em] text-brand-green-ink">Supplier / Farmer</label>
            <select id="add-stock-supplier" className={selectClasses} value={supplier} onChange={(event) => handleSupplierChange(event.target.value)}>
              <option value="">Select supplier</option>
              {farmers.map((farmer) => <option key={farmer.id} value={farmer.name}>{farmer.name}</option>)}
              <option value={NEW_OPTION}>+ Add a new farmer…</option>
            </select>
            {isNewSupplier ? (
              <div className="grid gap-1.5">
                <label htmlFor="add-stock-new-supplier" className="text-xs font-bold uppercase tracking-[0.1em] text-brand-green-ink">New supplier name</label>
                <input
                  ref={newSupplierRef}
                  id="add-stock-new-supplier"
                  className={inputClasses}
                  type="text"
                  value={newSupplierName}
                  onChange={(event) => setNewSupplierName(event.target.value)}
                  placeholder="e.g., Tashi Dorji"
                />
                <p className="text-xs text-brand-black/56">Also adds {newSupplierName.trim() || "this farmer"} to your farmers list.</p>
              </div>
            ) : null}
          </div>

          <Field label="Quantity received" htmlFor="add-stock-quantity">
            <input
              id="add-stock-quantity"
              className={inputClasses}
              type="number"
              min="0"
              step="any"
              inputMode="decimal"
              value={quantity}
              onChange={(event) => setQuantity(event.target.value)}
              placeholder="e.g., 25"
            />
          </Field>

          <Field label="Received date" htmlFor="add-stock-date">
            <input
              id="add-stock-date"
              className={inputClasses}
              type="date"
              value={receivedDate}
              onChange={(event) => setReceivedDate(event.target.value)}
            />
          </Field>

          <Field label="Unit cost (optional)" htmlFor="add-stock-cost">
            <input
              id="add-stock-cost"
              className={inputClasses}
              type="number"
              min="0"
              step="any"
              inputMode="decimal"
              value={unitCost}
              onChange={(event) => setUnitCost(event.target.value)}
              placeholder="e.g., 45"
            />
          </Field>

          <Field label="Batch / reference (optional)" htmlFor="add-stock-batch">
            <input
              id="add-stock-batch"
              className={inputClasses}
              type="text"
              value={batchReference}
              onChange={(event) => setBatchReference(event.target.value)}
              placeholder="e.g., BATCH-014"
            />
          </Field>

          <div className="grid gap-1.5 sm:col-span-2">
            <label htmlFor="add-stock-notes" className="text-xs font-bold uppercase tracking-[0.1em] text-brand-green-ink">Notes (optional)</label>
            <textarea
              id="add-stock-notes"
              className={inputClasses}
              rows={3}
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              placeholder="Anything worth remembering about this delivery"
            />
          </div>
        </div>

        {error ? (
          <p className="rounded-wobbly-card border-3 border-dashed border-brand-orange bg-brand-orange/10 p-3 text-sm font-semibold text-brand-black" role="alert">{error}</p>
        ) : null}

        <div className="flex flex-wrap items-center justify-end gap-3">
          <button className={btnOutlineSm} type="button" disabled={busy} onClick={onClose}>
            Cancel
          </button>
          <button className={btnPrimarySm} type="button" disabled={busy} onClick={() => void handleSubmit()}>
            {busy ? "Adding stock..." : "Add stock"}
          </button>
        </div>
      </div>
    </div>
  );
}
