import { useEffect, useRef, useState } from "react";
import { useCart } from "../../cart-context";
import { shopProducts } from "../../data/landing";
import { YellowTag } from "../../components/ui/tag";
import { btnPrimaryKit, sectionShell } from "../../components/ui/styles";

type ShopProduct = (typeof shopProducts)[number];

const categories = ["All", "Fresh boxes", "Meal kits", "Groceries"] as const;
type Category = (typeof categories)[number];

const categoryBadgeClasses: Record<ShopProduct["category"], string> = {
  "Fresh boxes": "bg-brand-lime text-brand-forest",
  "Meal kits": "bg-brand-purple text-brand-white",
  Groceries: "bg-brand-orange/18 text-brand-orange-ink",
};

const categoryRailClasses: Record<ShopProduct["category"], string> = {
  "Fresh boxes": "border-t-brand-leaf",
  "Meal kits": "border-t-brand-purple",
  Groceries: "border-t-brand-orange",
};

const numberFormatter = new Intl.NumberFormat("en-BT", { maximumFractionDigits: 0 });

function categorySlug(category: Category) {
  return category.toLowerCase().replaceAll(" ", "-");
}

function getInitialCategory(): Category {
  if (typeof window === "undefined") return "All";
  const requestedCategory = new URLSearchParams(window.location.search).get("category");
  return categories.find((category) => categorySlug(category) === requestedCategory) ?? "All";
}

function productPrice(product: ShopProduct) {
  return product.priceAmount === null ? product.priceLabel : `Nu. ${numberFormatter.format(product.priceAmount)} ${product.priceUnit}`;
}

function AddToCartIcon() {
  return (
    <svg className="shrink-0" width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M3 4h2.2l1.55 10.05a2 2 0 0 0 1.98 1.7h8.84a2 2 0 0 0 1.94-1.5L21 8H6.05" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M15.5 3.5v5M13 6h5" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" />
      <path d="M9 20h.01M18 20h.01" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path d="M4 4l12 12M16 4 4 16" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
    </svg>
  );
}

function ProductDetail({ product, compact = false }: { product: ShopProduct; compact?: boolean }) {
  const detailRows = [
    { label: "Ingredients", value: product.ingredients },
    { label: "Allergens", value: product.allergenNotice },
    { label: "Storage", value: product.storage },
    { label: "Source", value: product.source },
    { label: "Nutrition", value: product.nutrition },
  ] as const;

  return (
    <details className="group/product-details mt-1 rounded-wobbly-md border-2 border-dashed border-brand-forest/36 bg-brand-buff/70 px-3 text-sm text-brand-black open:border-solid open:bg-brand-warm-white open:shadow-brand-soft" name="product-details">
      <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-3 rounded-wobbly-md font-bold marker:content-none focus-visible:outline focus-visible:outline-3 focus-visible:outline-dashed focus-visible:outline-brand-green-ink focus-visible:outline-offset-3 [&::-webkit-details-marker]:hidden">
        <span>Product Details</span>
        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full border-2 border-brand-forest bg-brand-white text-xl leading-none text-brand-forest transition-transform duration-150 group-open/product-details:rotate-45" aria-hidden="true">+</span>
      </summary>
      <div className="border-t-2 border-dashed border-brand-forest/22 pb-3 pt-3">
        <dl className={`grid content-start gap-3 ${compact ? "" : "sm:grid-cols-2"}`}>
          {detailRows.map((row) => (
            <div className="grid min-w-0 content-start gap-0.5" key={row.label}>
              <dt className="text-xs font-bold uppercase tracking-[0.06em] text-brand-green-ink">{row.label}</dt>
              <dd className="break-words leading-[1.45] text-brand-black/72">{row.value}</dd>
            </div>
          ))}
        </dl>
        <p className="mt-3 border-t border-dashed border-brand-forest/20 pt-2 text-xs text-brand-black/58">
          Product code: <span className="break-all font-mono" translate="no">{product.sku}</span>
        </p>
      </div>
    </details>
  );
}

function ProductFacts({ product, compact = false }: { product: ShopProduct; compact?: boolean }) {
  return (
    <dl className={`grid grid-cols-2 gap-2 rounded-wobbly-md border-2 border-brand-forest/18 bg-brand-mint p-3 text-sm ${compact ? "text-xs" : ""}`}>
      <div className="grid min-w-0 gap-0.5"><dt className="text-[0.68rem] font-bold uppercase tracking-[0.06em] text-brand-green-ink">Portion</dt><dd className="text-brand-black/72">{product.servings}</dd></div>
      <div className="grid min-w-0 gap-0.5"><dt className="text-[0.68rem] font-bold uppercase tracking-[0.06em] text-brand-green-ink">Prep</dt><dd className="text-brand-black/72">{product.cookingTime}</dd></div>
      {!compact ? <div className="col-span-2 flex min-w-0 items-start justify-between gap-3 border-t border-dashed border-brand-forest/24 pt-2"><dt className="text-[0.68rem] font-bold uppercase tracking-[0.06em] text-brand-green-ink">Availability</dt><dd className="text-right text-brand-black/72">{product.availability}</dd></div> : null}
    </dl>
  );
}

function FeaturedShopCard({ product, onAdd }: { product: ShopProduct; onAdd: (product: ShopProduct) => void }) {
  const headingId = `${product.id}-title`;

  return (
    <article className="shop-feature-card relative grid gap-4 overflow-hidden rounded-wobbly-card border-4 border-brand-forest bg-brand-white p-4 shadow-brand transition-[box-shadow,transform] duration-150 ease-in-out hover:-translate-x-px hover:-translate-y-px hover:shadow-brand-hover sm:p-5 md:grid-cols-[minmax(240px,0.9fr)_minmax(0,1.1fr)]" id={product.id} aria-labelledby={headingId}>
      <div className="brand-pattern relative grid min-h-72 place-items-center overflow-hidden rounded-wobbly-card border-2 border-dashed border-brand-forest/36 p-4 md:min-h-110">
        <img className="h-64 w-full object-contain md:h-auto md:max-h-100" src={product.image} alt={product.alt} loading="lazy" decoding="async" width="420" height="340" />
        <span className="absolute left-3 top-3 rounded-full border-2 border-brand-forest bg-brand-yellow px-2 py-1 text-xs font-bold text-brand-black">Today’s field pick</span>
        <span className={`absolute right-3 bottom-3 rounded-full border-2 border-brand-forest px-2 py-1 text-xs font-bold ${categoryBadgeClasses[product.category]}`}>{product.category}</span>
      </div>
      <div className="grid min-w-0 content-start gap-3">
        <YellowTag>{product.eyebrow}</YellowTag>
        <h3 className="font-primary text-[clamp(2rem,4vw,3.4rem)] font-bold leading-[0.98] text-brand-black" id={headingId}>{product.name}</h3>
        <p className="text-[1.05rem] leading-[1.5] text-brand-black/72">{product.description}</p>
        <ProductFacts product={product} />
        <div className="flex flex-wrap gap-2">
          {product.tags.map((tag) => <span className="rounded-full border-2 border-brand-forest/30 bg-brand-white px-2 py-1 text-xs font-medium text-brand-black/72" key={tag}>{tag}</span>)}
        </div>
        <strong className="text-brand-orange-ink">{productPrice(product)}</strong>
        <p className="text-xs text-brand-black/64">{product.deliveryEstimate}</p>
        <ProductDetail product={product} />
        <button className={`${btnPrimaryKit} mt-auto w-full gap-2`} type="button" onClick={() => onAdd(product)} aria-label={`Add ${product.name} to cart`}>
          <AddToCartIcon />
          Add to Cart
        </button>
      </div>
    </article>
  );
}

function SupportingShopCard({ product, onAdd }: { product: ShopProduct; onAdd: (product: ShopProduct) => void }) {
  const headingId = `${product.id}-title`;

  return (
    <article className={`shop-note-card grid self-start content-start grid-cols-[96px_minmax(0,1fr)] gap-3 rounded-wobbly-card border-3 border-t-8 border-brand-forest ${categoryRailClasses[product.category]} bg-brand-white p-3 shadow-brand-soft transition-[box-shadow,transform] duration-150 ease-in-out hover:-translate-x-px hover:-translate-y-px hover:shadow-brand sm:grid-cols-[112px_minmax(0,1fr)]`} id={product.id} aria-labelledby={headingId}>
      <div className="brand-pattern relative grid min-h-34 place-items-center overflow-hidden rounded-wobbly-md border-2 border-dashed border-brand-forest/30 p-2">
        <img className="h-28 w-full object-contain" src={product.image} alt={product.alt} loading="lazy" decoding="async" width="210" height="170" />
        <span className={`absolute right-1.5 bottom-1.5 rounded-full border-2 border-brand-forest px-2 py-1 text-[0.65rem] font-bold ${categoryBadgeClasses[product.category]}`}>{product.category}</span>
      </div>
      <div className="grid min-w-0 content-start gap-1.5">
        <p className="text-[0.68rem] font-bold uppercase tracking-[0.08em] text-brand-green-ink">{product.eyebrow}</p>
        <h3 className="font-primary text-[1.45rem] font-bold leading-[1] text-brand-black" id={headingId}>{product.name}</h3>
        <p className="line-clamp-2 text-sm leading-[1.35] text-brand-black/72">{product.description}</p>
        <strong className="text-sm text-brand-orange-ink">{productPrice(product)}</strong>
      </div>
      <div className="col-span-full"><ProductFacts product={product} compact /></div>
      <div className="col-span-full"><ProductDetail product={product} compact /></div>
      <button className={`${btnPrimaryKit} col-span-full w-full gap-2`} type="button" onClick={() => onAdd(product)} aria-label={`Add ${product.name} to cart`}>
        <AddToCartIcon />
        Add to Cart
      </button>
    </article>
  );
}

function CartLine({ product, quantity, onChange, onRemove }: { product: ShopProduct; quantity: number; onChange: (productId: string, difference: number) => void; onRemove: (productId: string) => void }) {
  return (
    <li className="grid grid-cols-[72px_minmax(0,1fr)] gap-3 rounded-wobbly-md border-2 border-brand-forest bg-brand-white p-3 shadow-brand-soft">
      <div className="brand-pattern grid h-18 w-18 place-items-center overflow-hidden rounded-wobbly-md border-2 border-dashed border-brand-forest/28 p-1.5">
        <img className="h-full w-full object-contain" src={product.image} alt="" width="72" height="72" />
      </div>
      <div className="grid min-w-0 gap-2">
        <div className="min-w-0">
          <p className="font-bold leading-tight text-brand-black">{product.name}</p>
          <p className="mt-1 text-xs leading-snug text-brand-black/64">{productPrice(product)}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex items-center rounded-wobbly-md border-2 border-brand-forest bg-brand-mint">
            <button className="grid h-10 w-10 touch-manipulation place-items-center rounded-wobbly-md font-bold text-brand-forest hover:bg-brand-white focus-visible:outline focus-visible:outline-3 focus-visible:outline-dashed focus-visible:outline-brand-green-ink focus-visible:outline-offset-2" type="button" onClick={() => onChange(product.id, -1)} aria-label={`Decrease ${product.name} quantity`}>−</button>
            <span className="min-w-7 text-center font-bold tabular-nums text-brand-black" aria-label={`${quantity} in cart`}>{quantity}</span>
            <button className="grid h-10 w-10 touch-manipulation place-items-center rounded-wobbly-md font-bold text-brand-forest hover:bg-brand-white focus-visible:outline focus-visible:outline-3 focus-visible:outline-dashed focus-visible:outline-brand-green-ink focus-visible:outline-offset-2" type="button" onClick={() => onChange(product.id, 1)} aria-label={`Increase ${product.name} quantity`}>+</button>
          </div>
          <button className="min-h-10 touch-manipulation rounded-wobbly-md px-2 text-xs font-bold text-brand-green-ink underline decoration-dashed underline-offset-4 focus-visible:outline focus-visible:outline-3 focus-visible:outline-dashed focus-visible:outline-brand-green-ink focus-visible:outline-offset-2" type="button" onClick={() => onRemove(product.id)}>Remove</button>
        </div>
      </div>
    </li>
  );
}

export function ShopSection() {
  const drawerRef = useRef<HTMLElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const {
    cart,
    cartQuantity,
    isCartOpen,
    addToCart,
    changeCartQuantity,
    removeFromCart,
    closeCart,
  } = useCart();
  const [category, setCategory] = useState<Category>(getInitialCategory);
  const [cartAnnouncement, setCartAnnouncement] = useState("");
  const visibleProducts = category === "All" ? shopProducts : shopProducts.filter((product) => product.category === category);
  const [featuredProduct, ...supportingProducts] = visibleProducts;
  const cartItems = shopProducts.filter((product) => (cart[product.id] ?? 0) > 0);
  const hasCompletePricing = cartItems.length > 0 && cartItems.every((product) => product.priceAmount !== null);
  const subtotal = cartItems.reduce((total, product) => total + (product.priceAmount ?? 0) * cart[product.id], 0);

  useEffect(() => {
    if (!isCartOpen) return;

    const returnFocusTarget = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const focusTimer = window.setTimeout(() => closeButtonRef.current?.focus(), 0);

    function handleDrawerKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        closeCart();
        return;
      }
      if (event.key !== "Tab" || !drawerRef.current) return;

      const focusableElements = [...drawerRef.current.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])',
      )].filter((element) => !element.hasAttribute("inert"));
      const firstElement = focusableElements[0];
      const lastElement = focusableElements.at(-1);
      if (!firstElement || !lastElement) return;

      if (event.shiftKey && document.activeElement === firstElement) {
        event.preventDefault();
        lastElement.focus();
      } else if (!event.shiftKey && document.activeElement === lastElement) {
        event.preventDefault();
        firstElement.focus();
      }
    }

    document.addEventListener("keydown", handleDrawerKeyDown);
    return () => {
      window.clearTimeout(focusTimer);
      document.removeEventListener("keydown", handleDrawerKeyDown);
      document.body.style.overflow = previousOverflow;
      returnFocusTarget?.focus();
    };
  }, [closeCart, isCartOpen]);

  function selectCategory(nextCategory: Category) {
    setCategory(nextCategory);
    const url = new URL(window.location.href);
    if (nextCategory === "All") url.searchParams.delete("category");
    else url.searchParams.set("category", categorySlug(nextCategory));
    window.history.replaceState(window.history.state, "", url);
  }

  function handleAddToCart(product: ShopProduct) {
    addToCart(product.id);
    const nextQuantity = cartQuantity + 1;
    setCartAnnouncement(`${product.name} added to cart. ${nextQuantity} item${nextQuantity === 1 ? "" : "s"} in cart.`);
  }

  function changeQuantity(productId: string, difference: number) {
    changeCartQuantity(productId, difference);
  }

  function handleRemoveFromCart(productId: string) {
    removeFromCart(productId);
  }

  function browseProducts() {
    closeCart();
    window.setTimeout(() => {
      document.getElementById("product-grid")?.scrollIntoView({ behavior: "smooth", block: "start" });
      document.querySelector<HTMLButtonElement>("#product-grid button")?.focus();
    }, 0);
  }

  return (
    <section className="shop-section" id="shop" aria-labelledby="shop-title">
      <div className="shop-catalog-surface full-bleed-safe relative overflow-hidden py-[clamp(2.5rem,5vw,4.5rem)]">
        <div className={`relative z-[1] grid gap-7 ${sectionShell}`}>
          {/* <div className="market-board relative grid min-w-0 gap-6 overflow-hidden rounded-[38px_24px_46px_28px/28px_46px_24px_38px] border-4 border-brand-forest bg-brand-yellow p-4 shadow-brand-big sm:grid-cols-[minmax(0,1.05fr)_minmax(320px,0.7fr)] sm:items-center sm:p-7 lg:p-9">
            <div className="relative z-[1] grid min-w-0 gap-3">
              <OutlineTag>Today’s Market Board</OutlineTag>
              <h2 id="shop-title" className="max-w-170 break-words text-balance font-primary text-[clamp(2.25rem,11vw,5.4rem)] font-bold leading-[0.95] tracking-[-0.035em] text-brand-forest">Build a better <span className="inline-block max-w-full -rotate-1 rounded-wobbly-tag border-3 border-brand-forest bg-brand-warm-white px-2.5 py-1 shadow-brand sm:-rotate-2">basket.</span></h2>
              <p className="max-w-155 text-pretty text-[1.05rem] leading-[1.5] text-brand-black/72">Compare the planned range, check what is inside, and add the boxes you want Zama to prioritize for launch.</p>
            </div>
            <form className="market-ticket relative z-[1] grid min-w-0 gap-3 rounded-wobbly-md border-3 border-dashed border-brand-forest bg-brand-warm-white p-4 text-brand-black shadow-brand sm:rotate-[0.8deg] sm:p-5" onSubmit={checkArea} aria-label="Check launch delivery area" noValidate>
              <div>
                <p className="text-sm font-bold uppercase tracking-[0.12em] text-brand-orange-ink">Thimphu Delivery Ticket</p>
                <p className="mt-1 text-sm text-brand-black/72">Check whether your neighborhood is in the launch plan.</p>
              </div>
              <label className="grid gap-1 text-sm font-bold text-brand-black" htmlFor="service-area">Neighborhood or landmark
                <input className="min-h-11 min-w-0 rounded-wobbly-md border-2 border-brand-forest bg-brand-white px-3 font-normal outline-none focus-visible:border-brand-green-ink focus-visible:ring-4 focus-visible:ring-brand-leaf/20" id="service-area" ref={areaInputRef} name="service-area" value={area} onChange={(event) => { setArea(event.target.value); setAreaMessage(""); setAreaHasError(false); }} placeholder="Example: Changzamtok…" autoComplete="address-line1" aria-describedby="service-area-status" aria-invalid={areaHasError} required />
              </label>
              <button className={btnPrimaryKit} type="submit">Check Launch Area</button>
              <p className="min-h-[1.25rem] text-sm font-medium text-brand-black" id="service-area-status" role="status" aria-live="polite">{areaMessage}</p>
            </form>
          </div> */}

          <div className="market-filter-bar grid gap-3 rounded-[24px_18px_28px_16px/18px_28px_16px_24px] border-3 border-brand-forest bg-brand-warm-white p-3 shadow-brand sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center sm:px-4">
            <div className="flex flex-wrap gap-2" aria-label="Shop categories">
              {categories.map((item) => (
                <button className={`min-h-11 touch-manipulation rounded-full border-2 border-brand-forest px-4 py-2 text-sm font-bold transition-colors focus-visible:outline focus-visible:outline-3 focus-visible:outline-dashed focus-visible:outline-brand-green-ink focus-visible:outline-offset-2 ${category === item ? "bg-brand-forest text-brand-white" : "bg-brand-white text-brand-forest hover:bg-brand-yellow"}`} key={item} type="button" onClick={() => selectCategory(item)} aria-pressed={category === item} aria-controls="product-grid">
                  {item}
                </button>
              ))}
            </div>
            <p className="text-sm font-bold text-brand-green-ink" aria-live="polite">{visibleProducts.length} launch product{visibleProducts.length === 1 ? "" : "s"} on the shelf</p>
          </div>

          <div className="grid gap-5" id="product-grid">
            {featuredProduct ? <FeaturedShopCard product={featuredProduct} onAdd={handleAddToCart} /> : null}
            {supportingProducts.length > 0 ? (
              <div className={`grid content-start items-start gap-4 ${supportingProducts.length >= 2 ? "md:grid-cols-2" : ""} ${supportingProducts.length >= 3 ? "lg:grid-cols-3" : ""}`}>
                {supportingProducts.map((product) => <SupportingShopCard key={product.id} product={product} onAdd={handleAddToCart} />)}
              </div>
            ) : null}
          </div>
          <p className="sr-only" role="status" aria-live="polite">{cartAnnouncement}</p>
          <p className="text-sm text-brand-black/64">Need the practical details first? <a className="font-bold text-brand-green-ink underline decoration-dashed underline-offset-4 focus-visible:outline focus-visible:outline-3 focus-visible:outline-dashed focus-visible:outline-brand-green-ink focus-visible:outline-offset-3" href="#delivery">Review delivery and support.</a></p>
        </div>
      </div>

      <div
        className={`cart-drawer-layer fixed inset-x-0 top-0 z-50 overflow-hidden transition-[visibility] duration-300 ${isCartOpen ? "visible" : "invisible"}`}
        aria-hidden={!isCartOpen}
      >
        <button
          className={`absolute inset-0 h-full w-full cursor-default border-0 bg-brand-black/52 transition-opacity duration-300 ${isCartOpen ? "opacity-100" : "opacity-0"}`}
          type="button"
          aria-label="Close cart"
          tabIndex={-1}
          onClick={closeCart}
        />
        <aside
          className={`cart-drawer absolute right-0 top-0 grid w-[min(100%,440px)] grid-rows-[auto_minmax(0,1fr)_auto] overflow-hidden border-l-4 border-brand-forest bg-brand-warm-white shadow-[-10px_0_0_color-mix(in_srgb,var(--color-brand-forest)_18%,transparent)] transition-transform duration-300 ease-out ${isCartOpen ? "translate-x-0" : "translate-x-full"}`}
          id="cart-drawer"
          ref={drawerRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby="cart-drawer-title"
          aria-describedby="cart-drawer-description"
          inert={!isCartOpen}
        >
          <div className="relative flex items-start justify-between gap-4 border-b-3 border-dashed border-brand-forest bg-brand-yellow px-4 pb-4 pt-[max(1rem,env(safe-area-inset-top))] sm:px-5">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.12em] text-brand-orange-ink">Your launch cart</p>
              <h2 className="mt-1 font-primary text-[clamp(1.8rem,7vw,2.5rem)] font-bold leading-none text-brand-forest" id="cart-drawer-title">
                Market picks
                <span className="ml-2 inline-grid min-h-7 min-w-7 translate-y-[-0.15em] place-items-center rounded-full border-2 border-brand-forest bg-brand-orange px-1.5 font-secondary text-sm text-brand-white" aria-hidden="true">{cartQuantity}</span>
              </h2>
              <p className="mt-2 max-w-80 text-sm leading-snug text-brand-black/68" id="cart-drawer-description">Review quantities and save your interest. No payment or order is created.</p>
            </div>
            <button
              className="grid h-11 w-11 shrink-0 touch-manipulation place-items-center rounded-wobbly-md border-3 border-brand-forest bg-brand-white text-brand-forest shadow-brand-tight hover:bg-brand-mint focus-visible:outline focus-visible:outline-3 focus-visible:outline-dashed focus-visible:outline-brand-green-ink focus-visible:outline-offset-3"
              type="button"
              ref={closeButtonRef}
              aria-label="Close cart"
              onClick={closeCart}
            >
              <CloseIcon />
            </button>
          </div>

          <div className="overscroll-contain overflow-y-auto px-4 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-4 sm:px-5">
            {cartItems.length > 0 ? (
              <div className="grid gap-4">
                <ul className="grid gap-3">
                  {cartItems.map((product) => (
                    <CartLine
                      key={product.id}
                      product={product}
                      quantity={cart[product.id]}
                      onChange={changeQuantity}
                      onRemove={handleRemoveFromCart}
                    />
                  ))}
                </ul>

                {/* <form className="basket-receipt relative grid min-w-0 gap-3 rounded-wobbly-md border-3 border-dashed border-brand-forest bg-brand-white p-4 text-brand-black shadow-brand" onSubmit={handleLaunchRequest} aria-label="Save launch cart interest" noValidate>
                  <p className="font-primary text-xl font-bold text-brand-black">Save Your Cart</p>
                  <label className="grid gap-1 text-sm font-bold text-brand-black" htmlFor="cart-service-area">Neighborhood or landmark
                    <input className="min-h-11 min-w-0 rounded-wobbly-md border-2 border-brand-forest bg-brand-mint px-3 font-normal outline-none focus-visible:border-brand-green-ink focus-visible:ring-4 focus-visible:ring-brand-leaf/20" id="cart-service-area" ref={areaInputRef} name="area" value={area} onChange={(event) => { setArea(event.target.value); setAreaHasError(false); if (submissionError) setSubmissionError(false); if (submissionMessage) setSubmissionMessage(""); }} placeholder="Example: Changzamtok…" autoComplete="address-line1" aria-describedby="launch-submission-status" aria-invalid={areaHasError} required />
                  </label>
                  <label className="grid gap-1 text-sm font-bold text-brand-black" htmlFor="launch-email">Email for launch updates
                    <input className="min-h-11 min-w-0 rounded-wobbly-md border-2 border-brand-forest bg-brand-white px-3 font-normal outline-none focus-visible:border-brand-green-ink focus-visible:ring-4 focus-visible:ring-brand-leaf/20" id="launch-email" ref={emailInputRef} name="email" type="email" placeholder="you@example.com…" autoComplete="email" spellCheck={false} aria-describedby="launch-submission-status" aria-invalid={submissionError} onChange={() => { if (submissionError) setSubmissionError(false); if (submissionMessage) setSubmissionMessage(""); }} required />
                  </label>
                  <button className={`${btnPrimaryKit} gap-2`} type="submit" disabled={isSubmitting}>{isSubmitting ? "Saving…" : "Save My Cart"}</button>
                  <p className={`min-h-[1.25rem] text-sm ${submissionError ? "font-bold text-brand-black" : "font-bold text-brand-green-ink"}`} id="launch-submission-status" role="status" aria-live="polite">{submissionMessage}</p>
                  <p className="text-xs text-brand-black/72">By submitting, you agree to receive launch-related messages under the <a className="font-bold underline decoration-dashed underline-offset-2" href="#privacy-policy" onClick={closeCart}>privacy notice</a>. You can ask Zama to remove your details at any time.</p>
                </form> */}
              </div>
            ) : (
              <div className="grid min-h-full place-content-center justify-items-center gap-4 py-12 text-center">
                <div className="brand-pattern grid h-24 w-24 place-items-center rounded-full border-3 border-dashed border-brand-forest text-brand-forest">
                  <svg width="44" height="44" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <path d="M3 4h2.2l1.55 10.05a2 2 0 0 0 1.98 1.7h8.84a2 2 0 0 0 1.94-1.5L21 8H6.05" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                    <path d="M9 20h.01M18 20h.01" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-primary text-2xl font-bold text-brand-black">Your cart is empty</h3>
                  <p className="mt-1 max-w-70 text-sm text-brand-black/64">Add a fresh box, meal kit, or grocery top-up to get started.</p>
                </div>
                <button className={`${btnPrimaryKit} gap-2`} type="button" onClick={browseProducts}>
                  Browse Products
                </button>
              </div>
            )}
          </div>
          {cartItems.length > 0 ? (
            <div className="cart-summary-bar relative z-[2] grid gap-1 border-t-2 border-dashed border-brand-forest/32 bg-brand-warm-white px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3 shadow-[0_-8px_18px_color-mix(in_srgb,var(--color-brand-forest)_12%,transparent)] sm:px-5">
              <div className="flex items-center justify-between gap-3">
                <p className="font-bold text-brand-black"><span className="tabular-nums">{cartQuantity}</span> item{cartQuantity === 1 ? "" : "s"}</p>
                <p className="text-right font-bold text-brand-orange-ink">{hasCompletePricing ? `Nu. ${numberFormatter.format(subtotal)}` : "Pricing pending"}</p>
              </div>
              <p className="text-xs text-brand-black/58">{hasCompletePricing ? "Estimated subtotal" : "Final total shown before payment"}</p>
            </div>
          ) : null}
        </aside>
      </div>
    </section>
  );
}
