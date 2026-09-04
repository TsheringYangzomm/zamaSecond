import { useEffect, useMemo, useState } from "react";
import { GripVertical } from "lucide-react";
import {
  deleteFarmer,
  deleteFarmerDocument,
  farmerDocumentsTableExists,
  farmerPrivateInfoTableExists,
  farmerSeasonalUpdatesTableExists,
  farmerStoriesTableExists,
  listFarmerDocuments,
  listFarmerPrivateInfo,
  listFarmerSeasonalUpdates,
  listFarmerStories,
  listFarmers,
  listProducts,
  nextSlugId,
  reorderRows,
  upsertFarmer,
  upsertFarmerDocument,
  upsertFarmerPrivateInfo,
  upsertFarmerSeasonalUpdate,
  upsertFarmerStory,
} from "../../admin/admin-api";
import { btnOutlineSm, btnPrimarySm } from "../../components/ui/styles";
import { ConfirmDialog } from "../../components/ui/confirm-dialog";
import { inputClasses } from "./admin-fields";
import { ClearFiltersButton, ColumnFilterDropdown } from "./column-filter-dropdown";
import type { FarmerDocumentRow, FarmerPrivateInfoRow, FarmerRow, FarmerSeasonalUpdateRow, FarmerStoryRow, ProductRow } from "../../cms/types";
import { blankFarmer, blankFarmerPrivateInfo, blankFarmerSeasonalUpdate, blankFarmerStory, FarmerForm } from "./farmer-form";
import { FarmerDetail } from "./farmer-detail";
import { useRowDragSort } from "./use-row-drag";

export function FarmersTab() {
  const [farmers, setFarmers] = useState<FarmerRow[] | null>(null);
  const [products, setProducts] = useState<ProductRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [editing, setEditing] = useState<FarmerRow | null>(null);
  const [selected, setSelected] = useState<FarmerRow | null>(null);
  const [creating, setCreating] = useState(false);
  const [busy, setBusy] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<FarmerRow | null>(null);
  const [query, setQuery] = useState("");
  const [filters, setFilters] = useState({ location: "", status: "", product: "" });
  const [privateEnabled, setPrivateEnabled] = useState(false);
  const [privateMap, setPrivateMap] = useState<Record<string, FarmerPrivateInfoRow>>({});
  const [privateInfo, setPrivateInfo] = useState<FarmerPrivateInfoRow | null>(null);
  const [storyEnabled, setStoryEnabled] = useState(false);
  const [storyMap, setStoryMap] = useState<Record<string, FarmerStoryRow>>({});
  const [storyInfo, setStoryInfo] = useState<FarmerStoryRow | null>(null);
  const [seasonalEnabled, setSeasonalEnabled] = useState(false);
  const [seasonalMap, setSeasonalMap] = useState<Record<string, FarmerSeasonalUpdateRow>>({});
  const [seasonalInfo, setSeasonalInfo] = useState<FarmerSeasonalUpdateRow | null>(null);
  const [docsEnabled, setDocsEnabled] = useState(false);
  const [docsList, setDocsList] = useState<FarmerDocumentRow[]>([]);

  const dzongkhags = useMemo(() => {
    const set = new Set((farmers ?? []).map((row) => row.dzongkhag).filter(Boolean));
    return [...set].sort();
  }, [farmers]);

  const productName = useMemo(() => {
    const map = new Map(products.map((product) => [product.id, product.name]));
    return (productId: string) => map.get(productId) ?? productId;
  }, [products]);

  const filtered = useMemo(() => {
    if (!farmers) return [];
    const needle = query.trim().toLowerCase();
    return farmers.filter((row) => {
      if (filters.location && row.dzongkhag !== filters.location) return false;
      if (filters.status && (row.published ? "Active" : "Inactive") !== filters.status) return false;
      if (filters.product && !row.products.some((id) => productName(id) === filters.product)) return false;
      if (!needle) return true;
      return (
        row.name.toLowerCase().includes(needle) ||
        row.location.toLowerCase().includes(needle) ||
        row.dzongkhag.toLowerCase().includes(needle) ||
        row.products.some((id) => productName(id).toLowerCase().includes(needle))
      );
    });
  }, [farmers, query, filters, productName]);

  const activeFilterCount = (["location", "status", "product"] as const).filter((key) => filters[key] !== "").length;

  const reorderEnabled = farmers !== null && query === "" && activeFilterCount === 0;

  async function load() {
    setFarmers(null);
    setError(null);
    try {
      const [farmerRows, productRows] = await Promise.all([listFarmers(), listProducts()]);
      setFarmers(farmerRows);
      setProducts(productRows);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Could not load farmers.");
    }
    try {
      const enabled = await farmerPrivateInfoTableExists();
      setPrivateEnabled(enabled);
      if (enabled) {
        const rows = await listFarmerPrivateInfo();
        setPrivateMap(Object.fromEntries(rows.map((row) => [row.farmer_id, row])));
      }
    } catch {
      setPrivateEnabled(false);
      setPrivateMap({});
    }
    try {
      const enabled = await farmerStoriesTableExists();
      setStoryEnabled(enabled);
      if (enabled) {
        const rows = await listFarmerStories();
        setStoryMap(Object.fromEntries(rows.map((row) => [row.farmer_id, row])));
      }
    } catch {
      setStoryEnabled(false);
      setStoryMap({});
    }
    try {
      const enabled = await farmerSeasonalUpdatesTableExists();
      setSeasonalEnabled(enabled);
      if (enabled) {
        const rows = await listFarmerSeasonalUpdates();
        const latest: Record<string, FarmerSeasonalUpdateRow> = {};
        for (const row of rows) {
          if (!latest[row.farmer_id]) latest[row.farmer_id] = row;
        }
        setSeasonalMap(latest);
      }
    } catch {
      setSeasonalEnabled(false);
      setSeasonalMap({});
    }
    try {
      const enabled = await farmerDocumentsTableExists();
      setDocsEnabled(enabled);
      if (enabled) {
        const rows = await listFarmerDocuments();
        setDocsList(rows);
      }
    } catch {
      setDocsEnabled(false);
      setDocsList([]);
    }
    setSelected((current) => {
      if (!current) return current;
      const latest = farmerRows?.find((row) => row.id === current.id);
      return latest ?? current;
    });
  }

  useEffect(() => {
    void load();
  }, []);

  async function handleAdd() {
    setStatus(null);
    setError(null);
    setBusy(true);
    try {
      const id = await nextSlugId("New farmer", "farmers");
      const maxSort = (farmers ?? []).reduce((max, item) => Math.max(max, item.sort_order), -1);
      setEditing({ ...blankFarmer(id), sort_order: maxSort + 1 });
      setPrivateInfo(blankFarmerPrivateInfo(id));
      setStoryInfo(blankFarmerStory(id));
      setSeasonalInfo(blankFarmerSeasonalUpdate(id));
      setCreating(true);
    } catch (addError) {
      setError(addError instanceof Error ? addError.message : "Could not start a new farmer.");
    } finally {
      setBusy(false);
    }
  }

  async function handleSave(row: FarmerRow, privateRow: FarmerPrivateInfoRow | null, storyRow: FarmerStoryRow | null, seasonalRow: FarmerSeasonalUpdateRow | null) {
    await upsertFarmer(row);
    if (privateEnabled && privateRow) {
      await upsertFarmerPrivateInfo(privateRow);
      setPrivateMap((current) => ({ ...current, [privateRow.farmer_id]: privateRow }));
    }
    if (storyEnabled && storyRow && (storyMap[row.id] || storyRow.content.trim() !== "" || storyRow.published)) {
      await upsertFarmerStory(storyRow);
      setStoryMap((current) => ({ ...current, [storyRow.farmer_id]: storyRow }));
    }
    if (seasonalEnabled && seasonalRow && (seasonalMap[row.id] || seasonalRow.content.trim() !== "" || seasonalRow.published)) {
      await upsertFarmerSeasonalUpdate(seasonalRow);
      setSeasonalMap((current) => ({ ...current, [seasonalRow.farmer_id]: seasonalRow }));
    }
    const next = await listFarmers();
    setFarmers(next);
    setStatus(creating ? `Created ${row.name}.` : `Saved ${row.name}.`);
    setEditing(null);
    setCreating(false);
    setPrivateInfo(null);
    setStoryInfo(null);
    setSeasonalInfo(null);
  }

  async function handleDelete(row: FarmerRow) {
    setStatus(null);
    try {
      await deleteFarmer(row.id);
      setFarmers((current) => (current ?? []).filter((item) => item.id !== row.id));
      setPrivateMap((current) => {
        const next = { ...current };
        delete next[row.id];
        return next;
      });
      setStoryMap((current) => {
        const next = { ...current };
        delete next[row.id];
        return next;
      });
      setSeasonalMap((current) => {
        const next = { ...current };
        delete next[row.id];
        return next;
      });
      setStatus(`Deleted ${row.name}.`);
    } catch (deleteError) {
      setStatus(deleteError instanceof Error ? deleteError.message : "Could not delete the farmer.");
    } finally {
      setPendingDelete(null);
    }
  }

  async function handleToggleActive(row: FarmerRow) {
    setStatus(null);
    try {
      await upsertFarmer({ ...row, published: !row.published });
      setFarmers((current) => (current ?? []).map((item) => (item.id === row.id ? { ...item, published: !row.published } : item)));
      setSelected((current) => (current && current.id === row.id ? { ...current, published: !row.published } : current));
      setStatus(row.published ? `${row.name} is no longer active (hidden from the site, records kept).` : `${row.name} is now active.`);
    } catch (toggleError) {
      setStatus(toggleError instanceof Error ? toggleError.message : "Could not change the farmer status.");
    }
  }

  async function handleSaveDocuments(adds: FarmerDocumentRow[], deletes: FarmerDocumentRow[]) {
    if (!selected) return;
    const saved: FarmerDocumentRow[] = [];
    for (const doc of adds) {
      saved.push(await upsertFarmerDocument(doc));
    }
    for (const doc of deletes) {
      await deleteFarmerDocument(doc.id);
    }
    setDocsList((current) => {
      const deletesIds = new Set(deletes.map((doc) => doc.id));
      return [...saved, ...current.filter((doc) => !deletesIds.has(doc.id))];
    });
    setStatus(`Saved document changes for ${selected.name}.`);
  }

  async function handleToggleSelectedActive() {
    if (!selected) return;
    await handleToggleActive(selected);
  }

  async function handleReorder(orderedIds: string[]) {
    setStatus(null);
    if (!farmers) return;
    const byId = new Map(farmers.map((row) => [row.id, row]));
    const next = orderedIds
      .map((id, index) => {
        const row = byId.get(id);
        return row ? { ...row, sort_order: index } : undefined;
      })
      .filter((row): row is FarmerRow => row !== undefined);
    setFarmers(next);
    try {
      await reorderRows("farmers", orderedIds);
    } catch (reorderError) {
      setStatus(reorderError instanceof Error ? reorderError.message : "Could not reorder farmers.");
      await load();
    }
  }

  const { rowProps } = useRowDragSort(filtered, (orderedIds) => void handleReorder(orderedIds));

  if (selected) {
    return (
      <FarmerDetail
        farmer={selected}
        privateInfo={privateMap[selected.id] ?? null}
        storyInfo={storyMap[selected.id] ?? null}
        seasonalInfo={seasonalMap[selected.id] ?? null}
        documentsEnabled={docsEnabled}
        documents={docsList.filter((doc) => doc.farmer_id === selected.id)}
        productName={productName}
        onEdit={() => {
          const row = selected;
          setSelected(null);
          setCreating(false);
          setEditing(row);
          setPrivateInfo(privateMap[row.id] ?? blankFarmerPrivateInfo(row.id));
          setStoryInfo(storyMap[row.id] ?? blankFarmerStory(row.id));
          setSeasonalInfo(seasonalMap[row.id] ?? blankFarmerSeasonalUpdate(row.id));
        }}
        onBack={() => setSelected(null)}
        onToggleActive={() => void handleToggleSelectedActive()}
        onSaveChanges={(adds, deletes) => handleSaveDocuments(adds, deletes)}
      />
    );
  }

  if (editing) {
    return (
      <div className="grid gap-4">
        <FarmerForm
          initial={editing}
          privateInfo={privateInfo}
          storyInfo={storyInfo}
          seasonalInfo={seasonalInfo}
          privateEnabled={privateEnabled}
          storyEnabled={storyEnabled}
          seasonalEnabled={seasonalEnabled}
          onSave={handleSave}
          onCancel={() => { setEditing(null); setCreating(false); setPrivateInfo(null); setStoryInfo(null); setSeasonalInfo(null); }}
        />
      </div>
    );
  }

  return (
    <div className="grid gap-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="grid gap-1">
          <h1 className="font-primary text-[clamp(1.7rem,3.5vw,2.4rem)] font-bold leading-[1.02] text-brand-green-ink">Farmers</h1>
          <p className="text-sm text-brand-black/68">{farmers ? `${farmers.length} farmer${farmers.length === 1 ? "" : "s"}` : "Loading farmers..."}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button className={btnOutlineSm} type="button" onClick={() => void load()} disabled={!farmers}>Refresh</button>
          <button className={btnPrimarySm} type="button" onClick={() => void handleAdd()} disabled={busy}>Add farmer</button>
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
        <input className={`${inputClasses} min-w-0`} type="search" aria-label="Search farmers" placeholder="Search by name, location, or product..." value={query} onChange={(event) => setQuery(event.target.value)} />
        <div className="flex flex-wrap items-center gap-2">
          <ColumnFilterDropdown label="Location" options={dzongkhags} value={filters.location} onSelect={(v) => setFilters((f) => ({ ...f, location: v }))} allLabel="All locations" />
          <ColumnFilterDropdown label="Status" options={["Active", "Inactive"]} value={filters.status} onSelect={(v) => setFilters((f) => ({ ...f, status: v }))} />
          <ColumnFilterDropdown label="Products" options={products.map((p) => p.name).filter(Boolean).sort() as string[]} value={filters.product} onSelect={(v) => setFilters((f) => ({ ...f, product: v }))} />
          <ClearFiltersButton count={activeFilterCount} onClear={() => setFilters({ location: "", status: "", product: "" })} />
        </div>
      </div>

      {farmers ? (
        farmers.length === 0 ? (
          <p className="rounded-wobbly-card border-3 border-dashed border-brand-forest/30 bg-brand-white p-6 text-center text-sm font-semibold text-brand-black/64">No farmers yet. Add the first one.</p>
        ) : filtered.length === 0 ? (
          <p className="rounded-wobbly-card border-3 border-dashed border-brand-forest/30 bg-brand-white p-6 text-center text-sm font-semibold text-brand-black/64">No farmers match the current search or filter.</p>
        ) : (
          <div className="overflow-x-auto rounded-wobbly-card border-3 border-brand-forest bg-brand-white shadow-brand-soft">
            <table className="w-full min-w-190 border-collapse text-left">
              <caption className="sr-only">Farmers</caption>
              <thead>
                <tr className="border-b-3 border-dashed border-brand-forest/30 bg-brand-warm-white text-xs font-bold uppercase tracking-[0.08em] text-brand-green-ink">
                  <th className="w-12 px-2 py-3 text-center">
                    <span className="sr-only">Reorder</span>
                  </th>
                  <th className="px-4 py-3">Farmer</th>
                  <th className="px-4 py-3">Dzongkhag</th>
                  <th className="px-4 py-3">Products supplied</th>
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
                        <div className="grid gap-0.5">
                          <span className="font-bold text-brand-black">{row.name}</span>
                          <span className="text-xs text-brand-black/52">{row.location || row.id}</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-brand-black/72">{row.dzongkhag}</td>
                    <td className="px-4 py-3 text-brand-black/72">
                      {row.products.length === 0 ? <span className="text-brand-black/52">None</span> : (
                        <span className="line-clamp-2">{row.products.map((id) => productName(id)).join(", ")}</span>
                      )}
                    </td>
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
                        <button className="min-h-9 touch-manipulation rounded-full border-2 border-brand-forest px-3 py-1 text-xs font-bold text-brand-forest hover:bg-brand-yellow focus-visible:outline focus-visible:outline-3 focus-visible:outline-dashed focus-visible:outline-brand-green-ink focus-visible:outline-offset-2" type="button" onClick={() => setSelected(row)}>View</button>
                        <button className="min-h-9 touch-manipulation rounded-full border-2 border-brand-forest px-3 py-1 text-xs font-bold text-brand-forest hover:bg-brand-yellow focus-visible:outline focus-visible:outline-3 focus-visible:outline-dashed focus-visible:outline-brand-green-ink focus-visible:outline-offset-2" type="button" onClick={() => { setCreating(false); setEditing(row); setPrivateInfo(privateMap[row.id] ?? blankFarmerPrivateInfo(row.id)); setStoryInfo(storyMap[row.id] ?? blankFarmerStory(row.id)); setSeasonalInfo(seasonalMap[row.id] ?? blankFarmerSeasonalUpdate(row.id)); }}>Edit</button>
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
        title="Delete farmer"
        message={pendingDelete ? `Delete "${pendingDelete.name}"?` : ""}
        onConfirm={() => { if (pendingDelete) void handleDelete(pendingDelete); }}
        onCancel={() => setPendingDelete(null)}
      />
    </div>
  );
}
