import { useEffect, useMemo, useState } from "react";
import { useAdminAuth } from "../../admin/admin-auth";
import { inventoryItemsTableExists, inventoryStockHistoryTableExists, inventoryStockLotsTableExists, listFarmers, listInventoryItems, listInventoryStockLots } from "../../admin/admin-api";
import { btnOutlineSm, btnPrimarySm } from "../../components/ui/styles";
import { SearchIcon } from "../../components/ui/icons";
import { inputClasses, selectClasses } from "./admin-fields";
import type { FarmerRow, InventoryItemRow, InventoryStockLotRow } from "../../cms/types";
import { itemInventoryDevData } from "../../data/commerce-dev";
import {
  CommerceSectionHeading,
  stockLevel,
  StockStatusBadge,
} from "./commerce-shared";
import { AddStockModal } from "./add-stock-modal";
import { InventoryStockHistoryModal } from "./inventory-stock-history-modal";
import { StockLotsModal } from "./stock-lots-modal";
import {
  buildInventoryView,
  countLevels,
  emptyLevelCounts,
  type InventoryItemView,
  type LevelCounts,
  type StockLevel,
} from "./inventory-utils";

const levelOptions: { value: "" | StockLevel; label: string }[] = [
  { value: "", label: "All stock statuses" },
  { value: "in", label: "In stock" },
  { value: "low", label: "Low stock" },
  { value: "out", label: "Out of stock" },
  { value: "untracked", label: "Not tracked" },
];

type SortOption = "name-asc" | "name-desc" | "qty-asc" | "qty-desc" | "updated";

const sortOptions: { value: SortOption; label: string }[] = [
  { value: "name-asc", label: "Product name A-Z" },
  { value: "name-desc", label: "Product name Z-A" },
  { value: "qty-asc", label: "Quantity low → high" },
  { value: "qty-desc", label: "Quantity high → low" },
  { value: "updated", label: "Recently updated" },
];

function formatLastUpdated(value: string | null | undefined): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  const today = new Date();
  const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
  const startOfDate = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
  const dayDifference = Math.round((startOfToday - startOfDate) / 86_400_000);
  if (dayDifference === 0) return "Today";
  if (dayDifference === 1) return "Yesterday";
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(date);
}

const devItems: InventoryItemRow[] = Object.entries(itemInventoryDevData).map(([id, row]) => ({
  id,
  name: row.name,
  category: row.category,
  unit: row.unit,
  supplier: row.supplier,
  stock_quantity: row.stock_quantity,
  stock_alert_at: row.stock_alert_at,
}));

const devLots: InventoryStockLotRow[] = Object.entries(itemInventoryDevData)
  .filter(([, row]) => row.stock_quantity > 0)
  .map(([id, row]) => ({
    id: `${id}-initial`,
    item_id: id,
    supplier: row.supplier,
    quantity: row.stock_quantity,
    remaining: row.stock_quantity,
    received_date: "",
    unit_cost: null,
    batch_reference: "",
    notes: "",
    created_at: "",
  }));

type StatTone = "default" | "success" | "warning" | "danger" | "attention";

const statToneClasses: Record<StatTone, { card: string; label: string; value: string; dot: string }> = {
  default: {
    card: "border-brand-forest bg-brand-white",
    label: "text-brand-green-ink",
    value: "text-brand-green-ink",
    dot: "bg-brand-forest",
  },
  success: {
    card: "border-brand-forest bg-brand-white",
    label: "text-brand-green-ink",
    value: "text-brand-green-ink",
    dot: "bg-brand-leaf",
  },
  warning: {
    card: "border-brand-orange-ink bg-brand-buff",
    label: "text-brand-orange-ink",
    value: "text-brand-orange-ink",
    dot: "bg-brand-yellow",
  },
  danger: {
    card: "border-brand-orange bg-brand-orange/10",
    label: "text-brand-orange-ink",
    value: "text-brand-orange-ink",
    dot: "bg-brand-orange",
  },
  attention: {
    card: "border-brand-orange-ink bg-brand-buff",
    label: "text-brand-orange-ink",
    value: "text-brand-orange-ink",
    dot: "bg-brand-orange-ink",
  },
};

function InventoryStatCard({ label, value, note, tone }: { label: string; value: number; note: string; tone: StatTone }) {
  const toneClasses = statToneClasses[tone];
  return (
    <div className={`grid gap-1.5 rounded-wobbly-card border-3 p-5 shadow-brand-soft ${toneClasses.card}`}>
      <span className={`flex items-center gap-2 text-xs font-bold uppercase tracking-[0.1em] ${toneClasses.label}`}>
        <span className={`h-2.5 w-2.5 rounded-full ${toneClasses.dot}`} aria-hidden="true" />
        {label}
      </span>
      <span className={`font-primary text-[clamp(1.6rem,3.2vw,2.3rem)] font-bold leading-none ${toneClasses.value}`}>{value}</span>
      <p className="text-xs text-brand-black/60">{note}</p>
    </div>
  );
}

type HealthTone = "healthy" | "warning" | "critical";

function InventoryHealth({ counts }: { counts: LevelCounts }) {
  const totalTracked = counts.in + counts.low + counts.out;
  const percentage = totalTracked === 0 ? 0 : Math.round((counts.in / totalTracked) * 100);
  const tone: HealthTone = percentage >= 75 ? "healthy" : percentage >= 50 ? "warning" : "critical";

  const barClasses: Record<HealthTone, { fill: string; text: string }> = {
    healthy: { fill: "bg-brand-leaf", text: "text-brand-green-ink" },
    warning: { fill: "bg-brand-yellow", text: "text-brand-orange-ink" },
    critical: { fill: "bg-brand-orange", text: "text-brand-orange-ink" },
  };
  const toneClasses = barClasses[tone];

  return (
    <div className="grid gap-3 rounded-wobbly-card border-3 border-brand-forest bg-brand-white p-5 shadow-brand-soft">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-xs font-bold uppercase tracking-[0.1em] text-brand-green-ink">Inventory health</span>
        <span className={`font-primary text-[clamp(1.3rem,2.5vw,1.8rem)] font-bold leading-none ${toneClasses.text}`}>{percentage}%</span>
      </div>

      <div className="grid gap-1.5">
        <div
          className="h-3.5 w-full overflow-hidden rounded-full border-2 border-brand-forest/25 bg-brand-warm-white"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={percentage}
          aria-label="Inventory health"
        >
          <div className={`h-full rounded-full transition-[width] duration-300 ${toneClasses.fill}`} style={{ width: `${percentage}%` }} />
        </div>
        <p className="text-sm text-brand-black/68">
          {totalTracked === 0 ? "No tracked stock yet." : `${percentage}% of tracked items are currently available`}
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm font-bold">
        <span className="flex items-center gap-1.5 text-brand-green-ink">
          <span className="h-2 w-2 rounded-full bg-brand-leaf" aria-hidden="true" />
          {counts.in} In stock
        </span>
        <span className="flex items-center gap-1.5 text-brand-orange-ink">
          <span className="h-2 w-2 rounded-full bg-brand-yellow" aria-hidden="true" />
          {counts.low} Low stock
        </span>
        <span className="flex items-center gap-1.5 text-brand-orange-ink">
          <span className="h-2 w-2 rounded-full bg-brand-orange" aria-hidden="true" />
          {counts.out} Out of stock
        </span>
      </div>
    </div>
  );
}

function totalLabel(view: InventoryItemView): string {
  if (view.total == null) return "—";
  return `${view.total} ${view.item.unit || ""}`.trim();
}

function supplierLabel(view: InventoryItemView): string {
  if (view.suppliers.length === 0) return "—";
  if (view.suppliers.length === 1) return view.suppliers[0];
  return `${view.suppliers.length} suppliers`;
}

export function InventoryTab() {
  const { email: adminEmail } = useAdminAuth();
  const [items, setItems] = useState<InventoryItemRow[] | null>(null);
  const [lots, setLots] = useState<InventoryStockLotRow[]>([]);
  const [farmers, setFarmers] = useState<FarmerRow[]>([]);
  const [addOpen, setAddOpen] = useState(false);
  const [addProduct, setAddProduct] = useState<InventoryItemRow | null>(null);
  const [stockDetail, setStockDetail] = useState<InventoryItemView | null>(null);
  const [historyItem, setHistoryItem] = useState<InventoryItemRow | null>(null);
  const [stockAvailable, setStockAvailable] = useState(false);
  const [historyAvailable, setHistoryAvailable] = useState(false);
  const [lotsAvailable, setLotsAvailable] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [levelFilter, setLevelFilter] = useState<"" | StockLevel>("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [supplierFilter, setSupplierFilter] = useState("");
  const [sortBy, setSortBy] = useState<SortOption>("name-asc");

  async function load() {
    setError(null);
    try {
      const [hasItems, hasHistory, hasLots, farmerRows] = await Promise.all([
        inventoryItemsTableExists(),
        inventoryStockHistoryTableExists(),
        inventoryStockLotsTableExists(),
        listFarmers(),
      ]);
      if (hasItems) {
        const [rows, lotRows] = await Promise.all([
          listInventoryItems(),
          hasLots ? listInventoryStockLots() : Promise.resolve([]),
        ]);
        setItems(rows);
        setLots(lotRows);
      } else {
        setItems(devItems);
        setLots(devLots);
      }
      setStockAvailable(hasItems);
      setHistoryAvailable(hasHistory);
      setLotsAvailable(hasLots);
      setFarmers(farmerRows);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Could not load inventory data.");
    }
  }

  useEffect(() => {
    void load();
  }, []);

  const views = useMemo(() => buildInventoryView(items ?? [], lots), [items, lots]);

  const levelCounts = useMemo(() => {
    if (!items) return emptyLevelCounts();
    return countLevels(
      views.map((view) => stockLevel(view.total, view.item.stock_alert_at)),
    );
  }, [items, views]);

  const categories = useMemo(() => {
    const set = new Set((items ?? []).map((row) => row.category).filter(Boolean));
    return [...set].sort((a, b) => a.localeCompare(b));
  }, [items]);

  const suppliers = useMemo(() => {
    const set = new Set<string>();
    for (const view of views) {
      for (const supplier of view.suppliers) set.add(supplier);
    }
    return [...set].sort((a, b) => a.localeCompare(b));
  }, [views]);

  const hasActiveFilters =
    query.trim() !== "" ||
    levelFilter !== "" ||
    categoryFilter !== "" ||
    supplierFilter !== "" ||
    sortBy !== "name-asc";

  function clearFilters() {
    setQuery("");
    setLevelFilter("");
    setCategoryFilter("");
    setSupplierFilter("");
    setSortBy("name-asc");
  }

  const filtered = useMemo(() => {
    if (!items) return [];
    const needle = query.trim().toLowerCase();
    const rows = views.filter((view) => {
      if (levelFilter && stockLevel(view.total, view.item.stock_alert_at) !== levelFilter) return false;
      if (categoryFilter && view.item.category !== categoryFilter) return false;
      if (supplierFilter && !view.suppliers.includes(supplierFilter)) return false;
      if (!needle) return true;
      return (
        view.item.name.toLowerCase().includes(needle) ||
        view.item.id.toLowerCase().includes(needle) ||
        view.item.category.toLowerCase().includes(needle) ||
        view.suppliers.some((supplier) => supplier.toLowerCase().includes(needle))
      );
    });
    const sorted = [...rows];
    switch (sortBy) {
      case "name-asc":
        sorted.sort((a, b) => a.item.name.localeCompare(b.item.name));
        break;
      case "name-desc":
        sorted.sort((a, b) => b.item.name.localeCompare(a.item.name));
        break;
      case "qty-asc":
        sorted.sort((a, b) => (a.total ?? Number.POSITIVE_INFINITY) - (b.total ?? Number.POSITIVE_INFINITY));
        break;
      case "qty-desc":
        sorted.sort((a, b) => (b.total ?? Number.NEGATIVE_INFINITY) - (a.total ?? Number.NEGATIVE_INFINITY));
        break;
      case "updated":
        sorted.sort((a, b) => (b.lastUpdated ?? "").localeCompare(a.lastUpdated ?? ""));
        break;
    }
    return sorted;
  }, [views, items, query, levelFilter, categoryFilter, supplierFilter, sortBy]);

  function handleStockSaved(result: { item: InventoryItemRow; lot: InventoryStockLotRow; createdNewItem: boolean }) {
    setAddOpen(false);
    setAddProduct(null);
    const unit = result.item.unit ? ` ${result.item.unit}` : "";
    setStatus(
      result.createdNewItem
        ? `Added ${result.item.name} to inventory with ${result.lot.quantity}${unit} from ${result.lot.supplier}.`
        : `Added ${result.lot.quantity}${unit} of ${result.item.name} from ${result.lot.supplier}.`,
    );
    void load();
  }

  const attentionCount = levelCounts.low + levelCounts.out;
  const statCards: { label: string; value: number; note: string; tone: StatTone }[] = [
    { label: "Total Items", value: items?.length ?? 0, note: "All inventory items", tone: "default" },
    { label: "In Stock", value: levelCounts.in, note: "Currently available", tone: "success" },
    { label: "Low Stock", value: levelCounts.low, note: "Below threshold", tone: "warning" },
    { label: "Out of Stock", value: levelCounts.out, note: "Requires restocking", tone: "danger" },
    { label: "Needs Attention", value: attentionCount, note: "Requires action", tone: "attention" },
  ];

  return (
    <div className="grid gap-5">
      <CommerceSectionHeading title="Inventory" subtitle="Track stock per product across all its suppliers.">
        <button className={btnPrimarySm} type="button" onClick={() => { setAddProduct(null); setAddOpen(true); }} disabled={!items}>+ Add stock</button>
        <button className={btnOutlineSm} type="button" onClick={() => void load()} disabled={!items}>Refresh</button>
      </CommerceSectionHeading>

      {!stockAvailable ? (
        <p className="rounded-wobbly-card border-3 border-dashed border-brand-orange bg-brand-orange/10 p-4 text-sm font-semibold text-brand-black">
          Showing example stock levels. Run <code className="rounded bg-brand-white px-1 py-0.5 text-xs">supabase/inventory-schema.sql</code> to create the inventory tables.
        </p>
      ) : null}

      {!lotsAvailable ? (
        <p className="rounded-wobbly-card border-3 border-dashed border-brand-orange bg-brand-orange/10 p-4 text-sm font-semibold text-brand-black">
          Stock lots are not enabled yet. Re-run <code className="rounded bg-brand-white px-1 py-0.5 text-xs">supabase/inventory-schema.sql</code> to create the <code className="rounded bg-brand-white px-1 py-0.5 text-xs">inventory_stock_lots</code> table and enable per-supplier stock.
        </p>
      ) : null}

      {error ? (
        <div className="grid gap-3 rounded-wobbly-card border-3 border-dashed border-brand-orange bg-brand-orange/10 p-5">
          <p className="text-sm font-semibold text-brand-black" role="alert">{error}</p>
          <div><button className={btnOutlineSm} type="button" onClick={() => void load()}>Try again</button></div>
        </div>
      ) : null}

      {status ? <p className="text-sm font-semibold text-brand-green-ink" role="status">{status}</p> : null}

      {items ? (
        <>
          <div className="grid gap-4 sm:grid-cols-2 sm:gap-5 lg:grid-cols-5">
            {statCards.map((card) => <InventoryStatCard key={card.label} label={card.label} value={card.value} note={card.note} tone={card.tone} />)}
          </div>

          <InventoryHealth counts={levelCounts} />

          <form className="grid gap-3" onSubmit={(event) => event.preventDefault()}>
            <div className="relative">
              <SearchIcon className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-brand-green-ink/60" />
              <input className={`${inputClasses} min-w-0 pl-11`} type="search" aria-label="Search inventory" placeholder="Search inventory..." value={query} onChange={(event) => setQuery(event.target.value)} />
            </div>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <select className={`${selectClasses} min-w-0`} aria-label="Filter by category" value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)}>
                <option value="">All categories</option>
                {categories.map((option) => <option key={option} value={option}>{option}</option>)}
              </select>
              <select className={`${selectClasses} min-w-0`} aria-label="Filter by stock status" value={levelFilter} onChange={(event) => setLevelFilter(event.target.value as "" | StockLevel)}>
                {levelOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
              </select>
              <select className={`${selectClasses} min-w-0`} aria-label="Filter by supplier" value={supplierFilter} onChange={(event) => setSupplierFilter(event.target.value)}>
                <option value="">All suppliers</option>
                {suppliers.map((option) => <option key={option} value={option}>{option}</option>)}
              </select>
              <select className={`${selectClasses} min-w-0`} aria-label="Sort by" value={sortBy} onChange={(event) => setSortBy(event.target.value as SortOption)}>
                {sortOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
              </select>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3">
              <button className={btnPrimarySm} type="submit">Search</button>
              {hasActiveFilters ? (
                <>
                  <p className="text-sm font-semibold text-brand-black/64">
                    Showing {filtered.length} of {items.length} items
                  </p>
                  <button className={btnOutlineSm} type="button" onClick={clearFilters}>Clear filters</button>
                </>
              ) : null}
            </div>

            {filtered.length === 0 ? (
              <p className="rounded-wobbly-card border-3 border-dashed border-brand-forest/30 bg-brand-white p-6 text-center text-sm font-semibold text-brand-black/64">No items match the current search or filters.</p>
            ) : (
              <div className="overflow-x-auto rounded-wobbly-card border-3 border-brand-forest bg-brand-white shadow-brand-soft">
                <table className="w-full min-w-200 border-collapse text-left">
                  <caption className="sr-only">Item stock levels</caption>
                  <thead>
                    <tr className="border-b-3 border-dashed border-brand-forest/30 bg-brand-warm-white text-xs font-bold uppercase tracking-[0.08em] text-brand-green-ink">
                      <th className="px-4 py-3">Product</th>
                      <th className="px-4 py-3">Category</th>
                      <th className="px-4 py-3">Total Stock</th>
                      <th className="px-4 py-3">Suppliers</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3">Last Updated</th>
                      <th className="px-4 py-3">
                        <span className="sr-only">Action</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((view) => {
                      const level = stockLevel(view.total, view.item.stock_alert_at);
                      return (
                        <tr className="border-b-2 border-dashed border-brand-forest/16 text-sm last:border-b-0 transition-colors hover:bg-brand-warm-white/70" key={view.item.id}>
                          <td className="px-4 py-3">
                            <div className="grid gap-0.5">
                              <button
                                className="w-fit text-left font-bold text-brand-forest underline decoration-2 underline-offset-4 hover:text-brand-green-ink focus-visible:outline focus-visible:outline-3 focus-visible:outline-dashed focus-visible:outline-brand-green-ink focus-visible:outline-offset-2"
                                type="button"
                                onClick={() => setStockDetail(view)}
                              >
                                {view.item.name}
                              </button>
                              <span className="text-xs text-brand-black/52">{view.item.id}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-brand-black/72">{view.item.category}</td>
                          <td className="px-4 py-3">
                            <span className="font-bold text-brand-black">{totalLabel(view)}</span>
                          </td>
                          <td className="px-4 py-3 text-brand-black/72">{supplierLabel(view)}</td>
                          <td className="px-4 py-3"><StockStatusBadge level={level} /></td>
                          <td className="px-4 py-3 text-brand-black/72">{formatLastUpdated(view.lastUpdated)}</td>
                          <td className="px-4 py-3">
                            <div className="flex items-center justify-end gap-1.5">
                              <button className={btnOutlineSm} type="button" onClick={() => { setAddProduct(view.item); setAddOpen(true); }}>Add stock</button>
                              <button className={btnOutlineSm} type="button" onClick={() => setHistoryItem(view.item)}>View history</button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </form>
        </>
      ) : null}

      <AddStockModal
        open={addOpen}
        items={items ?? []}
        farmers={farmers}
        product={addProduct}
        adminEmail={adminEmail}
        onClose={() => {
          setAddOpen(false);
          setAddProduct(null);
        }}
        onSaved={handleStockSaved}
      />

      <StockLotsModal
        open={stockDetail !== null}
        view={stockDetail}
        onClose={() => setStockDetail(null)}
        onAddStock={(item) => {
          setStockDetail(null);
          setAddProduct(item);
          setAddOpen(true);
        }}
      />

      <InventoryStockHistoryModal
        open={historyItem !== null}
        item={historyItem}
        historyEnabled={historyAvailable}
        onClose={() => setHistoryItem(null)}
      />
    </div>
  );
}
