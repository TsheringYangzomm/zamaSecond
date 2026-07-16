import { mealKits } from "../../data/landing";
import { OutlineLink } from "../../components/ui/action-link";
import { OutlineTag, StatusBadge, YellowTag } from "../../components/ui/tag";
import { sectionShell, sectionTitle } from "../../components/ui/styles";

type MealKit = (typeof mealKits)[number];

const kitVariantClasses = {
  yellow: "bg-brand-buff",
  green: "bg-brand-mint",
} as const;

function FeaturedMealKit({ kit }: { kit: MealKit }) {
  return (
    <article className={`meal-kit-feature relative grid min-h-105 overflow-hidden rounded-wobbly-card border-4 border-brand-forest bg-brand-yellow p-5 shadow-brand-big sm:p-7 ${kit.rotation}`}>
      <div className="relative z-[1] grid h-full min-w-0 content-between gap-6 sm:grid-cols-[minmax(0,1.04fr)_minmax(240px,0.96fr)] sm:items-stretch">
        <div className="grid content-center gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <YellowTag>{kit.eyebrow}</YellowTag>
            <StatusBadge tone={kit.statusTone}>{kit.status}</StatusBadge>
          </div>
          <p className="text-xs font-bold uppercase tracking-[0.12em] text-brand-orange-ink">Featured menu concept</p>
          <h3 className="font-primary text-[clamp(2.6rem,4vw,3.5rem)] font-bold leading-[0.94] tracking-[-0.035em] text-brand-forest">{kit.title}</h3>
          <p className="max-w-120 text-[1.05rem] leading-[1.5] text-brand-black/72">{kit.description}</p>
          <div className="grid gap-1 border-l-4 border-brand-orange pl-3">
            <span className="text-xs font-bold uppercase tracking-[0.1em] text-brand-green-ink">Before you order</span>
            <strong className="text-brand-black">{kit.price}</strong>
          </div>
        </div>

        <div className="meal-kit-art relative grid min-h-64 place-items-center overflow-hidden rounded-[34px_20px_40px_24px/24px_40px_20px_34px] border-3 border-dashed border-brand-forest bg-brand-warm-white p-4 sm:min-h-115 sm:h-full">
          <span className="absolute top-3 left-3 rounded-full border-2 border-brand-forest bg-brand-mint px-3 py-1 text-xs font-bold text-brand-forest">One simple box</span>
          <img className="h-62 w-full object-contain sm:h-92" src={kit.image} alt={kit.alt} loading="lazy" decoding="async" width="420" height="340" />
          <span className="absolute right-3 bottom-3 -rotate-2 rounded-wobbly-tag border-2 border-brand-forest bg-brand-white px-3 py-2 text-xs font-bold text-brand-black shadow-brand-soft">Ingredients shown clearly</span>
        </div>
      </div>
    </article>
  );
}

function CompactMealKit({ kit }: { kit: MealKit }) {
  return (
    <article className={`meal-kit-note relative grid grid-cols-[minmax(0,1fr)_112px] items-center gap-3 overflow-hidden rounded-wobbly-card border-3 border-brand-forest p-4 shadow-brand transition-[box-shadow,transform] duration-150 ease-in-out hover:-translate-y-0.5 hover:rotate-0 hover:shadow-brand-hover sm:grid-cols-[minmax(0,1fr)_140px] ${kitVariantClasses[kit.variant]} ${kit.rotation}`}>
      <div className="relative z-[1] grid min-w-0 content-start gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge tone={kit.statusTone}>{kit.status}</StatusBadge>
          <p className="text-[0.65rem] font-bold uppercase tracking-[0.08em] text-brand-orange-ink">{kit.eyebrow}</p>
        </div>
        <h3 className="font-primary text-[clamp(1.75rem,3vw,2.55rem)] font-bold leading-[0.98] text-brand-black">{kit.title}</h3>
        <p className="line-clamp-2 text-sm leading-[1.42] text-brand-black/72">{kit.description}</p>
        <strong className="text-sm text-brand-green-ink">{kit.price}</strong>
      </div>
      <div className="brand-pattern relative z-[1] grid h-34 place-items-center overflow-hidden rounded-wobbly-md border-2 border-dashed border-brand-forest/36 p-2 sm:h-38">
        <img className="h-full w-full object-contain" src={kit.image} alt={kit.alt} loading="lazy" decoding="async" width="210" height="170" />
      </div>
    </article>
  );
}

export function MealKitsSection() {
  const [featuredKit, ...supportingKits] = mealKits;

  return (
    <section className={`deferred-section meal-kits grid gap-6 pt-[clamp(1rem,4vw,2rem)] pb-[clamp(4rem,8vw,6rem)] ${sectionShell}`} id="meal-kits" aria-labelledby="meal-title">
      <div className="section-heading grid gap-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end sm:gap-8">
        <div className="grid gap-2">
          <OutlineTag>Meal kits</OutlineTag>
          <h2 id="meal-title" className={`${sectionTitle} max-w-190 text-brand-green-ink`}>Dinner decisions, already sketched out.</h2>
          <p className="max-w-150 text-[1.05rem] leading-[1.5] text-brand-black/72">Choose a useful starting point, then see the final recipe, portions, price, nutrition, and allergens together before ordering.</p>
        </div>
        <OutlineLink href="?category=meal-kits#shop">Browse meal kits</OutlineLink>
      </div>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1.16fr)_minmax(360px,0.84fr)] lg:items-stretch">
        <FeaturedMealKit kit={featuredKit} />
        <div className="grid content-stretch gap-5">
          {supportingKits.map((kit) => <CompactMealKit key={kit.title} kit={kit} />)}
        </div>
      </div>

      <aside className="dietician-banner dietician-banner-shell relative grid grid-cols-1 items-center gap-4 -rotate-[0.4deg] rounded-[26px_38px_22px_34px/34px_24px_38px_22px] border-3 border-brand-forest bg-brand-mint p-5 shadow-brand sm:grid-cols-[auto_1fr_auto]" aria-label="Nutrition information">
        <div className="health-mark grid h-15 w-15 rotate-[8deg] place-items-center rounded-[48%_52%_54%_46%/52%_45%_55%_48%] border-3 border-brand-forest bg-brand-orange font-primary text-[2.2rem] leading-none text-brand-black" aria-hidden="true">+</div>
        <div>
          <h3 className="font-primary text-[clamp(1.45rem,2.4vw,2rem)] font-bold leading-[1.02] text-brand-black">Nutrition information belongs beside the recipe.</h3>
          <p className="text-brand-black/72">Macros, allergens, portions, and dietary guidance will be published after each final recipe is professionally reviewed.</p>
        </div>
        <OutlineLink href="#trust">View trust standards</OutlineLink>
      </aside>
    </section>
  );
}
