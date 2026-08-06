import { useState, type FormEvent } from "react";
import { btnOutlineSm, btnPrimarySm } from "../../components/ui/styles";
import type { ProductRow } from "../../cms/types";
import { Checkbox, Field, ImagePicker, TextArea, TextInput } from "./admin-fields";

export function blankProduct(id: string): ProductRow {
  return {
    id,
    sku: "",
    name: "",
    eyebrow: "",
    description: "",
    image: "",
    alt: "",
    category: "Fresh boxes",
    price_amount: null,
    price_unit: "",
    servings: "",
    availability: "",
    delivery_estimate: "",
    cooking_time: "",
    ingredients: "",
    allergen_notice: "",
    storage: "",
    source: "",
    nutrition: "",
    tags: [],
    collections: [],
    sort_order: 0,
    published: true,
  };
}

type ProductDraft = Omit<ProductRow, "price_amount" | "tags" | "collections"> & {
  price_amount: string;
  tags: string;
  collections: string;
};

function toDraft(row: ProductRow): ProductDraft {
  return {
    ...row,
    price_amount: row.price_amount == null ? "" : String(row.price_amount),
    tags: row.tags.join(", "),
    collections: row.collections.join(", "),
  };
}

function fromDraft(draft: ProductDraft): ProductRow {
  const parsedPrice = Number(draft.price_amount.trim());
  return {
    ...draft,
    price_amount: draft.price_amount.trim() === "" || Number.isNaN(parsedPrice) ? null : parsedPrice,
    tags: draft.tags.split(",").map((item) => item.trim()).filter(Boolean),
    collections: draft.collections.split(",").map((item) => item.trim()).filter(Boolean),
  };
}

const categories = ["Fresh boxes", "Meal kits", "Groceries"] as const;

export function ProductForm({ initial, onSave, onCancel }: { initial: ProductRow; onSave: (row: ProductRow) => Promise<void> | void; onCancel: () => void }) {
  const [draft, setDraft] = useState<ProductDraft>(() => toDraft(initial));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function set<K extends keyof ProductDraft>(key: K, value: ProductDraft[K]) {
    setDraft((current) => ({ ...current, [key]: value }));
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!draft.name.trim()) {
      setError("Name is required.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await onSave(fromDraft(draft));
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Could not save the product.");
      setBusy(false);
    }
  }

  return (
    <form className="grid gap-5 rounded-wobbly-card border-3 border-brand-forest bg-brand-warm-white p-5 shadow-brand" onSubmit={handleSubmit} aria-label="Product form">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-primary text-2xl font-bold text-brand-green-ink">{initial.name ? `Edit ${initial.name}` : "New product"}</h2>
        <span className="rounded-full border-2 border-brand-forest bg-brand-white px-3 py-1 text-xs font-bold text-brand-black">{initial.id}</span>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Name *" htmlFor="product-name"><TextInput id="product-name" required value={draft.name} onChange={(e) => set("name", e.target.value)} /></Field>
        <Field label="SKU" htmlFor="product-sku"><TextInput id="product-sku" value={draft.sku} onChange={(e) => set("sku", e.target.value)} /></Field>
        <Field label="Eyebrow (badge line)" htmlFor="product-eyebrow"><TextInput id="product-eyebrow" value={draft.eyebrow} onChange={(e) => set("eyebrow", e.target.value)} /></Field>
        <Field label="Category" htmlFor="product-category">
          <select id="product-category" className="min-h-11.5 w-full rounded-[18px_12px_16px_10px/12px_18px_10px_16px] border-3 border-brand-forest bg-brand-white px-4 py-[0.65rem] text-brand-black shadow-brand-soft outline-none focus-visible:border-brand-green-ink focus-visible:ring-4 focus-visible:ring-brand-leaf/20" value={draft.category} onChange={(e) => set("category", e.target.value as ProductRow["category"])}>
            {categories.map((category) => <option key={category} value={category}>{category}</option>)}
          </select>
        </Field>
        <Field label="Price (Nu.)" htmlFor="product-price" hint="Leave blank for a price listed later.">
          <TextInput id="product-price" type="number" inputMode="decimal" min="0" value={draft.price_amount} onChange={(e) => set("price_amount", e.target.value)} />
        </Field>
        <Field label="Price unit" htmlFor="product-price-unit" hint="e.g. / box, / 500g"><TextInput id="product-price-unit" value={draft.price_unit} onChange={(e) => set("price_unit", e.target.value)} /></Field>
        <Field label="Servings" htmlFor="product-servings"><TextInput id="product-servings" value={draft.servings} onChange={(e) => set("servings", e.target.value)} /></Field>
        <Field label="Availability" htmlFor="product-availability"><TextInput id="product-availability" value={draft.availability} onChange={(e) => set("availability", e.target.value)} /></Field>
        <Field label="Delivery estimate" htmlFor="product-delivery"><TextInput id="product-delivery" value={draft.delivery_estimate} onChange={(e) => set("delivery_estimate", e.target.value)} /></Field>
        <Field label="Cooking time" htmlFor="product-cooking"><TextInput id="product-cooking" value={draft.cooking_time} onChange={(e) => set("cooking_time", e.target.value)} /></Field>
      </div>

      <Field label="Description" htmlFor="product-description"><TextArea id="product-description" value={draft.description} onChange={(e) => set("description", e.target.value)} /></Field>
      <Field label="Ingredients" htmlFor="product-ingredients"><TextArea id="product-ingredients" value={draft.ingredients} onChange={(e) => set("ingredients", e.target.value)} /></Field>
      <Field label="Allergen notice" htmlFor="product-allergens"><TextInput id="product-allergens" value={draft.allergen_notice} onChange={(e) => set("allergen_notice", e.target.value)} /></Field>
      <Field label="Storage" htmlFor="product-storage"><TextInput id="product-storage" value={draft.storage} onChange={(e) => set("storage", e.target.value)} /></Field>
      <Field label="Source" htmlFor="product-source"><TextInput id="product-source" value={draft.source} onChange={(e) => set("source", e.target.value)} /></Field>
      <Field label="Nutrition" htmlFor="product-nutrition"><TextArea id="product-nutrition" value={draft.nutrition} onChange={(e) => set("nutrition", e.target.value)} /></Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Tags (comma-separated)" htmlFor="product-tags"><TextInput id="product-tags" value={draft.tags} onChange={(e) => set("tags", e.target.value)} /></Field>
        <Field label="Collections (comma-separated)" htmlFor="product-collections" hint="top-pick, new, frequent, time-saver, veggie, bundle">
          <TextInput id="product-collections" value={draft.collections} onChange={(e) => set("collections", e.target.value)} />
        </Field>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <ImagePicker label="Image" image={draft.image} onChange={(url) => set("image", url)} folder="products" id={draft.id} />
        <div className="grid content-start gap-4">
          <Field label="Image alt text" htmlFor="product-alt"><TextInput id="product-alt" value={draft.alt} onChange={(e) => set("alt", e.target.value)} /></Field>
          <Field label="Sort order" htmlFor="product-sort" hint="Lower numbers appear first.">
            <TextInput id="product-sort" type="number" value={String(draft.sort_order)} onChange={(e) => set("sort_order", Number(e.target.value))} />
          </Field>
          <Checkbox checked={draft.published} onChange={(next) => set("published", next)} label="Published (visible on the site)" />
        </div>
      </div>

      {error ? <p className="rounded-wobbly-md border-2 border-dashed border-brand-orange bg-brand-orange/10 px-3 py-2 text-sm font-semibold text-brand-black" role="alert">{error}</p> : null}

      <div className="flex flex-wrap items-center gap-3">
        <button className={btnPrimarySm} type="submit" disabled={busy}>{busy ? "Saving..." : "Save product"}</button>
        <button className={btnOutlineSm} type="button" onClick={onCancel} disabled={busy}>Cancel</button>
      </div>
    </form>
  );
}
