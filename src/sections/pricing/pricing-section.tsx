import { useContent } from "../../cms/content-context";
import { ActionLink } from "../../components/ui/action-link";
import { OutlineTag } from "../../components/ui/tag";
import { btnOutlineLg, btnPrimaryLg, sectionShell } from "../../components/ui/styles";

const planToneClasses = {
  white: "bg-brand-white shadow-brand-soft",
  yellow: "featured-plan featured-plan-shell bg-brand-yellow shadow-brand-big",
} as const;

type PricingPlan = {
  name: string;
  price: string;
  cadence: string;
  eyebrow: string;
  features: readonly string[];
  action: string;
  tone: "white" | "yellow";
  rotation: string;
};

function PlanCard({ name, price, cadence, eyebrow, features, action, tone, rotation }: PricingPlan) {
  const actionClass = tone === "yellow" ? btnPrimaryLg : btnOutlineLg;

  return (
    <article className={`price-card relative grid min-w-0 min-h-97.5 ${rotation} content-start gap-4 overflow-hidden rounded-wobbly-card border-3 border-brand-black ${planToneClasses[tone]} p-[1.2rem] transition-[box-shadow,transform] duration-120 ease-in-out hover:-translate-x-px hover:-translate-y-px hover:rotate-0`}>
      <OutlineTag>{eyebrow}</OutlineTag>
      <h3 className="font-primary text-[2rem] font-bold text-brand-black">{name}</h3>
      <p className="break-words font-primary text-[clamp(2.15rem,9vw,2.6rem)] font-bold leading-none text-brand-orange-ink">
        {price}<span className="text-[0.72em]">{cadence}</span>
      </p>
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
  const { blocks } = useContent();
  const pricing = blocks.pricing;

  return (
    <section className={`deferred-section pricing grid gap-[1.45rem] pb-[clamp(4rem,8vw,6rem)] ${sectionShell}`} id="pricing" aria-labelledby="pricing-title">
      <div className="section-heading grid gap-[0.55rem]">
        <OutlineTag>{pricing.tag}</OutlineTag>
        <h2 id="pricing-title" className="text-balance font-primary text-[clamp(2.35rem,5vw,5rem)] font-bold leading-[1.02] text-brand-green-ink">{pricing.heading}</h2>
        <p className="max-w-160 text-pretty text-[1.05rem] text-brand-black/72">{pricing.copy}</p>
      </div>
      <div className="pricing-grid grid grid-cols-1 gap-[1.15rem] sm:grid-cols-2">
        {pricing.plans.map((plan) => <PlanCard key={plan.name} {...plan} />)}
      </div>
    </section>
  );
}
