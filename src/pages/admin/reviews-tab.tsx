import { useEffect, useMemo, useState } from "react";
import { deleteReview, listProducts, listReviews, nextSlugId, upsertReview } from "../../admin/admin-api";
import { btnOutlineSm, btnPrimarySm } from "../../components/ui/styles";
import type { ProductRow, ReviewRow } from "../../cms/types";
import { blankReview, ReviewForm } from "./review-form";
import { inputClasses } from "./admin-fields";

export function ReviewsTab() {
  const [reviews, setReviews] = useState<ReviewRow[] | null>(null);
  const [products, setProducts] = useState<ProductRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [editing, setEditing] = useState<ReviewRow | null>(null);
  const [creating, setCreating] = useState(false);
  const [busy, setBusy] = useState(false);
  const [query, setQuery] = useState("");

  const productName = useMemo(() => {
    const map = new Map(products.map((product) => [product.id, product.name]));
    return (productId: string) => map.get(productId) ?? productId;
  }, [products]);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return reviews ?? [];
    return (reviews ?? []).filter((row) =>
      row.author.toLowerCase().includes(needle) ||
      row.title.toLowerCase().includes(needle) ||
      productName(row.product_id).toLowerCase().includes(needle),
    );
  }, [reviews, query, productName]);

  async function load() {
    setReviews(null);
    setError(null);
    try {
      const [reviewRows, productRows] = await Promise.all([listReviews(), listProducts()]);
      setReviews(reviewRows);
      setProducts(productRows);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Could not load reviews.");
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
      const productId = products[0]?.id ?? "";
      const id = await nextSlugId(`rv-${productId || "item"}`, "reviews");
      setEditing({ ...blankReview(productId), id, sort_order: (reviews ?? []).length });
      setCreating(true);
    } catch (addError) {
      setError(addError instanceof Error ? addError.message : "Could not start a new review.");
    } finally {
      setBusy(false);
    }
  }

  async function handleSave(row: ReviewRow) {
    await upsertReview(row);
    const next = await listReviews();
    setReviews(next);
    setStatus(creating ? `Created review by ${row.author}.` : `Saved review by ${row.author}.`);
    setEditing(null);
    setCreating(false);
  }

  async function handleDelete(row: ReviewRow) {
    if (!window.confirm(`Delete the review by "${row.author}"?`)) return;
    setStatus(null);
    try {
      await deleteReview(row.id);
      setReviews((current) => (current ?? []).filter((item) => item.id !== row.id));
      setStatus(`Deleted review by ${row.author}.`);
    } catch (deleteError) {
      setStatus(deleteError instanceof Error ? deleteError.message : "Could not delete the review.");
    }
  }

  if (editing) {
    return (
      <div className="grid gap-4">
        <ReviewForm initial={editing} products={products} onSave={handleSave} onCancel={() => { setEditing(null); setCreating(false); }} />
      </div>
    );
  }

  return (
    <div className="grid gap-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="grid gap-1">
          <h1 className="font-primary text-[clamp(1.7rem,3.5vw,2.4rem)] font-bold leading-[1.02] text-brand-green-ink">Reviews</h1>
          <p className="text-sm text-brand-black/68">{reviews ? `${reviews.length} review${reviews.length === 1 ? "" : "s"}` : "Loading reviews..."}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <input className={`${inputClasses} min-w-55`} type="search" placeholder="Search reviews" aria-label="Search reviews" value={query} onChange={(e) => setQuery(e.target.value)} />
          <button className={btnOutlineSm} type="button" onClick={() => void load()} disabled={!reviews}>Refresh</button>
          <button className={btnPrimarySm} type="button" onClick={() => void handleAdd()} disabled={busy || products.length === 0}>Add review</button>
        </div>
      </div>

      {error ? (
        <div className="grid gap-3 rounded-wobbly-card border-3 border-dashed border-brand-orange bg-brand-orange/10 p-5">
          <p className="text-sm font-semibold text-brand-black" role="alert">{error}</p>
          <div><button className={btnOutlineSm} type="button" onClick={() => void load()}>Try again</button></div>
        </div>
      ) : null}

      {status ? <p className="text-sm font-semibold text-brand-green-ink" role="status">{status}</p> : null}

      {reviews ? (
        reviews.length === 0 ? (
          <p className="rounded-wobbly-card border-3 border-dashed border-brand-forest/30 bg-brand-white p-6 text-center text-sm font-semibold text-brand-black/64">No reviews yet. Add the first one.</p>
        ) : filtered.length === 0 ? (
          <p className="rounded-wobbly-card border-3 border-dashed border-brand-forest/30 bg-brand-white p-6 text-center text-sm font-semibold text-brand-black/64">No reviews match &quot;{query}&quot;.</p>
        ) : (
          <div className="overflow-x-auto rounded-wobbly-card border-3 border-brand-forest bg-brand-white shadow-brand-soft">
            <table className="w-full min-w-160 border-collapse text-left">
              <caption className="sr-only">Reviews</caption>
              <thead>
                <tr className="border-b-3 border-dashed border-brand-forest/30 bg-brand-warm-white text-xs font-bold uppercase tracking-[0.08em] text-brand-green-ink">
                  <th className="px-4 py-3">Product</th>
                  <th className="px-4 py-3">Reviewer</th>
                  <th className="px-4 py-3">Rating</th>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((row) => (
                  <tr className="border-b-2 border-dashed border-brand-forest/16 text-sm last:border-b-0" key={row.id}>
                    <td className="px-4 py-3 text-brand-black/72">{productName(row.product_id)}</td>
                    <td className="px-4 py-3">
                      <div className="grid gap-0.5">
                        <span className="font-bold text-brand-black">{row.author}</span>
                        <span className="text-xs text-brand-black/52">{row.title || row.id}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-brand-black/72">{"★".repeat(row.rating)} <span className="text-brand-black/52">{row.rating}/5</span></td>
                    <td className="px-4 py-3 text-brand-black/72">{row.date}</td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full border-2 px-2 py-0.5 text-xs font-bold ${row.published ? "border-brand-forest bg-brand-yellow text-brand-forest" : "border-brand-black/30 bg-brand-white text-brand-black/52"}`}>
                        {row.published ? "Published" : "Draft"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1.5">
                        <button className="min-h-9 touch-manipulation rounded-full border-2 border-brand-forest px-3 py-1 text-xs font-bold text-brand-forest hover:bg-brand-yellow focus-visible:outline focus-visible:outline-3 focus-visible:outline-dashed focus-visible:outline-brand-green-ink focus-visible:outline-offset-2" type="button" onClick={() => { setCreating(false); setEditing(row); }}>Edit</button>
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
