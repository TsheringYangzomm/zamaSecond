import { useEffect, useMemo, useRef, useState } from "react";

type FilterOption = string | { value: string; label: string };

function optionValue(option: FilterOption): string {
  return typeof option === "string" ? option : option.value;
}

function optionLabel(option: FilterOption): string {
  return typeof option === "string" ? option.replace(/_/g, " ") : option.label;
}

const SEARCH_THRESHOLD = 10;

export function ColumnFilterDropdown({ label, options, value, onSelect, allLabel, align = "left" }: {
  label: string;
  options: readonly FilterOption[];
  value: string;
  onSelect: (val: string) => void;
  allLabel?: string;
  align?: "left" | "right";
}) {
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const hasActive = value !== "";
  const showSearch = options.length > SEARCH_THRESHOLD;
  const filteredOptions = useMemo(() => {
    const needle = search.trim().toLowerCase();
    if (!needle) return options;
    return options.filter((option) => optionLabel(option).toLowerCase().includes(needle));
  }, [options, search]);

  useEffect(() => {
    if (!open) return;
    function closeOnOutsidePointer(event: PointerEvent) {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) setOpen(false);
    }
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("pointerdown", closeOnOutsidePointer);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOnOutsidePointer);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [open]);

  return (
    <div className="group relative" ref={rootRef}>
      <div className={`inline-flex items-center rounded-full border-2 text-xs font-bold uppercase tracking-[0.06em] transition-colors duration-120 ${hasActive ? "border-brand-forest bg-brand-forest text-brand-white" : "border-brand-forest/40 bg-brand-white text-brand-green-ink hover:border-brand-forest hover:bg-brand-warm-white"}`}>
        <button
          className="flex items-center gap-1 rounded-full border-0 bg-transparent px-3 py-1.5 font-bold uppercase tracking-[0.06em] outline-none focus-visible:outline focus-visible:outline-3 focus-visible:outline-dashed focus-visible:outline-brand-green-ink focus-visible:outline-offset-2"
          type="button"
          aria-haspopup="menu"
          aria-expanded={open}
          onClick={() => setOpen((current) => !current)}
        >
          {label}
          <span className="ml-0.5 text-[0.6rem] opacity-70">{open ? "▴" : "▾"}</span>
        </button>
        {hasActive ? (
          <button
            className="mr-1 flex h-5 w-5 items-center justify-center rounded-full border-0 bg-transparent text-sm leading-none text-brand-white/80 outline-none hover:bg-brand-white/15 hover:text-brand-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-dashed focus-visible:outline-brand-white"
            type="button"
            aria-label={`Clear ${label} filter`}
            onClick={() => {
              setSearch("");
              setOpen(false);
              onSelect("");
            }}
          >
            ×
          </button>
        ) : null}
      </div>
      <div className={`${align === "right" ? "left-auto right-0" : "left-0"} absolute top-full z-20 -mt-1 max-h-72 w-max max-w-[min(20rem,calc(100vw-2rem))] min-w-40 overflow-y-auto rounded-wobbly-card border-3 border-brand-forest bg-brand-white p-2 shadow-brand transition-opacity duration-100 ${open ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0 group-hover:pointer-events-auto group-hover:opacity-100"}`} role="menu">
        {showSearch ? (
          <input
            className="mb-1 w-full rounded-lg border-2 border-brand-forest/25 bg-brand-warm-white px-2.5 py-1.5 text-xs font-semibold text-brand-black shadow-none outline-none placeholder:text-brand-black/44 focus-visible:border-brand-forest"
            type="search"
            placeholder={`Search ${label.toLowerCase()}s...`}
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            onKeyDown={(event) => { if (event.key === "Escape") setOpen(false); }}
          />
        ) : null}
        <button
          className={`w-full truncate rounded-lg px-3 py-1.5 text-left text-xs font-bold transition-colors duration-100 ${!value ? "bg-brand-forest text-brand-white" : "text-brand-black hover:bg-brand-warm-white"}`}
          type="button"
          onClick={() => {
            setSearch("");
            onSelect("");
            setOpen(false);
          }}
        >
          {allLabel ?? `All ${label.toLowerCase()}s`}
        </button>
        {!search.trim() && options.length > SEARCH_THRESHOLD ? (
          <p className="px-3 pb-0.5 pt-1 text-[0.6rem] font-bold uppercase tracking-[0.08em] text-brand-black/44">{options.length} options</p>
        ) : null}
        {filteredOptions.length === 0 ? (
          <p className="px-3 py-1.5 text-xs font-semibold text-brand-black/52">No matches.</p>
        ) : (
          filteredOptions.map((option) => {
            const key = optionValue(option);
            const text = optionLabel(option);
            return (
              <button
                className={`w-full truncate rounded-lg px-3 py-1.5 text-left text-xs font-bold capitalize transition-colors duration-100 ${value === key ? "bg-brand-forest text-brand-white" : "text-brand-black hover:bg-brand-warm-white"}`}
                key={key}
                title={text}
                type="button"
                onClick={() => {
                  setSearch("");
                  onSelect(key);
                  setOpen(false);
                }}
              >
                {text}
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}

export function ClearFiltersButton({ count, onClear }: { count: number; onClear: () => void }) {
  if (count === 0) return null;
  return (
    <button
      className="rounded-full border-2 border-brand-orange-ink bg-brand-white px-3 py-1.5 text-xs font-bold text-brand-orange-ink transition-colors duration-120 hover:bg-brand-orange hover:text-brand-white"
      type="button"
      onClick={onClear}
    >
      Clear all ({count})
    </button>
  );
}

export type AmountRanges = { value: string; label: string }[];

export function buildAmountRanges(inputValues: number[]): AmountRanges {
  const values = [...new Set(inputValues.filter((value) => value > 0))].sort((a, b) => a - b);
  const size = values.length;
  if (size === 0) return [];
  if (size === 1) {
    const value = values[0];
    return [{ value: `eq-${value}`, label: `Nu. ${value.toLocaleString()}` }];
  }
  const pivots = [0.25, 0.5, 0.75].map((frac) => values[Math.min(size - 1, Math.floor(frac * (size - 1)))]);
  const cuts = [values[0], ...pivots.filter((pivot, index, all) => all.indexOf(pivot) === index)];
  const ranges: AmountRanges = [];
  cuts.forEach((high, index) => {
    if (index === 0) {
      ranges.push({ value: `u-${high}`, label: `Up to Nu. ${high.toLocaleString()}` });
    } else {
      const low = cuts[index - 1];
      ranges.push({ value: `${low}-${high}`, label: `Nu. ${low.toLocaleString()} – ${high.toLocaleString()}` });
    }
  });
  const last = cuts[cuts.length - 1];
  ranges.push({ value: `${last}+`, label: `Nu. ${last.toLocaleString()}+` });
  return ranges;
}

export function amountRangeKeyFor(ranges: AmountRanges, amount: number): string {
  if (amount <= 0) return "";
  const match = ranges.find((range) => {
    if (range.value.startsWith("u-")) return amount <= Number(range.value.slice(2));
    if (range.value.endsWith("+")) return amount >= Number(range.value.slice(0, -1));
    if (range.value.startsWith("eq-")) return amount === Number(range.value.slice(3));
    const [low, high] = range.value.split("-").map(Number);
    return amount > low && amount <= high;
  });
  return match?.value ?? "";
}

export const DATE_RANGES = [
  { value: "today", label: "Today" },
  { value: "7d", label: "Last 7 days" },
  { value: "30d", label: "Last 30 days" },
  { value: "older", label: "Older" },
] as const;

export function dateRangeKey(date: string | Date | null | undefined): string {
  const time = new Date(date ?? "").getTime();
  if (Number.isNaN(time)) return "";
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  if (time >= startOfDay.getTime()) return "today";
  const now = Date.now();
  if (time >= now - 7 * 86400000) return "7d";
  if (time >= now - 30 * 86400000) return "30d";
  return "older";
}

export const COUNT_RANGES = [
  { value: "1", label: "1" },
  { value: "2", label: "2" },
  { value: "3-5", label: "3–5" },
  { value: "6+", label: "6+" },
] as const;

export function countRangeKey(count: number): string {
  if (count <= 1) return "1";
  if (count === 2) return "2";
  if (count <= 5) return "3-5";
  return "6+";
}

export const STOCK_QTY_RANGES = [
  { value: "u-10", label: "10 or fewer" },
  { value: "11-50", label: "11–50" },
  { value: "51-200", label: "51–200" },
  { value: "201+", label: "201+" },
] as const;

export function stockQtyRangeKey(quantity: number): string {
  if (quantity <= 10) return "u-10";
  if (quantity <= 50) return "11-50";
  if (quantity <= 200) return "51-200";
  return "201+";
}
