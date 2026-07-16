import { processSteps } from "../../data/landing";
import { OutlineTag } from "../../components/ui/tag";
import { sectionShell, sectionTitle } from "../../components/ui/styles";

const processToneClasses = { white: "bg-brand-white/88", yellow: "bg-brand-yellow/22" } as const;
const processPositionClasses = [
  "md:-translate-y-3",
  "md:translate-y-7",
  "md:-translate-y-1",
  "md:translate-y-9",
  "md:-translate-y-4",
] as const;
const processNotes = [
  "Pick the box that fits your week.",
  "Portions and sources are checked.",
  "Your delivery window is confirmed.",
  "Follow the simple recipe note.",
  "Save a favourite for next time.",
] as const;

function ProcessStep({ title, number, image, alt, tone, rotation, index }: (typeof processSteps)[number] & { index: number }) {
  return (
    <article className={`process-step process-stop relative z-[1] grid min-h-55 ${rotation} ${processPositionClasses[index]} justify-items-center gap-2 rounded-wobbly-card border-2 border-dashed border-brand-forest/56 ${processToneClasses[tone]} p-3 text-center shadow-brand-soft transition-[box-shadow,transform] duration-150 ease-in-out hover:-translate-y-1 hover:rotate-0 hover:shadow-brand sm:min-h-62`}>
      <div className="flex w-full items-center justify-between gap-2">
        <span className="grid h-9.5 w-9.5 place-items-center rounded-[42%_58%_52%_48%/54%_48%_52%_46%] border-3 border-brand-forest bg-brand-leaf font-primary text-base leading-none text-brand-white">{number}</span>
        <span className="text-[0.65rem] font-bold uppercase tracking-[0.12em] text-brand-green-ink">Field note {number}</span>
      </div>
      <img className="process-stop-image h-22 w-[min(100%,120px)] object-contain transition-transform duration-150 ease-in-out sm:h-28 sm:w-[min(100%,138px)]" src={image} alt={alt} loading="lazy" decoding="async" width="158" height="138" />
      <h3 className="font-primary text-[clamp(1.3rem,2vw,1.75rem)] font-bold leading-[1.02] text-brand-black">{title}</h3>
      <p className="text-xs leading-[1.35] text-brand-black/68">{processNotes[index]}</p>
    </article>
  );
}

export function ProcessSection() {
  return (
    <section className={`process-journey deferred-section process relative grid gap-[2.1rem] overflow-hidden rounded-[38px_24px_44px_28px/28px_44px_24px_38px] border-3 border-brand-forest bg-brand-buff px-4 py-[clamp(2.8rem,6vw,5rem)] shadow-brand sm:px-6 ${sectionShell}`} id="how-it-works" aria-labelledby="process-title">
      <div className="section-heading grid gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(240px,0.45fr)] sm:items-end sm:gap-8">
        <div className="grid gap-2">
          <OutlineTag>How it works</OutlineTag>
          <h2 id="process-title" className={`${sectionTitle} text-brand-green-ink`}>Follow the box from field to fork.</h2>
        </div>
        <p className="max-w-105 text-[1.05rem] text-brand-black/72">A simple route, with clear checkpoints instead of hidden steps.</p>
      </div>
      <div className="process-grid process-grid-shell relative grid grid-cols-1 items-start gap-4 sm:grid-cols-2 sm:gap-4 md:grid-cols-5 md:pt-5">
        {processSteps.map((step, index) => <ProcessStep key={step.number} {...step} index={index} />)}
      </div>
    </section>
  );
}
