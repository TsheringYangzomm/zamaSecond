import { useMemo, useState } from "react";
import { useContent } from "../cms/content-context";
import { farmerDzongkhags, farmerTagFilters, type Dzongkhag, type FarmTag, type Farmer } from "../data/farmers";
import { OutlineTag } from "../components/ui/tag";
import { sectionShell, sectionTitle } from "../components/ui/styles";
import { FarmerCard } from "../components/farmers/farmer-card";

type SortKey = "recent" | "name" | "products";

const sortOptions: { key: SortKey; label: string }[] = [
  { key: "recent", label: "Recently Joined" },
  { key: "name", label: "Alphabetical" },
  { key: "products", label: "Most Products" },
];

const filterButtonClasses =
  "min-h-11 touch-manipulation rounded-full border-2 border-brand-forest px-4 py-2 text-sm font-bold transition-all duration-150 ease-out focus-visible:outline focus-visible:outline-3 focus-visible:outline-dashed focus-visible:outline-brand-green-ink focus-visible:outline-offset-2 hover:shadow-brand-soft";

const activeFilterButtonClasses = "bg-brand-forest text-brand-white";
const inactiveFilterButtonClasses = "bg-brand-white text-brand-forest hover:bg-brand-yellow";

function sortFarmers(list: readonly Farmer[], sort: SortKey): Farmer[] {
  const copy = [...list];
  if (sort === "name") return copy.sort((a, b) => a.name.localeCompare(b.name));
  if (sort === "products") return copy.sort((a, b) => b.products.length - a.products.length);
  return copy.sort((a, b) => b.partnerSince - a.partnerSince || a.name.localeCompare(b.name));
}

export function FarmersPage() {
  const { farmers, blocks } = useContent();
  const page = blocks.farmersPage;
  const [search, setSearch] = useState("");
  const [activeDzongkhag, setActiveDzongkhag] = useState<Dzongkhag | "All">("All");
  const [activeTag, setActiveTag] = useState<FarmTag | "All">("All");
  const [sort, setSort] = useState<SortKey>("recent");

  const filtered = useMemo(() => {
    let list = [...farmers];
    if (activeDzongkhag !== "All") list = list.filter((f) => f.dzongkhag === activeDzongkhag);
    if (activeTag !== "All") list = list.filter((f) => (f.tags as readonly FarmTag[]).includes(activeTag));
    if (search.trim()) {
      const q = search.toLowerCase().trim();
      list = list.filter(
        (f) =>
          f.name.toLowerCase().includes(q) ||
          f.location.toLowerCase().includes(q) ||
          f.products.some((p) => p.toLowerCase().includes(q)),
      );
    }
    return sortFarmers(list, sort);
  }, [activeDzongkhag, activeTag, search, sort, farmers]);

  const resultCount = filtered.length;

  return (
    <section className="farm-story-surface full-bleed-safe relative overflow-hidden py-[clamp(2.5rem,5vw,4.5rem)]" aria-labelledby="farmers-page-title">
      <div className={`relative z-[1] grid gap-7 ${sectionShell}`}>
        <nav className="breadcrumb" aria-label="Breadcrumb">
          <ol className="flex flex-wrap items-center gap-1.5 text-sm">
            <li><a className="font-bold text-brand-green-ink underline decoration-dashed underline-offset-4 hover:text-brand-forest" href="#/">Home</a></li>
            <li aria-hidden="true" className="text-brand-black/40">/</li>
            <li aria-current="page" className="font-bold text-brand-black">Farmers</li>
          </ol>
        </nav>

        <div className="section-heading grid gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(280px,0.6fr)] sm:items-end sm:gap-10">
          <div className="grid gap-2">
            <OutlineTag>{page.tag}</OutlineTag>
            <h1 id="farmers-page-title" className={`${sectionTitle} max-w-170 text-brand-green-ink`}>{page.heading}</h1>
            <p className="max-w-150 text-[1.05rem] leading-[1.5] text-brand-black/72">{page.copy}</p>
          </div>
          <p className="text-sm font-bold text-brand-green-ink" aria-live="polite">
            <span key={resultCount}>{resultCount} farmer{resultCount === 1 ? "" : "s"}</span>
          </p>
        </div>

        {/* Search */}
        <div className="relative">
          <label htmlFor="farmer-search" className="sr-only">Search farmers by name, location, or product</label>
          <input
            id="farmer-search"
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={page.searchPlaceholder}
            className="w-full rounded-[18px_12px_16px_10px/12px_18px_10px_16px] border-3 border-brand-forest bg-brand-white px-5 py-3 font-secondary text-brand-black shadow-brand outline-none placeholder:text-brand-black/40 focus:shadow-brand-hover"
          />
        </div>

        {/* Filters */}
        <div className="grid gap-3">
          <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Filter by dzongkhag">
            <span className="text-xs font-bold text-brand-black/56">Dzongkhag:</span>
            <button type="button" className={`${filterButtonClasses} ${activeDzongkhag === "All" ? activeFilterButtonClasses : inactiveFilterButtonClasses}`} onClick={() => setActiveDzongkhag("All")} aria-pressed={activeDzongkhag === "All"}>All</button>
            {farmerDzongkhags.map((dz) => (
              <button type="button" key={dz} className={`${filterButtonClasses} ${activeDzongkhag === dz ? activeFilterButtonClasses : inactiveFilterButtonClasses}`} onClick={() => setActiveDzongkhag(dz)} aria-pressed={activeDzongkhag === dz}>{dz}</button>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Filter by category">
            <span className="text-xs font-bold text-brand-black/56">Category:</span>
            <button type="button" className={`${filterButtonClasses} ${activeTag === "All" ? activeFilterButtonClasses : inactiveFilterButtonClasses}`} onClick={() => setActiveTag("All")} aria-pressed={activeTag === "All"}>All</button>
            {farmerTagFilters.map((tag) => (
              <button type="button" key={tag} className={`${filterButtonClasses} ${activeTag === tag ? activeFilterButtonClasses : inactiveFilterButtonClasses}`} onClick={() => setActiveTag(tag)} aria-pressed={activeTag === tag}>{tag}</button>
            ))}
          </div>
          <div className="flex items-center gap-3">
            <label htmlFor="farmer-sort" className="text-xs font-bold text-brand-black/56">Sort:</label>
            <select id="farmer-sort" value={sort} onChange={(e) => setSort(e.target.value as SortKey)} className="rounded-full border-2 border-brand-forest bg-brand-white px-3 py-2 text-sm font-bold text-brand-forest focus-visible:outline focus-visible:outline-3 focus-visible:outline-dashed focus-visible:outline-brand-green-ink focus-visible:outline-offset-2">
              {sortOptions.map((opt) => (
                <option key={opt.key} value={opt.key}>{opt.label}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Grid or empty state */}
        {filtered.length === 0 ? (
          <div className="grid gap-4 rounded-[26px_38px_22px_34px/34px_24px_38px_22px] border-3 border-dashed border-brand-forest/30 bg-brand-warm-white p-8 text-center shadow-brand-soft">
            <div className="grid place-items-center">
              <div className="grid h-20 w-20 place-items-center rounded-full border-3 border-brand-forest/20 bg-brand-mint font-primary text-2xl font-bold text-brand-forest/40">?</div>
            </div>
            <p className="font-primary text-[clamp(1.4rem,2.4vw,1.9rem)] font-bold text-brand-black">{page.emptyTitle}</p>
            <p className="max-w-sm justify-self-center text-sm text-brand-black/64">{page.emptyCopy}</p>
            <div className="flex justify-center">
              <button type="button" className={`${filterButtonClasses} ${inactiveFilterButtonClasses}`} onClick={() => { setSearch(""); setActiveDzongkhag("All"); setActiveTag("All"); }}>{page.emptyCtaLabel}</button>
            </div>
          </div>
        ) : (
          <div className="grid gap-8 sm:grid-cols-2" id="farmers-grid" key={`${activeDzongkhag}:${activeTag}:${search}:${sort}`}>
            {filtered.map((farmer, index) => (
              <div className="farmers-grid-item min-w-0 self-start" key={farmer.id} style={{ animationDelay: `${index * 50}ms` }}>
                <FarmerCard farmer={farmer} image={farmer.image || "assets/farmer.webp"} detailed />
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
