import { useEffect, useRef } from "react";
import type { ShopProduct } from "./shop-utils";
import { productPrice } from "./shop-utils";

function ModalBackdrop({ onClose, children }: { onClose: () => void; children: React.ReactNode }) {
  const backdropRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKeyDown);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  return (
    <div
      ref={backdropRef}
      className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-brand-black/60 px-4 py-10"
      role="dialog"
      aria-modal="true"
      aria-labelledby="box-detail-title"
      onClick={(e) => { if (e.target === backdropRef.current) onClose(); }}
    >
      {children}
    </div>
  );
}

export function BoxDetailModal({ product, onClose }: { product: ShopProduct; onClose: () => void }) {
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    closeRef.current?.focus();
  }, []);

  return (
    <ModalBackdrop onClose={onClose}>
      <div className="relative grid w-full max-w-lg gap-5 rounded-[30px_40px_26px_36px/36px_26px_40px_30px] border-3 border-brand-forest bg-brand-warm-white p-6 shadow-brand-big">
        <button
          ref={closeRef}
          className="absolute right-3 top-3 grid h-9 w-9 place-items-center rounded-full border-2 border-brand-forest bg-brand-white text-sm font-bold text-brand-black hover:bg-brand-yellow focus-visible:outline focus-visible:outline-3 focus-visible:outline-dashed focus-visible:outline-brand-green-ink focus-visible:outline-offset-2"
          type="button"
          onClick={onClose}
          aria-label="Close"
        >
          ×
        </button>

        <div className="grid gap-2 pr-8">
          <span className="text-xs font-bold uppercase tracking-[0.1em] text-brand-green-ink">{product.category}</span>
          <h2 id="box-detail-title" className="font-primary text-[clamp(1.6rem,3vw,2.2rem)] font-bold leading-none text-brand-black">{product.name}</h2>
          <p className="text-sm text-brand-black/72">{product.description}</p>
        </div>

        <div className="brand-pattern relative grid h-48 place-items-center overflow-hidden rounded-wobbly-md border-2 border-dashed border-brand-forest/30 p-3">
          <img className="h-40 w-full object-contain" src={product.image} alt={product.alt} decoding="async" width="420" height="340" />
        </div>

        <div className="grid gap-2 rounded-wobbly-md border-2 border-brand-forest/24 bg-brand-mint p-4">
          <h3 className="text-sm font-bold uppercase tracking-[0.08em] text-brand-green-ink">What's in this box</h3>
          <ul className="grid gap-1.5">
            {product.contents.map((item) => (
              <li className="flex items-center justify-between gap-3 text-sm" key={item.name}>
                <span className="font-bold text-brand-black">{item.name}</span>
                <span className="min-w-20 text-right text-brand-black/72">{item.quantity}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="grid gap-3 text-sm text-brand-black/72">
          <div className="flex justify-between gap-3">
            <span className="font-bold text-brand-green-ink">Price</span>
            <span className="text-brand-orange-ink font-bold">{productPrice(product)}</span>
          </div>
          <div className="flex justify-between gap-3">
            <span className="font-bold text-brand-green-ink">Servings</span>
            <span>{product.servings}</span>
          </div>
          <div className="flex justify-between gap-3">
            <span className="font-bold text-brand-green-ink">Source</span>
            <span>{product.source}</span>
          </div>
        </div>

        <div className="grid gap-1 rounded-wobbly-md border-2 border-brand-forest/18 bg-brand-white p-3 text-xs text-brand-black/64">
          <p><span className="font-bold text-brand-green-ink">Storage:</span> {product.storage}</p>
          <p><span className="font-bold text-brand-green-ink">Allergens:</span> {product.allergenNotice}</p>
        </div>

        <button
          className="grid h-11 w-full place-items-center rounded-wobbly-md border-3 border-brand-forest bg-brand-yellow text-sm font-bold text-brand-black shadow-brand-soft transition-all duration-150 ease-out hover:-translate-x-px hover:-translate-y-px hover:shadow-brand focus-visible:outline focus-visible:outline-3 focus-visible:outline-dashed focus-visible:outline-brand-green-ink focus-visible:outline-offset-2"
          type="button"
          onClick={onClose}
        >
          Close
        </button>
      </div>
    </ModalBackdrop>
  );
}
