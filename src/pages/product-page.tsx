import { useEffect, useState } from "react";
import { useCart } from "../cart-context";
import { useContent } from "../cms/content-context";
import { useOptionalCustomerAuth } from "../checkout/customer-auth";
import { recordProductView } from "../account-preferences";
import { OutlineLink } from "../components/ui/action-link";
import { OutlineTag, YellowTag } from "../components/ui/tag";
import { btnPrimaryKit, sectionShell, sectionTitleCompact } from "../components/ui/styles";
import { AddToCartIcon, SupportingShopCard } from "../components/shop/product-cards";
import { ProductDetail } from "../components/shop/product-detail";
import { ProductFacts } from "../components/shop/product-facts";
import { ReviewsSection } from "../components/shop/reviews-section";
import { findProduct, isProductActive, productPrice, type ShopProduct } from "../components/shop/shop-utils";

const stepperButtonClasses =
  "grid h-11 w-11 touch-manipulation place-items-center rounded-wobbly-md font-bold text-brand-forest hover:bg-brand-white focus-visible:outline focus-visible:outline-3 focus-visible:outline-dashed focus-visible:outline-brand-green-ink focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent";

function PurchasePanel({ product }: { product: ShopProduct }) {
  const { cart, addToCart, changeCartQuantity, removeFromCart, openCart } = useCart();
  const [announcement, setAnnouncement] = useState("");
  const quantity = cart[product.id] ?? 0;
  const active = isProductActive(product);

  function handleAdd() {
    addToCart(product.id);
    const nextQuantity = quantity + 1;
    setAnnouncement(`${product.name} added to cart. ${nextQuantity} item${nextQuantity === 1 ? "" : "s"} in cart.`);
  }

  function handleChange(difference: number) {
    changeCartQuantity(product.id, difference);
    const nextQuantity = Math.max(0, quantity + difference);
    setAnnouncement(nextQuantity === 0 ? `${product.name} removed from cart.` : `${nextQuantity} of ${product.name} in cart.`);
  }

  function handleRemove() {
    removeFromCart(product.id);
    setAnnouncement(`${product.name} removed from cart.`);
  }

  return (
    <div className="rounded-wobbly-md border-3 border-dashed border-brand-forest bg-brand-warm-white p-4 shadow-brand">
      {!active ? (
        <div className="grid gap-2">
          <p className="rounded-wobbly-md border-2 border-brand-orange-ink bg-brand-orange/15 px-3 py-2 text-sm font-bold text-brand-orange-ink">Out of stock — this product is currently inactive.</p>
          <p className="text-sm text-brand-black/64">It will be available to order again once it is reactivated.</p>
        </div>
      ) : (
      <div className="flex items-center justify-between gap-3">
        <div className="grid gap-0.5">
          <p className="text-xs font-bold uppercase tracking-[0.1em] text-brand-green-ink">Quantity</p>
          <p className="text-sm text-brand-black/64">{quantity > 0 ? "In your basket — adjust below." : "Choose how many to add."}</p>
        </div>
        <div className="inline-flex items-center rounded-wobbly-md border-2 border-brand-forest bg-brand-mint">
          <button className={stepperButtonClasses} type="button" disabled={quantity === 0} onClick={() => handleChange(-1)} aria-label={`Decrease ${product.name} quantity`}>−</button>
          <span className="min-w-8 text-center font-bold tabular-nums text-brand-black" aria-label={`${quantity} in cart`}>{quantity}</span>
          <button className={stepperButtonClasses} type="button" onClick={() => handleChange(1)} aria-label={`Increase ${product.name} quantity`}>+</button>
        </div>
      </div>
      )}
      {active ? (
      <div className="mt-3 grid gap-2">
        {quantity === 0 ? (
          <button className={`${btnPrimaryKit} w-full gap-2`} type="button" onClick={handleAdd} aria-label={`Add ${product.name} to cart`}>
            <AddToCartIcon />
            Add to Cart
          </button>
        ) : (
          <>
            <button className={`${btnPrimaryKit} w-full gap-2`} type="button" onClick={openCart}>
              View basket and buy together
            </button>
            <button className="min-h-10 touch-manipulation rounded-wobbly-md px-2 text-xs font-bold text-brand-green-ink underline decoration-dashed underline-offset-4 focus-visible:outline focus-visible:outline-3 focus-visible:outline-dashed focus-visible:outline-brand-green-ink focus-visible:outline-offset-2" type="button" onClick={handleRemove}>Remove from basket</button>
          </>
        )}
      </div>
      ) : null}
      <p className="sr-only" role="status" aria-live="polite">{announcement}</p>
    </div>
  );
}

function ProductDetails({ product }: { product: ShopProduct }) {
  const { cartQuantity, addToCart } = useCart();
  const { products, blocks } = useContent();
  const auth = useOptionalCustomerAuth();
  const page = blocks.productPage;
  const [relatedAnnouncement, setRelatedAnnouncement] = useState("");
  const related = products.filter((candidate) => candidate.id !== product.id && candidate.category === product.category).slice(0, 3);
  const suggestions = products.filter((candidate) => candidate.id !== product.id && candidate.category !== product.category).slice(0, 3);

  useEffect(() => {
    if (auth?.profile?.email) recordProductView(auth.profile.email, product.id);
  }, [auth?.profile?.email, product.id]);

  function handleAddRelated(candidate: ShopProduct) {
    addToCart(candidate.id);
    const nextQuantity = cartQuantity + 1;
    setRelatedAnnouncement(`${candidate.name} added to cart. ${nextQuantity} item${nextQuantity === 1 ? "" : "s"} in cart.`);
  }

  return (
    <section className={`grid gap-6 py-[clamp(3rem,6vw,5rem)] ${sectionShell}`} aria-labelledby="product-title">
      <div className="grid gap-2">
        <a className="inline-flex w-fit items-center gap-1 text-sm font-bold text-brand-green-ink underline decoration-dashed underline-offset-4 hover:text-brand-forest focus-visible:outline focus-visible:outline-3 focus-visible:outline-dashed focus-visible:outline-brand-green-ink focus-visible:outline-offset-2" href="#/shop">{page.backLabel}</a>
        <nav className="breadcrumb" aria-label="Breadcrumb">
          <ol className="flex flex-wrap items-center gap-1.5 text-sm">
            <li><a className="font-bold text-brand-green-ink underline decoration-dashed underline-offset-4 hover:text-brand-forest" href="#/">Home</a></li>
            <li aria-hidden="true" className="text-brand-black/40">/</li>
            <li><a className="font-bold text-brand-green-ink underline decoration-dashed underline-offset-4 hover:text-brand-forest" href="#/shop">Shop</a></li>
            <li aria-hidden="true" className="text-brand-black/40">/</li>
            <li aria-current="page" className="font-bold text-brand-black">{product.name}</li>
          </ol>
        </nav>
      </div>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1.08fr)_minmax(360px,0.92fr)] lg:items-start lg:gap-8">
        <div className="brand-pattern relative grid min-h-105 place-items-center overflow-hidden rounded-[34px_20px_40px_24px/24px_40px_20px_34px] border-3 border-dashed border-brand-forest bg-brand-warm-white p-5 shadow-brand-big sm:p-7">
          <img className="h-92 w-full object-contain sm:h-110" src={product.image} alt={product.alt} decoding="async" width="620" height="520" />
          <span className="absolute left-4 top-4 rounded-full border-2 border-brand-forest bg-brand-yellow px-3 py-1 text-xs font-bold text-brand-black">{product.category}</span>
          <span className="absolute bottom-4 right-4 -rotate-2 rounded-wobbly-tag border-2 border-brand-forest bg-brand-white px-3 py-2 text-xs font-bold text-brand-black shadow-brand-soft">{page.contentsShownLabel}</span>
        </div>

        <div className="grid min-w-0 content-start gap-4">
          <div className="flex flex-wrap items-center gap-2">
            <YellowTag>{product.eyebrow}</YellowTag>
            {!isProductActive(product) ? <span className="inline-flex min-h-8 w-fit items-center rounded-full border-2 border-brand-orange-ink bg-brand-orange px-3 py-1 text-xs font-bold leading-none text-brand-white">Out of stock</span> : null}
            <span className="inline-flex min-h-8 w-fit items-center rounded-full border-2 border-brand-forest bg-brand-mint px-3 py-1 text-xs font-bold leading-none text-brand-green-ink">{product.availability}</span>
          </div>
          <h1 id="product-title" className={`${sectionTitleCompact} max-w-180 text-brand-black`}>{product.name}</h1>
          <p className="text-[1.05rem] leading-[1.55] text-brand-black/72">{product.description}</p>

          <div className="grid gap-1 border-l-4 border-brand-orange pl-3">
            <span className="text-xs font-bold uppercase tracking-[0.1em] text-brand-green-ink">{page.priceLabel}</span>
            <strong className="font-primary text-[clamp(2rem,4vw,2.8rem)] font-bold leading-none text-brand-orange-ink">{productPrice(product)}</strong>
            <p className="text-xs text-brand-black/64">{product.deliveryEstimate}</p>
          </div>

          <PurchasePanel product={product} />
          <ProductFacts product={product} />

          <div className="flex flex-wrap gap-2">
            {product.tags.map((tag) => <span className="rounded-full border-2 border-brand-forest/30 bg-brand-white px-2 py-1 text-xs font-medium text-brand-black/72" key={tag}>{tag}</span>)}
          </div>

          <ProductDetail product={product} />
        </div>
      </div>

      <ReviewsSection product={product} />

      {related.length > 0 ? (
        <aside className="grid content-start gap-4 border-t-2 border-dashed border-brand-forest/26 pt-6" aria-labelledby="related-title">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <h2 id="related-title" className="font-primary text-[clamp(1.6rem,3vw,2.2rem)] font-bold leading-none text-brand-black">{page.relatedHeading} {product.category.toLowerCase()}</h2>
            <OutlineLink href="#/shop">Browse the full shop</OutlineLink>
          </div>
          <div className="grid content-start items-start gap-4 md:grid-cols-2 lg:grid-cols-3">
            {related.map((candidate) => <SupportingShopCard key={candidate.id} product={candidate} onAdd={handleAddRelated} />)}
          </div>
        </aside>
      ) : null}

      {suggestions.length > 0 ? (
        <aside className="grid content-start gap-4 border-t-2 border-dashed border-brand-forest/26 pt-6" aria-labelledby="suggestions-title">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <h2 id="suggestions-title" className="font-primary text-[clamp(1.6rem,3vw,2.2rem)] font-bold leading-none text-brand-black">{page.suggestionsHeading}</h2>
            <OutlineLink href="#/shop">Browse the full shop</OutlineLink>
          </div>
          <div className="grid content-start items-start gap-4 md:grid-cols-2 lg:grid-cols-3">
            {suggestions.map((candidate) => <SupportingShopCard key={candidate.id} product={candidate} onAdd={handleAddRelated} />)}
          </div>
        </aside>
      ) : null}

      <p className="sr-only" role="status" aria-live="polite">{relatedAnnouncement}</p>
    </section>
  );
}

function ProductNotFound() {
  const { blocks } = useContent();
  const page = blocks.productPage;
  return (
    <section className={`grid gap-6 py-[clamp(3rem,6vw,5rem)] ${sectionShell}`} aria-labelledby="not-found-title">
      <div className="section-heading grid gap-4">
        <OutlineTag>{page.notFoundTag}</OutlineTag>
        <h1 id="not-found-title" className={`${sectionTitleCompact} max-w-180 text-brand-green-ink`}>{page.notFoundTitle}</h1>
        <p className="max-w-140 text-[1.05rem] leading-[1.5] text-brand-black/72">{page.notFoundCopy}</p>
        <div>
          <OutlineLink href="#/shop">{page.notFoundCtaLabel}</OutlineLink>
        </div>
      </div>
    </section>
  );
}

export function ProductPage({ productId }: { productId: string | null }) {
  const { products } = useContent();
  const product = productId ? findProduct(products, productId) : undefined;
  return product ? <ProductDetails product={product} /> : <ProductNotFound />;
}
