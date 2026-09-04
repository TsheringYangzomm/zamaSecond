import { useEffect, useRef } from "react";
import { btnOutlineSm, btnPrimarySm } from "../../components/ui/styles";
import type { InventoryItemRow, InventoryStockLotRow } from "../../cms/types";
import { stockLevel, StockStatusBadge } from "./commerce-shared";
import type { InventoryItemView } from "./inventory-utils";

type StockLotsModalProps = {
  open: boolean;
  view: InventoryItemView | null;
  onClose: () => void;
  onAddStock: (item: InventoryItemRow) => void;
};

function formatReceivedDate(value: string): string {
  if (!value) return "—";
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(date);
}

function formatCost(value: number | null): string {
  if (value == null) return "";
  return ` · Nu. ${value.toLocaleString("en-GB")}/unit`;
}

export function LotCard({ lot, unit }: { lot: InventoryStockLotRow; unit: string }) {
  return (
    <li className="grid gap-1 rounded-wobbly-card border-3 border-brand-forest/16 bg-brand-white p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="font-bold text-brand-black">{lot.supplier || "Unattributed supplier"}</span>
        <span className="text-xs font-bold text-brand-black/52">{formatReceivedDate(lot.received_date)}</span>
      </div>
      <p className="font-primary text-[clamp(1.1rem,2vw,1.35rem)] font-bold leading-none text-brand-green-ink">
        {lot.remaining ?? 0} {unit || ""}
        {formatCost(lot.unit_cost)}
      </p>
      {lot.batch_reference ? <p className="text-xs font-semibold text-brand-black/56">Batch: {lot.batch_reference}</p> : null}
      {lot.notes ? <p className="text-xs text-brand-black/60">{lot.notes}</p> : null}
    </li>
  );
}

export function StockLotsModal({ open, view, onClose, onAddStock }: StockLotsModalProps) {
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onCloseRef.current();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open]);

  if (!open || !view) return null;

  const { item, lots, total } = view;
  const level = stockLevel(total, item.stock_alert_at);

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-brand-black/60 px-4 py-10"
      role="dialog"
      aria-modal="true"
      aria-labelledby="stock-lots-title"
    >
      <div className="grid w-full max-w-150 gap-5 rounded-[30px_40px_26px_36px/36px_26px_40px_30px] border-3 border-brand-forest bg-brand-warm-white p-6 shadow-brand-big sm:p-7">
        <div className="grid gap-1">
          <h2 id="stock-lots-title" className="font-primary text-[clamp(1.4rem,3vw,1.9rem)] font-bold leading-[1.05] text-brand-green-ink">
            {item.name}
          </h2>
          <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-brand-black/68">
            <span className="font-bold text-brand-green-ink">{total == null ? "—" : `${total} ${item.unit || ""}`.trim()}</span>
            <span>in stock</span>
            <StockStatusBadge level={level} />
          </p>
        </div>

        {lots.length === 0 ? (
          <p className="rounded-wobbly-card border-3 border-dashed border-brand-forest/30 bg-brand-white p-6 text-center text-sm font-semibold text-brand-black/64">
            No stock lots for {item.name} yet.
          </p>
        ) : (
          <ul className="grid gap-3" aria-label={`Stock lots for ${item.name}`}>
            {lots.map((lot) => <LotCard key={lot.id} lot={lot} unit={item.unit} />)}
          </ul>
        )}

        <div className="flex flex-wrap items-center justify-end gap-3">
          <button className={btnOutlineSm} type="button" onClick={() => onAddStock(item)}>Add stock</button>
          <button className={btnPrimarySm} type="button" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}
