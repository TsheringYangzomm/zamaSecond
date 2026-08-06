import { useState, type FormEvent } from "react";
import { btnOutlineSm, btnPrimarySm } from "../../components/ui/styles";
import { farmerDzongkhags } from "../../data/farmers";
import type { FarmerRow } from "../../cms/types";
import { Checkbox, Field, ImagePicker, TextArea, TextInput } from "./admin-fields";

export function blankFarmer(id: string): FarmerRow {
  return {
    id,
    name: "",
    location: "",
    dzongkhag: "Thimphu",
    products: [],
    tags: [],
    years_farming: 0,
    bio: "",
    verified: false,
    partner_since: null,
    image: "",
    sort_order: 0,
    published: true,
  };
}

type FarmerDraft = Omit<FarmerRow, "products" | "tags" | "years_farming" | "partner_since"> & {
  products: string;
  tags: string;
  years_farming: string;
  partner_since: string;
};

function toDraft(row: FarmerRow): FarmerDraft {
  return {
    ...row,
    products: row.products.join(", "),
    tags: row.tags.join(", "),
    years_farming: String(row.years_farming),
    partner_since: row.partner_since == null ? "" : String(row.partner_since),
  };
}

function fromDraft(draft: FarmerDraft): FarmerRow {
  const years = Number(draft.years_farming.trim());
  const partner = Number(draft.partner_since.trim());
  return {
    ...draft,
    products: draft.products.split(",").map((item) => item.trim()).filter(Boolean),
    tags: draft.tags.split(",").map((item) => item.trim()).filter(Boolean),
    years_farming: Number.isNaN(years) ? 0 : years,
    partner_since: draft.partner_since.trim() === "" || Number.isNaN(partner) ? null : partner,
  };
}

export function FarmerForm({ initial, onSave, onCancel }: { initial: FarmerRow; onSave: (row: FarmerRow) => Promise<void> | void; onCancel: () => void }) {
  const [draft, setDraft] = useState<FarmerDraft>(() => toDraft(initial));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function set<K extends keyof FarmerDraft>(key: K, value: FarmerDraft[K]) {
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
      setError(saveError instanceof Error ? saveError.message : "Could not save the farmer.");
      setBusy(false);
    }
  }

  return (
    <form className="grid gap-5 rounded-wobbly-card border-3 border-brand-forest bg-brand-warm-white p-5 shadow-brand" onSubmit={handleSubmit} aria-label="Farmer form">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-primary text-2xl font-bold text-brand-green-ink">{initial.name ? `Edit ${initial.name}` : "New farmer"}</h2>
        <span className="rounded-full border-2 border-brand-forest bg-brand-white px-3 py-1 text-xs font-bold text-brand-black">{initial.id}</span>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Name *" htmlFor="farmer-name"><TextInput id="farmer-name" required value={draft.name} onChange={(e) => set("name", e.target.value)} /></Field>
        <Field label="Location" htmlFor="farmer-location" hint="e.g. Paro, Bhutan"><TextInput id="farmer-location" value={draft.location} onChange={(e) => set("location", e.target.value)} /></Field>
        <Field label="Dzongkhag" htmlFor="farmer-dzongkhag">
          <select id="farmer-dzongkhag" className="min-h-11.5 w-full rounded-[18px_12px_16px_10px/12px_18px_10px_16px] border-3 border-brand-forest bg-brand-white px-4 py-[0.65rem] text-brand-black shadow-brand-soft outline-none focus-visible:border-brand-green-ink focus-visible:ring-4 focus-visible:ring-brand-leaf/20" value={draft.dzongkhag} onChange={(e) => set("dzongkhag", e.target.value)}>
            {farmerDzongkhags.map((dzongkhag) => <option key={dzongkhag} value={dzongkhag}>{dzongkhag}</option>)}
          </select>
        </Field>
        <Field label="Years farming" htmlFor="farmer-years" hint="e.g. 18"><TextInput id="farmer-years" type="number" min="0" value={draft.years_farming} onChange={(e) => set("years_farming", e.target.value)} /></Field>
        <Field label="Partner since" htmlFor="farmer-partner" hint="Year, e.g. 2025"><TextInput id="farmer-partner" type="number" min="2000" max="2100" value={draft.partner_since} onChange={(e) => set("partner_since", e.target.value)} /></Field>
      </div>

      <Field label="Products (comma-separated)" htmlFor="farmer-products"><TextInput id="farmer-products" value={draft.products} onChange={(e) => set("products", e.target.value)} /></Field>
      <Field label="Tags (comma-separated)" htmlFor="farmer-tags" hint="Vegetable, Fruit, Herbs, Organic, Seasonal"><TextInput id="farmer-tags" value={draft.tags} onChange={(e) => set("tags", e.target.value)} /></Field>
      <Field label="Bio" htmlFor="farmer-bio"><TextArea id="farmer-bio" value={draft.bio} onChange={(e) => set("bio", e.target.value)} /></Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <ImagePicker label="Image" image={draft.image} onChange={(url) => set("image", url)} folder="farmers" id={draft.id} />
        <div className="grid content-start gap-4">
          <Field label="Sort order" htmlFor="farmer-sort" hint="Lower numbers appear first.">
            <TextInput id="farmer-sort" type="number" value={String(draft.sort_order)} onChange={(e) => set("sort_order", Number(e.target.value))} />
          </Field>
          <Checkbox checked={draft.verified} onChange={(next) => set("verified", next)} label="Verified partner" />
          <Checkbox checked={draft.published} onChange={(next) => set("published", next)} label="Published (visible on the site)" />
        </div>
      </div>

      {error ? <p className="rounded-wobbly-md border-2 border-dashed border-brand-orange bg-brand-orange/10 px-3 py-2 text-sm font-semibold text-brand-black" role="alert">{error}</p> : null}

      <div className="flex flex-wrap items-center gap-3">
        <button className={btnPrimarySm} type="submit" disabled={busy}>{busy ? "Saving..." : "Save farmer"}</button>
        <button className={btnOutlineSm} type="button" onClick={onCancel} disabled={busy}>Cancel</button>
      </div>
    </form>
  );
}
