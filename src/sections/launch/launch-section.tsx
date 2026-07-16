import { deliveryDetails, faqItems, policyItems, trustItems } from "../../data/landing";
import { PrimaryLink } from "../../components/ui/action-link";
import { OutlineTag, StatusBadge, YellowTag } from "../../components/ui/tag";
import { sectionShell, sectionTitle, sectionTitleCompact } from "../../components/ui/styles";

const trustStampClasses = [
  "bg-brand-white/10",
  "bg-brand-yellow/14",
  "bg-brand-mint/10",
  "bg-brand-orange/12",
] as const;

function TrustStamp({ title, body, index }: (typeof trustItems)[number] & { index: number }) {
  return (
    <article className={`trust-stamp grid gap-2 rounded-wobbly-card border-2 border-dashed border-brand-yellow/58 ${trustStampClasses[index]} p-4 text-brand-warm-white`}>
      <div className="flex items-center justify-between gap-3">
        <span className="grid h-9 w-9 place-items-center rounded-full border-2 border-brand-yellow bg-brand-yellow font-primary text-sm font-bold text-brand-black">0{index + 1}</span>
        <span className="text-[0.65rem] font-bold uppercase tracking-[0.12em] text-brand-yellow">Trust mark</span>
      </div>
      <h3 className="font-primary text-[1.35rem] font-bold leading-[1.05]">{title}</h3>
      <p className="text-sm leading-[1.45] text-brand-warm-white/78">{body}</p>
    </article>
  );
}

export function LaunchDetailsSection() {
  return (
    <>
      <section className={`py-[clamp(3rem,6vw,5rem)] ${sectionShell}`} id="delivery" aria-labelledby="delivery-title">
        <div className="delivery-ledger relative grid gap-7 overflow-hidden rounded-[38px_24px_46px_28px/28px_46px_24px_38px] border-4 border-brand-forest bg-brand-forest p-5 text-brand-warm-white shadow-brand-big sm:p-7">
          <div className="relative z-[1] grid gap-6 lg:grid-cols-[minmax(0,0.72fr)_minmax(480px,1.28fr)] lg:items-start">
            <div className="grid content-start gap-4 lg:sticky lg:top-32">
              <OutlineTag>Delivery and support</OutlineTag>
              <h2 id="delivery-title" className={`${sectionTitle} text-brand-warm-white`}>The practical details, written like a receipt.</h2>
              <p className="max-w-120 text-[1.05rem] text-brand-warm-white/72">Zama is starting in Thimphu. Exact coverage, hours, fees, and delivery windows will be visible before paid orders open.</p>
              <div className="grid gap-1 border-l-4 border-brand-yellow pl-4">
                <span className="text-xs font-bold uppercase tracking-[0.12em] text-brand-yellow">Need a human?</span>
                <a className="w-fit font-bold text-brand-warm-white underline decoration-dashed underline-offset-4 focus-visible:outline focus-visible:outline-3 focus-visible:outline-dashed focus-visible:outline-brand-yellow focus-visible:outline-offset-3" href="mailto:hello@zama.bt">hello@zama.bt</a>
                <span className="text-sm text-brand-warm-white/64">Launch questions, feedback, and partnerships.</span>
              </div>
            </div>

            <div className="service-receipt relative rotate-[0.4deg] rounded-[20px_34px_18px_30px/30px_18px_34px_20px] border-3 border-dashed border-brand-forest bg-brand-warm-white p-4 text-brand-black shadow-brand sm:p-5">
              <div className="flex flex-wrap items-start justify-between gap-3 border-b-2 border-dashed border-brand-forest/32 pb-4">
                <div>
                  <span className="text-[0.68rem] font-bold uppercase tracking-[0.12em] text-brand-orange-ink">Zama service note</span>
                  <h3 className="font-primary text-2xl font-bold text-brand-forest">Thimphu launch ledger</h3>
                </div>
                <StatusBadge tone="preview">Launch preview</StatusBadge>
              </div>
              <dl className="divide-y-2 divide-dashed divide-brand-forest/20">
                {deliveryDetails.map((item, index) => (
                  <div className="grid gap-1 py-3 sm:grid-cols-[1fr_1.45fr] sm:gap-5" key={item.label}>
                    <dt className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.08em] text-brand-green-ink"><span className="tabular-nums text-brand-orange-ink">0{index + 1}</span>{item.label}</dt>
                    <dd className="text-sm text-brand-black/72 sm:text-right">{item.value}</dd>
                  </div>
                ))}
              </dl>
              <div className="grid gap-3 border-t-3 border-double border-brand-forest pt-4 sm:grid-cols-[1fr_auto] sm:items-center">
                <div>
                  <p className="font-primary text-xl font-bold text-brand-black">Is your neighborhood covered?</p>
                  <p className="text-sm text-brand-black/68">Use the area checker in the Shop preview.</p>
                </div>
                <PrimaryLink href="#shop">Check launch area</PrimaryLink>
              </div>
            </div>
          </div>

          <section className="relative z-[1] grid gap-4 border-t-2 border-dashed border-brand-warm-white/24 pt-6" id="trust" aria-labelledby="trust-title">
            <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_minmax(260px,0.55fr)] sm:items-end sm:gap-8">
              <div className="grid gap-2">
                <YellowTag>Trust, made visible</YellowTag>
                <h2 id="trust-title" className={`${sectionTitleCompact} text-brand-warm-white`}>Proof belongs beside the promise.</h2>
              </div>
              <p className="text-sm text-brand-warm-white/68">These become verified records—not decorative claims—before checkout goes live.</p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {trustItems.map((item, index) => <TrustStamp key={item.title} {...item} index={index} />)}
            </div>
          </section>
        </div>
      </section>

      <section className={`grid gap-6 py-[clamp(3rem,6vw,5rem)] ${sectionShell}`} id="policies" aria-labelledby="policies-title">
        <div className="section-heading grid gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(280px,0.62fr)] sm:items-end sm:gap-10">
          <div className="grid gap-2">
            <OutlineTag>Help, policies and Zama</OutlineTag>
            <h2 id="policies-title" className={`${sectionTitle} max-w-190 text-brand-green-ink`}>The notes behind every box.</h2>
          </div>
          <p className="text-[1.05rem] text-brand-black/72">Plain-language policies, quick answers, and the reason Zama is being built—kept together like an open field notebook.</p>
        </div>

        <div className="field-notebook relative grid overflow-hidden rounded-[38px_24px_44px_28px/28px_44px_24px_38px] border-4 border-brand-forest bg-brand-warm-white shadow-brand-big lg:grid-cols-2">
          <div className="notebook-page relative z-[1] grid content-start gap-4 border-b-3 border-dashed border-brand-forest/28 p-5 sm:p-7 lg:border-r-3 lg:border-b-0">
            <div className="grid gap-1">
              <span className="text-xs font-bold uppercase tracking-[0.12em] text-brand-orange-ink">01 · Practical promises</span>
              <h3 className={`${sectionTitleCompact} text-brand-black`}>Fine print, in plain language.</h3>
              <p className="text-sm text-brand-black/68">Final legal wording, licenses, and effective dates will be reviewed before checkout goes live.</p>
            </div>
            <div className="rounded-wobbly-md border-3 border-brand-forest bg-brand-white px-4 shadow-brand-soft sm:px-5">
              {policyItems.map((item, index) => (
                <details className="border-b-2 border-dashed border-brand-forest/22 py-2 last:border-b-0" id={item.id} key={item.id}>
                  <summary className="flex min-h-12 cursor-pointer items-center gap-3 font-primary text-[1.08rem] font-bold text-brand-black focus-visible:outline focus-visible:outline-3 focus-visible:outline-dashed focus-visible:outline-brand-green-ink focus-visible:outline-offset-3">
                    <span className="text-sm tabular-nums text-brand-orange-ink">0{index + 1}</span>{item.title}
                  </summary>
                  <p className="pb-3 pl-8 text-sm leading-[1.5] text-brand-black/72">{item.body}</p>
                </details>
              ))}
            </div>
            <a className="inline-flex min-h-11 w-fit items-center font-bold text-brand-green-ink underline decoration-dashed underline-offset-4 focus-visible:outline focus-visible:outline-3 focus-visible:outline-dashed focus-visible:outline-brand-green-ink focus-visible:outline-offset-3" href="mailto:hello@zama.bt">Ask Zama a question</a>
          </div>

          <article className="notebook-page relative z-[1] grid content-start gap-5 p-5 sm:p-7" id="about" aria-labelledby="about-title">
            <div className="grid gap-2">
              <YellowTag>02 · About Zama</YellowTag>
              <h3 id="about-title" className={`${sectionTitleCompact} text-brand-green-ink`}>A field notebook for better everyday food.</h3>
            </div>
            <div className="grid gap-3 text-[1.02rem] leading-[1.55] text-brand-black/72">
              <p>Zama is being built for people in Thimphu who want better ingredients and less planning between work, study, training, and home.</p>
              <p>Trust will be earned one clear product, one careful pack, and one honest delivery update at a time.</p>
            </div>
            <ol className="grid gap-2 sm:grid-cols-3" aria-label="Zama principles">
              {[
                "Show what is inside before asking for an order.",
                "Prioritize Bhutanese produce when it is in season.",
                "Publish proof before making a product claim.",
              ].map((principle, index) => (
                <li className="grid content-start gap-2 rounded-wobbly-md border-2 border-dashed border-brand-forest/30 bg-brand-mint p-3 text-sm font-bold text-brand-black" key={principle}>
                  <span className="grid h-9 w-9 place-items-center rounded-full border-2 border-brand-forest bg-brand-yellow font-primary text-xs">0{index + 1}</span>
                  {principle}
                </li>
              ))}
            </ol>
            <div className="flex flex-wrap items-center gap-4">
              <PrimaryLink href="#shop">Browse the market</PrimaryLink>
              <a className="inline-flex min-h-11 items-center font-bold text-brand-green-ink underline decoration-dashed underline-offset-4 focus-visible:outline focus-visible:outline-3 focus-visible:outline-dashed focus-visible:outline-brand-green-ink focus-visible:outline-offset-3" href="#farmers">Read sourcing notes</a>
            </div>
          </article>

          <div className="relative z-[1] col-span-full grid gap-3 border-t-3 border-dashed border-brand-forest/28 bg-brand-mint/72 p-5 sm:p-7">
            <div className="flex flex-wrap items-end justify-between gap-2">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.12em] text-brand-green-ink">03 · Quick answers</p>
                <h3 className="font-primary text-[clamp(1.75rem,3vw,2.5rem)] font-bold leading-[1.02] text-brand-black">Questions people ask before the first box.</h3>
              </div>
              <StatusBadge tone="preview">Launch information</StatusBadge>
            </div>
            <div className="grid gap-x-6 sm:grid-cols-2 lg:grid-cols-3">
              {faqItems.map((item) => (
                <details className="border-t-2 border-dashed border-brand-forest/22 py-1" key={item.question}>
                  <summary className="flex min-h-12 cursor-pointer items-center text-sm font-bold text-brand-black focus-visible:outline focus-visible:outline-3 focus-visible:outline-dashed focus-visible:outline-brand-green-ink focus-visible:outline-offset-3">{item.question}</summary>
                  <p className="pb-3 text-sm leading-[1.5] text-brand-black/72">{item.answer}</p>
                </details>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className={`postcard-shell relative grid gap-6 overflow-hidden rounded-[42px_26px_48px_30px/30px_48px_26px_42px] border-4 border-brand-forest bg-brand-yellow p-5 shadow-brand-big sm:p-8 lg:grid-cols-[minmax(0,1.25fr)_minmax(260px,0.55fr)] lg:items-center ${sectionShell}`} id="b2b" aria-labelledby="b2b-title">
        <div className="relative z-[1] grid gap-4">
          <span className="w-fit -rotate-2 rounded-wobbly-tag border-2 border-dashed border-brand-forest bg-brand-warm-white px-3 py-2 text-sm font-bold text-brand-forest shadow-brand-soft">A note for partners</span>
          <h2 id="b2b-title" className={`${sectionTitle} max-w-190 text-brand-forest`}>Bring better food closer to your people.</h2>
          <p className="max-w-170 text-[1.05rem] text-brand-black/72">Gyms, offices, hotels, universities, and farms can join the early partnership list while the Thimphu operating model is finalized.</p>
          <div>
            <PrimaryLink href="mailto:hello@zama.bt?subject=Zama%20partnership%20enquiry">Start a partnership conversation</PrimaryLink>
          </div>
        </div>
        <aside className="postcard-stamp relative z-[1] grid justify-items-center gap-3 rotate-[2deg] rounded-wobbly-card border-3 border-dashed border-brand-forest bg-brand-warm-white p-5 text-center shadow-brand">
          <img className="w-28" src="assets/zama_logo.png" alt="Zama" width="112" height="48" loading="lazy" decoding="async" />
          <p className="font-primary text-2xl font-bold leading-[1.02] text-brand-forest">Ready to cook, built for Thimphu.</p>
          <a className="font-bold text-brand-green-ink underline decoration-dashed underline-offset-4" href="#waitlist">Join customer launch updates</a>
        </aside>
      </section>
    </>
  );
}
