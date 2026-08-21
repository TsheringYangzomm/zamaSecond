import { useEffect, useMemo, useState } from "react";
import {
  deleteWaitlistEntry,
  downloadCsv,
  listWaitlist,
  waitlistToCsv,
  type WaitlistEntry,
} from "../../admin/admin-api";
import { btnOutlineSm } from "../../components/ui/styles";
import { ConfirmDialog } from "../../components/ui/confirm-dialog";
import { inputClasses, selectClasses } from "./admin-fields";
import { formatDate } from "./commerce-shared";

function itemSummary(entry: WaitlistEntry) {
  const items = (entry.items ?? []) as Array<{ quantity?: number }>;
  if (items.length === 0) return "—";
  const total = items.reduce((sum, item) => sum + (item.quantity ?? 0), 0);
  return `${items.length} item${items.length === 1 ? "" : "s"}${total ? ` (${total})` : ""}`;
}

export function WaitlistTab() {
  const [entries, setEntries] = useState<WaitlistEntry[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [sourceFilter, setSourceFilter] = useState("");
  const [areaFilter, setAreaFilter] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<WaitlistEntry | null>(null);

  const sources = useMemo(() => {
    const set = new Set((entries ?? []).map((entry) => entry.source).filter(Boolean));
    return [...set].sort();
  }, [entries]);

  const areas = useMemo(() => {
    const set = new Set((entries ?? []).map((entry) => entry.area).filter((area): area is string => Boolean(area)));
    return [...set].sort();
  }, [entries]);

  async function load() {
    setEntries(null);
    setError(null);
    try {
      setEntries(await listWaitlist());
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Could not load the waitlist.");
    }
  }

  useEffect(() => {
    void load();
  }, []);

  const filtered = useMemo(() => {
    if (!entries) return [];
    const q = query.trim().toLowerCase();
    return entries.filter((entry) => {
      if (sourceFilter && entry.source !== sourceFilter) return false;
      if (areaFilter && entry.area !== areaFilter) return false;
      if (!q) return true;
      return (
        entry.email.toLowerCase().includes(q) ||
        (entry.area ?? "").toLowerCase().includes(q) ||
        entry.source.toLowerCase().includes(q)
      );
    });
  }, [entries, query, sourceFilter, areaFilter]);

  async function handleDelete(entry: WaitlistEntry) {
    setStatus(null);
    try {
      await deleteWaitlistEntry(entry.id);
      setEntries((current) => (current ?? []).filter((item) => item.id !== entry.id));
      setStatus(`Deleted ${entry.email}.`);
    } catch (deleteError) {
      setStatus(deleteError instanceof Error ? deleteError.message : "Could not delete the entry.");
    } finally {
      setPendingDelete(null);
    }
  }

  function handleExport() {
    if (!entries || entries.length === 0) {
      setStatus("Nothing to export yet.");
      return;
    }
    downloadCsv(`zama-waitlist-${new Date().toISOString().slice(0, 10)}.csv`, waitlistToCsv(entries));
  }

  return (
    <div className="grid gap-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="grid gap-1">
          <h1 className="font-primary text-[clamp(1.7rem,3.5vw,2.4rem)] font-bold leading-[1.02] text-brand-green-ink">Waitlist</h1>
          <p className="text-sm text-brand-black/68">
            {entries ? `${entries.length} signup${entries.length === 1 ? "" : "s"}` : "Loading signups..."}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button className={btnOutlineSm} type="button" onClick={handleExport} disabled={!entries}>Export CSV</button>
          <button className={btnOutlineSm} type="button" onClick={() => void load()} disabled={!entries}>Refresh</button>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto_auto]">
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Filter by email, area, or source..."
          aria-label="Search waitlist"
          className={inputClasses}
        />
        <select className={`${selectClasses} min-w-40`} aria-label="Filter by source" value={sourceFilter} onChange={(e) => setSourceFilter(e.target.value)}>
          <option value="">All sources</option>
          {sources.map((source) => <option key={source} value={source}>{source}</option>)}
        </select>
        <select className={`${selectClasses} min-w-40`} aria-label="Filter by area" value={areaFilter} onChange={(e) => setAreaFilter(e.target.value)}>
          <option value="">All areas</option>
          {areas.map((area) => <option key={area} value={area}>{area}</option>)}
        </select>
      </div>

      {error ? (
        <div className="grid gap-3 rounded-wobbly-card border-3 border-dashed border-brand-orange bg-brand-orange/10 p-5">
          <p className="text-sm font-semibold text-brand-black" role="alert">{error}</p>
          <div><button className={btnOutlineSm} type="button" onClick={() => void load()}>Try again</button></div>
        </div>
      ) : null}

      {status ? <p className="text-sm font-semibold text-brand-green-ink" role="status">{status}</p> : null}

      {entries ? (
        filtered.length === 0 ? (
          <p className="rounded-wobbly-card border-3 border-dashed border-brand-forest/30 bg-brand-white p-6 text-center text-sm font-semibold text-brand-black/64">
            {query || sourceFilter || areaFilter ? "No signups match the current search or filters." : "No waitlist signups yet."}
          </p>
        ) : (
          <div className="overflow-x-auto rounded-wobbly-card border-3 border-brand-forest bg-brand-white shadow-brand-soft">
            <table className="w-full min-w-175 border-collapse text-left">
              <caption className="sr-only">Waitlist signups</caption>
              <thead>
                <tr className="border-b-3 border-dashed border-brand-forest/30 bg-brand-warm-white text-xs font-bold uppercase tracking-[0.08em] text-brand-green-ink">
                  <th className="px-4 py-3">Email</th>
                  <th className="px-4 py-3">Source</th>
                  <th className="px-4 py-3">Area</th>
                  <th className="px-4 py-3">Items</th>
                  <th className="px-4 py-3">Signed up</th>
                  <th className="px-4 py-3">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((entry) => (
                  <tr className="border-b-2 border-dashed border-brand-forest/16 text-sm last:border-b-0" key={entry.id}>
                    <td className="px-4 py-3 font-bold text-brand-black">{entry.email}</td>
                    <td className="px-4 py-3 text-brand-black/72">{entry.source}</td>
                    <td className="px-4 py-3 text-brand-black/72">{entry.area ?? "—"}</td>
                    <td className="px-4 py-3 text-brand-black/72">{itemSummary(entry)}</td>
                    <td className="px-4 py-3 text-brand-black/72">{formatDate(entry.created_at)}</td>
                    <td className="px-4 py-3 text-right">
                      <button
                        className="min-h-9 touch-manipulation rounded-full border-2 border-brand-orange-ink bg-brand-white px-3 py-1 text-xs font-bold text-brand-black transition-colors duration-120 ease-in-out hover:bg-brand-orange focus-visible:outline focus-visible:outline-3 focus-visible:outline-dashed focus-visible:outline-brand-green-ink focus-visible:outline-offset-2"
                        type="button"
                        onClick={() => setPendingDelete(entry)}
                      >
                        Delete
                      </button>
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
        title="Delete waitlist entry"
        message={pendingDelete ? `Delete ${pendingDelete.email} from the waitlist?` : ""}
        confirmLabel="Delete"
        onConfirm={() => { if (pendingDelete) void handleDelete(pendingDelete); }}
        onCancel={() => setPendingDelete(null)}
      />
    </div>
  );
}
