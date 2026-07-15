import { processSteps } from "../../data/landing";
import { OutlineTag } from "../../components/ui/tag";
import { sectionShell } from "../../components/ui/styles";

const processToneClasses = { white: "bg-brand-white", yellow: "bg-brand-yellow" } as const;

function ProcessStep({ title, number, image, alt, tone, rotation }: (typeof processSteps)[number]) {
  return (
    <article className={`process-step relative z-[1] grid min-h-47.5 ${rotation} justify-items-center gap-[0.6rem] rounded-wobbly-card border-3 border-brand-black ${processToneClasses[tone]} p-[0.85rem_0.7rem] text-center shadow-brand-soft transition-[box-shadow,transform] duration-120 ease-in-out hover:-translate-x-px hover:-translate-y-px hover:rotate-0 hover:shadow-brand sm:min-h-70 sm:gap-[0.85rem] sm:p-[1rem_0.75rem]`}>
      <h3 className="font-primary text-[clamp(1.35rem,2vw,2rem)] font-bold leading-[1.02] text-brand-black">{title}</h3>
      <span className="grid h-9.5 w-9.5 place-items-center rounded-[42%_58%_52%_48%/54%_48%_52%_46%] border-3 border-brand-black bg-brand-green font-primary text-base leading-none text-brand-black">{number}</span>
      <img className="h-23 w-[min(100%,108px)] object-contain sm:h-34.5 sm:w-[min(100%,158px)]" src={image} alt={alt} loading="lazy" decoding="async" width="158" height="138" />
    </article>
  );
}

export function ProcessSection() {
  return (
    <section className={`deferred-section process grid gap-[2.1rem] py-[clamp(2.4rem,5vw,4.2rem)] ${sectionShell}`} id="how-it-works" aria-labelledby="process-title">
      <div className="section-heading grid justify-items-center gap-[0.55rem] text-center">
        <OutlineTag>How it works</OutlineTag>
        <h2 id="process-title" className="font-primary text-[clamp(2.35rem,5vw,5rem)] font-bold leading-[1.02] text-brand-green-ink">From farm list to dinner table.</h2>
      </div>
      <div className="process-grid process-grid-shell relative grid grid-cols-1 items-start gap-6 sm:grid-cols-2 sm:gap-[clamp(0.6rem,2vw,1rem)] md:grid-cols-5">
        {processSteps.map((step) => <ProcessStep key={step.number} {...step} />)}
      </div>
    </section>
  );
}
