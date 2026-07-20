import { topPicks } from "../../data/landing";
import { OutlineTag } from "../../components/ui/tag";
import { sectionShell } from "../../components/ui/styles";

const dishToneClasses = { white: "bg-brand-white", yellow: "rotate-1 bg-brand-yellow" } as const;

function DishCard({ name, duration, tone }: (typeof topPicks)[number]) {
  return (
    <article className={`dish-card grid grid-cols-[90px_1fr] items-center gap-[0.8rem] rounded-[22px_34px_18px_30px/28px_18px_34px_22px] border-3 border-brand-black ${dishToneClasses[tone]} p-[0.58rem] shadow-brand-soft transition-[box-shadow,transform] duration-120 ease-in-out hover:-translate-x-px hover:-translate-y-px hover:-rotate-1 hover:shadow-brand`}>
      <img className="h-19.5 w-22.5 rounded-[18px_10px_16px_12px/12px_18px_10px_16px] border-3 border-brand-black object-cover" src="assets/top-pick.webp" alt={`${name} meal kit`} loading="lazy" decoding="async" width="90" height="78" />
      <div>
        <h3 className="text-[1.25rem] font-bold text-brand-black">{name}</h3>
        <p className="text-brand-black/72">{duration}</p>
      </div>
    </article>
  );
}

export function TopPicksSection() {
  return (
    <section className={`deferred-section top-picks grid grid-cols-1 items-center gap-[1.3rem] py-[clamp(1rem,3vw,1.8rem)] sm:grid-cols-[minmax(220px,0.52fr)_1fr] ${sectionShell}`} aria-labelledby="top-picks-title">
      <div className="top-picks-copy top-picks-copy-shell relative">
        <OutlineTag>This week's top picks</OutlineTag>
          <h2 id="top-picks-title" className="font-primary text-[clamp(2rem,3.5vw,3.5rem)] font-bold leading-[1.02] text-brand-green-ink">Made with what's fresh now.</h2>
      </div>
      <div className="dish-grid grid grid-cols-1 gap-[0.9rem] sm:grid-cols-3">
        {topPicks.map((pick) => <DishCard key={pick.name} {...pick} />)}
      </div>
    </section>
  );
}
