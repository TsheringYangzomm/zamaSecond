import { useEffect, useRef, useState } from "react";
import { useCart } from "../cart-context";
import { shopProducts } from "../data/landing";
import { OutlineLink } from "../components/ui/action-link";
import { OutlineTag } from "../components/ui/tag";
import { sectionShell, sectionTitle } from "../components/ui/styles";
import { FeaturedShopCard, SupportingShopCard } from "../components/shop/product-cards";
import {
  categories,
  getInitialCategory,
  getInitialFilter,
  setCategoryInUrl,
  setFilterInUrl,
  shopFilters,
  type Category,
  type ShopProduct,
} from "../components/shop/shop-utils";

const filterButtonClasses =
  "min-h-11 touch-manipulation rounded-full border-2 border-brand-forest px-4 py-2 text-sm font-bold transition-all duration-150 ease-out focus-visible:outline focus-visible:outline-3 focus-visible:outline-dashed focus-visible:outline-brand-green-ink focus-visible:outline-offset-2 hover:-translate-y-0.5 hover:shadow-brand-soft";
const activeFilterButtonClasses = "bg-brand-forest text-brand-white hover:-rotate-1";
const inactiveFilterButtonClasses = "bg-brand-white text-brand-forest hover:bg-brand-yellow";

type FilterChipsProps = {
  activeCategory: Category;
  activeFilter: string;
  onSelectCategory: (category: Category) => void;
  onSelectFilter: (filter: string) => void;
  onClear: () => void;
  hidden?: boolean;
};

function FilterChips({ activeCategory, activeFilter, onSelectCategory, onSelectFilter, onClear, hidden = false }: FilterChipsProps) {
  const interactive = hidden ? -1 : undefined;
  return (
    <div className="flex w-max items-center gap-2 pr-2" aria-label="Shop filters" aria-hidden={hidden || undefined}>
      <button
        type="button"
        tabIndex={interactive}
        className={`${filterButtonClasses} ${activeCategory === "All" && activeFilter === "All" ? activeFilterButtonClasses : inactiveFilterButtonClasses}`}
        onClick={onClear}
        aria-pressed={activeCategory === "All" && activeFilter === "All"}
        aria-controls="product-grid"
      >
        All
      </button>
      {shopFilters.map(({ slug, label }) => (
        <button
          type="button"
          tabIndex={interactive}
          key={slug}
          className={`${filterButtonClasses} ${activeFilter === slug ? activeFilterButtonClasses : inactiveFilterButtonClasses}`}
          onClick={() => onSelectFilter(slug)}
          aria-pressed={activeFilter === slug}
          aria-controls="product-grid"
        >
          {label}
        </button>
      ))}
      <span aria-hidden="true" className="mx-1 h-6 w-px bg-brand-forest/25" />
      {categories.filter((item) => item !== "All").map((item) => (
        <button
          type="button"
          tabIndex={interactive}
          key={item}
          className={`${filterButtonClasses} ${activeCategory === item ? activeFilterButtonClasses : inactiveFilterButtonClasses}`}
          onClick={() => onSelectCategory(item)}
          aria-pressed={activeCategory === item}
          aria-controls="product-grid"
        >
          {item}
        </button>
      ))}
    </div>
  );
}

export function ShopPage() {
  const {
    cartQuantity,
    addToCart,
  } = useCart();
  const [category, setCategory] = useState<Category>(getInitialCategory);
  const [filter, setFilter] = useState<string>(getInitialFilter);
  const [cartAnnouncement, setCartAnnouncement] = useState("");
  const barRef = useRef<HTMLDivElement>(null);
  const measureRef = useRef<HTMLDivElement>(null);
  const [isOverflowing, setIsOverflowing] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    const measure = () => {
      const bar = barRef.current;
      const measureEl = measureRef.current;
      if (!bar || !measureEl) return;
      setIsOverflowing(measureEl.offsetWidth > bar.clientWidth);
    };
    let motionQuery: MediaQueryList | undefined;
    const updateMotion = () => setReducedMotion(motionQuery?.matches ?? false);
    if (typeof window.matchMedia === "function") {
      motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
      updateMotion();
      motionQuery.addEventListener("change", updateMotion);
    }
    measure();
    window.addEventListener("resize", measure);
    return () => {
      window.removeEventListener("resize", measure);
      motionQuery?.removeEventListener("change", updateMotion);
    };
  }, []);

  const activeFilter = shopFilters.find((item) => item.slug === filter);
  const visibleProducts = shopProducts.filter((product) =>
    (category === "All" || product.category === category) &&
    (activeFilter ? activeFilter.matches(product) : true),
  );
  const [featuredProduct, ...supportingProducts] = visibleProducts;

  function selectCategory(nextCategory: Category) {
    setCategory(nextCategory);
    setCategoryInUrl(nextCategory);
    if (nextCategory !== "All") {
      setFilter("All");
      setFilterInUrl("All");
    }
  }

  function selectFilter(nextFilter: string) {
    setFilter(nextFilter);
    setFilterInUrl(nextFilter);
    if (nextFilter !== "All") {
      setCategory("All");
      setCategoryInUrl("All");
    }
  }

  function clearFilters() {
    selectCategory("All");
    selectFilter("All");
  }

  function handleAddToCart(product: ShopProduct) {
    addToCart(product.id);
    const nextQuantity = cartQuantity + 1;
    setCartAnnouncement(`${product.name} added to cart. ${nextQuantity} item${nextQuantity === 1 ? "" : "s"} in cart.`);
  }

  return (
    <section className="shop-catalog-surface full-bleed-safe relative overflow-hidden" aria-labelledby="shop-page-title">
      <div className={`relative z-[1] grid gap-7 py-[clamp(2.5rem,5vw,4.5rem)] ${sectionShell}`}>
        <nav className="breadcrumb" aria-label="Breadcrumb">
          <ol className="flex flex-wrap items-center gap-1.5 text-sm">
            <li><a className="font-bold text-brand-green-ink underline decoration-dashed underline-offset-4 hover:text-brand-forest" href="#/">Home</a></li>
            <li aria-hidden="true" className="text-brand-black/40">/</li>
            <li aria-current="page" className="font-bold text-brand-black">Shop</li>
          </ol>
        </nav>

        <div className="section-heading grid gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(280px,0.6fr)] sm:items-end sm:gap-10">
          <div className="grid gap-2">
            <OutlineTag>Zama Shop</OutlineTag>
            <h1 id="shop-page-title" className={`${sectionTitle} max-w-170 text-brand-green-ink`}>All products, one basket.</h1>
            <p className="max-w-150 text-[1.05rem] leading-[1.5] text-brand-black/72">Every fresh box, meal kit, and grocery top-up in the launch range — with price, portions, and contents shown before you add them to one shared basket.</p>
          </div>
          <p className="text-sm font-bold text-brand-green-ink" aria-live="polite">
            <span className="shop-count-pop" key={visibleProducts.length}>{visibleProducts.length} product{visibleProducts.length === 1 ? "" : "s"} on the shelf</span>
          </p>
        </div>

        <div className="market-filter-bar relative overflow-hidden rounded-[24px_18px_28px_16px/18px_28px_16px_24px] border-3 border-brand-forest bg-brand-warm-white p-3 shadow-brand" ref={barRef}>
          {isOverflowing ? (
            reducedMotion ? (
              <div className="max-w-full overflow-x-auto">
                <FilterChips
                  activeCategory={category}
                  activeFilter={filter}
                  onSelectCategory={selectCategory}
                  onSelectFilter={selectFilter}
                  onClear={clearFilters}
                />
              </div>
            ) : (
              <div className="filter-marquee">
                <FilterChips
                  activeCategory={category}
                  activeFilter={filter}
                  onSelectCategory={selectCategory}
                  onSelectFilter={selectFilter}
                  onClear={clearFilters}
                />
                <FilterChips
                  hidden
                  activeCategory={category}
                  activeFilter={filter}
                  onSelectCategory={selectCategory}
                  onSelectFilter={selectFilter}
                  onClear={clearFilters}
                />
              </div>
            )
          ) : (
            <FilterChips
              activeCategory={category}
              activeFilter={filter}
              onSelectCategory={selectCategory}
              onSelectFilter={selectFilter}
              onClear={clearFilters}
            />
          )}
          <div ref={measureRef} aria-hidden="true" className="invisible pointer-events-none absolute left-0 top-0 z-[-1] w-max">
            <FilterChips
              activeCategory={category}
              activeFilter={filter}
              onSelectCategory={selectCategory}
              onSelectFilter={selectFilter}
              onClear={clearFilters}
            />
          </div>
        </div>

        {visibleProducts.length === 0 ? (
          <div className="grid gap-3 rounded-[26px_38px_22px_34px/34px_24px_38px_22px] border-3 border-dashed border-brand-forest/30 bg-brand-warm-white p-6 text-center shadow-brand-soft">
            <p className="font-primary text-[clamp(1.4rem,2.4vw,1.9rem)] font-bold text-brand-black">Nothing on the shelf for that combination.</p>
            <p className="text-sm text-brand-black/64">Try a different filter, or clear everything and browse the whole range.</p>
            <div className="flex justify-center">
              <button className={`${filterButtonClasses} ${inactiveFilterButtonClasses}`} type="button" onClick={clearFilters}>Clear filters</button>
            </div>
          </div>
        ) : (
          <div className="grid gap-5" id="product-grid" key={`${category}:${filter}`}>
            {featuredProduct ? (
              <div className="shop-grid-item">
                <FeaturedShopCard product={featuredProduct} onAdd={handleAddToCart} />
              </div>
            ) : null}
            {supportingProducts.length > 0 ? (
              <div className={`grid content-start items-start gap-4 ${supportingProducts.length >= 2 ? "md:grid-cols-2" : ""} ${supportingProducts.length >= 3 ? "lg:grid-cols-3" : ""}`}>
                {supportingProducts.map((product, index) => (
                  <div className="shop-grid-item min-w-0 self-start" key={product.id} style={{ animationDelay: `${(index + 1) * 60}ms` }}>
                    <SupportingShopCard product={product} onAdd={handleAddToCart} />
                  </div>
                ))}
              </div>
            ) : null}
          </div>
        )}

        <aside className="grid gap-4 rounded-[26px_38px_22px_34px/34px_24px_38px_22px] border-3 border-brand-forest bg-brand-mint p-5 shadow-brand sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center" aria-label="Delivery information">
          <div>
            <h2 className="font-primary text-[clamp(1.4rem,2.4vw,1.9rem)] font-bold text-brand-black">Preparing for Thimphu deliveries.</h2>
            <p className="mt-1 max-w-140 text-brand-black/72">Coverage, hours, and delivery fees will be published before orders open. No payment or order is created at launch.</p>
          </div>
          <OutlineLink href="#delivery">Review delivery details</OutlineLink>
        </aside>

        <p className="sr-only" role="status" aria-live="polite">{cartAnnouncement}</p>
      </div>
    </section>
  );
}
