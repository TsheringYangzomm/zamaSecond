import { useContent } from "../cms/content-context";
import type { MealKitTrustDetail } from "../data/landing";
import { OutlineTag } from "../components/ui/tag";
import { sectionShell, sectionTitle } from "../components/ui/styles";

function TrustSection({ heading, children }: { heading: string; children: React.ReactNode }) {
  return (
    <div className="grid gap-2">
      <h3 className="font-primary text-sm font-bold uppercase tracking-[0.08em] text-brand-green-ink">{heading}</h3>
      <div className="rounded-wobbly-md border-2 border-brand-forest/26 bg-brand-warm-white p-4 text-sm leading-[1.6] text-brand-black/72">{children}</div>
    </div>
  );
}

function TrustCard({ detail }: { detail: MealKitTrustDetail }) {
  const { blocks } = useContent();
  const page = blocks.mealKitTrustPage;

  return (
    <article className="grid gap-5 overflow-hidden rounded-wobbly-card border-3 border-brand-forest bg-brand-white p-5 shadow-brand sm:p-7">
      <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_200px] sm:items-start sm:gap-6">
        <div className="grid gap-3">
          <h2 className="font-primary text-[clamp(1.6rem,3vw,2.2rem)] font-bold leading-none text-brand-black">{detail.title}</h2>

          <TrustSection heading={page.consultantHeading}>
            <p>{detail.consultantNote}</p>
          </TrustSection>

          <TrustSection heading={page.dieticianHeading}>
            <p>{detail.dieticianNote}</p>
          </TrustSection>
        </div>

        <div className="brand-pattern relative grid min-h-48 place-items-center overflow-hidden rounded-[24px_16px_28px_18px/18px_28px_16px_24px] border-2 border-dashed border-brand-forest/36 bg-brand-warm-white p-3">
          <img className="h-40 w-full object-contain" src={detail.image} alt={detail.alt} loading="lazy" decoding="async" width="210" height="170" />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <TrustSection heading={page.healthBenefitsHeading}>
          <ul className="list-disc pl-4 grid gap-1">
            {detail.healthBenefits.map((benefit) => <li key={benefit}>{benefit}</li>)}
          </ul>
        </TrustSection>

        <TrustSection heading={page.allergensHeading}>
          <ul className="list-disc pl-4 grid gap-1">
            {detail.allergens.map((allergen) => <li key={allergen}>{allergen}</li>)}
          </ul>
        </TrustSection>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <TrustSection heading={page.sourcingHeading}>
          <p>{detail.sourcing}</p>
        </TrustSection>

        <TrustSection heading={page.storageHeading}>
          <p>{detail.storageAdvice}</p>
        </TrustSection>
      </div>
    </article>
  );
}

export function MealKitTrustPage() {
  const { blocks, mealKitTrustDetails } = useContent();
  const page = blocks.mealKitTrustPage;

  return (
    <section className={`grid gap-6 py-[clamp(3rem,6vw,5rem)] ${sectionShell}`} aria-labelledby="trust-page-title">
      <div className="section-heading grid gap-4">
        <a className="inline-flex w-fit items-center gap-1 text-sm font-bold text-brand-green-ink underline decoration-dashed underline-offset-4 hover:text-brand-forest focus-visible:outline focus-visible:outline-3 focus-visible:outline-dashed focus-visible:outline-brand-green-ink focus-visible:outline-offset-2" href="#/">{page.backLabel}</a>
        <nav className="breadcrumb" aria-label="Breadcrumb">
          <ol className="flex flex-wrap items-center gap-1.5 text-sm">
            <li><a className="font-bold text-brand-green-ink underline decoration-dashed underline-offset-4 hover:text-brand-forest" href="#/">Home</a></li>
            <li aria-hidden="true" className="text-brand-black/40">/</li>
            <li><a className="font-bold text-brand-green-ink underline decoration-dashed underline-offset-4 hover:text-brand-forest" href="#/">Meal kits</a></li>
            <li aria-hidden="true" className="text-brand-black/40">/</li>
            <li aria-current="page" className="font-bold text-brand-black">Trust standards</li>
          </ol>
        </nav>
        <OutlineTag>{page.tag}</OutlineTag>
        <h1 id="trust-page-title" className={`${sectionTitle} max-w-190 text-brand-green-ink`}>{page.heading}</h1>
        <p className="max-w-150 text-[1.05rem] leading-[1.5] text-brand-black/72">{page.copy}</p>
      </div>

      <div className="grid gap-6">
        {mealKitTrustDetails.map((detail) => <TrustCard detail={detail} key={detail.slug} />)}
      </div>
    </section>
  );
}
