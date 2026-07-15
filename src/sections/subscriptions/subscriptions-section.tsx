import type { ReactNode } from "react";
import { products } from "../../data/landing";
import { OutlineLink, PrimaryLink } from "../../components/ui/action-link";
import { OutlineTag } from "../../components/ui/tag";
import { sectionShell } from "../../components/ui/styles";

type ProductLayout = (typeof products)[number]["layout"];
type ProductTone = (typeof products)[number]["tone"];

function ProductFrame({ children, layout }: { children: ReactNode; layout: ProductLayout }) {
  const layoutClass = layout === "reverse" ? "product-row-reverse product-row-reverse-shell sm:grid-cols-[minmax(0,1fr)_minmax(250px,0.88fr)]" : "sm:grid-cols-[minmax(250px,0.88fr)_minmax(0,1fr)]";

  return <article className={`product-row product-row-shell relative grid grid-cols-1 items-center gap-[clamp(2rem,7vw,5.4rem)] ${layoutClass}`}>{children}</article>;
}

function ProductArtwork({ image, alt, layout, tone }: { image: string; alt: string; layout: ProductLayout; tone: ProductTone }) {
  const layoutClass = layout === "reverse" ? "order-none sm:order-2" : "";
  const toneClass = tone === "yellow" ? "product-art-shell-alt" : "";

  return (
    <div className={`product-art product-art-shell relative grid min-h-62.5 place-items-center sm:min-h-75 ${layoutClass} ${toneClass}`}>
      <div className="absolute left-5 top-5 z-[2] grid gap-0.5 rounded-[18px_10px_16px_12px] border-2 border-brand-green-ink bg-brand-white/90 px-3 py-2 shadow-brand-soft" aria-hidden="true">
        <span className="font-primary text-lg font-bold leading-none text-brand-green-ink">Zama</span>
        <span className="text-[0.62rem] font-bold uppercase tracking-[0.12em] text-brand-black/64">Ready to cook</span>
      </div>
      <img className="relative z-[1] max-h-85 -rotate-1 object-contain" src={image} alt={alt} loading="lazy" decoding="async" width="420" height="340" />
    </div>
  );
}

function ProductCopy({ name, eyebrow, description, secondaryLabel, secondaryHref }: Omit<(typeof products)[number], "image" | "alt" | "layout" | "tone">) {
  return (
    <div className="product-copy grid max-w-130 content-center gap-4">
      <OutlineTag>{eyebrow}</OutlineTag>
      <h3 className="font-primary text-[clamp(2.6rem,5vw,4.65rem)] font-bold leading-[1.02] text-brand-green-ink">{name}</h3>
      <p className="text-[1.25rem] text-brand-black/72">{description}</p>
      <div className="editorial-rule" aria-hidden="true" />
      <div className="button-row flex flex-wrap gap-[0.8rem]">
        <PrimaryLink href="#waitlist">Get this box</PrimaryLink>
        <OutlineLink href={secondaryHref}>{secondaryLabel}</OutlineLink>
      </div>
    </div>
  );
}

const Product = { Frame: ProductFrame, Artwork: ProductArtwork, Copy: ProductCopy };

export function SubscriptionsSection() {
  return (
    <section className={`deferred-section products grid gap-[clamp(2.6rem,6vw,5rem)] pb-[clamp(4rem,7vw,6rem)] ${sectionShell}`} id="subscriptions" aria-labelledby="products-title">
      <div className="section-heading grid justify-items-center gap-[0.55rem] text-center">
        <OutlineTag>Shop categories</OutlineTag>
        <h2 id="products-title" className="font-primary text-[clamp(2.35rem,5vw,5rem)] font-bold leading-[1.02] text-brand-green-ink">Explore the range</h2>
      </div>
      {products.map((product) => (
        <Product.Frame key={product.name} layout={product.layout}>
          <Product.Artwork image={product.image} alt={product.alt} layout={product.layout} tone={product.tone} />
          <Product.Copy name={product.name} eyebrow={product.eyebrow} description={product.description} secondaryLabel={product.secondaryLabel} secondaryHref={product.secondaryHref} />
        </Product.Frame>
      ))}
    </section>
  );
}
