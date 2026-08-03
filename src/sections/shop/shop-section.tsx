import { useState } from "react";
import { useCart } from "../../cart-context";
import { shopProducts } from "../../data/landing";
import { OutlineTag } from "../../components/ui/tag";
import { PrimaryLink } from "../../components/ui/action-link";
import { sectionShell, sectionTitleCompact } from "../../components/ui/styles";
import { FeaturedShopCard, SupportingShopCard } from "../../components/shop/product-cards";
import type { ShopProduct } from "../../components/shop/shop-utils";

export function ShopSection() {
  const {
    cartQuantity,
    addToCart,
  } = useCart();
  const [cartAnnouncement, setCartAnnouncement] = useState("");
  const [featuredProduct, ...supportingProducts] = shopProducts;

  function handleAddToCart(product: ShopProduct) {
    addToCart(product.id);
    const nextQuantity = cartQuantity + 1;
    setCartAnnouncement(`${product.name} added to cart. ${nextQuantity} item${nextQuantity === 1 ? "" : "s"} in cart.`);
  }

  return (
    <section className="shop-section" id="shop" aria-labelledby="shop-title">
      <div className="shop-catalog-surface full-bleed-safe relative overflow-hidden py-[clamp(2.5rem,5vw,4.5rem)]">
        <div className={`relative z-[1] grid gap-7 ${sectionShell}`}>
          <div className="section-heading flex flex-wrap items-end justify-between gap-4">
            <div className="grid max-w-150 gap-2">
              <OutlineTag>Launch shop</OutlineTag>
              <h2 id="shop-title" className={`${sectionTitleCompact} max-w-170 text-brand-green-ink`}>Shop the launch range.</h2>
              <p className="text-[1.05rem] leading-[1.5] text-brand-black/72">A first look at every fresh box, meal kit, and grocery top-up. Open the full shop for portions, ingredients, and reviews.</p>
            </div>
            <PrimaryLink href="#/shop">View full shop</PrimaryLink>
          </div>

          <div className="grid gap-5" id="product-grid">
            {featuredProduct ? <FeaturedShopCard product={featuredProduct} onAdd={handleAddToCart} preview /> : null}
            {supportingProducts.length > 0 ? (
              <div className={`grid content-start items-start gap-4 ${supportingProducts.length >= 2 ? "md:grid-cols-2" : ""} ${supportingProducts.length >= 3 ? "lg:grid-cols-3" : ""}`}>
                {supportingProducts.map((product) => <SupportingShopCard key={product.id} product={product} onAdd={handleAddToCart} preview />)}
              </div>
            ) : null}
          </div>
          <p className="sr-only" role="status" aria-live="polite">{cartAnnouncement}</p>
          <p className="text-sm text-brand-black/64">Want the full range, portions, and buyer reviews? <a className="font-bold text-brand-green-ink underline decoration-dashed underline-offset-4 focus-visible:outline focus-visible:outline-3 focus-visible:outline-dashed focus-visible:outline-brand-green-ink focus-visible:outline-offset-3" href="#/shop">Browse the full shop →</a> or review <a className="font-bold text-brand-green-ink underline decoration-dashed underline-offset-4 focus-visible:outline focus-visible:outline-3 focus-visible:outline-dashed focus-visible:outline-brand-green-ink focus-visible:outline-offset-3" href="#delivery">delivery details.</a></p>
        </div>
      </div>
    </section>
  );
}
