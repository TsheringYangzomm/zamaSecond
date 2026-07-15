import { useState, type FormEvent } from "react";
import { shopProducts } from "../../data/landing";
import { OutlineLink, PrimaryLink } from "../../components/ui/action-link";
import { OutlineTag, YellowTag } from "../../components/ui/tag";
import { btnPrimaryKit, sectionShell } from "../../components/ui/styles";

type ShopProduct = (typeof shopProducts)[number];

const categories = ["All", "Fresh boxes", "Meal kits", "Groceries"] as const;

function ProductDetail({ product }: { product: ShopProduct }) {
  return (
    <details className="mt-3 rounded-wobbly-md border-2 border-dashed border-brand-black/42 bg-brand-white/70 px-3 py-2 text-sm text-brand-black">
      <summary className="cursor-pointer font-bold">Product details</summary>
      <dl className="mt-3 grid gap-2">
        <div className="grid gap-1 sm:grid-cols-[120px_1fr]"><dt className="font-bold">Price</dt><dd>{product.priceLabel} · {product.priceUnit}</dd></div>
        <div className="grid gap-1 sm:grid-cols-[120px_1fr]"><dt className="font-bold">Portion</dt><dd>{product.servings}</dd></div>
        <div className="grid gap-1 sm:grid-cols-[120px_1fr]"><dt className="font-bold">Source</dt><dd>{product.source}</dd></div>
        <div className="grid gap-1 sm:grid-cols-[120px_1fr]"><dt className="font-bold">Nutrition</dt><dd>{product.nutrition}</dd></div>
        <div className="grid gap-1 sm:grid-cols-[120px_1fr]"><dt className="font-bold">Availability</dt><dd>Preview item; final stock is confirmed before launch.</dd></div>
      </dl>
    </details>
  );
}

function ShopCard({ product, onAdd }: { product: ShopProduct; onAdd: (product: ShopProduct) => void }) {
  return (
    <article className="relative grid content-start gap-3 rounded-wobbly-card border-3 border-brand-black bg-brand-white p-4 shadow-brand-soft transition-[box-shadow,transform] duration-120 ease-in-out hover:-translate-x-px hover:-translate-y-px hover:shadow-brand">
      <div className="brand-pattern relative grid min-h-52 place-items-center overflow-hidden rounded-wobbly-md border-2 border-dashed border-brand-black/42 p-3">
        <img className="h-44 w-full object-contain" src={product.image} alt={product.alt} loading="lazy" decoding="async" width="420" height="340" />
        <span className="absolute left-3 top-3 rounded-full border-2 border-brand-black bg-brand-white px-2 py-1 text-xs font-bold text-brand-black">Preview</span>
      </div>
      <div className="grid gap-2">
        <YellowTag>{product.eyebrow}</YellowTag>
        <h3 className="font-primary text-[clamp(1.55rem,2.4vw,2.15rem)] font-bold leading-[1.02] text-brand-black">{product.name}</h3>
        <p className="text-brand-black/72">{product.description}</p>
        <div className="flex flex-wrap gap-2">
          {product.tags.map((tag) => <span className="rounded-full border-2 border-brand-black/42 px-2 py-1 text-xs text-brand-black/72" key={tag}>{tag}</span>)}
        </div>
        <strong className="text-brand-orange">{product.priceLabel}</strong>
      </div>
      <ProductDetail product={product} />
      <button className={btnPrimaryKit} type="button" onClick={() => onAdd(product)} aria-label={`Add ${product.name} to launch basket`}>
        Add to launch basket
      </button>
    </article>
  );
}

export function ShopSection() {
  const [category, setCategory] = useState<(typeof categories)[number]>("All");
  const [basket, setBasket] = useState<string[]>([]);
  const [submitted, setSubmitted] = useState(false);
  const visibleProducts = category === "All" ? shopProducts : shopProducts.filter((product) => product.category === category);

  function addToBasket(product: ShopProduct) {
    setBasket((current) => current.includes(product.id) ? current : [...current, product.id]);
    setSubmitted(false);
  }

  function handleLaunchRequest(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitted(true);
  }

  return (
    <section className={`shop-section grid gap-6 py-[clamp(2.8rem,6vw,5rem)] ${sectionShell}`} id="shop" aria-labelledby="shop-title">
      <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(260px,0.62fr)] sm:items-end sm:gap-8">
        <div className="grid gap-2">
          <OutlineTag>Shop preview</OutlineTag>
          <h2 id="shop-title" className="font-primary text-[clamp(2.35rem,5vw,5rem)] font-bold leading-[1.02] text-brand-green-ink">Build a better basket.</h2>
          <p className="max-w-160 text-[1.1rem] text-brand-black/72">Explore the planned range and add ideas to a launch basket. Final stock, pricing, delivery, and checkout details will be shown before orders open.</p>
        </div>
        <div className="rounded-wobbly-md border-3 border-brand-black bg-brand-yellow p-4 shadow-brand">
          <p className="text-sm font-bold uppercase tracking-[0.12em] text-brand-black/72">Launch geography</p>
          <p className="mt-1 font-primary text-2xl font-bold text-brand-black">Thimphu first</p>
          <p className="mt-1 text-sm text-brand-black/72">Future areas can join the launch list while coverage is finalized.</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2" aria-label="Shop categories">
        {categories.map((item) => (
          <button className={`touch-manipulation rounded-full border-2 border-brand-black px-3 py-2 text-sm font-bold transition-colors focus-visible:outline focus-visible:outline-3 focus-visible:outline-dashed focus-visible:outline-brand-green-ink focus-visible:outline-offset-2 ${category === item ? "bg-brand-green" : "bg-brand-white hover:bg-brand-yellow"}`} key={item} type="button" onClick={() => setCategory(item)} aria-pressed={category === item}>
            {item}
          </button>
        ))}
      </div>

      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {visibleProducts.map((product) => <ShopCard key={product.id} product={product} onAdd={addToBasket} />)}
      </div>

      <div className="grid gap-5 rounded-[28px_18px_32px_16px/18px_32px_20px_28px] border-3 border-brand-black bg-brand-green/12 p-5 shadow-brand sm:grid-cols-[minmax(0,1fr)_minmax(300px,0.7fr)] sm:items-center sm:p-6">
        <div className="grid gap-2">
          <OutlineTag>Launch basket</OutlineTag>
          <h3 className="font-primary text-[clamp(1.8rem,3vw,3rem)] font-bold leading-[1.02] text-brand-black">Tell us what you want first.</h3>
          <p className="text-brand-black/72">Your basket is a launch-interest list, not a payment or order confirmation. We will use it to prioritize the first Thimphu range.</p>
          {basket.length > 0 ? <p className="text-sm font-bold text-brand-green-ink" aria-live="polite">{basket.length} product idea{basket.length === 1 ? "" : "s"} selected.</p> : <p className="text-sm text-brand-black/64">Select a preview product to add it here.</p>}
          <div className="flex flex-wrap gap-2">
            {basket.map((id) => <span className="rounded-full border-2 border-brand-black bg-brand-white px-2 py-1 text-xs" key={id}>{shopProducts.find((product) => product.id === id)?.name}</span>)}
          </div>
        </div>
        <form className="grid gap-3 rounded-wobbly-md border-3 border-brand-black bg-brand-white p-4" onSubmit={handleLaunchRequest}>
          <label className="grid gap-1 text-sm font-bold text-brand-black" htmlFor="launch-area">Your Thimphu area
            <input className="min-h-11 rounded-wobbly-md border-2 border-brand-black px-3 font-normal outline-none focus:border-brand-green-ink focus:ring-4 focus:ring-brand-green/20" id="launch-area" name="area" placeholder="Neighborhood or landmark…" required />
          </label>
          <label className="grid gap-1 text-sm font-bold text-brand-black" htmlFor="launch-email">Email for launch updates
            <input className="min-h-11 rounded-wobbly-md border-2 border-brand-black px-3 font-normal outline-none focus:border-brand-green-ink focus:ring-4 focus:ring-brand-green/20" id="launch-email" name="email" type="email" placeholder="you@example.com…" autoComplete="email" required />
          </label>
          <button className={btnPrimaryKit} type="submit">Save my launch interest</button>
          {submitted ? <p className="text-sm font-bold text-brand-green-ink" role="status">Thanks — your launch interest is noted for this session. Connect the form to your email system before going live.</p> : null}
        </form>
      </div>

      <div className="flex flex-wrap gap-3">
        <PrimaryLink href="#waitlist">Join the full launch list</PrimaryLink>
        <OutlineLink href="#delivery">See delivery details</OutlineLink>
      </div>
    </section>
  );
}
