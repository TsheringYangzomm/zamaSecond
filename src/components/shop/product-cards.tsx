import { useEffect, useState } from "react";
import { Heart } from "lucide-react";
import { fetchAccountRewards, toggleSavedItem } from "../../account-rewards/account-rewards-api";
import { useCart } from "../../cart-context";
import { useOptionalCustomerAuth } from "../../checkout/customer-auth";
import { btnPrimaryKit } from "../ui/styles";
import { YellowTag } from "../ui/tag";
import { ProductDetail } from "./product-detail";
import { ProductFacts } from "./product-facts";
import { isProductActive, productDetailHref, productPrice, type ShopProduct } from "./shop-utils";

function AddToCartIcon() {
  return (
    <svg className="shrink-0" width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M3 4h2.2l1.55 10.05a2 2 0 0 0 1.98 1.7h8.84a2 2 0 0 0 1.94-1.5L21 8H6.05" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M15.5 3.5v5M13 6h5" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" />
      <path d="M9 20h.01M18 20h.01" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" />
    </svg>
  );
}

export { AddToCartIcon };

const saveButtonClasses =
  "inline-flex min-h-10 w-full items-center justify-center gap-1.5 rounded-wobbly-md border-2 border-brand-forest/35 bg-brand-white px-3 py-2 text-sm font-bold text-brand-green-ink transition-colors hover:border-brand-forest hover:bg-brand-mint focus-visible:outline focus-visible:outline-3 focus-visible:outline-dashed focus-visible:outline-brand-green-ink focus-visible:outline-offset-2";

export function WishlistButton({ product }: { product: ShopProduct }) {
  const auth = useOptionalCustomerAuth();
  const { openAuth } = useCart();
  const email = auth?.profile?.email ?? null;
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let active = true;
    if (!email) {
      setSaved(false);
      return () => { active = false; };
    }
    void fetchAccountRewards(email).then((snapshot) => {
      if (active) setSaved(snapshot.savedItems.some((item) => item.kind === "wishlist" && item.productId === product.id));
    }).catch(() => {
      if (active) setSaved(false);
    });
    return () => { active = false; };
  }, [email, product.id]);

  async function toggleSaved() {
    if (!email) {
      openAuth();
      return;
    }
    if (busy) return;
    setBusy(true);
    try {
      const snapshot = await toggleSavedItem(email, product.id, "wishlist");
      setSaved(snapshot.savedItems.some((item) => item.kind === "wishlist" && item.productId === product.id));
    } finally {
      setBusy(false);
    }
  }

  return <button className={saveButtonClasses} type="button" disabled={busy} aria-pressed={saved} aria-label={`${saved ? "Remove" : "Save"} ${product.name} ${saved ? "from" : "to"} wishlist`} onClick={() => void toggleSaved()}><Heart className={`h-4 w-4 ${saved ? "fill-brand-orange text-brand-orange-ink" : ""}`} />{busy ? "Saving..." : saved ? "Saved" : "Save"}</button>;
}

export function AddToCartButton({ product, onAdd }: { product: ShopProduct; onAdd: (product: ShopProduct) => void }) {
  if (!isProductActive(product)) {
    return (
      <button className={`${btnPrimaryKit} w-full gap-2 cursor-not-allowed opacity-50`} type="button" disabled aria-label={`${product.name} is out of stock`}>
        <AddToCartIcon />
        Out of stock
      </button>
    );
  }
  return (
    <button className={`${btnPrimaryKit} w-full gap-2`} type="button" onClick={() => onAdd(product)} aria-label={`Add ${product.name} to cart`}>
      <AddToCartIcon />
      Add to Cart
    </button>
  );
}

const cardLinkFocus =
  "focus-visible:outline focus-visible:outline-3 focus-visible:outline-dashed focus-visible:outline-brand-green-ink focus-visible:outline-offset-3";

const detailsLinkClasses =
  "inline-flex min-h-10 w-full items-center justify-center gap-1 text-sm font-bold text-brand-green-ink underline decoration-dashed underline-offset-4 hover:text-brand-forest focus-visible:outline focus-visible:outline-3 focus-visible:outline-dashed focus-visible:outline-brand-green-ink focus-visible:outline-offset-2";

const viewContentsButtonClasses =
  "inline-flex min-h-9 w-full items-center justify-center gap-1.5 rounded-wobbly-md border-2 border-brand-forest bg-brand-mint px-3 text-xs font-bold text-brand-green-ink transition-all duration-150 ease-out hover:bg-brand-yellow hover:shadow-brand-soft focus-visible:outline focus-visible:outline-3 focus-visible:outline-dashed focus-visible:outline-brand-green-ink focus-visible:outline-offset-2";

export function FeaturedShopCard({ product, onAdd, onViewDetail, preview = false }: { product: ShopProduct; onAdd: (product: ShopProduct) => void; onViewDetail?: (product: ShopProduct) => void; preview?: boolean }) {
  const headingId = `${product.id}-title`;
  const detailHref = productDetailHref(product);

  return (
    <article className="shop-feature-card relative grid gap-4 overflow-hidden rounded-wobbly-card border-4 border-brand-forest bg-brand-white p-4 shadow-brand transition-shadow duration-150 ease-in-out hover:-translate-x-px hover:-translate-y-px hover:shadow-brand-hover sm:p-5 md:grid-cols-[minmax(240px,0.9fr)_minmax(0,1.1fr)]" id={product.id} aria-labelledby={headingId}>
      <a className={`brand-pattern relative grid min-h-72 place-items-center overflow-hidden rounded-wobbly-card border-2 border-dashed border-brand-forest/36 p-4 md:min-h-110 ${cardLinkFocus}`} href={detailHref} aria-label={`View ${product.name} details`}>
        <img className="h-64 w-full object-contain md:h-auto md:max-h-100" src={product.image} alt={product.alt} loading="lazy" decoding="async" width="420" height="340" />
        <span className="absolute left-3 top-3 rounded-full border-2 border-brand-forest bg-brand-yellow px-2 py-1 text-xs font-bold text-brand-black">Today’s field pick</span>
        {!isProductActive(product) ? <span className="absolute right-3 top-3 rounded-full border-2 border-brand-orange-ink bg-brand-orange px-2 py-1 text-xs font-bold text-brand-white">Out of stock</span> : null}
        <span className={`absolute right-3 bottom-3 rounded-full border-2 border-brand-forest px-2 py-1 text-xs font-bold ${categoryBadge(product)}`}>{product.category}</span>
      </a>
      <div className="grid min-w-0 content-start gap-3">
        <YellowTag>{product.eyebrow}</YellowTag>
        <h3 className="font-primary text-[clamp(2rem,4vw,3.4rem)] font-bold leading-[0.98] text-brand-black" id={headingId}>
          <a className={`rounded-wobbly-tag focus-visible:outline focus-visible:outline-3 focus-visible:outline-dashed focus-visible:outline-brand-green-ink focus-visible:outline-offset-3 hover:text-brand-green-ink`} href={detailHref}>{product.name}</a>
        </h3>
        <p className="text-[1.05rem] leading-[1.5] text-brand-black/72">{product.description}</p>
        {!preview ? <ProductFacts product={product} /> : null}
        {!preview ? (
          <div className="flex flex-wrap gap-2">
            {product.tags.map((tag) => <span className="rounded-full border-2 border-brand-forest/30 bg-brand-white px-2 py-1 text-xs font-medium text-brand-black/72" key={tag}>{tag}</span>)}
          </div>
        ) : null}
        <strong className="text-brand-orange-ink">{productPrice(product)}</strong>
        {!preview ? <p className="text-xs text-brand-black/64">{product.deliveryEstimate}</p> : null}
        {!preview ? <ProductDetail product={product} short /> : null}
        <div className="mt-auto grid gap-2">
          {onViewDetail ? (
            <button className={viewContentsButtonClasses} type="button" onClick={() => onViewDetail(product)}>
              View box contents ({product.contents.length} items)
            </button>
          ) : null}
          <WishlistButton product={product} />
          <AddToCartButton product={product} onAdd={onAdd} />
          <a className={detailsLinkClasses} href={detailHref}>View full details →</a>
        </div>
      </div>
    </article>
  );
}

function categoryBadge(product: ShopProduct) {
  const classes = {
    Vegetables: "bg-brand-lime text-brand-forest",
    Fruits: "bg-brand-orange/18 text-brand-orange-ink",
    "Meal kits": "bg-brand-purple text-brand-white",
    Groceries: "bg-brand-buff text-brand-forest",
    "Custom boxes": "bg-brand-mint text-brand-forest",
  } as const;
  return classes[product.category];
}

function categoryRail(product: ShopProduct) {
  const classes = {
    Vegetables: "border-t-brand-leaf",
    Fruits: "border-t-brand-orange",
    "Meal kits": "border-t-brand-purple",
    Groceries: "border-t-brand-yellow",
    "Custom boxes": "border-t-brand-green-ink",
  } as const;
  return classes[product.category];
}

export function SupportingShopCard({ product, onAdd, onViewDetail, preview = false }: { product: ShopProduct; onAdd: (product: ShopProduct) => void; onViewDetail?: (product: ShopProduct) => void; preview?: boolean }) {
  const headingId = `${product.id}-title`;
  const detailHref = productDetailHref(product);

  return (
    <article className={`shop-note-card grid self-start content-start grid-cols-[96px_minmax(0,1fr)] gap-3 rounded-wobbly-card border-3 border-t-8 border-brand-forest ${categoryRail(product)} bg-brand-white p-3 shadow-brand-soft transition-shadow duration-150 ease-in-out hover:-translate-x-px hover:-translate-y-px hover:shadow-brand sm:grid-cols-[112px_minmax(0,1fr)]`} id={product.id} aria-labelledby={headingId}>
      <a className={`brand-pattern relative grid min-h-34 place-items-center overflow-hidden rounded-wobbly-md border-2 border-dashed border-brand-forest/30 p-2 ${cardLinkFocus}`} href={detailHref} aria-label={`View ${product.name} details`}>
        <img className="h-28 w-full object-contain" src={product.image} alt={product.alt} loading="lazy" decoding="async" width="210" height="170" />
        {!isProductActive(product) ? <span className="absolute left-1.5 top-1.5 rounded-full border-2 border-brand-orange-ink bg-brand-orange px-1.5 py-0.5 text-[0.6rem] font-bold text-brand-white">Out of stock</span> : null}
        <span className={`absolute right-1.5 bottom-1.5 rounded-full border-2 border-brand-forest px-2 py-1 text-[0.65rem] font-bold ${categoryBadge(product)}`}>{product.category}</span>
      </a>
      <div className="grid min-w-0 content-start gap-1.5">
        <p className="text-[0.68rem] font-bold uppercase tracking-[0.08em] text-brand-green-ink">{product.eyebrow}</p>
        <h3 className="font-primary text-[1.45rem] font-bold leading-[1] text-brand-black" id={headingId}>
          <a className={`rounded-wobbly-tag focus-visible:outline focus-visible:outline-3 focus-visible:outline-dashed focus-visible:outline-brand-green-ink focus-visible:outline-offset-3 hover:text-brand-green-ink`} href={detailHref}>{product.name}</a>
        </h3>
        <p className="line-clamp-2 text-sm leading-[1.35] text-brand-black/72">{product.description}</p>
        <strong className="text-sm text-brand-orange-ink">{productPrice(product)}</strong>
        {onViewDetail ? (
          <button className={`${viewContentsButtonClasses} min-h-8 text-[0.7rem]`} type="button" onClick={() => onViewDetail(product)}>
            View box contents
          </button>
        ) : null}
        <a className={`${detailsLinkClasses} min-h-9 justify-start px-0`} href={detailHref}>View details →</a>
      </div>
      {!preview ? <div className="col-span-full"><ProductFacts product={product} compact /></div> : null}
      {!preview ? <div className="col-span-full"><ProductDetail product={product} short /></div> : null}
      <div className="col-span-full"><WishlistButton product={product} /></div>
      <div className="col-span-full"><AddToCartButton product={product} onAdd={onAdd} /></div>
    </article>
  );
}
