import { mealKits } from "../../data/landing";
import { ActionLink, OutlineLink } from "../../components/ui/action-link";
import { OutlineTag, YellowTag } from "../../components/ui/tag";
import { btnPrimaryKit, sectionShell } from "../../components/ui/styles";

const kitVariantClasses = { yellow: "bg-brand-yellow", green: "bg-brand-green/18" } as const;

function MealKitCard({ title, eyebrow, description, price, alt, variant, rotation, badge }: (typeof mealKits)[number]) {
  return (
    <article className={`kit-card kit-card-shell relative grid min-h-75 ${rotation} overflow-hidden rounded-wobbly-card border-4 border-brand-black ${kitVariantClasses[variant]} p-4 shadow-brand transition-[box-shadow,transform] duration-120 ease-in-out hover:-translate-x-px hover:-translate-y-px hover:rotate-0 hover:shadow-brand-hover sm:min-h-95 sm:p-[1.2rem] md:min-h-90`}>
      {badge ? <span className="absolute right-[0.9rem] top-[0.9rem] z-[2] inline-flex items-center rounded-full border-2 border-brand-black bg-brand-green px-[0.62rem] py-[0.22rem] font-secondary text-[0.72rem] font-medium leading-none text-white shadow-[2px_2px_0_0_rgb(38_38_38/0.3)]">{badge}</span> : null}
      <div className="kit-copy relative z-1 grid max-w-[82%] content-start gap-[0.7rem] md:max-w-[72%]">
        <YellowTag>{eyebrow}</YellowTag>
        <h3 className="font-primary text-[clamp(1.55rem,2.4vw,2.15rem)] font-bold leading-[1.02] text-brand-black">{title}</h3>
        <p className="text-brand-black/72">{description}</p>
        <strong className="text-brand-black">{price}</strong>
      </div>
      <img className="absolute -right-7.5 bottom-10 w-[56%] max-h-40 rotate-[7deg] object-contain sm:-right-12.5 sm:bottom-12 sm:w-[62%] sm:max-h-57.5" src="assets/orderkit.png" alt={alt} loading="lazy" decoding="async" width="280" height="230" />
      <ActionLink className={`${btnPrimaryKit} absolute right-4 bottom-4 left-4 sm:right-[1.2rem] sm:bottom-[1.2rem] sm:left-[1.2rem]`} href="#waitlist">Order Kit</ActionLink>
    </article>
  );
}

export function MealKitsSection() {
  return (
    <section className={`deferred-section meal-kits grid gap-[1.6rem] pt-[clamp(1rem,4vw,2rem)] pb-[clamp(4rem,8vw,6rem)] ${sectionShell}`} id="meal-kits" aria-labelledby="meal-title">
      <div className="section-heading split-heading flex flex-col items-start gap-[0.55rem] sm:flex-row sm:items-end sm:justify-between sm:gap-8">
        <div>
          <OutlineTag>Meal kits</OutlineTag>
          <h2 id="meal-title" className="font-primary text-[clamp(2.35rem,5vw,5rem)] font-bold leading-[1.02] text-brand-green-ink">Don't know what to cook?</h2>
          <p className="font-primary text-[clamp(1.8rem,3.5vw,3.2rem)] leading-[1.05] text-brand-orange">Let us plan it for you.</p>
        </div>
        <OutlineLink href="#shop">See all Meal Kits</OutlineLink>
      </div>

      <div className="kit-grid grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {mealKits.map((kit) => <MealKitCard key={kit.title} {...kit} />)}
      </div>

      <aside className="dietician-banner dietician-banner-shell relative grid grid-cols-1 items-center gap-4 -rotate-[0.6deg] rounded-[26px_38px_22px_34px/34px_24px_38px_22px] border-4 border-brand-black bg-brand-white p-[1.35rem] shadow-brand-big sm:grid-cols-[auto_1fr_auto]" aria-label="Nutrition information">
        <div className="health-mark grid h-16 w-16 rotate-[8deg] place-items-center rounded-[48%_52%_54%_46%/52%_45%_55%_48%] border-4 border-brand-black bg-brand-orange font-primary text-[2.4rem] leading-none text-brand-black" aria-hidden="true">+</div>
        <div>
          <h3 className="font-primary text-[clamp(1.55rem,2.4vw,2.15rem)] font-bold leading-[1.02] text-brand-black">Nutrition information will be easy to find.</h3>
          <p className="text-brand-black/72">Final macros, allergens, and dietary guidance will be published after each recipe is reviewed by a qualified professional.</p>
        </div>
        <OutlineLink href="#pricing">Learn More</OutlineLink>
      </aside>
    </section>
  );
}
