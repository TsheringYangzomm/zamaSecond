import { farmers } from "../../data/landing";
import { OutlineLink } from "../../components/ui/action-link";
import { OutlineTag, StatusBadge } from "../../components/ui/tag";
import { sectionShell, sectionTitleCompact } from "../../components/ui/styles";

function FarmNote({ name, place, produce, certification, profileNote, rotation, index }: (typeof farmers)[number] & { index: number }) {
  return (
    <article className={`farm-note relative z-[1] grid gap-2 ${rotation} rounded-wobbly-md border-2 border-dashed border-brand-yellow/70 bg-brand-warm-white p-3 text-brand-black shadow-brand-soft transition-[box-shadow,transform] duration-150 ease-in-out hover:-translate-y-1 hover:rotate-0 hover:shadow-brand`}>
      <div className="grid grid-cols-[32px_minmax(0,1fr)] items-center gap-3">
        <span className="grid h-8 w-8 place-items-center rounded-full border-2 border-brand-forest bg-brand-orange text-xs font-bold">0{index + 1}</span>
        <div className="min-w-0">
          <h3 className="font-primary text-[1.25rem] font-bold leading-[1.05]">{name}</h3>
          <p className="break-words text-[0.65rem] font-bold uppercase tracking-[0.08em] text-brand-green-ink">{place}</p>
        </div>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="min-w-0 break-words text-sm text-brand-black/70">{produce}</p>
        <StatusBadge tone="pending" className="min-h-7 px-2 py-0.5 text-[0.65rem]">{certification.replace("Partner ", "")}</StatusBadge>
      </div>
      <details className="rounded-wobbly-md border-t-2 border-dashed border-brand-forest/28 text-xs text-brand-black">
        <summary className="flex min-h-11 cursor-pointer items-center font-bold focus-visible:outline focus-visible:outline-3 focus-visible:outline-dashed focus-visible:outline-brand-green-ink focus-visible:outline-offset-3">Open verification note</summary>
        <p className="mt-2 text-brand-black/72">{profileNote}</p>
      </details>
    </article>
  );
}

export function FarmersSection() {
  return (
    <section className={`deferred-section farmers grid gap-6 py-[clamp(3rem,6vw,5rem)] ${sectionShell}`} id="farmers" aria-labelledby="farmer-title">
      <div className="split-heading section-heading flex flex-col items-start gap-2 sm:flex-row sm:items-end sm:justify-between sm:gap-8">
        <div>
          <OutlineTag>Our farmers</OutlineTag>
          <h2 id="farmer-title" className={`${sectionTitleCompact} text-balance text-brand-green-ink`}>Show where every ingredient comes from.</h2>
        </div>
        <p className="max-w-120 text-pretty text-[1.05rem] text-brand-black/72">Zama will publish a farm identity, season, and sourcing record only after the partner and information have been verified.</p>
      </div>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1.05fr)_minmax(360px,0.95fr)] lg:items-stretch">
        <figure className="farmer-portrait relative min-h-105 overflow-hidden rounded-[34px_22px_44px_26px/26px_44px_22px_34px] border-4 border-brand-forest bg-brand-buff shadow-brand-big">
          <img className="h-full min-h-105 w-full object-cover [filter:saturate(0.82)_contrast(1.05)] transition-transform duration-300 ease-in-out" src="assets/farmer.webp" alt="Illustration representing a future verified farm profile" loading="lazy" decoding="async" width="720" height="560" />
          <span className="absolute left-4 top-4 rounded-wobbly-tag border-2 border-brand-forest bg-brand-yellow px-3 py-2 text-xs font-bold text-brand-black">Field story preview</span>
          <figcaption className="absolute right-4 bottom-4 left-4 grid gap-1 rotate-[-1deg] rounded-wobbly-md border-3 border-brand-forest bg-brand-warm-white/94 p-4 shadow-brand">
            <span className="text-[0.68rem] font-bold uppercase tracking-[0.12em] text-brand-orange-ink">From the field notebook</span>
            <strong className="font-primary text-[clamp(1.45rem,3vw,2.25rem)] leading-[1.02] text-brand-black">A field story needs proof first.</strong>
            <p className="text-sm text-brand-black/68">This illustration is not a partner profile. A verified name, harvest window, consented photograph, and sourcing record will replace it.</p>
          </figcaption>
        </figure>

        <aside className="source-map-shell relative grid min-w-0 content-start gap-4 overflow-hidden rounded-[28px_42px_24px_38px/40px_24px_42px_26px] border-4 border-brand-forest bg-brand-forest p-5 text-brand-warm-white shadow-brand-big sm:p-6" aria-label="Sourcing verification checklist">
          <div className="relative z-[1] grid gap-1">
            <span className="text-[0.68rem] font-bold uppercase tracking-[0.14em] text-brand-yellow">Sourcing checklist · launch preview</span>
            <h3 className="text-balance font-primary text-[clamp(1.8rem,8vw,2.7rem)] font-bold leading-[1.02]">Proof before a partner profile.</h3>
            <p className="text-pretty text-sm text-brand-warm-white/72">These checks must be complete before a farm name, photograph, or sourcing claim appears publicly.</p>
          </div>
          <div className="relative z-[1] grid gap-3">
            {farmers.map((farmer, index) => <FarmNote key={farmer.name} {...farmer} index={index} />)}
          </div>
          <div className="relative z-[1] mt-1">
            <OutlineLink href="mailto:hello@zama.bt?subject=Zama%20farm%20partnership">Become a Farm Partner</OutlineLink>
          </div>
        </aside>
      </div>
    </section>
  );
}
