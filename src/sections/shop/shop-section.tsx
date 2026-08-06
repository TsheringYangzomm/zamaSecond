import { useState } from "react";
import { useCart } from "../../cart-context";
import { useContent } from "../../cms/content-context";
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
  const { products, blocks } = useContent();
  const shop = blocks.shopSection;
  const [featuredProduct, ...supportingProducts] = products;

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
              <OutlineTag>{shop.tag}</OutlineTag>
              <h2 id="shop-title" className={`${sectionTitleCompact} max-w-170 text-brand-green-ink`}>{shop.heading}</h2>
              <p className="text-[1.05rem] leading-[1.5] text-brand-black/72">{shop.copy}</p>
            </div>
            <PrimaryLink href="#/shop">{shop.ctaLabel}</PrimaryLink>
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
          <p className="text-sm text-brand-black/64">{shop.footerPrefix} <a className="font-bold text-brand-green-ink underline decoration-dashed underline-offset-4 focus-visible:outline focus-visible:outline-3 focus-visible:outline-dashed focus-visible:outline-brand-green-ink focus-visible:outline-offset-3" href="#/shop">{shop.footerBrowseLabel}</a> or review <a className="font-bold text-brand-green-ink underline decoration-dashed underline-offset-4 focus-visible:outline focus-visible:outline-3 focus-visible:outline-dashed focus-visible:outline-brand-green-ink focus-visible:outline-offset-3" href="#delivery">{shop.footerDeliveryLabel}</a></p>
        </div>
      </div>
    </section>
  );
}
