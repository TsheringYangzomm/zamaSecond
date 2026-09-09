import { useContent } from "../../cms/content-context";
import { PrimaryLink } from "../../components/ui/action-link";
import { OutlineTag } from "../../components/ui/tag";
import { sectionShell, sectionTitleCompact } from "../../components/ui/styles";
import { FarmerCard } from "../../components/farmers/farmer-card";

export function FarmersSection() {
  const { farmers, blocks } = useContent();
  const section = blocks.farmersSection;
  return (
    <section className="farm-story-surface full-bleed-safe deferred-section relative overflow-hidden py-[clamp(3rem,6vw,5rem)]" id="farmers" aria-labelledby="farmer-title">
      <div className={`relative z-[1] grid gap-6 ${sectionShell}`}>
        <div className="section-heading grid gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(280px,0.6fr)] sm:items-end sm:gap-10">
          <div className="grid gap-2">
            <OutlineTag>{section.tag}</OutlineTag>
            <h2 id="farmer-title" className={`${sectionTitleCompact} text-balance text-brand-green-ink`}>{section.heading}</h2>
          </div>
          <p className="max-w-120 text-pretty text-[1.05rem] text-brand-black/72">{section.copy}</p>
        </div>

        <div className="relative">
          <div
            className="farmer-carousel flex items-stretch gap-5 overflow-x-auto scroll-smooth snap-x snap-mandatory pb-4 scrollbar-none"
            role="region"
            aria-roledescription="carousel"
            aria-label={section.carouselLabel}
          >
            {farmers.slice(0, 3).map((farmer) => (
              <div className="farmer-carousel-card flex min-w-[280px] max-w-[340px] flex-1 snap-start" key={farmer.id}>
                <FarmerCard farmer={farmer} image={farmer.image || "assets/farmer.webp"} />
              </div>
            ))}
          </div>
        </div>

        <div className="flex justify-center pt-2">
          <PrimaryLink href="#/farmers">{section.ctaLabel}</PrimaryLink>
        </div>
      </div>
    </section>
  );
}
