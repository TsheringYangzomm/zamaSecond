import { featureItems, valueItems } from "../../data/landing";
import { sectionShell } from "../../components/ui/styles";

const featureToneClasses = {
  yellow:
    "flex min-h-26.5 -rotate-[1.5deg] items-center gap-3 rounded-wobbly-card border-3 border-brand-forest bg-brand-buff p-[1rem_1.1rem] shadow-brand transition-[box-shadow,transform] duration-120 ease-in-out hover:translate-x-0.5 hover:translate-y-0.5 hover:rotate-0 hover:shadow-brand-tight",
  white:
    "flex min-h-26.5 rotate-[1.2deg] items-center gap-3 rounded-wobbly-card border-3 border-brand-forest bg-brand-mint p-[1rem_1.1rem] shadow-brand transition-[box-shadow,transform] duration-120 ease-in-out hover:translate-x-0.5 hover:translate-y-0.5 hover:rotate-0 hover:shadow-brand-tight",
} as const;

function FeatureCard({ number, copy, tone }: (typeof featureItems)[number]) {
  return (
    <div className={featureToneClasses[tone]}>
      <span className="grid h-9.5 w-9.5 flex-none place-items-center rounded-[44%_56%_48%_52%/54%_44%_56%_46%] border-3 border-brand-forest bg-brand-orange font-primary text-[0.92rem] leading-none text-brand-black">
        {number}
      </span>
      <p className="text-[1.15rem] leading-[1.12] text-brand-black">{copy}</p>
    </div>
  );
}

const valueToneClasses = {
  white: "bg-brand-white",
  yellow: "bg-brand-buff",
} as const;

function ValueCard({ title, body, image, tone, rotation }: (typeof valueItems)[number]) {
  return (
    <article className={`value-card value-card-shell relative grid ${rotation} justify-items-center gap-2 rounded-wobbly-card border-3 border-brand-forest ${valueToneClasses[tone]} p-[1.1rem_1rem_1rem] text-center shadow-brand-soft transition-[box-shadow,transform] duration-120 ease-in-out hover:-translate-x-px hover:-translate-y-px hover:rotate-0 hover:shadow-brand sm:gap-[0.8rem] sm:p-[1.45rem_1rem_1.3rem]`}>
      <img className="h-19 w-19 object-contain sm:h-31 sm:w-31" src={image} alt="" aria-hidden="true" loading="lazy" decoding="async" width="124" height="124" />
      <h3 className="font-primary text-[1.55rem] font-bold leading-[1.02] text-brand-black sm:text-[2.1rem]">{title}</h3>
      <p className="max-w-75 text-[0.98rem] text-brand-black/72 sm:text-[1.12rem]">{body}</p>
    </article>
  );
}

export function FeaturesSection() {
  return (
    <>
      <section className={`feature-strip relative z-[2] grid grid-cols-1 gap-4 pt-4 pb-4 sm:grid-cols-2 md:-mt-6 md:grid-cols-4 lg:-mt-8 ${sectionShell}`} aria-label="Zama promises">
        {featureItems.map((item) => <FeatureCard key={item.number} {...item} />)}
      </section>

      <section className={`values grid grid-cols-1 gap-4 py-[clamp(2.4rem,8vw,6rem)] sm:grid-cols-2 sm:gap-[clamp(1.2rem,4vw,3rem)] md:grid-cols-3 ${sectionShell}`} aria-label="Why Zama works">
        <h2 className="sr-only">Why Zama works</h2>
        {valueItems.map((item) => <ValueCard key={item.title} {...item} />)}
      </section>
    </>
  );
}
