import { useRef, useState, type FormEvent } from "react";
import { shopProducts } from "../../data/landing";
import { OutlineTag, YellowTag } from "../../components/ui/tag";
import { btnPrimaryKit, sectionShell } from "../../components/ui/styles";
import { submitLaunchInterest } from "../../launch-interest";

type ShopProduct = (typeof shopProducts)[number];
type Basket = Record<string, number>;

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
        <button className={`${btnPrimaryKit} mt-auto w-full`} type="button" onClick={() => onAdd(product)} aria-label={`Save ${product.name} for launch`}>
          Save for Launch
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
      <button className={`${btnPrimaryKit} col-span-full w-full`} type="button" onClick={() => onAdd(product)} aria-label={`Save ${product.name} for launch`}>
        Save for Launch
      </button>
    </article>
  );
}

function BasketLine({ product, quantity, onChange, onRemove }: { product: ShopProduct; quantity: number; onChange: (productId: string, difference: number) => void; onRemove: (productId: string) => void }) {
  return (
    <li className="grid gap-3 rounded-wobbly-md border-2 border-brand-forest bg-brand-white p-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
      <div className="min-w-0">
        <p className="font-bold text-brand-black">{product.name}</p>
        <p className="text-sm text-brand-black/64">{productPrice(product)}</p>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <button className="grid h-11 w-11 touch-manipulation place-items-center rounded-wobbly-md border-2 border-brand-forest bg-brand-white font-bold text-brand-forest shadow-brand-tight hover:bg-brand-mint focus-visible:outline focus-visible:outline-3 focus-visible:outline-dashed focus-visible:outline-brand-green-ink focus-visible:outline-offset-2" type="button" onClick={() => onChange(product.id, -1)} aria-label={`Decrease ${product.name} quantity`}>−</button>
        <span className="min-w-8 text-center font-bold tabular-nums" aria-label={`${quantity} selected`}>{quantity}</span>
        <button className="grid h-11 w-11 touch-manipulation place-items-center rounded-wobbly-md border-2 border-brand-forest bg-brand-leaf font-bold text-brand-white shadow-brand-tight hover:bg-brand-forest focus-visible:outline focus-visible:outline-3 focus-visible:outline-dashed focus-visible:outline-brand-green-ink focus-visible:outline-offset-2" type="button" onClick={() => onChange(product.id, 1)} aria-label={`Increase ${product.name} quantity`}>+</button>
        <button className="min-h-11 touch-manipulation rounded-wobbly-md px-2 text-sm font-bold text-brand-green-ink underline decoration-dashed underline-offset-4 focus-visible:outline focus-visible:outline-3 focus-visible:outline-dashed focus-visible:outline-brand-green-ink focus-visible:outline-offset-2" type="button" onClick={() => onRemove(product.id)}>Remove</button>
      </div>
    </li>
  );
}

export function ShopSection() {
  const areaInputRef = useRef<HTMLInputElement>(null);
  const emailInputRef = useRef<HTMLInputElement>(null);
  const [category, setCategory] = useState<Category>(getInitialCategory);
  const [basket, setBasket] = useState<Basket>({});
  const [area, setArea] = useState("");
  const [areaMessage, setAreaMessage] = useState("");
  const [areaHasError, setAreaHasError] = useState(false);
  const [submissionMessage, setSubmissionMessage] = useState("");
  const [submissionError, setSubmissionError] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const visibleProducts = category === "All" ? shopProducts : shopProducts.filter((product) => product.category === category);
  const [featuredProduct, ...supportingProducts] = visibleProducts;
  const basketItems = shopProducts.filter((product) => (basket[product.id] ?? 0) > 0);
  const basketQuantity = basketItems.reduce((total, product) => total + basket[product.id], 0);
  const hasCompletePricing = basketItems.length > 0 && basketItems.every((product) => product.priceAmount !== null);
  const subtotal = basketItems.reduce((total, product) => total + (product.priceAmount ?? 0) * basket[product.id], 0);

  function selectCategory(nextCategory: Category) {
    setCategory(nextCategory);
    const url = new URL(window.location.href);
    if (nextCategory === "All") url.searchParams.delete("category");
    else url.searchParams.set("category", categorySlug(nextCategory));
    window.history.replaceState(window.history.state, "", url);
  }

  function addToBasket(product: ShopProduct) {
    setBasket((current) => ({ ...current, [product.id]: (current[product.id] ?? 0) + 1 }));
    setSubmissionMessage("");
  }

  function changeQuantity(productId: string, difference: number) {
    setBasket((current) => {
      const nextQuantity = Math.max(0, (current[productId] ?? 0) + difference);
      if (nextQuantity === 0) {
        const remaining = { ...current };
        delete remaining[productId];
        return remaining;
      }
      return { ...current, [productId]: nextQuantity };
    });
    setSubmissionMessage("");
  }

  function removeFromBasket(productId: string) {
    setBasket((current) => {
      const remaining = { ...current };
      delete remaining[productId];
      return remaining;
    });
    setSubmissionMessage("");
  }

  function checkArea(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmedArea = area.trim();
    if (!trimmedArea) {
      setAreaMessage("Enter your neighborhood or a nearby landmark so Zama can review it.");
      setAreaHasError(true);
      areaInputRef.current?.focus();
      return;
    }
    setArea(trimmedArea);
    setAreaHasError(false);
    setAreaMessage(`Coverage for ${trimmedArea} is being reviewed. Final serviceability, fee, and delivery window will be confirmed before ordering.`);
  }

  async function handleLaunchRequest(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    const email = formData.get("email");

    if (basketQuantity === 0) {
      setSubmissionError(true);
      setSubmissionMessage("Save at least 1 product for launch, then submit your picks again.");
      document.querySelector<HTMLButtonElement>("#product-grid button")?.focus();
      return;
    }

    if (!area.trim()) {
      setSubmissionError(true);
      setSubmissionMessage("Enter and check your delivery area before saving your picks.");
      setAreaHasError(true);
      areaInputRef.current?.focus();
      return;
    }

    if (typeof email !== "string" || !emailInputRef.current?.validity.valid) {
      setSubmissionError(true);
      setSubmissionMessage(emailInputRef.current?.validity.typeMismatch ? "Enter a complete email address, such as name@example.com." : "Enter your email address so Zama can follow up about your launch picks.");
      emailInputRef.current?.focus();
      return;
    }

    setIsSubmitting(true);
    setSubmissionError(false);
    setSubmissionMessage("");

    try {
      const result = await submitLaunchInterest({
        email: email.trim(),
        area: area.trim(),
        source: "launch-basket",
        items: basketItems.map((product) => ({ sku: product.sku, quantity: basket[product.id] })),
      });
      setSubmissionMessage(result.mode === "preview" ? "Preview saved for this browser session. Connect the launch endpoint before publishing." : "Your product and delivery-area interest has been saved. Zama will contact you before orders open.");
      form.reset();
    } catch (error) {
      setSubmissionError(true);
      setSubmissionMessage(error instanceof Error ? error.message : "We could not save your request. Please try again or email hello@zama.bt.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section className={`shop-section grid gap-7 py-[clamp(2.5rem,5vw,4.5rem)] ${sectionShell}`} id="shop" aria-labelledby="shop-title">
      <div className="market-board relative grid min-w-0 gap-6 overflow-hidden rounded-[38px_24px_46px_28px/28px_46px_24px_38px] border-4 border-brand-forest bg-brand-yellow p-4 shadow-brand-big sm:grid-cols-[minmax(0,1.05fr)_minmax(320px,0.7fr)] sm:items-center sm:p-7 lg:p-9">
        <div className="relative z-[1] grid min-w-0 gap-3">
          <OutlineTag>Today’s Market Board</OutlineTag>
          <h2 id="shop-title" className="max-w-170 break-words text-balance font-primary text-[clamp(2.25rem,11vw,5.4rem)] font-bold leading-[0.95] tracking-[-0.035em] text-brand-forest">Build a better <span className="inline-block max-w-full -rotate-1 rounded-wobbly-tag border-3 border-brand-forest bg-brand-warm-white px-2.5 py-1 shadow-brand sm:-rotate-2">basket.</span></h2>
          <p className="max-w-155 text-pretty text-[1.05rem] leading-[1.5] text-brand-black/72">Compare the planned range, check what is inside, and save the boxes you want Zama to prioritize for launch.</p>
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
      </div>

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
        {featuredProduct ? <FeaturedShopCard product={featuredProduct} onAdd={addToBasket} /> : null}
        {supportingProducts.length > 0 ? (
          <div className={`grid content-start items-start gap-4 ${supportingProducts.length >= 2 ? "md:grid-cols-2" : ""} ${supportingProducts.length >= 3 ? "lg:grid-cols-3" : ""}`}>
            {supportingProducts.map((product) => <SupportingShopCard key={product.id} product={product} onAdd={addToBasket} />)}
          </div>
        ) : null}
      </div>

      <div className="launch-counter relative grid min-w-0 gap-6 overflow-hidden rounded-[36px_22px_42px_26px/26px_42px_22px_36px] border-4 border-brand-forest bg-brand-forest p-4 text-brand-warm-white shadow-brand-big sm:p-7 lg:grid-cols-[minmax(0,1fr)_minmax(320px,0.62fr)] lg:items-start">
        <div className="relative z-[1] grid gap-3">
          <OutlineTag>Launch Basket</OutlineTag>
          <h3 className="max-w-155 text-balance font-primary text-[clamp(2.2rem,4vw,4rem)] font-bold leading-[0.98] text-brand-warm-white">Take your picks to the counter.</h3>
          <p className="text-brand-warm-white/72">Save product interest only. No payment or order is created.</p>
          {basketItems.length > 0 ? (
            <ul className="grid gap-2">
              {basketItems.map((product) => <BasketLine key={product.id} product={product} quantity={basket[product.id]} onChange={changeQuantity} onRemove={removeFromBasket} />)}
            </ul>
          ) : (
            <div className="rounded-wobbly-md border-2 border-dashed border-brand-yellow/46 bg-brand-warm-white/10 p-4 text-brand-warm-white/68">Your basket is empty. Add a launch product above to begin.</div>
          )}
          <div className="flex flex-wrap items-center justify-between gap-3 border-t-2 border-dashed border-brand-warm-white/24 pt-3">
            <p className="font-bold text-brand-warm-white" aria-live="polite"><span className="tabular-nums">{basketQuantity}</span> item{basketQuantity === 1 ? "" : "s"} saved</p>
            <p className="font-bold text-brand-yellow">{hasCompletePricing ? `Estimated subtotal: Nu. ${numberFormatter.format(subtotal)}` : "Final total shown before payment"}</p>
          </div>
        </div>

        <form className="basket-receipt relative z-[1] grid min-w-0 gap-3 rounded-wobbly-md border-3 border-dashed border-brand-forest bg-brand-warm-white p-4 text-brand-black shadow-brand sm:rotate-[0.6deg]" onSubmit={handleLaunchRequest} aria-label="Save launch basket interest" noValidate>
          <p className="font-primary text-xl font-bold text-brand-black">Save Your Market Picks</p>
          <div className="rounded-wobbly-md border-2 border-dashed border-brand-forest/36 bg-brand-mint p-3">
            <p className="text-xs font-bold uppercase tracking-[0.08em] text-brand-green-ink">Delivery Area</p>
            <p className="mt-1 text-sm text-brand-black/72">{area.trim() || "Check your Thimphu area above first."}</p>
          </div>
          <input name="area" type="hidden" value={area} readOnly />
          <label className="grid gap-1 text-sm font-bold text-brand-black" htmlFor="launch-email">Email for launch updates
            <input className="min-h-11 min-w-0 rounded-wobbly-md border-2 border-brand-forest bg-brand-white px-3 font-normal outline-none focus-visible:border-brand-green-ink focus-visible:ring-4 focus-visible:ring-brand-leaf/20" id="launch-email" ref={emailInputRef} name="email" type="email" placeholder="you@example.com…" autoComplete="email" spellCheck={false} aria-describedby="launch-submission-status" aria-invalid={submissionError} onChange={() => { if (submissionError) setSubmissionError(false); if (submissionMessage) setSubmissionMessage(""); }} required />
          </label>
          <button className={btnPrimaryKit} type="submit" disabled={isSubmitting}>{isSubmitting ? "Saving…" : "Save My Launch Picks"}</button>
          <p className={`min-h-[1.25rem] text-sm ${submissionError ? "font-bold text-brand-black" : "font-bold text-brand-green-ink"}`} id="launch-submission-status" role="status" aria-live="polite">{submissionMessage}</p>
          <p className="text-xs text-brand-black/72">By submitting, you agree to receive launch-related messages under the <a className="font-bold underline decoration-dashed underline-offset-2" href="#privacy-policy">privacy notice</a>. You can ask Zama to remove your details at any time.</p>
        </form>
      </div>

      <p className="text-sm text-brand-black/64">Need the practical details first? <a className="font-bold text-brand-green-ink underline decoration-dashed underline-offset-4 focus-visible:outline focus-visible:outline-3 focus-visible:outline-dashed focus-visible:outline-brand-green-ink focus-visible:outline-offset-3" href="#delivery">Review delivery and support.</a></p>
    </section>
  );
}
