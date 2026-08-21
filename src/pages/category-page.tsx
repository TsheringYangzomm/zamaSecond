import { useState } from "react";
import { useCart } from "../cart-context";
import { useContent } from "../cms/content-context";
import { OutlineLink } from "../components/ui/action-link";
import { OutlineTag } from "../components/ui/tag";
import { btnPrimaryKit, sectionShell, sectionTitleCompact } from "../components/ui/styles";
import { FeaturedShopCard, SupportingShopCard } from "../components/shop/product-cards";
import { BoxDetailModal } from "../components/shop/box-detail-modal";
import { customCartKey } from "../components/shop/cart-lines";
import { categoryBadgeClasses, categoryRailClasses, categorySlug, slugToCategory, type ProductCategory, type ShopProduct } from "../components/shop/shop-utils";
import { individualItemsByCategory, type IndividualItem } from "../data/individual-items";
import type { Review } from "../components/shop/reviews";

const stepperButtonClasses =
  "grid h-9 w-9 touch-manipulation place-items-center rounded-wobbly-md font-bold text-brand-forest hover:bg-brand-white focus-visible:outline focus-visible:outline-3 focus-visible:outline-dashed focus-visible:outline-brand-green-ink focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent";

function Stars({ rating }: { rating: number }) {
  return (
    <span className="inline-flex items-center gap-0.5 text-sm leading-none text-brand-orange-ink" role="img" aria-label={`${rating} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((star) => (
        <span aria-hidden="true" className={star <= rating ? "" : "text-brand-black/20"} key={star}>★</span>
      ))}
    </span>
  );
}

function initials(name: string) {
  return name.split(" ").map((word) => word[0]).slice(0, 2).join("").toUpperCase();
}

function CategoryReviews({ reviews }: { reviews: Review[] }) {
  if (reviews.length === 0) return null;
  const average = reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length;
  return (
    <aside className="grid content-start gap-4 border-t-2 border-dashed border-brand-forest/26 pt-6" aria-labelledby="category-reviews-title">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="grid gap-1">
          <OutlineTag>Reviews & feedback</OutlineTag>
          <h2 id="category-reviews-title" className="font-primary text-[clamp(1.6rem,3vw,2.2rem)] font-bold leading-none text-brand-black">What previous buyers say</h2>
          <p className="text-sm text-brand-black/64">Sample reviews for the launch preview.</p>
        </div>
        <div className="grid min-w-36 place-items-center gap-1 rounded-wobbly-md border-2 border-brand-forest/24 bg-brand-white px-4 py-3 text-center shadow-brand-soft">
          <strong className="font-primary text-[clamp(1.8rem,3vw,2.4rem)] font-bold leading-none text-brand-orange-ink">{average.toFixed(1)}</strong>
          <Stars rating={Math.round(average)} />
          <span className="text-xs text-brand-black/64">Based on {reviews.length} review{reviews.length === 1 ? "" : "s"}</span>
        </div>
      </div>
      <div className="grid content-start items-start gap-4 md:grid-cols-2 lg:grid-cols-3">
        {reviews.map((review) => (
          <article className="review-card grid content-start gap-2 rounded-wobbly-md border-2 border-brand-forest/22 bg-brand-white p-4 shadow-brand-soft" key={review.id} aria-label={`${review.rating} star review by ${review.author}`}>
            <div className="flex items-start justify-between gap-2">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full border-2 border-brand-forest bg-brand-yellow text-sm font-bold text-brand-black" aria-hidden="true">{initials(review.author)}</span>
              <Stars rating={review.rating} />
            </div>
            <div className="grid gap-0.5">
              <h3 className="font-secondary text-base font-bold leading-tight text-brand-black">{review.title}</h3>
              <p className="text-xs text-brand-black/64">{review.author} · {review.location} · {review.date}{review.verified ? " · Verified buyer" : ""}</p>
            </div>
            <p className="text-sm leading-[1.5] text-brand-black/72">{review.body}</p>
          </article>
        ))}
      </div>
    </aside>
  );
}

function IndividualItemCard({ item, quantity, onSetQuantity }: { item: IndividualItem; quantity: number; onSetQuantity: (id: string, quantity: number) => void }) {
  return (
    <div className="grid content-start gap-2 rounded-wobbly-md border-2 border-brand-forest/20 bg-brand-white p-3 shadow-brand-soft">
      <div className="flex items-center justify-between gap-2">
        <h3 className="font-primary text-base font-bold text-brand-black">{item.name}</h3>
        <span className="shrink-0 rounded-full border-2 border-brand-forest/30 bg-brand-mint px-2 py-0.5 text-[0.65rem] font-bold text-brand-green-ink">{item.unit}</span>
      </div>
      <p className="text-xs leading-[1.4] text-brand-black/64">{item.description}</p>
      <div className="mt-1 flex items-center justify-between gap-2 border-t-2 border-dashed border-brand-forest/15 pt-2">
        <div className="inline-flex items-center rounded-wobbly-md border-2 border-brand-forest bg-brand-mint">
          <button className={stepperButtonClasses} type="button" disabled={quantity === 0} onClick={() => onSetQuantity(item.id, quantity - 1)} aria-label={`Decrease ${item.name} quantity`}>−</button>
          <span className="min-w-8 text-center font-bold tabular-nums text-brand-black" aria-label={`${quantity} ${item.name} in basket`}>{quantity}</span>
          <button className={stepperButtonClasses} type="button" onClick={() => onSetQuantity(item.id, quantity + 1)} aria-label={`Increase ${item.name} quantity`}>+</button>
        </div>
        {quantity > 0 ? <span className="text-[0.65rem] font-bold text-brand-green-ink">In basket</span> : null}
      </div>
    </div>
  );
}

function AlsoLikeCard({ item }: { item: { category: ProductCategory; title: string; description: string; image: string; alt: string } }) {
  const slug = categorySlug(item.category);
  return (
    <a
      className={`group grid content-start gap-3 overflow-hidden rounded-wobbly-card border-3 border-t-8 border-brand-forest ${categoryRailClasses[item.category]} bg-brand-white p-4 shadow-brand-soft transition-[box-shadow,transform] duration-150 ease-in-out hover:-translate-x-px hover:-translate-y-px hover:shadow-brand focus-visible:outline focus-visible:outline-3 focus-visible:outline-dashed focus-visible:outline-brand-green-ink focus-visible:outline-offset-3`}
      href={`#/shop/${slug}`}
      aria-label={`Browse ${item.title}`}
    >
      <div className="brand-pattern relative grid h-32 place-items-center overflow-hidden rounded-wobbly-md border-2 border-dashed border-brand-forest/30 p-2">
        <img className="h-24 w-full object-contain" src={item.image} alt={item.alt} loading="lazy" decoding="async" width="210" height="170" />
      </div>
      <div className="grid min-w-0 content-start gap-1.5">
        <h3 className="font-primary text-[1.3rem] font-bold leading-[1.05] text-brand-black">{item.title}</h3>
        <p className="line-clamp-2 text-sm leading-[1.35] text-brand-black/72">{item.description}</p>
        <span className="text-sm font-bold text-brand-green-ink underline decoration-dashed underline-offset-4 group-hover:text-brand-forest">Browse {item.title.toLowerCase()} →</span>
      </div>
    </a>
  );
}

export function CategoryPage({ categorySlug: slug }: { categorySlug: string }) {
  const categoryResult = slugToCategory(slug);
  const category: ProductCategory | null = categoryResult === "All" ? null : categoryResult;
  const { cartQuantity, addToCart, setCartQuantity, openCart } = useCart();
  const { products, blocks, reviews: reviewsByProduct } = useContent();
  const [cartAnnouncement, setCartAnnouncement] = useState("");
  const [detailProduct, setDetailProduct] = useState<ShopProduct | null>(null);
  const [selection, setSelection] = useState<Record<string, number>>({});

  if (!category) {
    return (
      <section className={`grid gap-6 py-[clamp(3rem,6vw,5rem)] ${sectionShell}`} aria-labelledby="cat-not-found-title">
        <div className="section-heading grid gap-4">
          <OutlineTag>Category not found</OutlineTag>
          <h1 id="cat-not-found-title" className={`${sectionTitleCompact} max-w-180 text-brand-green-ink`}>That category does not exist.</h1>
          <p className="max-w-140 text-[1.05rem] leading-[1.5] text-brand-black/72">Try browsing the full shop instead.</p>
          <div>
            <OutlineLink href="#/shop">Browse all products</OutlineLink>
          </div>
        </div>
      </section>
    );
  }

  const categoryPageKeyMap: Record<ProductCategory, keyof typeof blocks.categoryPages> = {
    Vegetables: "vegetables",
    Fruits: "fruits",
    "Meal kits": "mealKits",
    Groceries: "groceries",
    "Custom boxes": "customBoxes",
  };
  const page = blocks.categoryPages[categoryPageKeyMap[category]];

  const categoryProducts = products.filter((p) => p.category === category);
  const [featuredProduct, ...supportingProducts] = categoryProducts;

  const allCategoryReviews: Review[] = [];
  for (const product of categoryProducts) {
    const productReviews = reviewsByProduct[product.id] ?? [];
    allCategoryReviews.push(...productReviews);
  }

  const otherCategories = blocks.shopCategories.items.filter((item) => item.category !== category);
  const items = individualItemsByCategory[category] ?? [];

  const hasCustomization = page.customizationTitle && page.customizationCtaLabel;
  const customizationHref = category === "Custom boxes" ? "#/customize-box" : "#/customize";

  const selectedCount = Object.values(selection).reduce((total, qty) => total + qty, 0);

  function handleAdd(product: ShopProduct) {
    addToCart(product.id);
    const nextQuantity = cartQuantity + 1;
    setCartAnnouncement(`${product.name} added to cart. ${nextQuantity} item${nextQuantity === 1 ? "" : "s"} in cart.`);
  }

  function setItemQuantity(id: string, quantity: number) {
    const next = Math.max(0, quantity);
    setSelection((current) => {
      const nextSelection = { ...current };
      if (next === 0) delete nextSelection[id];
      else nextSelection[id] = next;
      return nextSelection;
    });
  }

  function addSelectedToBasket() {
    for (const [id, qty] of Object.entries(selection)) {
      if (qty > 0) setCartQuantity(customCartKey(id), qty);
    }
    const totalAdded = Object.values(selection).reduce((s, q) => s + q, 0);
    setSelection({});
    setCartAnnouncement(`${totalAdded} item${totalAdded === 1 ? "" : "s"} added to basket.`);
    openCart();
  }

  return (
    <section className="shop-catalog-surface full-bleed-safe relative overflow-hidden" aria-labelledby="category-page-title">
      <div className={`relative z-[1] grid gap-7 py-[clamp(2.5rem,5vw,4.5rem)] ${sectionShell}`}>
        <nav className="breadcrumb" aria-label="Breadcrumb">
          <ol className="flex flex-wrap items-center gap-1.5 text-sm">
            <li><a className="font-bold text-brand-green-ink underline decoration-dashed underline-offset-4 hover:text-brand-forest" href="#/">Home</a></li>
            <li aria-hidden="true" className="text-brand-black/40">/</li>
            <li><a className="font-bold text-brand-green-ink underline decoration-dashed underline-offset-4 hover:text-brand-forest" href="#/shop">Shop</a></li>
            <li aria-hidden="true" className="text-brand-black/40">/</li>
            <li aria-current="page" className="font-bold text-brand-black">{page.heading}</li>
          </ol>
        </nav>

        <div className="grid gap-5 lg:grid-cols-[minmax(0,1.08fr)_minmax(360px,0.92fr)] lg:items-start lg:gap-8">
          <div className="brand-pattern relative grid min-h-80 place-items-center overflow-hidden rounded-[34px_20px_40px_24px/24px_40px_20px_34px] border-3 border-dashed border-brand-forest bg-brand-warm-white p-5 shadow-brand-big sm:p-7">
            <img className="h-72 w-full object-contain sm:h-96" src={page.heroImage} alt={page.heroAlt} decoding="async" width="620" height="520" />
            <span className={`absolute left-4 top-4 rounded-full border-2 border-brand-forest px-3 py-1 text-xs font-bold ${categoryBadgeClasses[category as ProductCategory]}`}>{page.tag}</span>
          </div>
          <div className="grid min-w-0 content-start gap-3">
            <OutlineTag>{page.tag}</OutlineTag>
            <h1 id="category-page-title" className={`${sectionTitleCompact} max-w-180 text-brand-green-ink`}>{page.heading}</h1>
            <p className="max-w-150 text-[1.05rem] leading-[1.5] text-brand-black/72">{page.copy}</p>
            {hasCustomization ? (
              <div className="mt-2 grid gap-2 rounded-wobbly-md border-3 border-dashed border-brand-forest bg-brand-mint p-4 shadow-brand">
                <h2 className="font-primary text-[clamp(1.4rem,2.4vw,1.9rem)] font-bold text-brand-black">{page.customizationTitle}</h2>
                <p className="max-w-120 text-sm text-brand-black/72">{page.customizationCopy}</p>
                <div>
                  <OutlineLink href={customizationHref}>{page.customizationCtaLabel} →</OutlineLink>
                </div>
              </div>
            ) : null}
          </div>
        </div>

        {categoryProducts.length > 0 ? (
          <div className="grid gap-5">
            <h2 className="font-primary text-[clamp(1.6rem,3vw,2.2rem)] font-bold leading-none text-brand-black">
              {category === "Custom boxes" ? "Pre-built boxes" : `This week's ${page.tag.toLowerCase()}`}
            </h2>
            {featuredProduct ? (
              <FeaturedShopCard product={featuredProduct} onAdd={handleAdd} onViewDetail={setDetailProduct} />
            ) : null}
            {supportingProducts.length > 0 ? (
              <div className={`grid content-start items-start gap-4 ${supportingProducts.length >= 2 ? "md:grid-cols-2" : ""} ${supportingProducts.length >= 3 ? "lg:grid-cols-3" : ""}`}>
                {supportingProducts.map((product, index) => (
                  <div className="shop-grid-item min-w-0 self-start" key={product.id} style={{ animationDelay: `${(index + 1) * 60}ms` }}>
                    <SupportingShopCard product={product} onAdd={handleAdd} onViewDetail={setDetailProduct} />
                  </div>
                ))}
              </div>
            ) : null}
          </div>
        ) : (
          <div className="grid gap-3 rounded-[26px_38px_22px_34px/34px_24px_38px_22px] border-3 border-dashed border-brand-forest/30 bg-brand-warm-white p-6 text-center shadow-brand-soft">
            <p className="font-primary text-[clamp(1.4rem,2.4vw,1.9rem)] font-bold text-brand-black">Coming soon</p>
            <p className="text-sm text-brand-black/64">Products in this category are being prepared for the launch range.</p>
            <div>
              <OutlineLink href="#/shop">Browse all products</OutlineLink>
            </div>
          </div>
        )}

        {items.length > 0 ? (
          <aside className="grid content-start gap-4 border-t-2 border-dashed border-brand-forest/26 pt-6" aria-labelledby="individual-items-title">
            <div className="grid gap-2">
              <h2 id="individual-items-title" className="font-primary text-[clamp(1.6rem,3vw,2.2rem)] font-bold leading-none text-brand-black">
                Pick your own {category === "Groceries" ? "groceries" : category.toLowerCase()}
              </h2>
              <p className="text-sm text-brand-black/64">Choose quantities for individual items and add them to your basket.</p>
            </div>
            <div className="grid content-start items-start gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {items.map((item) => (
                <IndividualItemCard key={item.id} item={item} quantity={selection[item.id] ?? 0} onSetQuantity={setItemQuantity} />
              ))}
            </div>
            {selectedCount > 0 ? (
              <div className="sticky bottom-4 z-20 grid gap-3 rounded-[26px_38px_22px_34px/34px_24px_38px_22px] border-3 border-brand-forest bg-brand-yellow p-4 shadow-brand-big sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
                <div className="grid gap-0.5">
                  <p className="font-primary text-lg font-bold text-brand-black">{selectedCount} item{selectedCount === 1 ? "" : "s"} selected</p>
                  <p className="text-sm text-brand-black/72">Add them to your basket to buy together with boxes.</p>
                </div>
                <button className={`${btnPrimaryKit} gap-2 whitespace-nowrap`} type="button" onClick={addSelectedToBasket}>
                  Add to basket &amp; view cart
                </button>
              </div>
            ) : null}
          </aside>
        ) : null}

        <CategoryReviews reviews={allCategoryReviews} />

        {otherCategories.length > 0 ? (
          <aside className="grid content-start gap-4 border-t-2 border-dashed border-brand-forest/26 pt-6" aria-labelledby="also-like-title">
            <div className="grid gap-2">
              <h2 id="also-like-title" className="font-primary text-[clamp(1.6rem,3vw,2.2rem)] font-bold leading-none text-brand-black">{page.alsoLikeHeading}</h2>
              <p className="text-sm text-brand-black/64">{page.alsoLikeCopy}</p>
            </div>
            <div className="grid content-start items-start gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {otherCategories.map((item) => (
                <AlsoLikeCard key={item.category} item={item} />
              ))}
            </div>
          </aside>
        ) : null}

        <aside className="grid gap-4 rounded-[26px_38px_22px_34px/34px_24px_38px_22px] border-3 border-brand-forest bg-brand-mint p-5 shadow-brand sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center" aria-label="Delivery information">
          <div>
            <h2 className="font-primary text-[clamp(1.4rem,2.4vw,1.9rem)] font-bold text-brand-black">Preparing for Thimphu deliveries.</h2>
            <p className="mt-1 max-w-140 text-brand-black/72">Coverage, hours, and delivery fees will be published before orders open. No payment or order is created at launch.</p>
          </div>
          <OutlineLink href="#delivery">Review delivery details</OutlineLink>
        </aside>

        <p className="sr-only" role="status" aria-live="polite">{cartAnnouncement}</p>
      </div>

      {detailProduct ? <BoxDetailModal product={detailProduct} onClose={() => setDetailProduct(null)} /> : null}
    </section>
  );
}
