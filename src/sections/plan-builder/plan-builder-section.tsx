import { OutlineTag } from "../../components/ui/tag";
import { OutlineLink } from "../../components/ui/action-link";
import { sectionShell } from "../../components/ui/styles";
import { useContent } from "../../cms/content-context";

export function PlanBuilderSection() {
  const { blocks } = useContent();
  const plan = blocks.planBuilder;

  return (
    <section className={`deferred-section plan-builder plan-builder-shell relative mb-[clamp(4rem,8vw,6rem)] grid grid-cols-1 items-center gap-[clamp(2rem,7vw,5rem)] border-y-4 border-dashed border-brand-black/42 py-[clamp(2.8rem,6vw,4.8rem)] sm:grid-cols-[minmax(0,0.95fr)_minmax(300px,0.78fr)] ${sectionShell}`}>
      <div className="plan-copy grid gap-4">
        <OutlineTag>{plan.tag}</OutlineTag>
        <h2 className="font-primary text-[clamp(2.35rem,5vw,5rem)] font-bold leading-[1.02] text-brand-green-ink">{plan.heading}</h2>
        <p className="max-w-140 text-[1.25rem] text-brand-black/72">{plan.copy}</p>
        <div className="store-row mt-[0.4rem] flex flex-wrap items-center gap-[0.7rem]"><OutlineLink href="#waitlist">{plan.ctaLabel}</OutlineLink></div>
      </div>

      <div className="app-preview app-preview-shell relative grid gap-[0.9rem] rotate-[1.2deg] rounded-[34px_24px_38px_22px/26px_38px_24px_34px] border-4 border-brand-black p-4 shadow-brand-big" aria-label="Zama mobile ordering preview">
        <div className="app-topbar flex items-center justify-between rounded-wobbly-md border-3 border-brand-black bg-brand-white p-3"><span className="h-8.5 w-8.5 rounded-full border-3 border-brand-black bg-brand-yellow"></span><strong className="text-brand-black">{plan.previewLabel}</strong><small className="text-brand-black">{plan.previewPrice}</small></div>
        <div className="delivery-card rounded-wobbly-md border-3 border-brand-black bg-brand-yellow p-4"><p className="text-brand-black/72">{plan.nextDeliveryLabel}</p><h3 className="my-[0.2rem] text-[1.5rem] font-bold text-brand-black">{plan.deliveryTitle}</h3><span className="text-brand-orange-ink">{plan.deliveryEstimate}</span></div>
        <div className="mini-map mini-map-shell relative flex min-h-29 items-center justify-between overflow-hidden rounded-[24px_16px_28px_18px/18px_28px_16px_24px] border-3 border-dashed border-brand-black p-4"><span className="relative z-[1] rounded-wobbly border-3 border-brand-black bg-brand-white px-[0.74rem] py-[0.4rem] text-brand-black">{plan.farmLabel}</span><i className="mini-map-dot relative z-[1] h-4.5 w-4.5 rounded-full border-3 border-brand-black bg-brand-orange"></i><span className="relative z-[1] rounded-wobbly border-3 border-brand-black bg-brand-white px-[0.74rem] py-[0.4rem] text-brand-black">{plan.kitchenLabel}</span></div>
        <div className="app-list grid gap-[0.45rem] rounded-wobbly-md border-3 border-brand-black bg-brand-white p-[0.9rem]">{plan.listItems.map((item) => <p className="flex items-center gap-2 text-brand-black" key={item}><span className="h-3 w-3 rounded-full border-2 border-brand-black bg-brand-orange"></span> {item}</p>)}</div>
      </div>
    </section>
  );
}
