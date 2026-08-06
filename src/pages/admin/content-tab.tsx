import { useEffect, useMemo, useState } from "react";
import { deleteContentBlock, getContentBlock, listContentBlocks, upsertContentBlock, type ContentBlockSummary } from "../../admin/admin-api";
import { slugify } from "../../admin/admin-api";
import { btnOutlineSm, btnPrimarySm } from "../../components/ui/styles";
import { Field, TextInput } from "./admin-fields";
import { textAreaClasses } from "./admin-fields";

type EditingBlock = { key: string; json: string };

export function ContentTab() {
  const [blocks, setBlocks] = useState<ContentBlockSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [editing, setEditing] = useState<EditingBlock | null>(null);
  const [creating, setCreating] = useState(false);
  const [busy, setBusy] = useState(false);
  const [newKey, setNewKey] = useState("");

  const keySet = useMemo(() => new Set((blocks ?? []).map((block) => block.key)), [blocks]);

  async function load() {
    setBlocks(null);
    setError(null);
    try {
      setBlocks(await listContentBlocks());
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Could not load content blocks.");
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function handleAdd() {
    setStatus(null);
    setError(null);
    const key = slugify(newKey);
    if (!key) {
      setError("Enter a block key first.");
      return;
    }
    if (keySet.has(key)) {
      setError(`A block named "${key}" already exists.`);
      return;
    }
    setBusy(true);
    try {
      setEditing({ key, json: "{}" });
      setCreating(true);
      setNewKey("");
    } finally {
      setBusy(false);
    }
  }

  async function handleEdit(block: ContentBlockSummary) {
    setStatus(null);
    setError(null);
    setBusy(true);
    try {
      const value = await getContentBlock(block.key);
      setEditing({ key: block.key, json: JSON.stringify(value, null, 2) });
      setCreating(false);
    } catch (editError) {
      setError(editError instanceof Error ? editError.message : "Could not load the block.");
    } finally {
      setBusy(false);
    }
  }

  async function handleSave() {
    if (!editing) return;
    setError(null);
    let value: Record<string, unknown>;
    try {
      value = JSON.parse(editing.json) as Record<string, unknown>;
    } catch {
      setError("The JSON is not valid. Fix it before saving.");
      return;
    }
    setBusy(true);
    try {
      await upsertContentBlock(editing.key, value);
      const next = await listContentBlocks();
      setBlocks(next);
      setStatus(creating ? `Created block "${editing.key}".` : `Saved block "${editing.key}".`);
      setEditing(null);
      setCreating(false);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Could not save the block.");
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete(block: ContentBlockSummary) {
    if (!window.confirm(`Delete the "${block.key}" block?`)) return;
    setStatus(null);
    try {
      await deleteContentBlock(block.key);
      setBlocks((current) => (current ?? []).filter((item) => item.key !== block.key));
      setStatus(`Deleted block "${block.key}".`);
    } catch (deleteError) {
      setStatus(deleteError instanceof Error ? deleteError.message : "Could not delete the block.");
    }
  }

  if (editing) {
    return (
      <div className="grid gap-5 rounded-wobbly-card border-3 border-brand-forest bg-brand-warm-white p-5 shadow-brand">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-primary text-2xl font-bold text-brand-green-ink">{creating ? "New block" : `Edit block`}</h2>
          <span className="rounded-full border-2 border-brand-forest bg-brand-white px-3 py-1 text-xs font-bold text-brand-black">{editing.key}</span>
        </div>

        <Field label="Block JSON" htmlFor="block-json" hint="This JSON replaces the landing-copy block with the same key. The public site falls back to its built-in copy if a key is missing.">
          <textarea id="block-json" className={`${textAreaClasses} min-h-80 font-mono text-sm`} spellCheck={false} value={editing.json} onChange={(e) => setEditing({ ...editing, json: e.target.value })} />
        </Field>

        {error ? <p className="rounded-wobbly-md border-2 border-dashed border-brand-orange bg-brand-orange/10 px-3 py-2 text-sm font-semibold text-brand-black" role="alert">{error}</p> : null}

        <div className="flex flex-wrap items-center gap-3">
          <button className={btnPrimarySm} type="button" onClick={() => void handleSave()} disabled={busy}>{busy ? "Saving..." : "Save block"}</button>
          <button className={btnOutlineSm} type="button" onClick={() => { setEditing(null); setCreating(false); }} disabled={busy}>Cancel</button>
        </div>
      </div>
    );
  }

  return (
    <div className="grid gap-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="grid gap-1">
          <h1 className="font-primary text-[clamp(1.7rem,3.5vw,2.4rem)] font-bold leading-[1.02] text-brand-green-ink">Content blocks</h1>
          <p className="text-sm text-brand-black/68">{blocks ? `${blocks.length} block${blocks.length === 1 ? "" : "s"}` : "Loading content blocks..."}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button className={btnOutlineSm} type="button" onClick={() => void load()} disabled={!blocks}>Refresh</button>
        </div>
      </div>

      <form className="grid gap-3 rounded-wobbly-card border-3 border-dashed border-brand-forest/40 bg-brand-white p-4 sm:grid-cols-[minmax(0,1fr)_auto]" onSubmit={(e) => { e.preventDefault(); void handleAdd(); }}>
        <TextInput aria-label="New block key" placeholder="New block key, e.g. hero" value={newKey} onChange={(e) => setNewKey(e.target.value)} />
        <button className={btnPrimarySm} type="submit" disabled={busy}>Add block</button>
      </form>

      {error ? (
        <div className="grid gap-3 rounded-wobbly-card border-3 border-dashed border-brand-orange bg-brand-orange/10 p-5">
          <p className="text-sm font-semibold text-brand-black" role="alert">{error}</p>
          <div><button className={btnOutlineSm} type="button" onClick={() => void load()}>Try again</button></div>
        </div>
      ) : null}

      {status ? <p className="text-sm font-semibold text-brand-green-ink" role="status">{status}</p> : null}

      {blocks ? (
        blocks.length === 0 ? (
          <p className="rounded-wobbly-card border-3 border-dashed border-brand-forest/30 bg-brand-white p-6 text-center text-sm font-semibold text-brand-black/64">No content blocks yet. Add the first one.</p>
        ) : (
          <ul className="grid gap-3">
            {blocks.map((block) => (
              <li key={block.key} className="flex flex-wrap items-center justify-between gap-3 rounded-wobbly-card border-3 border-brand-forest bg-brand-white p-4 shadow-brand-soft">
                <div className="grid gap-1">
                  <span className="font-bold text-brand-green-ink">{block.key}</span>
                  <span className="text-xs text-brand-black/52">{block.updated_at ? new Date(block.updated_at).toLocaleString() : "Not updated yet"}</span>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <button className={btnOutlineSm} type="button" onClick={() => void handleEdit(block)} disabled={busy}>Edit</button>
                  <button className="min-h-9 touch-manipulation rounded-full border-2 border-brand-orange-ink px-3 py-1 text-xs font-bold text-brand-black hover:bg-brand-orange focus-visible:outline focus-visible:outline-3 focus-visible:outline-dashed focus-visible:outline-brand-green-ink focus-visible:outline-offset-2" type="button" onClick={() => void handleDelete(block)}>Delete</button>
                </div>
              </li>
            ))}
          </ul>
        )
      ) : null}
    </div>
  );
}
