import { useEffect, useMemo, useState } from "react";
import { deleteReview, listProducts, listReviews, upsertReview } from "../../admin/admin-api";
import { updateCustomerReviewStatus } from "../../account-rewards/account-rewards-api";
import { useAdminAuth } from "../../admin/admin-auth";
import { btnOutlineSm } from "../../components/ui/styles";
import { ConfirmDialog } from "../../components/ui/confirm-dialog";
import type { ProductRow, ReviewRow } from "../../cms/types";
import { inputClasses } from "./admin-fields";
import { ClearFiltersButton, ColumnFilterDropdown, DATE_RANGES, dateRangeKey } from "./column-filter-dropdown";

export function ReviewsTab() {
  const { email: adminEmail } = useAdminAuth();
  const [reviews, setReviews] = useState<ReviewRow[] | null>(null);
  const [products, setProducts] = useState<ProductRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [query, setQuery] = useState("");
  const [filters, setFilters] = useState({ product: "", rating: "", date: "", status: "" });
  const [pendingDelete, setPendingDelete] = useState<ReviewRow | null>(null);

  const productName = useMemo(() => {
    const map = new Map(products.map((product) => [product.id, product.name]));
    return (productId: string) => map.get(productId) ?? productId;
  }, [products]);

  const productOptions = useMemo(() => [...new Set(products.map((product) => product.name).filter(Boolean))].sort(), [products]);

  const ratingOptions = [
    { value: "5", label: "5 stars" },
    { value: "4", label: "4 stars" },
    { value: "3", label: "3 stars" },
    { value: "2", label: "2 stars" },
    { value: "1", label: "1 star" },
  ];

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return (reviews ?? []).filter((row) => {
      if (filters.product && productName(row.product_id) !== filters.product) return false;
      if (filters.rating && row.rating !== Number(filters.rating)) return false;
      if (filters.date && dateRangeKey(row.date) !== filters.date) return false;
      const statusLabel = row.source === "customer" ? `customer_${row.moderation_status ?? (row.published ? "approved" : "pending")}` : row.published ? "Active" : "Inactive";
      if (filters.status && statusLabel !== filters.status) return false;
      if (!needle) return true;
      return (
        row.author.toLowerCase().includes(needle) ||
        row.title.toLowerCase().includes(needle) ||
        row.body.toLowerCase().includes(needle) ||
        productName(row.product_id).toLowerCase().includes(needle) ||
        String(row.customer_id ?? "").toLowerCase().includes(needle) ||
        String(row.order_id ?? "").toLowerCase().includes(needle)
      );
    });
  }, [reviews, query, filters, productName]);

  const activeFilterCount = (["product", "rating", "date", "status"] as const).filter((key) => filters[key] !== "").length;

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
      if (row.source === "customer") {
        const nextStatus = row.moderation_status === "approved" ? "pending" : "approved";
        await updateCustomerReviewStatus(row.id, nextStatus, adminEmail ?? "admin");
        setReviews((current) => (current ?? []).map((item) => (item.id === row.id ? { ...item, published: nextStatus === "approved", moderation_status: nextStatus } : item)));
        setStatus(nextStatus === "approved" ? `Approved ${row.author}'s customer review.` : `Moved ${row.author}'s customer review back to pending.`);
      } else {
        await upsertReview({ ...row, published: !row.published });
        setReviews((current) => (current ?? []).map((item) => (item.id === row.id ? { ...item, published: !item.published } : item)));
        setStatus(row.published ? `Hidden ${row.author}'s review.` : `Activated ${row.author}'s review.`);
      }
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

      <div className="grid gap-3">
        <input className={`${inputClasses} min-w-0`} type="search" aria-label="Search reviews" placeholder="Search by reviewer, title, body, or product..." value={query} onChange={(e) => setQuery(e.target.value)} />
        <div className="flex flex-wrap items-center gap-2">
          <ColumnFilterDropdown label="Product" options={productOptions} value={filters.product} onSelect={(v) => setFilters((f) => ({ ...f, product: v }))} />
          <ColumnFilterDropdown label="Rating" options={ratingOptions} value={filters.rating} onSelect={(v) => setFilters((f) => ({ ...f, rating: v }))} />
          <ColumnFilterDropdown label="Date" options={DATE_RANGES} value={filters.date} onSelect={(v) => setFilters((f) => ({ ...f, date: v }))} />
          <ColumnFilterDropdown label="Status" options={["Active", "Inactive", { value: "customer_pending", label: "Customer pending" }, { value: "customer_approved", label: "Customer approved" }, { value: "customer_rejected", label: "Customer rejected" }]} value={filters.status} onSelect={(v) => setFilters((f) => ({ ...f, status: v }))} />
          <ClearFiltersButton count={activeFilterCount} onClear={() => setFilters({ product: "", rating: "", date: "", status: "" })} />
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
                <th className="px-4 py-3">Source / order</th>
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
                    <td className="px-4 py-3 text-xs text-brand-black/68"><div className="grid gap-1"><span className="font-bold capitalize text-brand-green-ink">{row.source === "customer" ? "Customer" : "CMS"}</span>{row.order_id ? <a className="font-semibold text-brand-green-ink underline decoration-dashed underline-offset-2" href={`#/account/orders?order=${encodeURIComponent(row.order_id)}`}>Order {row.order_id}</a> : null}{row.customer_id ? <span>Customer {row.customer_id}</span> : null}</div></td>
                    <td className="px-4 py-3 text-brand-black/72">{"★".repeat(row.rating)} <span className="text-brand-black/52">{row.rating}/5</span></td>
                    <td className="px-4 py-3 text-brand-black/72">{row.date}</td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full border-2 px-2 py-0.5 text-xs font-bold ${row.published ? "border-brand-forest bg-brand-mint text-brand-green-ink" : "border-brand-black/30 bg-brand-white text-brand-black/52"}`}>
                        {row.source === "customer" ? row.moderation_status ?? "pending" : row.published ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1.5">
                        <button className="min-h-9 touch-manipulation rounded-full border-2 border-brand-forest px-3 py-1 text-xs font-bold text-brand-forest hover:bg-brand-yellow focus-visible:outline focus-visible:outline-3 focus-visible:outline-dashed focus-visible:outline-brand-green-ink focus-visible:outline-offset-2" type="button" disabled={busy} onClick={() => void handleTogglePublished(row)}>{row.source === "customer" ? row.moderation_status === "approved" ? "Set pending" : "Approve" : row.published ? "Set inactive" : "Activate"}</button>
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
