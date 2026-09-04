import { useEffect, useMemo, useState } from "react";
import { listProducts, upsertProduct } from "../../admin/admin-api";
import { btnOutlineSm, btnPrimarySm } from "../../components/ui/styles";
import { Field, inputClasses, TextArea } from "./admin-fields";
import type { ProductRow } from "../../cms/types";

export function MealKitNotesTab() {
  const [mealKits, setMealKits] = useState<ProductRow[] | null>(null);
  const [selectedId, setSelectedId] = useState<string>("");
  const [consultantNote, setConsultantNote] = useState("");
  const [dieticianNote, setDieticianNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const selected = useMemo(
    () => (mealKits ?? []).find((row) => row.id === selectedId) ?? null,
    [mealKits, selectedId],
  );

  async function load() {
    setError(null);
    try {
      const rows = await listProducts();
      setMealKits(rows.filter((row) => row.category === "Meal kits"));
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Could not load meal kits.");
    }
  }

  useEffect(() => {
    void load();
  }, []);

  function handleSelect(id: string) {
    setSelectedId(id);
    setStatus(null);
    setError(null);
    const row = (mealKits ?? []).find((r) => r.id === id);
    setConsultantNote(row?.consultant_note ?? "");
    setDieticianNote(row?.dietician_note ?? "");
  }

  async function handleSave() {
    if (!selected) return;
    setStatus(null);
    setError(null);
    setBusy(true);
    try {
      await upsertProduct({ ...selected, consultant_note: consultantNote, dietician_note: dieticianNote });
      await load();
      setSelectedId(selected.id);
      setStatus(`Saved notes for ${selected.name}.`);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Could not save the notes.");
    } finally {
      setBusy(false);
    }
  }

  const selectable = mealKits ?? [];

  return (
    <div className="grid gap-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="grid gap-1">
          <h1 className="font-primary text-[clamp(1.7rem,3.5vw,2.4rem)] font-bold leading-[1.02] text-brand-green-ink">Meal Kit Notes</h1>
          <p className="text-sm text-brand-black/68">Choose a meal kit and write its Consultant and Dietician notes. These appear on the kit's Trust standards card.</p>
        </div>
        <button className={btnOutlineSm} type="button" onClick={() => void load()} disabled={!mealKits}>Refresh</button>
      </div>

      {error ? (
        <div className="grid gap-3 rounded-wobbly-card border-3 border-dashed border-brand-orange bg-brand-orange/10 p-5">
          <p className="text-sm font-semibold text-brand-black" role="alert">{error}</p>
          <div><button className={btnOutlineSm} type="button" onClick={() => void load()}>Try again</button></div>
        </div>
      ) : null}

      {mealKits ? (
        <div className="grid gap-4">
          <Field label="Select a meal kit" htmlFor="meal-kit-select">
            <select
              id="meal-kit-select"
              className={`${inputClasses} min-w-0`}
              value={selectedId}
              onChange={(event) => handleSelect(event.target.value)}
            >
              <option value="">Choose a meal kit...</option>
              {selectable.map((row) => (
                <option key={row.id} value={row.id}>{row.name}</option>
              ))}
            </select>
          </Field>

          {selected ? (
            <div className="grid gap-5 rounded-wobbly-card border-3 border-brand-forest bg-brand-warm-white p-5 shadow-brand">
              <div className="grid gap-1">
                <h2 className="font-primary text-2xl font-bold text-brand-green-ink">{selected.name}</h2>
                <span className="text-xs font-bold text-brand-black/52">{selected.id}</span>
              </div>

              <Field label="Consultant note" htmlFor="mk-consultant" hint="Reviewed by a nutrition consultant, e.g. the macronutrient profile. Shown on this meal kit's trust card.">
                <TextArea id="mk-consultant" rows={4} value={consultantNote} onChange={(e) => setConsultantNote(e.target.value)} />
              </Field>

              <Field label="Dietician note" htmlFor="mk-dietician" hint="Reviewed by a dietician, e.g. portion sizes and energy guidance. Shown on this meal kit's trust card.">
                <TextArea id="mk-dietician" rows={4} value={dieticianNote} onChange={(e) => setDieticianNote(e.target.value)} />
              </Field>

              {status ? <p className="text-sm font-semibold text-brand-green-ink" role="status">{status}</p> : null}

              <div className="flex flex-wrap items-center gap-3">
                <button className={btnPrimarySm} type="button" onClick={() => void handleSave()} disabled={busy}>{busy ? "Saving..." : "Save notes"}</button>
                <button className={btnOutlineSm} type="button" onClick={() => handleSelect(selected.id)} disabled={busy}>Discard changes</button>
              </div>
            </div>
          ) : (
            <p className="rounded-wobbly-card border-3 border-dashed border-brand-forest/30 bg-brand-white p-6 text-center text-sm font-semibold text-brand-black/64">
              {selectable.length === 0 ? "No meal kits yet. Add meal kit products in the Products tab first." : "Choose a meal kit above to add or edit its notes."}
            </p>
          )}
        </div>
      ) : (
        <p className="text-sm text-brand-black/68">Loading meal kits...</p>
      )}
    </div>
  );
}
