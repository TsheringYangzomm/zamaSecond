import { useEffect, useMemo, useState } from "react";
import { GripVertical } from "lucide-react";
import { deleteDietician, listDieticians, nextSlugId, reorderRows, upsertDietician } from "../../admin/admin-api";
import { btnOutlineSm, btnPrimarySm } from "../../components/ui/styles";
import { ConfirmDialog } from "../../components/ui/confirm-dialog";
import { inputClasses } from "./admin-fields";
import { ClearFiltersButton, ColumnFilterDropdown } from "./column-filter-dropdown";
import type { DieticianRow } from "../../cms/types";
import { blankDietician, DieticianForm } from "./dietician-form";
import { useRowDragSort } from "./use-row-drag";

export function DieticiansTab() {
  const [dieticians, setDieticians] = useState<DieticianRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [editing, setEditing] = useState<DieticianRow | null>(null);
  const [creating, setCreating] = useState(false);
  const [busy, setBusy] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<DieticianRow | null>(null);
  const [query, setQuery] = useState("");
  const [filters, setFilters] = useState<{ status: string }>({ status: "" });

  const activeFilterCount = filters.status !== "" ? 1 : 0;

  const filtered = useMemo(() => {
    if (!dieticians) return [];
    const needle = query.trim().toLowerCase();
    return dieticians.filter((row) => {
      if (filters.status && (row.published ? "Active" : "Inactive") !== filters.status) return false;
      if (!needle) return true;
      return (
        row.name.toLowerCase().includes(needle) ||
        row.title.toLowerCase().includes(needle) ||
        row.bio.toLowerCase().includes(needle)
      );
    });
  }, [dieticians, query, filters]);

  const reorderEnabled = dieticians !== null && query === "" && activeFilterCount === 0;

  async function load() {
    setDieticians(null);
    setError(null);
    try {
      setDieticians(await listDieticians());
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Could not load dieticians.");
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
      const id = await nextSlugId("New dietician", "dieticians");
      const maxSort = (dieticians ?? []).reduce((max, item) => Math.max(max, item.sort_order), -1);
      setEditing({ ...blankDietician(id), sort_order: maxSort + 1 });
      setCreating(true);
    } catch (addError) {
      setError(addError instanceof Error ? addError.message : "Could not start a new dietician.");
    } finally {
      setBusy(false);
    }
  }

  async function handleSave(row: DieticianRow) {
    await upsertDietician(row);
    const next = await listDieticians();
    setDieticians(next);
    setStatus(creating ? `Created ${row.name}.` : `Saved ${row.name}.`);
    setEditing(null);
    setCreating(false);
  }

  async function handleDelete(row: DieticianRow) {
    setStatus(null);
    try {
      await deleteDietician(row.id);
      setDieticians((current) => (current ?? []).filter((item) => item.id !== row.id));
      setStatus(`Deleted ${row.name}.`);
    } catch (deleteError) {
      setStatus(deleteError instanceof Error ? deleteError.message : "Could not delete the dietician.");
    } finally {
      setPendingDelete(null);
    }
  }

  async function handleToggleActive(row: DieticianRow) {
    setStatus(null);
    try {
      await upsertDietician({ ...row, published: !row.published });
      setDieticians((current) => (current ?? []).map((item) => (item.id === row.id ? { ...item, published: !row.published } : item)));
      setStatus(row.published ? `${row.name} is no longer active (hidden from the site, records kept).` : `${row.name} is now active.`);
    } catch (toggleError) {
      setStatus(toggleError instanceof Error ? toggleError.message : "Could not change the dietician status.");
    }
  }

  async function handleReorder(orderedIds: string[]) {
    setStatus(null);
    if (!dieticians) return;
    const byId = new Map(dieticians.map((row) => [row.id, row]));
    const next = orderedIds
      .map((id, index) => {
        const row = byId.get(id);
        return row ? { ...row, sort_order: index } : undefined;
      })
      .filter((row): row is DieticianRow => row !== undefined);
    setDieticians(next);
    try {
      await reorderRows("dieticians", orderedIds);
    } catch (reorderError) {
      setStatus(reorderError instanceof Error ? reorderError.message : "Could not reorder dieticians.");
      await load();
    }
  }

  const { rowProps } = useRowDragSort(filtered, (orderedIds) => void handleReorder(orderedIds));

  if (editing) {
    return (
      <div className="grid gap-4">
        <DieticianForm
          initial={editing}
          onSave={handleSave}
          onCancel={() => { setEditing(null); setCreating(false); }}
        />
      </div>
    );
  }

  return (
    <div className="grid gap-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="grid gap-1">
          <h1 className="font-primary text-[clamp(1.7rem,3.5vw,2.4rem)] font-bold leading-[1.02] text-brand-green-ink">Dieticians</h1>
          <p className="text-sm text-brand-black/68">{dieticians ? `${dieticians.length} dietician${dieticians.length === 1 ? "" : "s"}` : "Loading dieticians..."}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button className={btnOutlineSm} type="button" onClick={() => void load()} disabled={!dieticians}>Refresh</button>
          <button className={btnPrimarySm} type="button" onClick={() => void handleAdd()} disabled={busy}>Add dietician</button>
        </div>
      </div>

      {error ? (
        <div className="grid gap-3 rounded-wobbly-card border-3 border-dashed border-brand-orange bg-brand-orange/10 p-5">
          <p className="text-sm font-semibold text-brand-black" role="alert">{error}</p>
          <div><button className={btnOutlineSm} type="button" onClick={() => void load()}>Try again</button></div>
        </div>
      ) : null}

      {status ? <p className="text-sm font-semibold text-brand-green-ink" role="status">{status}</p> : null}

      <div className="grid gap-3">
        <input className={`${inputClasses} min-w-0`} type="search" aria-label="Search dieticians" placeholder="Search by name, title, or bio..." value={query} onChange={(event) => setQuery(event.target.value)} />
        <div className="flex flex-wrap items-center gap-2">
          <ColumnFilterDropdown label="Status" options={["Active", "Inactive"]} value={filters.status} onSelect={(v) => setFilters((f) => ({ ...f, status: v }))} />
          <ClearFiltersButton count={activeFilterCount} onClear={() => setFilters({ status: "" })} />
        </div>
      </div>

      {dieticians ? (
        dieticians.length === 0 ? (
          <p className="rounded-wobbly-card border-3 border-dashed border-brand-forest/30 bg-brand-white p-6 text-center text-sm font-semibold text-brand-black/64">No dieticians yet. Add the first one.</p>
        ) : filtered.length === 0 ? (
          <p className="rounded-wobbly-card border-3 border-dashed border-brand-forest/30 bg-brand-white p-6 text-center text-sm font-semibold text-brand-black/64">No dieticians match the current search or filter.</p>
        ) : (
          <div className="overflow-x-auto rounded-wobbly-card border-3 border-brand-forest bg-brand-white shadow-brand-soft">
            <table className="w-full min-w-150 border-collapse text-left">
              <caption className="sr-only">Dieticians</caption>
              <thead>
                <tr className="border-b-3 border-dashed border-brand-forest/30 bg-brand-warm-white text-xs font-bold uppercase tracking-[0.08em] text-brand-green-ink">
                  <th className="w-12 px-2 py-3 text-center">
                    <span className="sr-only">Reorder</span>
                  </th>
                  <th className="px-4 py-3">Dietician</th>
                  <th className="px-4 py-3">Title</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((row) => {
                  const drag = rowProps(row);
                  return (
                    <tr
                      className={`border-b-2 border-dashed border-brand-forest/16 text-sm last:border-b-0 ${reorderEnabled ? "cursor-grab active:cursor-grabbing" : ""} ${drag.isDragging ? "opacity-40" : ""} ${drag.isDropTarget ? "bg-brand-yellow/30" : ""}`}
                      key={row.id}
                      draggable={reorderEnabled}
                      onDragStart={drag.onDragStart}
                      onDragOver={drag.onDragOver}
                      onDrop={drag.onDrop}
                      onDragEnd={drag.onDragEnd}
                    >
                      <td className="px-2 py-3 text-center">
                        <span className={`inline-flex items-center justify-center ${reorderEnabled ? "text-brand-black/40" : "text-brand-black/20"}`} title="Drag to reorder" aria-hidden="true">
                          <GripVertical className="h-4 w-4" />
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          {row.image ? <img className="h-11 w-11 flex-none rounded-full border-2 border-brand-forest/30 bg-brand-warm-white object-cover" src={row.image} alt="" aria-hidden="true" /> : null}
                          <span className="font-bold text-brand-black">{row.name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-brand-black/72">{row.title || <span className="text-brand-black/52">—</span>}</td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className={`rounded-full border-2 px-2 py-0.5 text-xs font-bold ${row.published ? "border-brand-forest bg-brand-mint text-brand-green-ink" : "border-brand-black/30 bg-brand-white text-brand-black/52"}`}>
                            {row.published ? "Active" : "Inactive"}
                          </span>
                          <button className="min-h-7 touch-manipulation rounded-full border-2 border-brand-forest/60 px-2 py-0.5 text-xs font-bold text-brand-forest hover:bg-brand-yellow focus-visible:outline focus-visible:outline-3 focus-visible:outline-dashed focus-visible:outline-brand-green-ink focus-visible:outline-offset-2" type="button" onClick={() => void handleToggleActive(row)}>{row.published ? "Set inactive" : "Activate"}</button>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1.5">
                          <button className="min-h-9 touch-manipulation rounded-full border-2 border-brand-forest px-3 py-1 text-xs font-bold text-brand-forest hover:bg-brand-yellow focus-visible:outline focus-visible:outline-3 focus-visible:outline-dashed focus-visible:outline-brand-green-ink focus-visible:outline-offset-2" type="button" onClick={() => { setCreating(false); setEditing(row); }}>Edit</button>
                          <button className="min-h-9 touch-manipulation rounded-full border-2 border-brand-orange-ink px-3 py-1 text-xs font-bold text-brand-black hover:bg-brand-orange focus-visible:outline focus-visible:outline-3 focus-visible:outline-dashed focus-visible:outline-brand-green-ink focus-visible:outline-offset-2" type="button" onClick={() => setPendingDelete(row)}>Delete</button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )
      ) : null}
      <ConfirmDialog
        open={pendingDelete !== null}
        title="Delete dietician"
        message={pendingDelete ? `Delete "${pendingDelete.name}"?` : ""}
        onConfirm={() => { if (pendingDelete) void handleDelete(pendingDelete); }}
        onCancel={() => setPendingDelete(null)}
      />
    </div>
  );
}
