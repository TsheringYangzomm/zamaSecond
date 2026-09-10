import { useContent } from "../cms/content-context";
import { formatPartnerSince } from "../cms/partner-since";
import { FarmerAvatar } from "../components/farmers/farmer-avatar";
import { OutlineLink, PrimaryLink } from "../components/ui/action-link";
import { OutlineTag, YellowTag } from "../components/ui/tag";
import { sectionShell, sectionTitleCompact } from "../components/ui/styles";
import { productPrice, type ShopProduct } from "../components/shop/shop-utils";
import type { Farmer } from "../data/farmers";

function FarmerNotFound() {
  return (
    <section className={`grid gap-5 py-[clamp(3rem,6vw,5rem)] ${sectionShell}`} aria-labelledby="farmer-not-found-title">
      <OutlineTag>Our farmers</OutlineTag>
      <h1 id="farmer-not-found-title" className={`${sectionTitleCompact} text-brand-green-ink`}>Farmer profile not found</h1>
      <p className="max-w-140 text-[1.05rem] leading-[1.5] text-brand-black/72">This farmer may have been removed or the link is no longer available.</p>
      <div><OutlineLink href="/farmers">Back to all farmers</OutlineLink></div>
    </section>
  );
}

function ProductSupplied({ product }: { product: ShopProduct }) {
  return (
    <a className="grid gap-2 rounded-wobbly-md border-3 border-brand-forest bg-brand-white p-3 shadow-brand-soft transition-transform hover:-translate-y-0.5 hover:shadow-brand-hover focus-visible:outline focus-visible:outline-3 focus-visible:outline-dashed focus-visible:outline-brand-green-ink focus-visible:outline-offset-4" href={`/shop/${encodeURIComponent(product.id)}`}>
      <div className="grid h-32 place-items-center overflow-hidden rounded-wobbly-sm border-2 border-brand-forest/15 bg-brand-warm-white">
        {product.image ? <img className="h-full w-full object-contain p-2" src={product.image} alt="" loading="lazy" /> : <span className="font-primary text-2xl font-bold text-brand-forest/35">Zama</span>}
      </div>
      <div className="flex items-start justify-between gap-2">
        <span className="font-bold text-brand-black">{product.name}</span>
        <span className="shrink-0 text-sm font-bold text-brand-orange-ink">{productPrice(product)}</span>
      </div>
      <span className="text-xs font-bold text-brand-green-ink underline decoration-dashed underline-offset-4">View product →</span>
    </a>
  );
}

function FarmerMeta({ farmer }: { farmer: Farmer }) {
  return (
    <div className="grid gap-3 sm:grid-cols-3">
      <div className="rounded-wobbly-md border-2 border-brand-forest/20 bg-brand-white p-3">
        <p className="text-xs font-bold uppercase tracking-[0.08em] text-brand-green-ink">From</p>
        <p className="mt-1 font-bold text-brand-black">{farmer.dzongkhag}</p>
      </div>
      <div className="rounded-wobbly-md border-2 border-brand-forest/20 bg-brand-white p-3">
        <p className="text-xs font-bold uppercase tracking-[0.08em] text-brand-green-ink">Farming</p>
        <p className="mt-1 font-bold text-brand-black">{farmer.yearsFarming} years</p>
      </div>
      <div className="rounded-wobbly-md border-2 border-brand-forest/20 bg-brand-white p-3">
        <p className="text-xs font-bold uppercase tracking-[0.08em] text-brand-green-ink">Partner since</p>
        <p className="mt-1 font-bold text-brand-black">{formatPartnerSince(farmer.partnerSince)}</p>
      </div>
    </div>
  );
}

export function FarmerProfilePage({ farmerId }: { farmerId: string | null }) {
  const { farmers, products } = useContent();
  const farmer = farmerId ? farmers.find((item) => item.id === farmerId) : undefined;
  if (!farmer) return <FarmerNotFound />;

  const suppliedProducts = products.filter((product) => farmer.products.some((name) => name.toLowerCase() === product.name.toLowerCase()));

  return (
    <section className="farm-story-surface full-bleed-safe relative overflow-hidden py-[clamp(2.5rem,5vw,4.5rem)]" aria-labelledby="farmer-profile-title">
      <div className={`relative z-[1] grid gap-7 ${sectionShell}`}>
        <nav className="breadcrumb" aria-label="Breadcrumb">
          <ol className="flex flex-wrap items-center gap-1.5 text-sm">
            <li><a className="font-bold text-brand-green-ink underline decoration-dashed underline-offset-4 hover:text-brand-forest" href="/">Home</a></li>
            <li aria-hidden="true" className="text-brand-black/40">/</li>
            <li><a className="font-bold text-brand-green-ink underline decoration-dashed underline-offset-4 hover:text-brand-forest" href="/farmers">Farmers</a></li>
            <li aria-hidden="true" className="text-brand-black/40">/</li>
            <li aria-current="page" className="font-bold text-brand-black">{farmer.name}</li>
          </ol>
        </nav>

        <a className="inline-flex w-fit items-center gap-1.5 text-sm font-bold text-brand-green-ink underline decoration-dashed underline-offset-4 hover:text-brand-forest focus-visible:outline focus-visible:outline-3 focus-visible:outline-dashed focus-visible:outline-brand-green-ink focus-visible:outline-offset-4" href="/farmers">← Back to all farmers</a>

        <div className="grid gap-7 lg:grid-cols-[minmax(0,0.82fr)_minmax(0,1.18fr)] lg:items-start lg:gap-10">
          <div className="brand-pattern relative overflow-hidden rounded-[34px_22px_40px_24px/24px_40px_22px_34px] border-3 border-dashed border-brand-forest bg-brand-warm-white p-3 shadow-brand-big sm:p-5">
            {farmer.image ? (
              <img className="h-90 w-full rounded-[26px_17px_32px_18px/18px_32px_17px_26px] object-cover sm:h-115" src={farmer.image} alt={farmer.name} />
            ) : (
              <FarmerAvatar name={farmer.name} className="h-90 w-full rounded-[26px_17px_32px_18px/18px_32px_17px_26px] sm:h-115" />
            )}
            <span className="absolute left-6 top-6 rounded-full border-2 border-brand-forest bg-brand-yellow px-3 py-1 text-xs font-bold text-brand-black">Farmer profile</span>
          </div>

          <div className="grid content-start gap-4">
            <div className="flex flex-wrap items-center gap-2">
              <OutlineTag>Meet the farmer</OutlineTag>
              {farmer.verified ? <span className="rounded-full border-2 border-brand-forest bg-brand-mint px-3 py-1 text-xs font-bold text-brand-green-ink">✓ Verified partner</span> : null}
            </div>
            <div className="grid gap-2">
              <h1 id="farmer-profile-title" className={`${sectionTitleCompact} text-brand-green-ink`}>{farmer.name}</h1>
              <p className="text-lg font-bold text-brand-black/64">{farmer.location}</p>
            </div>
            <p className="max-w-155 text-[1.08rem] leading-[1.6] text-brand-black/76">{farmer.bio}</p>
            <FarmerMeta farmer={farmer} />
            <div className="flex flex-wrap gap-2">
              {farmer.tags.map((tag) => <YellowTag key={tag}>{tag}</YellowTag>)}
            </div>
          </div>
        </div>

        <div className="grid gap-5 lg:grid-cols-[minmax(0,1.15fr)_minmax(280px,0.85fr)] lg:items-start">
          <article className="grid gap-3 rounded-wobbly-card border-3 border-brand-forest bg-brand-white p-5 shadow-brand-soft sm:p-7">
            <p className="text-xs font-bold uppercase tracking-[0.12em] text-brand-orange-ink">Their story</p>
            <h2 className="font-primary text-[clamp(1.7rem,3vw,2.4rem)] font-bold leading-[1.05] text-brand-green-ink">Grown with care in {farmer.dzongkhag}</h2>
            <p className="text-[1.05rem] leading-[1.65] text-brand-black/72">{farmer.story || farmer.bio}</p>
          </article>
          <aside className="grid gap-3 rounded-wobbly-card border-3 border-brand-forest bg-brand-yellow p-5 shadow-brand-soft sm:p-6" aria-label="Latest seasonal update">
            <p className="text-xs font-bold uppercase tracking-[0.12em] text-brand-orange-ink">Latest from the farm</p>
            <p className="font-primary text-xl font-bold leading-[1.25] text-brand-green-ink">&ldquo;{farmer.seasonalUpdate || farmer.bio}&rdquo;</p>
            <p className="text-sm leading-[1.5] text-brand-black/68">Follow the harvest as local produce moves from the farm to your kitchen.</p>
          </aside>
        </div>

        <section className="grid gap-4" aria-labelledby="farmer-products-title">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div className="grid gap-1">
              <p className="text-xs font-bold uppercase tracking-[0.12em] text-brand-orange-ink">From this farmer</p>
              <h2 id="farmer-products-title" className="font-primary text-[clamp(1.7rem,3vw,2.4rem)] font-bold leading-[1.05] text-brand-green-ink">Products supplied</h2>
            </div>
            <OutlineLink href="/shop">Browse the market</OutlineLink>
          </div>
          <div className="flex flex-wrap gap-2" aria-label="Products supplied by this farmer">
            {farmer.products.map((product) => <span className="rounded-full border-2 border-brand-forest/20 bg-brand-white px-3 py-1 text-sm font-bold text-brand-black" key={product}>{product}</span>)}
          </div>
          {suppliedProducts.length > 0 ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {suppliedProducts.map((product) => <ProductSupplied key={product.id} product={product} />)}
            </div>
          ) : (
            <div className="rounded-wobbly-card border-3 border-dashed border-brand-forest/30 bg-brand-warm-white p-5 text-sm font-semibold text-brand-black/68">The products supplied by {farmer.name} will be added to the market soon.</div>
          )}
        </section>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t-2 border-dashed border-brand-forest/25 pt-5">
          <p className="text-sm font-semibold text-brand-black/64">Want to meet more of the people behind your food?</p>
          <div className="flex flex-wrap gap-2">
            <OutlineLink href="/farmers">Meet more farmers</OutlineLink>
            <PrimaryLink href="/shop">Shop local produce</PrimaryLink>
          </div>
        </div>
      </div>
    </section>
  );
}
