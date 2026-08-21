import { useEffect, useRef, useState } from "react";
import { listInventoryStockHistory } from "../../admin/admin-api";
import { btnPrimarySm } from "../../components/ui/styles";
import type { InventoryItemRow, InventoryStockHistoryRow } from "../../cms/types";
import { stockLevel, StockStatusBadge } from "./commerce-shared";

type InventoryStockHistoryModalProps = {
  open: boolean;
  item: InventoryItemRow | null;
  historyEnabled: boolean;
  onClose: () => void;
};

function formatHistoryDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  const datePart = new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
  const timePart = new Intl.DateTimeFormat("en-US", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
  return `${datePart} · ${timePart}`;
}

function HistoryEntry({ entry, unit }: { entry: InventoryStockHistoryRow; unit: string }) {
  const change = entry.quantity_change;
  const added = change > 0;
  const removed = change < 0;
  return (
    <li className="grid gap-1 rounded-wobbly-card border-3 border-brand-forest/16 bg-brand-white p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span
          className={`font-primary text-[clamp(1.1rem,2vw,1.35rem)] font-bold leading-none ${
            added ? "text-brand-green-ink" : removed ? "text-brand-orange-ink" : "text-brand-black/64"
          }`}
        >
          {added ? "+" : removed ? "−" : ""}
          {change} {unit || ""}
        </span>
        <span className="text-xs font-bold text-brand-black/52">{formatHistoryDate(entry.created_at)}</span>
      </div>
      <p className="text-sm font-semibold text-brand-black">{entry.reason || "Stock movement"}</p>
      <p className="text-xs text-brand-black/56">
        {entry.reference ? <span>Reference: {entry.reference} · </span> : null}
        {entry.admin_email ? `Admin: ${entry.admin_email}` : null}
      </p>
    </li>
  );
}

export function InventoryStockHistoryModal({ open, item, historyEnabled, onClose }: InventoryStockHistoryModalProps) {
  const [history, setHistory] = useState<InventoryStockHistoryRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!open || !item) return;
    setHistory(null);
    setError(null);
    if (!historyEnabled) return;
    let active = true;
    void listInventoryStockHistory(item.id)
      .then((rows) => {
        if (active) setHistory(rows);
      })
      .catch((loadError) => {
        if (active) setError(loadError instanceof Error ? loadError.message : "Could not load stock history.");
      });
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onCloseRef.current();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      active = false;
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open, item, historyEnabled]);

  if (!open || !item) return null;

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-brand-black/60 px-4 py-10"
      role="dialog"
      aria-modal="true"
      aria-labelledby="inventory-stock-history-title"
    >
      <div className="grid w-full max-w-150 gap-5 rounded-[30px_40px_26px_36px/36px_26px_40px_30px] border-3 border-brand-forest bg-brand-warm-white p-6 shadow-brand-big sm:p-7">
        <div className="grid gap-1">
          <h2 id="inventory-stock-history-title" className="font-primary text-[clamp(1.4rem,3vw,1.9rem)] font-bold leading-[1.05] text-brand-green-ink">
            {item.name} — Stock History
          </h2>
          <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-brand-black/68">
            {item.stock_quantity == null ? "—" : `${item.stock_quantity} ${item.unit || ""}`.trim()} in stock
            <StockStatusBadge level={stockLevel(item.stock_quantity, item.stock_alert_at)} />
          </p>
        </div>

        {!historyEnabled ? (
          <p className="rounded-wobbly-card border-3 border-dashed border-brand-orange bg-brand-orange/10 p-4 text-sm font-semibold text-brand-black">
            Stock history tracking is not enabled yet. Run <code className="rounded bg-brand-white px-1 py-0.5 text-xs">supabase/inventory-schema.sql</code> in the Supabase SQL editor to create the <code className="rounded bg-brand-white px-1 py-0.5 text-xs">inventory_stock_history</code> table.
          </p>
        ) : null}

        {error ? (
          <p className="rounded-wobbly-card border-3 border-dashed border-brand-orange bg-brand-orange/10 p-4 text-sm font-semibold text-brand-black" role="alert">{error}</p>
        ) : null}

        {historyEnabled && !error && history === null ? (
          <p className="text-sm font-semibold text-brand-black/60">Loading stock history...</p>
        ) : null}

        {historyEnabled && !error && history !== null && history.length === 0 ? (
          <p className="rounded-wobbly-card border-3 border-dashed border-brand-forest/30 bg-brand-white p-6 text-center text-sm font-semibold text-brand-black/64">
            No stock movements recorded for {item.name} yet. Movements are added automatically when stock is received or adjusted.
          </p>
        ) : null}

        {history !== null && history.length > 0 ? (
          <ul className="grid gap-3" aria-label={`Stock history for ${item.name}`}>
            {history.map((entry) => <HistoryEntry key={entry.id} entry={entry} unit={item.unit} />)}
          </ul>
        ) : null}

        <div className="flex flex-wrap items-center justify-end gap-3">
          <button className={btnPrimarySm} type="button" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}
