import { useEffect, useMemo, useState } from "react";
import { deleteReview, listProducts, listReviews, upsertReview } from "../../admin/admin-api";
import { btnOutlineSm } from "../../components/ui/styles";
import { ConfirmDialog } from "../../components/ui/confirm-dialog";
import type { ProductRow, ReviewRow } from "../../cms/types";
import { inputClasses, selectClasses } from "./admin-fields";

export function ReviewsTab() {
  const [reviews, setReviews] = useState<ReviewRow[] | null>(null);
  const [products, setProducts] = useState<ProductRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [query, setQuery] = useState("");
  const [productFilter, setProductFilter] = useState("");
  const [ratingFilter, setRatingFilter] = useState("");
  const [pendingDelete, setPendingDelete] = useState<ReviewRow | null>(null);

  const productName = useMemo(() => {
    const map = new Map(products.map((product) => [product.id, product.name]));
    return (productId: string) => map.get(productId) ?? productId;
  }, [products]);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return (reviews ?? []).filter((row) => {
      if (productFilter && row.product_id !== productFilter) return false;
      if (ratingFilter && row.rating !== Number(ratingFilter)) return false;
      if (!needle) return true;
      return (
        row.author.toLowerCase().includes(needle) ||
        row.title.toLowerCase().includes(needle) ||
        row.body.toLowerCase().includes(needle) ||
        productName(row.product_id).toLowerCase().includes(needle)
      );
    });
  }, [reviews, query, productFilter, ratingFilter, productName]);

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

  async function handleTogglePublished(row: ReviewRow) {
    setStatus(null);
    setBusy(true);
    try {
      await upsertReview({ ...row, published: !row.published });
      setReviews((current) => (current ?? []).map((item) => (item.id === row.id ? { ...item, published: !item.published } : item)));
      setStatus(row.published ? `Hidden ${row.author}'s review.` : `Published ${row.author}'s review.`);
    } catch (toggleError) {
      setStatus(toggleError instanceof Error ? toggleError.message : "Could not update the review.");
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete(row: ReviewRow) {
    setStatus(null);
    try {
      await deleteReview(row.id);
      setReviews((current) => (current ?? []).filter((item) => item.id !== row.id));
      setStatus(`Deleted ${row.author}'s review.`);
    } catch (deleteError) {
      setStatus(deleteError instanceof Error ? deleteError.message : "Could not delete the review.");
    } finally {
      setPendingDelete(null);
    }
  }

  return (
    <div className="grid gap-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="grid gap-1">
          <h1 className="font-primary text-[clamp(1.7rem,3.5vw,2.4rem)] font-bold leading-[1.02] text-brand-green-ink">Reviews</h1>
          <p className="text-sm text-brand-black/68">{reviews ? `${reviews.length} review${reviews.length === 1 ? "" : "s"}` : "Loading reviews..."}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button className={btnOutlineSm} type="button" onClick={() => void load()} disabled={!reviews}>Refresh</button>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto_auto]">
        <input className={`${inputClasses} min-w-0`} type="search" aria-label="Search reviews" placeholder="Search by reviewer, title, body, or product..." value={query} onChange={(e) => setQuery(e.target.value)} />
        <select className={`${selectClasses} min-w-44`} aria-label="Filter by product" value={productFilter} onChange={(e) => setProductFilter(e.target.value)}>
          <option value="">All products</option>
          {products.map((product) => <option key={product.id} value={product.id}>{product.name}</option>)}
        </select>
        <select className={`${selectClasses} min-w-36`} aria-label="Filter by rating" value={ratingFilter} onChange={(e) => setRatingFilter(e.target.value)}>
          <option value="">All ratings</option>
          <option value="5">5 stars</option>
          <option value="4">4 stars</option>
          <option value="3">3 stars</option>
          <option value="2">2 stars</option>
          <option value="1">1 star</option>
        </select>
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
          <p className="rounded-wobbly-card border-3 border-dashed border-brand-forest/30 bg-brand-white p-6 text-center text-sm font-semibold text-brand-black/64">No reviews yet.</p>
        ) : filtered.length === 0 ? (
          <p className="rounded-wobbly-card border-3 border-dashed border-brand-forest/30 bg-brand-white p-6 text-center text-sm font-semibold text-brand-black/64">No reviews match the current filters.</p>
        ) : (
          <div className="overflow-x-auto rounded-wobbly-card border-3 border-brand-forest bg-brand-white shadow-brand-soft">
            <table className="w-full min-w-180 border-collapse text-left">
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
                        {row.title ? <span className="text-sm font-semibold text-brand-green-ink">{row.title}</span> : null}
                        <span className="text-xs text-brand-black/52">{row.location || row.id}</span>
                      </div>
                      {row.body ? <p className="mt-1 max-w-100 text-xs leading-[1.4] text-brand-black/64">{row.body}</p> : null}
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
                        <button className="min-h-9 touch-manipulation rounded-full border-2 border-brand-forest px-3 py-1 text-xs font-bold text-brand-forest hover:bg-brand-yellow focus-visible:outline focus-visible:outline-3 focus-visible:outline-dashed focus-visible:outline-brand-green-ink focus-visible:outline-offset-2" type="button" disabled={busy} onClick={() => void handleTogglePublished(row)}>{row.published ? "Hide" : "Publish"}</button>
                        <button className="min-h-9 touch-manipulation rounded-full border-2 border-brand-orange-ink px-3 py-1 text-xs font-bold text-brand-black hover:bg-brand-orange focus-visible:outline focus-visible:outline-3 focus-visible:outline-dashed focus-visible:outline-brand-green-ink focus-visible:outline-offset-2" type="button" onClick={() => setPendingDelete(row)}>Delete</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      ) : null}
      <ConfirmDialog
        open={pendingDelete !== null}
        title="Delete review"
        message={pendingDelete ? `Delete ${pendingDelete.author}'s review of "${productName(pendingDelete.product_id)}"?` : ""}
        onConfirm={() => { if (pendingDelete) void handleDelete(pendingDelete); }}
        onCancel={() => setPendingDelete(null)}
      />
    </div>
  );
}
