import { useState, type FormEvent } from "react";
import { btnOutlineSm, btnPrimarySm } from "../../components/ui/styles";
import type { ProductRow, ReviewRow } from "../../cms/types";
import { Checkbox, Field, TextArea, TextInput } from "./admin-fields";

export function blankReview(productId: string): ReviewRow {
  return {
    id: "",
    product_id: productId,
    author: "",
    location: "",
    rating: 5,
    date: "",
    title: "",
    body: "",
    verified: false,
    sort_order: 0,
    published: true,
  };
}

type ReviewDraft = Omit<ReviewRow, "rating" | "sort_order"> & {
  rating: string;
  sort_order: string;
};

function toDraft(row: ReviewRow): ReviewDraft {
  return {
    ...row,
    rating: String(row.rating),
    sort_order: String(row.sort_order),
  };
}

function fromDraft(draft: ReviewDraft): ReviewRow {
  const rating = Number(draft.rating);
  const sort = Number(draft.sort_order);
  return {
    ...draft,
    rating: Number.isNaN(rating) ? 5 : rating,
    sort_order: Number.isNaN(sort) ? 0 : sort,
  };
}

const selectClasses =
  "min-h-11.5 w-full rounded-[18px_12px_16px_10px/12px_18px_10px_16px] border-3 border-brand-forest bg-brand-white px-4 py-[0.65rem] text-brand-black shadow-brand-soft outline-none focus-visible:border-brand-green-ink focus-visible:ring-4 focus-visible:ring-brand-leaf/20";

export function ReviewForm({ initial, products, onSave, onCancel }: { initial: ReviewRow; products: ProductRow[]; onSave: (row: ReviewRow) => Promise<void> | void; onCancel: () => void }) {
  const [draft, setDraft] = useState<ReviewDraft>(() => toDraft(initial));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function set<K extends keyof ReviewDraft>(key: K, value: ReviewDraft[K]) {
    setDraft((current) => ({ ...current, [key]: value }));
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!draft.product_id) {
      setError("Product is required.");
      return;
    }
    if (!draft.author.trim()) {
      setError("Author is required.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await onSave(fromDraft(draft));
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Could not save the review.");
      setBusy(false);
    }
  }

  return (
    <form className="grid gap-5 rounded-wobbly-card border-3 border-brand-forest bg-brand-warm-white p-5 shadow-brand" onSubmit={handleSubmit} aria-label="Review form">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-primary text-2xl font-bold text-brand-green-ink">{initial.author ? "Edit review" : "New review"}</h2>
        <span className="rounded-full border-2 border-brand-forest bg-brand-white px-3 py-1 text-xs font-bold text-brand-black">{initial.id}</span>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Product *" htmlFor="review-product">
          <select id="review-product" className={selectClasses} value={draft.product_id} onChange={(e) => set("product_id", e.target.value)}>
            {products.map((product) => <option key={product.id} value={product.id}>{product.name}</option>)}
          </select>
        </Field>
        <Field label="Author *" htmlFor="review-author"><TextInput id="review-author" required value={draft.author} onChange={(e) => set("author", e.target.value)} /></Field>
        <Field label="Location" htmlFor="review-location" hint="e.g. Thimphu"><TextInput id="review-location" value={draft.location} onChange={(e) => set("location", e.target.value)} /></Field>
        <Field label="Rating" htmlFor="review-rating">
          <select id="review-rating" className={selectClasses} value={draft.rating} onChange={(e) => set("rating", e.target.value)}>
            {[5, 4, 3, 2, 1].map((n) => <option key={n} value={n}>{n} {n === 1 ? "star" : "stars"}</option>)}
          </select>
        </Field>
        <Field label="Date" htmlFor="review-date" hint="e.g. March 2025"><TextInput id="review-date" value={draft.date} onChange={(e) => set("date", e.target.value)} /></Field>
        <Field label="Sort order" htmlFor="review-sort" hint="Lower numbers appear first.">
          <TextInput id="review-sort" type="number" value={draft.sort_order} onChange={(e) => set("sort_order", e.target.value)} />
        </Field>
      </div>

      <Field label="Title" htmlFor="review-title"><TextInput id="review-title" value={draft.title} onChange={(e) => set("title", e.target.value)} /></Field>
      <Field label="Body" htmlFor="review-body"><TextArea id="review-body" value={draft.body} onChange={(e) => set("body", e.target.value)} /></Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <Checkbox checked={draft.verified} onChange={(next) => set("verified", next)} label="Verified buyer" />
        <Checkbox checked={draft.published} onChange={(next) => set("published", next)} label="Published (visible on the site)" />
      </div>

      {error ? <p className="rounded-wobbly-md border-2 border-dashed border-brand-orange bg-brand-orange/10 px-3 py-2 text-sm font-semibold text-brand-black" role="alert">{error}</p> : null}

      <div className="flex flex-wrap items-center gap-3">
        <button className={btnPrimarySm} type="submit" disabled={busy}>{busy ? "Saving..." : "Save review"}</button>
        <button className={btnOutlineSm} type="button" onClick={onCancel} disabled={busy}>Cancel</button>
      </div>
    </form>
  );
}
