import { useEffect, useMemo, useState } from "react";
import {
  deleteWaitlistEntry,
  downloadCsv,
  listWaitlist,
  waitlistToCsv,
  type WaitlistEntry,
} from "../../admin/admin-api";
import { btnOutlineSm } from "../../components/ui/styles";

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

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
  const [status, setStatus] = useState<string | null>(null);

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
    if (!q) return entries;
    return entries.filter(
      (entry) =>
        entry.email.toLowerCase().includes(q) ||
        (entry.area ?? "").toLowerCase().includes(q) ||
        entry.source.toLowerCase().includes(q),
    );
  }, [entries, query]);

  async function handleDelete(entry: WaitlistEntry) {
    if (!window.confirm(`Delete ${entry.email} from the waitlist?`)) return;
    setStatus(null);
    try {
      await deleteWaitlistEntry(entry.id);
      setEntries((current) => (current ?? []).filter((item) => item.id !== entry.id));
      setStatus(`Deleted ${entry.email}.`);
    } catch (deleteError) {
      setStatus(deleteError instanceof Error ? deleteError.message : "Could not delete the entry.");
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

      <label className="grid gap-1.5">
        <span className="text-xs font-bold uppercase tracking-[0.1em] text-brand-green-ink">Search</span>
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Filter by email, area, or source..."
          className="min-h-11.5 w-full max-w-150 rounded-[18px_12px_16px_10px/12px_18px_10px_16px] border-3 border-brand-forest bg-brand-white px-4 py-[0.65rem] text-brand-black shadow-brand-soft outline-none placeholder:text-brand-black/46 focus-visible:border-brand-green-ink focus-visible:ring-4 focus-visible:ring-brand-leaf/20"
        />
      </label>

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
            {query ? "No signups match that search." : "No waitlist signups yet."}
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
                        onClick={() => void handleDelete(entry)}
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
    </div>
  );
}
