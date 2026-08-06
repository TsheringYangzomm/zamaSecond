import { useEffect, useState } from "react";
import {
  deleteProduct,
  listProducts,
  nextSlugId,
  swapSortOrder,
  upsertProduct,
} from "../../admin/admin-api";
import { btnOutlineSm, btnPrimarySm } from "../../components/ui/styles";
import type { ProductRow } from "../../cms/types";
import { blankProduct, ProductForm } from "./product-form";

export function ProductsTab() {
  const [products, setProducts] = useState<ProductRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [editing, setEditing] = useState<ProductRow | null>(null);
  const [creating, setCreating] = useState(false);
  const [busy, setBusy] = useState(false);

  async function load() {
    setProducts(null);
    setError(null);
    try {
      setProducts(await listProducts());
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

  async function handleSave(row: ProductRow) {
    await upsertProduct(row);
    const next = await listProducts();
    setProducts(next);
    setStatus(creating ? `Created ${row.name}.` : `Saved ${row.name}.`);
    setEditing(null);
    setCreating(false);
  }

  async function handleDelete(row: ProductRow) {
    if (!window.confirm(`Delete "${row.name}"? Its reviews will be deleted too.`)) return;
    setStatus(null);
    try {
      await deleteProduct(row.id);
      setProducts((current) => (current ?? []).filter((item) => item.id !== row.id));
      setStatus(`Deleted ${row.name}.`);
    } catch (deleteError) {
      setStatus(deleteError instanceof Error ? deleteError.message : "Could not delete the product.");
    }
  }

  async function handleMove(row: ProductRow, direction: -1 | 1) {
    if (!products) return;
    const neighbor = direction === -1
      ? products.find((item) => item.sort_order < row.sort_order)
      : [...products].reverse().find((item) => item.sort_order > row.sort_order);
    if (!neighbor) return;
    setStatus(null);
    try {
      await swapSortOrder("products", row.id, neighbor.id);
      await load();
    } catch (moveError) {
      setStatus(moveError instanceof Error ? moveError.message : "Could not reorder products.");
    }
  }

  if (editing) {
    return (
      <div className="grid gap-4">
        <ProductForm initial={editing} onSave={handleSave} onCancel={() => { setEditing(null); setCreating(false); }} />
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

      {error ? (
        <div className="grid gap-3 rounded-wobbly-card border-3 border-dashed border-brand-orange bg-brand-orange/10 p-5">
          <p className="text-sm font-semibold text-brand-black" role="alert">{error}</p>
          <div><button className={btnOutlineSm} type="button" onClick={() => void load()}>Try again</button></div>
        </div>
      ) : null}

      {status ? <p className="text-sm font-semibold text-brand-green-ink" role="status">{status}</p> : null}

      {products ? (
        products.length === 0 ? (
          <p className="rounded-wobbly-card border-3 border-dashed border-brand-forest/30 bg-brand-white p-6 text-center text-sm font-semibold text-brand-black/64">No products yet. Add the first one.</p>
        ) : (
          <div className="overflow-x-auto rounded-wobbly-card border-3 border-brand-forest bg-brand-white shadow-brand-soft">
            <table className="w-full min-w-160 border-collapse text-left">
              <caption className="sr-only">Products</caption>
              <thead>
                <tr className="border-b-3 border-dashed border-brand-forest/30 bg-brand-warm-white text-xs font-bold uppercase tracking-[0.08em] text-brand-green-ink">
                  <th className="px-4 py-3">Product</th>
                  <th className="px-4 py-3">Category</th>
                  <th className="px-4 py-3">Price</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {products.map((row) => (
                  <tr className="border-b-2 border-dashed border-brand-forest/16 text-sm last:border-b-0" key={row.id}>
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
                    <td className="px-4 py-3">
                      <span className={`rounded-full border-2 px-2 py-0.5 text-xs font-bold ${row.published ? "border-brand-forest bg-brand-yellow text-brand-forest" : "border-brand-black/30 bg-brand-white text-brand-black/52"}`}>
                        {row.published ? "Published" : "Draft"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1.5">
                        <button className="min-h-9 touch-manipulation rounded-full border-2 border-brand-forest px-3 py-1 text-xs font-bold text-brand-forest hover:bg-brand-yellow focus-visible:outline focus-visible:outline-3 focus-visible:outline-dashed focus-visible:outline-brand-green-ink focus-visible:outline-offset-2" type="button" onClick={() => { setCreating(false); setEditing(row); }}>Edit</button>
                        <button className="min-h-9 touch-manipulation rounded-full border-2 border-brand-forest px-3 py-1 text-xs font-bold text-brand-forest hover:bg-brand-yellow focus-visible:outline focus-visible:outline-3 focus-visible:outline-dashed focus-visible:outline-brand-green-ink focus-visible:outline-offset-2" type="button" aria-label={`Move ${row.name} up`} onClick={() => void handleMove(row, -1)}>↑</button>
                        <button className="min-h-9 touch-manipulation rounded-full border-2 border-brand-forest px-3 py-1 text-xs font-bold text-brand-forest hover:bg-brand-yellow focus-visible:outline focus-visible:outline-3 focus-visible:outline-dashed focus-visible:outline-brand-green-ink focus-visible:outline-offset-2" type="button" aria-label={`Move ${row.name} down`} onClick={() => void handleMove(row, 1)}>↓</button>
                        <button className="min-h-9 touch-manipulation rounded-full border-2 border-brand-orange-ink px-3 py-1 text-xs font-bold text-brand-black hover:bg-brand-orange focus-visible:outline focus-visible:outline-3 focus-visible:outline-dashed focus-visible:outline-brand-green-ink focus-visible:outline-offset-2" type="button" onClick={() => void handleDelete(row)}>Delete</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      ) : null}
    </div>
  );
}
