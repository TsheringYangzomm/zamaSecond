import { useEffect, useMemo, useState } from "react";
import { GripVertical } from "lucide-react";
import {
  deleteProduct,
  inventoryTableExists,
  listInventory,
  listProducts,
  nextSlugId,
  reorderRows,
  updateProductStock,
  upsertProduct,
} from "../../admin/admin-api";
import { btnOutlineSm, btnPrimarySm } from "../../components/ui/styles";
import { ConfirmDialog } from "../../components/ui/confirm-dialog";
import { inputClasses, selectClasses } from "./admin-fields";
import type { InventoryRow, ProductRow } from "../../cms/types";
import { blankProduct, ProductForm } from "./product-form";
import { StockBadge, stockInfo, stockLevel } from "./commerce-shared";
import { useRowDragSort } from "./use-row-drag";

export function ProductsTab() {
  const [products, setProducts] = useState<ProductRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [editing, setEditing] = useState<ProductRow | null>(null);
  const [creating, setCreating] = useState(false);
  const [busy, setBusy] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<ProductRow | null>(null);
  const [query, setQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [stockFilter, setStockFilter] = useState("");
  const [stockAvailable, setStockAvailable] = useState(false);
  const [inventory, setInventory] = useState<InventoryRow[]>([]);

  const inventoryMap = useMemo(
    () => new Map(inventory.map((row) => [row.product_id, row])),
    [inventory],
  );

  const categories = useMemo(() => {
    const set = new Set((products ?? []).map((row) => row.category).filter(Boolean));
    return [...set].sort();
  }, [products]);

  const filtered = useMemo(() => {
    if (!products) return [];
    const needle = query.trim().toLowerCase();
    return products.filter((row) => {
      if (categoryFilter && row.category !== categoryFilter) return false;
      if (stockFilter) {
        const level = stockLevel(stockInfo(row.id, inventoryMap, stockAvailable).quantity, stockInfo(row.id, inventoryMap, stockAvailable).alertAt);
        if (level !== stockFilter) return false;
      }
      if (!needle) return true;
      return (
        row.name.toLowerCase().includes(needle) ||
        row.id.toLowerCase().includes(needle) ||
        row.sku.toLowerCase().includes(needle) ||
        row.category.toLowerCase().includes(needle)
      );
    });
  }, [products, query, categoryFilter, stockFilter, stockAvailable, inventoryMap]);

  const reorderEnabled = products !== null && query === "" && !categoryFilter && !stockFilter;

  async function load() {
    setProducts(null);
    setError(null);
    try {
      const [rows, hasStock] = await Promise.all([listProducts(), inventoryTableExists()]);
      const inventoryRows = hasStock ? await listInventory() : [];
      setProducts(rows);
      setStockAvailable(hasStock);
      setInventory(inventoryRows);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Could not load products.");
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function handleAdd() {
    setStatus(null);
    setError(null);
    setBusy(true);
    try {
      const id = await nextSlugId("New product", "products");
      const maxSort = (products ?? []).reduce((max, item) => Math.max(max, item.sort_order), -1);
      setEditing({ ...blankProduct(id), sort_order: maxSort + 1 });
      setCreating(true);
    } catch (addError) {
      setError(addError instanceof Error ? addError.message : "Could not start a new product.");
    } finally {
      setBusy(false);
    }
  }

  async function handleSave(row: ProductRow, stock: { quantity: number | null; alertAt: number | null }) {
    await upsertProduct(row);
    if (stockAvailable) {
      await updateProductStock(row.id, stock.quantity, stock.alertAt);
    }
    const [next, inventoryRows] = await Promise.all([
      listProducts(),
      stockAvailable ? listInventory() : Promise.resolve([]),
    ]);
    setProducts(next);
    setInventory(inventoryRows);
    setStatus(creating ? `Created ${row.name}.` : `Saved ${row.name}.`);
    setEditing(null);
    setCreating(false);
  }

  async function handleDelete(row: ProductRow) {
    setStatus(null);
    try {
      await deleteProduct(row.id);
      setProducts((current) => (current ?? []).filter((item) => item.id !== row.id));
      setStatus(`Deleted ${row.name}.`);
    } catch (deleteError) {
      setStatus(deleteError instanceof Error ? deleteError.message : "Could not delete the product.");
    } finally {
      setPendingDelete(null);
    }
  }

  async function handleReorder(orderedIds: string[]) {
    setStatus(null);
    if (!products) return;
    const byId = new Map(products.map((row) => [row.id, row]));
    const next = orderedIds
      .map((id, index) => {
        const row = byId.get(id);
        return row ? { ...row, sort_order: index } : undefined;
      })
      .filter((row): row is ProductRow => row !== undefined);
    setProducts(next);
    try {
      await reorderRows("products", orderedIds);
    } catch (reorderError) {
      setStatus(reorderError instanceof Error ? reorderError.message : "Could not reorder products.");
      await load();
    }
  }

  const { rowProps } = useRowDragSort(filtered, (orderedIds) => void handleReorder(orderedIds));

  if (editing) {
    return (
      <div className="grid gap-4">
        <ProductForm initial={editing} initialStock={inventoryMap.get(editing.id) ? { quantity: inventoryMap.get(editing.id)!.stock_quantity ?? null, alertAt: inventoryMap.get(editing.id)!.stock_alert_at ?? null } : null} onSave={handleSave} onCancel={() => { setEditing(null); setCreating(false); }} stockAvailable={stockAvailable} />
      </div>
    );
  }

  return (
    <div className="grid gap-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="grid gap-1">
          <h1 className="font-primary text-[clamp(1.7rem,3.5vw,2.4rem)] font-bold leading-[1.02] text-brand-green-ink">Products</h1>
          <p className="text-sm text-brand-black/68">{products ? `${products.length} product${products.length === 1 ? "" : "s"}` : "Loading products..."}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button className={btnOutlineSm} type="button" onClick={() => void load()} disabled={!products}>Refresh</button>
          <button className={btnPrimarySm} type="button" onClick={() => void handleAdd()} disabled={busy}>Add product</button>
        </div>
      </div>

      {!stockAvailable ? (
        <p className="rounded-wobbly-card border-3 border-dashed border-brand-orange bg-brand-orange/10 p-4 text-sm font-semibold text-brand-black">
          Showing example stock levels. Run <code className="rounded bg-brand-white px-1 py-0.5 text-xs">supabase/inventory-schema.sql</code> to create the inventory table.
        </p>
      ) : null}

      {error ? (
        <div className="grid gap-3 rounded-wobbly-card border-3 border-dashed border-brand-orange bg-brand-orange/10 p-5">
          <p className="text-sm font-semibold text-brand-black" role="alert">{error}</p>
          <div><button className={btnOutlineSm} type="button" onClick={() => void load()}>Try again</button></div>
        </div>
      ) : null}

      {status ? <p className="text-sm font-semibold text-brand-green-ink" role="status">{status}</p> : null}

      {products ? (
        <>
          <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto_auto]">
            <input className={`${inputClasses} min-w-0`} type="search" aria-label="Search products" placeholder="Search by name, ID, or SKU..." value={query} onChange={(event) => setQuery(event.target.value)} />
            <select className={`${selectClasses} min-w-44`} aria-label="Filter by category" value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)}>
              <option value="">All categories</option>
              {categories.map((category) => <option key={category} value={category}>{category}</option>)}
            </select>
            <select className={`${selectClasses} min-w-44`} aria-label="Filter by stock" value={stockFilter} onChange={(event) => setStockFilter(event.target.value)}>
              <option value="">All stock</option>
              <option value="in">In stock</option>
              <option value="low">Low stock</option>
              <option value="out">Out of stock</option>
              <option value="untracked">Not tracked</option>
            </select>
          </div>

          {products.length === 0 ? (
            <p className="rounded-wobbly-card border-3 border-dashed border-brand-forest/30 bg-brand-white p-6 text-center text-sm font-semibold text-brand-black/64">No products yet. Add the first one.</p>
          ) : filtered.length === 0 ? (
            <p className="rounded-wobbly-card border-3 border-dashed border-brand-forest/30 bg-brand-white p-6 text-center text-sm font-semibold text-brand-black/64">No products match the current search or filters.</p>
          ) : (
            <div className="overflow-x-auto rounded-wobbly-card border-3 border-brand-forest bg-brand-white shadow-brand-soft">
              <table className="w-full min-w-210 border-collapse text-left">
                <caption className="sr-only">Products</caption>
                <thead>
                  <tr className="border-b-3 border-dashed border-brand-forest/30 bg-brand-warm-white text-xs font-bold uppercase tracking-[0.08em] text-brand-green-ink">
                    <th className="w-12 px-2 py-3 text-center">
                      <span className="sr-only">Reorder</span>
                    </th>
                    <th className="px-4 py-3">Product</th>
                    <th className="px-4 py-3">Category</th>
                    <th className="px-4 py-3">Price</th>
                    <th className="px-4 py-3">Stock</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">
                      <span className="sr-only">Actions</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((row) => {
                    const stock = stockInfo(row.id, inventoryMap, stockAvailable);
                    const level = stockLevel(stock.quantity, stock.alertAt);
                    const drag = rowProps(row);
                    return (
                      <tr
                        className={`border-b-2 border-dashed border-brand-forest/16 text-sm last:border-b-0 ${reorderEnabled ? "cursor-grab active:cursor-grabbing" : ""} ${drag.isDragging ? "opacity-40" : ""} ${drag.isDropTarget ? "bg-brand-yellow/30" : ""}`}
                        key={row.id}
                        draggable={reorderEnabled}
                        onDragStart={drag.onDragStart}
                        onDragOver={drag.onDragOver}
                        onDrop={drag.onDrop}
                        onDragEnd={drag.onDragEnd}
                      >
                        <td className="px-2 py-3 text-center">
                          <span className={`inline-flex items-center justify-center ${reorderEnabled ? "text-brand-black/40" : "text-brand-black/20"}`} title="Drag to reorder" aria-hidden="true">
                            <GripVertical className="h-4 w-4" />
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            {row.image ? <img className="h-11 w-11 flex-none rounded-wobbly-md border-2 border-brand-forest/30 bg-brand-warm-white object-contain p-0.5" src={row.image} alt="" aria-hidden="true" /> : null}
                            <div className="grid gap-0.5">
                              <span className="font-bold text-brand-black">{row.name}</span>
                              <span className="text-xs text-brand-black/52">{row.id}</span>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-brand-black/72">{row.category}</td>
                        <td className="px-4 py-3 text-brand-black/72">{row.price_amount == null ? "—" : `Nu. ${row.price_amount}`}</td>
                        <td className="px-4 py-3"><StockBadge level={level} quantity={stock.quantity} /></td>
                        <td className="px-4 py-3">
                          <span className={`rounded-full border-2 px-2 py-0.5 text-xs font-bold ${row.published ? "border-brand-forest bg-brand-yellow text-brand-forest" : "border-brand-black/30 bg-brand-white text-brand-black/52"}`}>
                            {row.published ? "Published" : "Draft"}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-end gap-1.5">
                            <button className="min-h-9 touch-manipulation rounded-full border-2 border-brand-forest px-3 py-1 text-xs font-bold text-brand-forest hover:bg-brand-yellow focus-visible:outline focus-visible:outline-3 focus-visible:outline-dashed focus-visible:outline-brand-green-ink focus-visible:outline-offset-2" type="button" onClick={() => { setCreating(false); setEditing(row); }}>Edit</button>
                            <button className="min-h-9 touch-manipulation rounded-full border-2 border-brand-orange-ink px-3 py-1 text-xs font-bold text-brand-black hover:bg-brand-orange focus-visible:outline focus-visible:outline-3 focus-visible:outline-dashed focus-visible:outline-brand-green-ink focus-visible:outline-offset-2" type="button" onClick={() => setPendingDelete(row)}>Delete</button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </>
      ) : null}
      <ConfirmDialog
        open={pendingDelete !== null}
        title="Delete product"
        message={pendingDelete ? `Delete "${pendingDelete.name}"? Its reviews will be deleted too.` : ""}
        onConfirm={() => { if (pendingDelete) void handleDelete(pendingDelete); }}
        onCancel={() => setPendingDelete(null)}
      />
    </div>
  );
}
