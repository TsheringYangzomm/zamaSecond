import { useEffect, type ReactNode } from "react";
import { commerceStore, useCommerceData } from "../../admin/commerce-api";
import type { CommerceLoadState } from "../../admin/commerce-api";
import type { InventoryRow } from "../../cms/types";
import { productStockDevData } from "../../data/commerce-dev";

export type StockLevel = "in" | "low" | "out" | "untracked";

export function stockInfo(
  productId: string,
  inventory: Map<string, InventoryRow>,
  stockAvailable: boolean,
): { quantity: number | null; alertAt: number | null } {
  if (stockAvailable) {
    const row = inventory.get(productId);
    return {
      quantity: row?.stock_quantity ?? null,
      alertAt: row?.stock_alert_at ?? null,
    };
  }
  const fallback = productStockDevData[productId];
  return fallback ? { quantity: fallback.stock_quantity, alertAt: fallback.stock_alert_at } : { quantity: null, alertAt: null };
}

export function stockLevel(quantity: number | null, alertAt: number | null): StockLevel {
  if (quantity == null) return "untracked";
  if (quantity <= 0) return "out";
  if (alertAt != null && quantity <= alertAt) return "low";
  return "in";
}

export const stockBadgeClasses: Record<StockLevel, string> = {
  in: "border-brand-forest bg-brand-mint text-brand-green-ink",
  low: "border-brand-orange-ink bg-brand-buff text-brand-orange-ink",
  out: "border-brand-orange bg-brand-orange/15 text-brand-orange-ink",
  untracked: "border-brand-black/30 bg-brand-white text-brand-black/52",
};

export const stockLabels: Record<StockLevel, string> = {
  in: "In stock",
  low: "Low stock",
  out: "Out of stock",
  untracked: "Not tracked",
};

export function StockBadge({ level, quantity }: { level: StockLevel; quantity: number | null }) {
  return (
    <span className={`inline-flex min-h-7 w-fit items-center rounded-full border-2 px-2.5 py-0.5 text-xs font-bold leading-none ${stockBadgeClasses[level]}`}>
      {stockLabels[level]}{quantity != null ? ` · ${quantity}` : ""}
    </span>
  );
}

const statusEmoji: Record<StockLevel, string> = {
  in: "🟢",
  low: "🟡",
  out: "🔴",
  untracked: "⚪",
};

export function StockStatusBadge({ level }: { level: StockLevel }) {
  return (
    <span className={`inline-flex min-h-7 w-fit items-center gap-1.5 rounded-full border-2 px-2.5 py-0.5 text-xs font-bold leading-none ${stockBadgeClasses[level]}`}>
      <span aria-hidden="true">{statusEmoji[level]}</span>
      {stockLabels[level]}
    </span>
  );
}

export function formatMoney(value: number): string {
  return `Nu. ${value.toLocaleString("en-GB")}`;
}

export function formatDate(value: string | null | undefined): string {
  if (!value) return "—";
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

export function formatDateTime(value: string | null | undefined): string {
  if (!value) return "—";
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

const statusToneClasses: Record<string, string> = {
  active: "border-brand-forest bg-brand-mint text-brand-green-ink",
  paid: "border-brand-forest bg-brand-mint text-brand-green-ink",
  delivered: "border-brand-forest bg-brand-mint text-brand-green-ink",
  confirmed: "border-brand-forest bg-brand-yellow text-brand-black",
  pending: "border-brand-forest bg-brand-yellow text-brand-black",
  preparing: "border-brand-forest bg-brand-yellow text-brand-black",
  out_for_delivery: "border-brand-orange-ink bg-brand-buff text-brand-orange-ink",
  paused: "border-brand-orange-ink bg-brand-buff text-brand-orange-ink",
  failed: "border-brand-orange-ink bg-brand-buff text-brand-orange-ink",
  cancelled: "border-brand-orange bg-brand-orange/15 text-brand-orange-ink",
  refunded: "border-brand-orange bg-brand-orange/15 text-brand-orange-ink",
  suspended: "border-brand-orange bg-brand-orange/15 text-brand-orange-ink",
};

export function humanizeStatus(status: string): string {
  return status
    .replace(/_/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export function CommerceStatusBadge({ status }: { status: string }) {
  const tone = statusToneClasses[status] ?? statusToneClasses.pending;
  return (
    <span className={`inline-flex min-h-7 w-fit items-center rounded-full border-2 px-2.5 py-0.5 text-xs font-bold leading-none ${tone}`}>
      {humanizeStatus(status)}
    </span>
  );
}

export function DevDataNotice() {
  return (
    <p className="rounded-wobbly-card border-3 border-dashed border-brand-orange bg-brand-orange/10 p-4 text-sm font-semibold text-brand-black">
      Showing example data. Run <code className="rounded bg-brand-white px-1 py-0.5 text-xs">supabase/commerce-schema.sql</code> in the Supabase SQL editor to enable the live tables and writes.
    </p>
  );
}

export function StatCard({ label, value, note }: { label: string; value: string | number; note?: string }) {
  return (
    <div className="grid gap-1 rounded-wobbly-card border-3 border-brand-forest bg-brand-white p-5 shadow-brand-soft">
      <span className="text-xs font-bold uppercase tracking-[0.1em] text-brand-orange-ink">{label}</span>
      <span className="font-primary text-[clamp(1.4rem,3vw,2rem)] font-bold leading-none text-brand-green-ink">{value}</span>
      {note ? <p className="text-xs text-brand-black/60">{note}</p> : null}
    </div>
  );
}

export function useCommerceStore(): CommerceLoadState {
  const state = useCommerceData();
  useEffect(() => {
    void commerceStore.load();
  }, []);
  return state;
}

export function StatusChangeSelect({ value, options, writable, busy, onChange }: {
  value: string;
  options: readonly string[];
  writable: boolean;
  busy: boolean;
  onChange: (next: string) => void;
}) {
  return (
    <select
      className="min-h-10 min-w-36 rounded-full border-2 border-brand-forest bg-brand-white px-3 py-1 text-xs font-bold text-brand-black outline-none focus-visible:outline focus-visible:outline-3 focus-visible:outline-dashed focus-visible:outline-brand-green-ink focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:opacity-55"
      value={value}
      disabled={!writable || busy}
      aria-label="Change status"
      onChange={(event) => onChange(event.target.value)}
    >
      {options.map((option) => (
        <option key={option} value={option}>{humanizeStatus(option)}</option>
      ))}
    </select>
  );
}

export function CommerceLoading() {
  return <p className="text-sm font-semibold text-brand-black/60">Loading commerce data...</p>;
}

export function CommerceError({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="grid gap-3 rounded-wobbly-card border-3 border-dashed border-brand-orange bg-brand-orange/10 p-5">
      <p className="text-sm font-semibold text-brand-black" role="alert">{message}</p>
      <div><button className="min-h-11 touch-manipulation rounded-full border-2 border-brand-forest bg-brand-white px-4 py-2 text-sm font-bold text-brand-forest hover:bg-brand-mint focus-visible:outline focus-visible:outline-3 focus-visible:outline-dashed focus-visible:outline-brand-green-ink focus-visible:outline-offset-2" type="button" onClick={onRetry}>Try again</button></div>
    </div>
  );
}

export function CommerceSectionHeading({ title, subtitle, children }: { title: string; subtitle: string; children?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div className="grid gap-1">
        <h1 className="font-primary text-[clamp(1.7rem,3.5vw,2.4rem)] font-bold leading-[1.02] text-brand-green-ink">{title}</h1>
        <p className="text-sm text-brand-black/68">{subtitle}</p>
      </div>
      {children ? <div className="flex flex-wrap items-center gap-2">{children}</div> : null}
    </div>
  );
}
