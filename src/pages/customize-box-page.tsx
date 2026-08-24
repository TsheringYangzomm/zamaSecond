import { useEffect, useMemo, useState } from "react";
import { useCart } from "../cart-context";
import { loadInventoryCatalog } from "../checkout/inventory-catalog";
import { customBoxCartKey } from "../components/shop/cart-lines";
import { OutlineTag } from "../components/ui/tag";
import { btnOutlineSm, btnPrimaryLg, sectionShell, sectionTitle } from "../components/ui/styles";
import { PackageIcon, SearchIcon, ShoppingBagIcon } from "../components/ui/icons";
import type { InventoryItemRow } from "../cms/types";

type StockLevel = "in" | "low" | "out" | "untracked";

function stockLevelOf(quantity: number | null, alertAt: number | null): StockLevel {
  if (quantity == null) return "untracked";
  if (quantity <= 0) return "out";
  if (alertAt != null && quantity <= alertAt) return "low";
  return "in";
}

const stockBadgeClasses: Record<StockLevel, string> = {
  in: "border-brand-forest bg-brand-mint text-brand-green-ink",
  low: "border-brand-orange-ink bg-brand-buff text-brand-orange-ink",
  out: "border-brand-orange bg-brand-orange/15 text-brand-orange-ink",
  untracked: "border-brand-black/30 bg-brand-white text-brand-black/52",
};

const stockLabels: Record<StockLevel, string> = {
  in: "In stock",
  low: "Low stock",
  out: "Out of stock",
  untracked: "Stock not tracked",
};

const categoryBadgeClasses: Record<string, string> = {
  "Fresh produce": "bg-brand-lime text-brand-forest",
  "Meat & protein": "bg-brand-orange/18 text-brand-orange-ink",
  "Dairy & poultry": "bg-brand-buff text-brand-forest",
  "Dairy & pantry": "bg-brand-yellow text-brand-black",
  Pantry: "bg-brand-mint text-brand-forest",
  Snacks: "bg-brand-purple text-brand-white",
  Frozen: "bg-brand-white text-brand-forest",
};

function categoryBadge(category: string): string {
  return categoryBadgeClasses[category] ?? "bg-brand-warm-white text-brand-forest";
}

const focusRing =
  "focus-visible:outline focus-visible:outline-3 focus-visible:outline-dashed focus-visible:outline-brand-green-ink focus-visible:outline-offset-2";

const stepperButtonClasses =
  "grid h-11 w-11 touch-manipulation place-items-center rounded-wobbly-md font-bold text-brand-forest hover:bg-brand-white focus-visible:outline focus-visible:outline-3 focus-visible:outline-dashed focus-visible:outline-brand-green-ink focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent";

const filterButtonClasses =
  "min-h-11 touch-manipulation rounded-full border-2 border-brand-forest px-4 py-2 text-sm font-bold transition-all duration-150 ease-out focus-visible:outline focus-visible:outline-3 focus-visible:outline-dashed focus-visible:outline-brand-green-ink focus-visible:outline-offset-2 hover:shadow-brand-soft";

const fieldClasses =
  "min-h-11.5 w-full min-w-0 rounded-[20px_28px_16px_24px/24px_16px_28px_20px] border-3 border-brand-forest bg-brand-white px-4 py-[0.65rem] text-brand-black shadow-brand-soft outline-none placeholder:text-brand-black/46 focus-visible:border-brand-green-ink focus-visible:ring-4 focus-visible:ring-brand-leaf/20";

type ItemSelection = Record<string, number>;

function maxQuantity(item: InventoryItemRow): number | null {
  return typeof item.stock_quantity === "number" ? item.stock_quantity : null;
}

function ItemCard({ item, quantity, onSetQuantity }: { item: InventoryItemRow; quantity: number; onSetQuantity: (id: string, quantity: number) => void }) {
  const level = stockLevelOf(item.stock_quantity, item.stock_alert_at);
  const max = maxQuantity(item);
  const disabled = level === "out";

  return (
    <article className="grid content-start gap-3 rounded-wobbly-card border-3 border-t-8 border-brand-forest bg-brand-white p-4 shadow-brand-soft transition-shadow duration-150 ease-in-out hover:-translate-x-px hover:-translate-y-px hover:shadow-brand" aria-labelledby={`customize-${item.id}-title`}>
      <div className="flex flex-wrap items-center gap-2">
        <span className={`rounded-full border-2 border-brand-forest px-2 py-1 text-xs font-bold ${categoryBadge(item.category)}`}>{item.category || "Other"}</span>
        <span className={`ml-auto rounded-full border-2 px-2 py-1 text-xs font-bold ${stockBadgeClasses[level]}`}>{stockLabels[level]}{item.stock_quantity != null ? ` · ${item.stock_quantity} ${item.unit}` : ""}</span>
      </div>
      <h3 className="font-primary text-[1.55rem] font-bold leading-[1.02] text-brand-black" id={`customize-${item.id}-title`}>{item.name}</h3>
      <p className="text-sm leading-[1.42] text-brand-black/64">
        {item.unit ? `Sells by ${item.unit}.` : "Priced by unit."}{item.supplier ? ` Supplied by ${item.supplier}.` : ""}
      </p>
      <div className="mt-auto flex flex-wrap items-center justify-between gap-3 border-t-2 border-dashed border-brand-forest/22 pt-3">
        <div className="inline-flex items-center rounded-wobbly-md border-2 border-brand-forest bg-brand-mint">
          <button className={stepperButtonClasses} type="button" disabled={quantity === 0} onClick={() => onSetQuantity(item.id, quantity - 1)} aria-label={`Decrease ${item.name} quantity`}>−</button>
          <span className="min-w-9 text-center font-bold tabular-nums text-brand-black" aria-label={`${quantity} ${item.name} in box`}>{quantity}</span>
          <button className={stepperButtonClasses} type="button" disabled={disabled || (max != null && quantity >= max)} onClick={() => onSetQuantity(item.id, quantity + 1)} aria-label={`Increase ${item.name} quantity`}>+</button>
        </div>
        {disabled ? <p className="text-xs font-bold text-brand-orange-ink">Back soon</p> : null}
      </div>
    </article>
  );
}

export function CustomizeBoxPage() {
  const { setCartQuantity, openCart } = useCart();
  const [items, setItems] = useState<InventoryItemRow[] | null>(null);
  const [selection, setSelection] = useState<ItemSelection>({});
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("All");
  const [announcement, setAnnouncement] = useState("");

  useEffect(() => {
    let cancelled = false;
    void loadInventoryCatalog().then((rows) => {
      if (cancelled) return;
      setItems(rows);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const categories = useMemo(() => {
    const set = new Set((items ?? []).map((item) => item.category).filter(Boolean));
    return ["All", ...[...set].sort((a, b) => a.localeCompare(b))];
  }, [items]);

  const visibleItems = useMemo(() => {
    if (!items) return [];
    const needle = query.trim().toLowerCase();
    return items.filter((item) => {
      if (category !== "All" && item.category !== category) return false;
      if (!needle) return true;
      return (
        item.name.toLowerCase().includes(needle) ||
        item.category.toLowerCase().includes(needle) ||
        item.supplier.toLowerCase().includes(needle)
      );
    });
  }, [items, query, category]);

  const selectedCount = Object.values(selection).reduce((total, quantity) => total + quantity, 0);

  function setQuantity(id: string, quantity: number) {
    const item = items?.find((candidate) => candidate.id === id);
    const max = item ? maxQuantity(item) : null;
    const next = Math.max(0, max != null ? Math.min(quantity, max) : quantity);
    setSelection((current) => {
      const nextSelection = { ...current };
      if (next === 0) delete nextSelection[id];
      else nextSelection[id] = next;
      return nextSelection;
    });
  }

  function handleAddToCart() {
    const picks = Object.entries(selection).filter(([, quantity]) => quantity > 0);
    if (picks.length === 0) return;
    for (const [itemId, quantity] of picks) {
      setCartQuantity(customBoxCartKey(itemId), quantity);
    }
    setAnnouncement(`${selectedCount} item${selectedCount === 1 ? "" : "s"} added to your box.`);
    openCart();
  }

  const hasActiveFilters = query.trim() !== "" || category !== "All";

  return (
    <section className="customize-box-surface full-bleed-safe relative overflow-hidden" aria-labelledby="customize-box-title">
      <div className={`relative z-[1] grid gap-7 py-[clamp(2.5rem,5vw,4.5rem)] ${sectionShell}`}>
        <nav className="breadcrumb" aria-label="Breadcrumb">
          <ol className="flex flex-wrap items-center gap-1.5 text-sm">
            <li><a className="font-bold text-brand-green-ink underline decoration-dashed underline-offset-4 hover:text-brand-forest" href="#/">Home</a></li>
            <li aria-hidden="true" className="text-brand-black/40">/</li>
            <li><a className="font-bold text-brand-green-ink underline decoration-dashed underline-offset-4 hover:text-brand-forest" href="#/shop">Shop</a></li>
            <li aria-hidden="true" className="text-brand-black/40">/</li>
            <li aria-current="page" className="font-bold text-brand-black">Customize your box</li>
          </ol>
        </nav>

        <div className="section-heading grid gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(280px,0.6fr)] sm:items-end sm:gap-10">
          <div className="grid gap-2">
            <OutlineTag>Build your own</OutlineTag>
            <h1 id="customize-box-title" className={`${sectionTitle} max-w-170 text-brand-green-ink`}>Customize your box.</h1>
            <p className="max-w-150 text-[1.05rem] leading-[1.5] text-brand-black/72">Pick any item we stock, in the quantity you want, and fill a box that fits your kitchen. Everything lands in one shared basket.</p>
          </div>
          <p className="text-sm font-bold text-brand-green-ink" aria-live="polite">
            <span className="shop-count-pop" key={visibleItems.length}>{items === null ? "Loading inventory..." : `${visibleItems.length} item${visibleItems.length === 1 ? "" : "s"} on the shelf`}</span>
          </p>
        </div>

        <div className="grid gap-3 rounded-[24px_18px_28px_16px/18px_28px_16px_24px] border-3 border-brand-forest bg-brand-warm-white p-3 shadow-brand sm:grid-cols-[minmax(220px,0.5fr)_minmax(0,1.5fr)]">
          <label className="relative block">
            <span className="sr-only">Search inventory</span>
            <SearchIcon className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-brand-green-ink" />
            <input className={`${fieldClasses} pl-11`} type="search" placeholder="Search by name, category, or supplier..." value={query} onChange={(event) => setQuery(event.target.value)} />
          </label>
          <div className="flex w-max items-center gap-2 overflow-x-auto pr-1" aria-label="Filter by category">
            {categories.map((itemCategory) => (
              <button
                type="button"
                key={itemCategory}
                className={`${filterButtonClasses} ${category === itemCategory ? "bg-brand-forest text-brand-white" : "bg-brand-white text-brand-forest hover:bg-brand-yellow"}`}
                onClick={() => setCategory(itemCategory)}
                aria-pressed={category === itemCategory}
              >
                {itemCategory}
              </button>
            ))}
          </div>
        </div>

        {items === null ? (
          <div className="grid gap-3 rounded-[26px_38px_22px_34px/34px_24px_38px_22px] border-3 border-dashed border-brand-forest/30 bg-brand-warm-white p-10 text-center shadow-brand-soft">
            <p className="font-primary text-[clamp(1.4rem,2.4vw,1.9rem)] font-bold text-brand-black">Loading the shelves...</p>
          </div>
        ) : visibleItems.length === 0 ? (
          <div className="grid gap-3 rounded-[26px_38px_22px_34px/34px_24px_38px_22px] border-3 border-dashed border-brand-forest/30 bg-brand-warm-white p-6 text-center shadow-brand-soft">
            <p className="font-primary text-[clamp(1.4rem,2.4vw,1.9rem)] font-bold text-brand-black">{hasActiveFilters ? "Nothing on the shelf for that combination." : "No stockable items yet."}</p>
            <p className="text-sm text-brand-black/64">{hasActiveFilters ? "Try a different search or category, or clear everything and browse the whole range." : "The team is adding inventory — check back soon."}</p>
            {hasActiveFilters ? (
              <div className="flex justify-center">
                <button className={`${filterButtonClasses} bg-brand-white text-brand-forest hover:bg-brand-yellow`} type="button" onClick={() => { setQuery(""); setCategory("All"); }}>Clear filters</button>
              </div>
            ) : null}
          </div>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3" id="customize-item-grid">
            {visibleItems.map((item) => (
              <ItemCard key={item.id} item={item} quantity={selection[item.id] ?? 0} onSetQuantity={setQuantity} />
            ))}
          </div>
        )}

        <div className="grid gap-4 rounded-[26px_38px_22px_34px/34px_24px_38px_22px] border-3 border-brand-forest bg-brand-mint p-5 shadow-brand sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
          <div className="grid gap-1">
            <div className="flex flex-wrap items-center gap-2">
              <PackageIcon className="text-brand-green-ink" />
              <h2 className="font-primary text-[clamp(1.4rem,2.4vw,1.9rem)] font-bold text-brand-black">Your box</h2>
            </div>
            <p className="text-brand-black/72">
              <span className="tabular-nums font-bold">{selectedCount}</span> item{selectedCount === 1 ? "" : "s"} picked. Prices are confirmed at checkout — this is a launch preview.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <button className={`${btnPrimaryLg} gap-2`} type="button" onClick={handleAddToCart} disabled={selectedCount === 0}>
              <ShoppingBagIcon />
              Add {selectedCount > 0 ? `${selectedCount} item${selectedCount === 1 ? "" : "s"}` : "items"} to basket
            </button>
            <a className={btnOutlineSm} href="#/shop">Browse the shop instead</a>
          </div>
        </div>

        <aside className="grid gap-3 rounded-[26px_38px_22px_34px/34px_24px_38px_22px] border-3 border-brand-forest bg-brand-warm-white p-5 shadow-brand-soft" aria-label="Delivery information">
          <h2 className="font-primary text-[clamp(1.3rem,2.2vw,1.7rem)] font-bold text-brand-black">Delivery</h2>
          <p className="max-w-140 text-brand-black/72">Delivery coverage, hours, and fees for Thimphu will be published before orders open. No payment or order is created at launch.</p>
          <div>
            <a className={`inline-flex min-h-10 items-center font-bold text-brand-green-ink underline decoration-dashed underline-offset-4 hover:text-brand-forest ${focusRing}`} href="#delivery">Review delivery details</a>
          </div>
        </aside>

        <p className="sr-only" role="status" aria-live="polite">{announcement}</p>
      </div>
    </section>
  );
}
