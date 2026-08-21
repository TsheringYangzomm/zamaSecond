import { useContent } from "../../cms/content-context";
import { OutlineTag } from "../../components/ui/tag";
import { PrimaryLink } from "../../components/ui/action-link";
import { sectionShell, sectionTitleCompact } from "../../components/ui/styles";
import {
  categoryBadgeClasses,
  categoryRailClasses,
  categorySlug,
  type ProductCategory,
} from "../../components/shop/shop-utils";

type ShopCategoryItem = {
  category: ProductCategory;
  title: string;
  description: string;
  image: string;
  alt: string;
};

const focusRing =
  "focus-visible:outline focus-visible:outline-3 focus-visible:outline-dashed focus-visible:outline-brand-green-ink focus-visible:outline-offset-3";

function CategoryCard({ item, count }: { item: ShopCategoryItem; count: number }) {
  const href = `#/shop/${categorySlug(item.category)}`;
  const browseLabel = item.category === "Custom boxes" ? "Start building your box" : `Browse ${item.title.toLowerCase()}`;
  return (
    <a
      className={`group grid content-start gap-3 overflow-hidden rounded-wobbly-card border-3 border-t-8 border-brand-forest ${categoryRailClasses[item.category]} bg-brand-white p-4 shadow-brand-soft transition-[box-shadow,transform] duration-150 ease-in-out hover:-translate-x-px hover:-translate-y-px hover:shadow-brand ${focusRing}`}
      href={href}
      aria-label={`${item.title}, ${item.category === "Custom boxes" ? "pick any stock item and quantity" : `${count} product${count === 1 ? "" : "s"}`}. ${browseLabel}.`}
    >
      <div className="brand-pattern relative grid h-40 place-items-center overflow-hidden rounded-wobbly-md border-2 border-dashed border-brand-forest/30 p-2">
        <img className="h-32 w-full object-contain" src={item.image} alt={item.alt} loading="lazy" decoding="async" width="210" height="170" />
        {item.category !== "Custom boxes" ? (
          <span className={`absolute right-2 bottom-2 rounded-full border-2 border-brand-forest px-2 py-1 text-xs font-bold ${categoryBadgeClasses[item.category]}`}>
            {count} product{count === 1 ? "" : "s"}
          </span>
        ) : null}
      </div>
      <div className="grid min-w-0 content-start gap-1.5">
        <h3 className="font-primary text-[1.5rem] font-bold leading-[1.05] text-brand-black">{item.title}</h3>
        <p className="text-sm leading-[1.42] text-brand-black/72">{item.description}</p>
        <span className="text-sm font-bold text-brand-green-ink underline decoration-dashed underline-offset-4 group-hover:text-brand-forest">{browseLabel} →</span>
      </div>
    </a>
  );
}

export function ShopSection() {
  const { products, blocks } = useContent();
  const shop = blocks.shopSection;
  const categoryItems = blocks.shopCategories.items;

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

          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3" id="shop-category-grid">
            {categoryItems.map((item) => (
              <CategoryCard key={item.category} item={item} count={products.filter((product) => product.category === item.category).length} />
            ))}
          </div>

          <p className="text-sm text-brand-black/64">{shop.footerPrefix} <a className={`font-bold text-brand-green-ink underline decoration-dashed underline-offset-4 ${focusRing}`} href="#delivery">{shop.footerDeliveryLabel}</a></p>
        </div>
      </div>
    </section>
  );
}
