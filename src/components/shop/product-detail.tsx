import { productDetailHref, type ShopProduct } from "./shop-utils";

const viewMoreLinkClasses =
  "inline-flex min-h-9 w-fit items-center gap-1 text-sm font-bold text-brand-green-ink underline decoration-dashed underline-offset-4 hover:text-brand-forest focus-visible:outline focus-visible:outline-3 focus-visible:outline-dashed focus-visible:outline-brand-green-ink focus-visible:outline-offset-2";

export function ProductDetail({ product, short = false }: { product: ShopProduct; short?: boolean }) {
  const detailRows = short
    ? [
        { label: "What's inside", value: product.ingredients },
        { label: "Storage", value: product.storage },
      ]
    : [
        { label: "Ingredients", value: product.ingredients },
        { label: "Allergens", value: product.allergenNotice },
        { label: "Storage", value: product.storage },
        { label: "Source", value: product.source },
        { label: "Nutrition", value: product.nutrition },
      ];

  return (
    <details className="group/product-details mt-1 rounded-wobbly-md border-2 border-dashed border-brand-forest/36 bg-brand-buff/70 px-3 text-sm text-brand-black open:border-solid open:bg-brand-warm-white open:shadow-brand-soft" name="product-details">
      <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-3 rounded-wobbly-md font-bold marker:content-none focus-visible:outline focus-visible:outline-3 focus-visible:outline-dashed focus-visible:outline-brand-green-ink focus-visible:outline-offset-3 [&::-webkit-details-marker]:hidden">
        <span>Product Details</span>
        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full border-2 border-brand-forest bg-brand-white text-xl leading-none text-brand-forest transition-transform duration-150 group-open/product-details:rotate-45" aria-hidden="true">+</span>
      </summary>
      <div className="border-t-2 border-dashed border-brand-forest/22 pb-3 pt-3">
        <dl className={`grid content-start gap-3 ${short ? "" : "sm:grid-cols-2"}`}>
          {detailRows.map((row) => (
            <div className="grid min-w-0 content-start gap-0.5" key={row.label}>
              <dt className="text-xs font-bold uppercase tracking-[0.06em] text-brand-green-ink">{row.label}</dt>
              <dd className="break-words leading-[1.45] text-brand-black/72">{row.value}</dd>
            </div>
          ))}
        </dl>
        {short ? (
          <p className="mt-3 border-t border-dashed border-brand-forest/20 pt-2">
            <a className={viewMoreLinkClasses} href={productDetailHref(product)}>View more on the shop page →</a>
          </p>
        ) : (
          <p className="mt-3 border-t border-dashed border-brand-forest/20 pt-2 text-xs text-brand-black/58">
            Product code: <span className="break-all font-mono" translate="no">{product.sku}</span>
          </p>
        )}
      </div>
    </details>
  );
}
