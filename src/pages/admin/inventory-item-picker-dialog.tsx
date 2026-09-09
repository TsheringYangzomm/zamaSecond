import { useEffect, useMemo, useRef, useState } from "react";
import { Check, Search } from "lucide-react";
import { btnOutlineSm, btnPrimarySm } from "../../components/ui/styles";
import type { InventoryItemRow } from "../../cms/types";
import { inputClasses, selectClasses } from "./admin-fields";

type InventoryItemPickerDialogProps = {
  open: boolean;
  items: InventoryItemRow[];
  alreadyIncludedIds: Iterable<string>;
  onAdd: (items: InventoryItemRow[]) => void;
  onClose: () => void;
};

function rowClasses(selected: boolean, disabled: boolean): string {
  const base =
    "group grid w-full grid-cols-[auto_1fr_auto] items-center gap-3 rounded-wobbly-md border-2 px-3 py-2 text-left transition-colors duration-100 focus-visible:outline focus-visible:outline-3 focus-visible:outline-dashed focus-visible:outline-brand-green-ink focus-visible:outline-offset-2";
  if (disabled) return `${base} cursor-not-allowed border-brand-forest/20 bg-brand-white/60 opacity-60`;
  if (selected) return `${base} border-brand-forest bg-brand-mint shadow-brand-tight`;
  return `${base} border-brand-forest/20 bg-brand-white hover:border-brand-forest/60 hover:bg-brand-warm-white`;
}

export function InventoryItemPickerDialog({
  open,
  items,
  alreadyIncludedIds,
  onAdd,
  onClose,
}: InventoryItemPickerDialogProps) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const searchRef = useRef<HTMLInputElement>(null);
  const includedIds = useMemo(() => new Set(alreadyIncludedIds), [alreadyIncludedIds]);

  useEffect(() => {
    if (!open) return;
    setQuery("");
    setCategory("");
    setSelectedIds([]);
    searchRef.current?.focus();
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose]);

  const categories = useMemo(
    () =>
      [...new Set(items.map((item) => item.category).filter(Boolean))].sort(),
    [items],
  );

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return items.filter((item) => {
      if (category && item.category !== category) return false;
      if (needle && !item.name.toLowerCase().includes(needle)) return false;
      return true;
    });
  }, [items, query, category]);

  if (!open) return null;

  const selection = new Set(selectedIds);

  function toggle(id: string) {
    setSelectedIds((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id],
    );
  }

  function addAll() {
    onAdd(visible.filter((item) => selection.has(item.id)));
    onClose();
  }

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-brand-black/60 px-4 py-10"
      role="dialog"
      aria-modal="true"
      aria-labelledby="inventory-picker-title"
    >
      <div className="grid max-h-[85vh] w-full max-w-160 gap-4 rounded-[30px_40px_26px_36px/36px_26px_40px_30px] border-3 border-brand-forest bg-brand-warm-white p-6 shadow-brand-big sm:p-7">
        <div className="grid gap-1">
          <h2 id="inventory-picker-title" className="font-primary text-[clamp(1.4rem,3vw,1.9rem)] font-bold leading-[1.05] text-brand-green-ink">
            Add inventory items
          </h2>
          <p className="text-sm leading-[1.5] text-brand-black/72">
            Pick tracked inventory items. Items already linked are marked below.
          </p>
        </div>

        <div className="grid gap-2 sm:grid-cols-[1fr_auto] sm:items-start">
          <label className="grid gap-1.5">
            <span className="text-xs font-bold uppercase tracking-[0.1em] text-brand-green-ink">Search</span>
            <span className="relative block">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4.5 w-4.5 -translate-y-1/2 text-brand-black/40" aria-hidden="true" />
              <input
                ref={searchRef}
                className={`${inputClasses} pl-11`}
                type="search"
                placeholder="Search inventory items..."
                value={query}
                onChange={(event) => setQuery(event.target.value)}
              />
            </span>
          </label>
          <label className="grid gap-1.5">
            <span className="text-xs font-bold uppercase tracking-[0.1em] text-brand-green-ink">Category</span>
            <select
              className={`${selectClasses} min-w-44`}
              value={category}
              onChange={(event) => setCategory(event.target.value)}
            >
              <option value="">All categories</option>
              {categories.map((option) => (
                <option key={option} value={option}>{option}</option>
              ))}
            </select>
          </label>
        </div>

        <p className="text-xs font-semibold text-brand-black/56" aria-live="polite">
          {visible.length} of {items.length} items shown
        </p>

        {visible.length === 0 ? (
          <p className="rounded-wobbly-md border-2 border-dashed border-brand-forest/30 px-3 py-4 text-sm font-semibold text-brand-black/64">
            No inventory items match the current search or filter.
          </p>
        ) : (
          <ul className="grid max-h-70 gap-1.5 overflow-y-auto pr-1">
            {visible.map((item) => {
              const alreadyIncluded = includedIds.has(item.id);
              const selected = selection.has(item.id);
              return (
                <li key={item.id}>
                  <button
                    type="button"
                    disabled={alreadyIncluded}
                    aria-pressed={selected || alreadyIncluded}
                    className={rowClasses(selected, alreadyIncluded)}
                    onClick={() => toggle(item.id)}
                  >
                    <span className={`grid h-5.5 w-5.5 flex-none place-items-center rounded-md border-2 ${selected || alreadyIncluded ? "border-brand-forest bg-brand-leaf text-brand-white" : "border-brand-forest/40 bg-brand-white text-transparent"}`} aria-hidden="true">
                      <Check className="h-3.5 w-3.5" strokeWidth={3} />
                    </span>
                    <span className="min-w-0 grid gap-0.5">
                      <span className="truncate font-bold text-brand-black">{item.name}</span>
                      <span className="truncate text-xs text-brand-black/52">{item.category}{item.unit ? ` / ${item.unit}` : ""}</span>
                    </span>
                    {alreadyIncluded ? (
                      <span className="rounded-full border-2 border-brand-forest bg-brand-white px-2 py-0.5 text-xs font-bold text-brand-green-ink">Linked</span>
                    ) : item.stock_quantity != null ? (
                      <span className="text-xs font-bold text-brand-black/56">{item.stock_quantity} {item.unit}</span>
                    ) : null}
                  </button>
                </li>
              );
            })}
          </ul>
        )}

        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm font-semibold text-brand-black/72" aria-live="polite">
            {selectedIds.length} item{selectedIds.length === 1 ? "" : "s"} selected
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <button className={btnOutlineSm} type="button" onClick={onClose}>
              Cancel
            </button>
            <button className={btnPrimarySm} type="button" disabled={selectedIds.length === 0} onClick={addAll}>
              Add {selectedIds.length} item{selectedIds.length === 1 ? "" : "s"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
