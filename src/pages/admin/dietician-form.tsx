import { useState, type FormEvent } from "react";
import { btnOutlineSm, btnPrimarySm } from "../../components/ui/styles";
import type { DieticianRow } from "../../cms/types";
import { Checkbox, Field, ImagePicker, TextArea, TextInput } from "./admin-fields";

export function blankDietician(id: string): DieticianRow {
  return {
    id,
    name: "",
    title: "",
    image: "",
    bio: "",
    qualifications: "",
    consultant_note: "",
    dietician_note: "",
    sort_order: 0,
    published: true,
  };
}

type DieticianDraft = Omit<
  DieticianRow,
  "sort_order"
> & {
  sort_order: string;
};

function toDraft(row: DieticianRow): DieticianDraft {
  return {
    ...row,
    sort_order: String(row.sort_order),
  };
}

function fromDraft(draft: DieticianDraft): DieticianRow {
  const sort = Number(draft.sort_order.trim());
  return {
    ...draft,
    sort_order: Number.isNaN(sort) ? 0 : sort,
  };
}

export function DieticianForm({
  initial,
  onSave,
  onCancel,
}: {
  initial: DieticianRow;
  onSave: (row: DieticianRow) => Promise<void> | void;
  onCancel: () => void;
}) {
  const [draft, setDraft] = useState<DieticianDraft>(() => toDraft(initial));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function set<K extends keyof DieticianDraft>(key: K, value: DieticianDraft[K]) {
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
      setError(saveError instanceof Error ? saveError.message : "Could not save the dietician.");
      setBusy(false);
    }
  }

  return (
    <form className="grid gap-5 rounded-wobbly-card border-3 border-brand-forest bg-brand-warm-white p-5 shadow-brand" onSubmit={handleSubmit} aria-label="Dietician form">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-primary text-2xl font-bold text-brand-green-ink">{initial.name ? `Edit ${initial.name}` : "New dietician"}</h2>
        <span className="rounded-full border-2 border-brand-forest bg-brand-white px-3 py-1 text-xs font-bold text-brand-black">{initial.id}</span>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={<>Name <span className="text-brand-orange">*</span></>} htmlFor="dietician-name"><TextInput id="dietician-name" required value={draft.name} onChange={(e) => set("name", e.target.value)} /></Field>
        <Field label="Title" htmlFor="dietician-title" hint="e.g. Registered Dietician"><TextInput id="dietician-title" value={draft.title} onChange={(e) => set("title", e.target.value)} /></Field>
      </div>

      <ImagePicker label="Photo" image={draft.image} onChange={(url) => set("image", url)} folder="dieticians" id={draft.id} />

      <Field label="Bio" htmlFor="dietician-bio"><TextArea id="dietician-bio" rows={4} value={draft.bio} onChange={(e) => set("bio", e.target.value)} /></Field>

      <Field label="Study / qualifications" htmlFor="dietician-qualifications" hint="One per line, e.g. MSc Nutrition &amp; Dietetics"><TextArea id="dietician-qualifications" rows={5} value={draft.qualifications} onChange={(e) => set("qualifications", e.target.value)} /></Field>

      <Field label="Consultant note" htmlFor="dietician-consultant" hint="Reviewed by a nutrition consultant, e.g. the macronutrient profile. Shown on the meal-kit trust page under this dietician.">
        <TextArea id="dietician-consultant" rows={4} value={draft.consultant_note} onChange={(e) => set("consultant_note", e.target.value)} />
      </Field>

      <Field label="Dietician note" htmlFor="dietician-note" hint="Reviewed by this dietician, e.g. portion sizes and energy guidance. Shown on the meal-kit trust page under this dietician.">
        <TextArea id="dietician-note" rows={4} value={draft.dietician_note} onChange={(e) => set("dietician_note", e.target.value)} />
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Sort order" htmlFor="dietician-sort" hint="Lower numbers appear first.">
          <TextInput id="dietician-sort" type="number" value={draft.sort_order} onChange={(e) => set("sort_order", e.target.value)} />
        </Field>
        <div className="grid content-start gap-4">
          <Checkbox checked={draft.published} onChange={(next) => set("published", next)} label="Active (visible on the site). Inactive dieticians are hidden from the site." />
        </div>
      </div>

      {error ? <p className="rounded-wobbly-md border-2 border-dashed border-brand-orange bg-brand-orange/10 px-3 py-2 text-sm font-semibold text-brand-black" role="alert">{error}</p> : null}

      <div className="flex flex-wrap items-center gap-3">
        <button className={btnPrimarySm} type="submit" disabled={busy}>{busy ? "Saving..." : "Save dietician"}</button>
        <button className={btnOutlineSm} type="button" onClick={onCancel} disabled={busy}>Cancel</button>
      </div>
    </form>
  );
}
