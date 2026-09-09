import type { ShopProduct } from "./shop-utils";

export function ProductFacts({ product, compact = false }: { product: ShopProduct; compact?: boolean }) {
  return (
    <dl className={`grid grid-cols-2 gap-2 rounded-wobbly-md border-2 border-brand-forest/18 bg-brand-mint p-3 text-sm ${compact ? "text-xs" : ""}`}>
      <div className="grid min-w-0 gap-0.5"><dt className="text-[0.68rem] font-bold uppercase tracking-[0.06em] text-brand-green-ink">Portion</dt><dd className="text-brand-black/72">{product.servings}</dd></div>
      <div className="grid min-w-0 gap-0.5"><dt className="text-[0.68rem] font-bold uppercase tracking-[0.06em] text-brand-green-ink">Prep</dt><dd className="text-brand-black/72">{product.cookingTime}</dd></div>
      {!compact ? <div className="col-span-2 flex min-w-0 items-start justify-between gap-3 border-t border-dashed border-brand-forest/24 pt-2"><dt className="text-[0.68rem] font-bold uppercase tracking-[0.06em] text-brand-green-ink">Availability</dt><dd className="text-right text-brand-black/72">{product.availability}</dd></div> : null}
    </dl>
  );
}
