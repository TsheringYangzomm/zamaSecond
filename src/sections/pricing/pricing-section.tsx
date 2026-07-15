import { pricingPlans } from "../../data/landing";
import { ActionLink } from "../../components/ui/action-link";
import { OutlineTag } from "../../components/ui/tag";
import { btnOutlineLg, btnPrimaryLg, sectionShell } from "../../components/ui/styles";

const planToneClasses = {
  white: "bg-brand-white shadow-brand-soft",
  yellow: "featured-plan featured-plan-shell bg-brand-yellow shadow-brand-big",
} as const;

function PlanCard({ price, cadence, eyebrow, features, action, tone, rotation }: (typeof pricingPlans)[number]) {
  const actionClass = tone === "yellow" ? btnPrimaryLg : btnOutlineLg;

  return (
    <article className={`price-card relative grid min-h-97.5 ${rotation} content-start gap-4 rounded-wobbly-card border-3 border-brand-black ${planToneClasses[tone]} p-[1.2rem] transition-[box-shadow,transform] duration-120 ease-in-out hover:-translate-x-px hover:-translate-y-px hover:rotate-0`}>
      <OutlineTag>{eyebrow}</OutlineTag>
      <h3 className="text-[2.6rem] font-bold text-brand-black">
        {price}<span className="font-secondary text-base font-normal text-brand-black/72">{cadence}</span>
      </h3>
      <ul className="grid list-none gap-[0.55rem] text-brand-black/72">
        {features.map((feature) => (
          <li className="relative pl-5 before:absolute before:left-0 before:font-primary before:leading-none before:text-brand-green-ink before:content-['+']" key={feature}>{feature}</li>
        ))}
      </ul>
      <ActionLink className={`${actionClass} mt-auto self-end`} href="#waitlist">{action}</ActionLink>
    </article>
  );
}

export function PricingSection() {
  return (
    <section className={`deferred-section pricing grid gap-[1.45rem] pb-[clamp(4rem,8vw,6rem)] ${sectionShell}`} id="pricing" aria-labelledby="pricing-title">
      <div className="section-heading grid gap-[0.55rem]">
        <OutlineTag>Membership</OutlineTag>
        <h2 id="pricing-title" className="font-primary text-[clamp(2.35rem,5vw,5rem)] font-bold leading-[1.02] text-brand-green-ink">Save more, eat better</h2>
      </div>
      <div className="pricing-grid grid grid-cols-1 gap-[1.15rem] sm:grid-cols-2">
        {pricingPlans.map((plan) => <PlanCard key={plan.name} {...plan} />)}
      </div>
    </section>
  );
}
