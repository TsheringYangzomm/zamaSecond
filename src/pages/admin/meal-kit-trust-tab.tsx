import { useEffect, useMemo, useState } from "react";
import { deleteMealKitTrustDetail, listMealKitTrustDetails, upsertMealKitTrustDetail } from "../../admin/admin-api";
import type { MealKitTrustDetailRow } from "../../cms/types";
import { btnOutlineSm } from "../../components/ui/styles";
import { ConfirmDialog } from "../../components/ui/confirm-dialog";
import { Field, TextInput, TextArea, Checkbox, ImagePicker, inputClasses, selectClasses, textAreaClasses } from "./admin-fields";

function emptyRow(): MealKitTrustDetailRow {
  return {
    slug: "",
    title: "",
    image: "",
    alt: "",
    consultant_note: "",
    dietician_note: "",
    health_benefits: [],
    allergens: [],
    sourcing: "",
    storage_advice: "",
    sort_order: 0,
    published: true,
  };
}

function toStringList(value: string[]): string {
  return value.join(", ");
}

function fromStringList(value: string): string[] {
  return value.split(",").map((s) => s.trim()).filter(Boolean);
}

function TrustForm({ initial, onSave, onCancel, busy }: {
  initial: MealKitTrustDetailRow;
  onSave: (row: MealKitTrustDetailRow) => void;
  onCancel: () => void;
  busy: boolean;
}) {
  const [row, setRow] = useState(initial);

  function update<K extends keyof MealKitTrustDetailRow>(key: K, value: MealKitTrustDetailRow[K]) {
    setRow((prev) => ({ ...prev, [key]: value }));
  }

  return (
    <form className="grid gap-5 rounded-wobbly-card border-3 border-brand-forest bg-brand-white p-5 shadow-brand sm:p-7" onSubmit={(e) => { e.preventDefault(); onSave(row); }}>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Title" htmlFor="trust-title">
          <TextInput id="trust-title" value={row.title} onChange={(e) => update("title", e.target.value)} required />
        </Field>
        <Field label="Slug" htmlFor="trust-slug" hint="URL-safe identifier, e.g. breakfast-kit">
          <TextInput id="trust-slug" value={row.slug} onChange={(e) => update("slug", e.target.value)} required disabled={!!initial.slug} />
        </Field>
      </div>

      <ImagePicker label="Image" image={row.image} onChange={(url) => update("image", url)} folder="products" id={row.slug || "new-trust"} />

      <Field label="Alt text" htmlFor="trust-alt">
        <TextInput id="trust-alt" value={row.alt} onChange={(e) => update("alt", e.target.value)} placeholder="Describe the image for accessibility" />
      </Field>

      <Field label="Consultant note" htmlFor="trust-consultant">
        <TextArea id="trust-consultant" value={row.consultant_note} onChange={(e) => update("consultant_note", e.target.value)} rows={4} />
      </Field>

      <Field label="Dietician note" htmlFor="trust-dietician">
        <TextArea id="trust-dietician" value={row.dietician_note} onChange={(e) => update("dietician_note", e.target.value)} rows={4} />
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Health benefits" htmlFor="trust-benefits" hint="Comma-separated list">
          <TextInput id="trust-benefits" value={toStringList(row.health_benefits)} onChange={(e) => update("health_benefits", fromStringList(e.target.value))} placeholder="Benefit 1, Benefit 2, ..." />
        </Field>
        <Field label="Allergens" htmlFor="trust-allergens" hint="Comma-separated list">
          <TextInput id="trust-allergens" value={toStringList(row.allergens)} onChange={(e) => update("allergens", fromStringList(e.target.value))} placeholder="Allergen 1, Allergen 2, ..." />
        </Field>
      </div>

      <Field label="Sourcing" htmlFor="trust-sourcing">
        <TextArea id="trust-sourcing" value={row.sourcing} onChange={(e) => update("sourcing", e.target.value)} rows={3} />
      </Field>

      <Field label="Storage advice" htmlFor="trust-storage">
        <TextArea id="trust-storage" value={row.storage_advice} onChange={(e) => update("storage_advice", e.target.value)} rows={3} />
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Sort order" htmlFor="trust-sort">
          <TextInput id="trust-sort" type="number" value={String(row.sort_order)} onChange={(e) => update("sort_order", Number(e.target.value))} />
        </Field>
        <Checkbox checked={row.published} onChange={(v) => update("published", v)} label="Published" />
      </div>

      <div className="flex flex-wrap gap-2">
        <button className={btnOutlineSm} type="submit" disabled={busy}>Save</button>
        <button className={btnOutlineSm} type="button" onClick={onCancel} disabled={busy}>Cancel</button>
      </div>
    </form>
  );
}

export function MealKitTrustTab() {
  const [rows, setRows] = useState<MealKitTrustDetailRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState<MealKitTrustDetailRow | null>(null);
  const [creating, setCreating] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<MealKitTrustDetailRow | null>(null);

  async function load() {
    setRows(null);
    setError(null);
    try {
      setRows(await listMealKitTrustDetails());
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Could not load meal kit trust details.");
    }
  }

  useEffect(() => { void load(); }, []);

  async function handleSave(row: MealKitTrustDetailRow) {
    setStatus(null);
    setBusy(true);
    try {
      await upsertMealKitTrustDetail(row);
      const updated = await listMealKitTrustDetails();
      setRows(updated);
      setEditing(null);
      setCreating(false);
      setStatus(`Saved "${row.title}".`);
    } catch (saveError) {
      setStatus(saveError instanceof Error ? saveError.message : "Could not save.");
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete(row: MealKitTrustDetailRow) {
    setStatus(null);
    try {
      await deleteMealKitTrustDetail(row.slug);
      setRows((current) => (current ?? []).filter((r) => r.slug !== row.slug));
      setStatus(`Deleted "${row.title}".`);
    } catch (deleteError) {
      setStatus(deleteError instanceof Error ? deleteError.message : "Could not delete.");
    } finally {
      setPendingDelete(null);
    }
  }

  const sorted = useMemo(() => (rows ?? []).slice().sort((a, b) => a.sort_order - b.sort_order), [rows]);

  return (
    <div className="grid gap-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="grid gap-1">
          <h1 className="font-primary text-[clamp(1.7rem,3.5vw,2.4rem)] font-bold leading-[1.02] text-brand-green-ink">Meal Kit Trust</h1>
          <p className="text-sm text-brand-black/68">{rows ? `${rows.length} detail${rows.length === 1 ? "" : "s"}` : "Loading..."}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button className={btnOutlineSm} type="button" onClick={() => { setEditing(null); setCreating(true); }}>Add new</button>
          <button className={btnOutlineSm} type="button" onClick={() => void load()} disabled={!rows}>Refresh</button>
        </div>
      </div>

      {error ? (
        <div className="grid gap-3 rounded-wobbly-card border-3 border-dashed border-brand-orange bg-brand-orange/10 p-5">
          <p className="text-sm font-semibold text-brand-black" role="alert">{error}</p>
          <div><button className={btnOutlineSm} type="button" onClick={() => void load()}>Try again</button></div>
        </div>
      ) : null}

      {status ? <p className="text-sm font-semibold text-brand-green-ink" role="status">{status}</p> : null}

      {creating ? (
        <TrustForm initial={emptyRow()} onSave={handleSave} onCancel={() => setCreating(false)} busy={busy} />
      ) : null}

      {editing ? (
        <TrustForm initial={editing} onSave={handleSave} onCancel={() => setEditing(null)} busy={busy} />
      ) : null}

      {rows ? (
        sorted.length === 0 ? (
          <p className="rounded-wobbly-card border-3 border-dashed border-brand-forest/30 bg-brand-white p-6 text-center text-sm font-semibold text-brand-black/64">No trust details yet. Add one to get started.</p>
        ) : (
          <div className="overflow-x-auto rounded-wobbly-card border-3 border-brand-forest bg-brand-white shadow-brand-soft">
            <table className="w-full min-w-160 border-collapse text-left">
              <caption className="sr-only">Meal Kit Trust Details</caption>
              <thead>
                <tr className="border-b-3 border-dashed border-brand-forest/30 bg-brand-warm-white text-xs font-bold uppercase tracking-[0.08em] text-brand-green-ink">
                  <th className="px-4 py-3">Title</th>
                  <th className="px-4 py-3">Slug</th>
                  <th className="px-4 py-3">Order</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3"><span className="sr-only">Actions</span></th>
                </tr>
              </thead>
              <tbody>
                {sorted.map((row) => (
                  <tr className="border-b-2 border-dashed border-brand-forest/16 text-sm last:border-b-0" key={row.slug}>
                    <td className="px-4 py-3 font-bold text-brand-black">{row.title}</td>
                    <td className="px-4 py-3 text-brand-black/72 font-mono text-xs">{row.slug}</td>
                    <td className="px-4 py-3 text-brand-black/72">{row.sort_order}</td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full border-2 px-2 py-0.5 text-xs font-bold ${row.published ? "border-brand-forest bg-brand-yellow text-brand-forest" : "border-brand-black/30 bg-brand-white text-brand-black/52"}`}>
                        {row.published ? "Published" : "Draft"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1.5">
                        <button className="min-h-9 touch-manipulation rounded-full border-2 border-brand-forest px-3 py-1 text-xs font-bold text-brand-forest hover:bg-brand-yellow focus-visible:outline focus-visible:outline-3 focus-visible:outline-dashed focus-visible:outline-brand-green-ink focus-visible:outline-offset-2" type="button" disabled={busy} onClick={() => { setCreating(false); setEditing(row); }}>Edit</button>
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
        title="Delete trust detail"
        message={pendingDelete ? `Delete "${pendingDelete.title}"?` : ""}
        onConfirm={() => { if (pendingDelete) void handleDelete(pendingDelete); }}
        onCancel={() => setPendingDelete(null)}
      />
    </div>
  );
}
