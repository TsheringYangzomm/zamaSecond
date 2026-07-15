import { farmers } from "../../data/landing";
import { ActionLink, OutlineLink } from "../../components/ui/action-link";
import { OutlineTag } from "../../components/ui/tag";
import { btnOutlineXs, sectionShell } from "../../components/ui/styles";

function FarmerCard({ name, place, produce, certification, story, rotation }: (typeof farmers)[number]) {
  return (
    <article className={`farmer-card farmer-card-shell relative ${rotation} overflow-hidden rounded-wobbly-card border-3 border-brand-black bg-brand-white shadow-brand-soft transition-[box-shadow,transform] duration-120 ease-in-out hover:-translate-x-px hover:-translate-y-px hover:rotate-0 hover:shadow-brand`}>
      <img className="aspect-[1.3] w-full border-b-3 border-brand-black object-cover [filter:saturate(0.92)_contrast(1.04)]" src="assets/farmer.png" alt={`Farmer ${name}`} loading="lazy" decoding="async" width="420" height="323" />
      <div className="grid gap-[0.35rem] p-[0.9rem]">
        <h3 className="text-[1.35rem] font-bold text-brand-black">{name}</h3>
        <p className="text-[0.98rem] text-brand-black/72">{place}</p>
        <p className="text-[0.98rem] text-brand-black/72">{produce}</p>
        <p className="text-xs font-bold uppercase tracking-[0.08em] text-brand-orange">{certification}</p>
        <ActionLink className={btnOutlineXs} href="#farmers">{story}</ActionLink>
      </div>
    </article>
  );
}

export function FarmersSection() {
  return (
    <section className={`deferred-section farmers grid gap-4 py-[clamp(2.2rem,4.5vw,3.4rem)] ${sectionShell}`} id="farmers" aria-labelledby="farmer-title">
      <div className="split-heading section-heading flex flex-col items-start gap-[0.4rem] sm:flex-row sm:items-end sm:justify-between sm:gap-8">
        <div>
          <OutlineTag>Our farmers</OutlineTag>
          <h2 id="farmer-title" className="font-primary text-[clamp(2rem,4vw,3.6rem)] font-bold leading-[1.02] text-brand-green-ink">Every Ingredient has a Name.</h2>
        </div>
        <p className="max-w-120 text-[1.05rem] text-brand-black/72">When an ingredient comes from a partner farm, we want to show its source, season, and verification status instead of making broad claims.</p>
      </div>
      <div className="farmer-grid grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {farmers.map((farmer) => <FarmerCard key={farmer.name} {...farmer} />)}
      </div>
      <div className="section-action flex justify-end">
        <OutlineLink href="#farmers">Meet all Farmers</OutlineLink>
      </div>
    </section>
  );
}
