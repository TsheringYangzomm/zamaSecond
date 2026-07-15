import { deliveryDetails, faqItems, policyItems, trustItems } from "../../data/landing";
import { OutlineLink, PrimaryLink } from "../../components/ui/action-link";
import { OutlineTag, YellowTag } from "../../components/ui/tag";
import { sectionShell } from "../../components/ui/styles";

const trustToneClasses = {
  white: "bg-brand-white",
  yellow: "bg-brand-yellow",
} as const;

function TrustCard({ title, body, tone }: (typeof trustItems)[number]) {
  return (
    <article className={`grid gap-2 rounded-wobbly-card border-3 border-brand-black ${trustToneClasses[tone]} p-4 shadow-brand-soft`}>
      <h3 className="font-primary text-[1.55rem] font-bold leading-[1.02] text-brand-black">{title}</h3>
      <p className="text-brand-black/72">{body}</p>
    </article>
  );
}

export function LaunchDetailsSection() {
  return (
    <>
      <section className={`grid gap-6 py-[clamp(2.8rem,6vw,5rem)] ${sectionShell}`} id="delivery" aria-labelledby="delivery-title">
        <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_minmax(260px,0.62fr)] sm:items-end sm:gap-8">
          <div className="grid gap-2">
            <OutlineTag>Delivery and support</OutlineTag>
            <h2 id="delivery-title" className="font-primary text-[clamp(2.35rem,5vw,5rem)] font-bold leading-[1.02] text-brand-green-ink">Know the details before you order.</h2>
            <p className="max-w-150 text-[1.1rem] text-brand-black/72">Zama is starting in Thimphu. We will publish the exact service area, hours, fees, and delivery windows before paid orders open.</p>
          </div>
          <div className="rounded-wobbly-md border-3 border-brand-black bg-brand-white p-4 shadow-brand">
            <p className="font-primary text-2xl font-bold text-brand-black">Need help now?</p>
            <p className="mt-1 text-sm text-brand-black/72">For launch questions, product feedback, and partnership enquiries:</p>
            <a className="mt-3 inline-flex font-bold text-brand-green-ink underline decoration-dashed underline-offset-4" href="mailto:hello@zama.bt">hello@zama.bt</a>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {deliveryDetails.map((item) => (
            <div className="grid gap-1 rounded-wobbly-md border-2 border-dashed border-brand-black/42 bg-brand-white/80 p-4" key={item.label}>
              <dt className="text-sm font-bold uppercase tracking-[0.08em] text-brand-green-ink">{item.label}</dt>
              <dd className="text-brand-black/76">{item.value}</dd>
            </div>
          ))}
        </div>

        <div className="grid gap-3 rounded-[26px_18px_32px_16px/18px_32px_20px_28px] border-3 border-brand-black bg-brand-yellow/55 p-5 shadow-brand sm:grid-cols-[auto_1fr_auto] sm:items-center sm:p-6">
          <div className="grid h-14 w-14 place-items-center rounded-full border-3 border-brand-black bg-brand-orange font-primary text-2xl font-bold">?</div>
          <div>
            <h3 className="font-primary text-2xl font-bold text-brand-black">Not sure if your neighborhood is covered?</h3>
            <p className="text-brand-black/72">Join the launch list with your area and we will confirm the service map as it is finalized.</p>
          </div>
          <PrimaryLink href="#waitlist">Check launch area</PrimaryLink>
        </div>
      </section>

      <section className={`grid gap-5 py-[clamp(2.8rem,6vw,5rem)] ${sectionShell}`} id="trust" aria-labelledby="trust-title">
        <div className="section-heading grid gap-2 justify-items-center text-center">
          <YellowTag>Trust, made visible</YellowTag>
          <h2 id="trust-title" className="font-primary text-[clamp(2.35rem,5vw,5rem)] font-bold leading-[1.02] text-brand-green-ink">Proof before promises.</h2>
          <p className="max-w-150 text-[1.1rem] text-brand-black/72">The launch site will show the evidence customers need: clear product information, responsible sourcing, food-safety processes, and honest service boundaries.</p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {trustItems.map((item) => <TrustCard key={item.title} {...item} />)}
        </div>
      </section>

      <section className={`grid gap-5 py-[clamp(2.8rem,6vw,5rem)] ${sectionShell}`} id="policies" aria-labelledby="policies-title">
        <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_minmax(260px,0.62fr)] sm:items-end sm:gap-8">
          <div className="grid gap-2">
            <OutlineTag>Help and policies</OutlineTag>
            <h2 id="policies-title" className="font-primary text-[clamp(2.35rem,5vw,5rem)] font-bold leading-[1.02] text-brand-green-ink">Good service includes the fine print.</h2>
          </div>
          <p className="text-brand-black/72">These public explanations are the content foundation. Final legal wording, license details, and effective dates must be reviewed before checkout goes live.</p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          {policyItems.map((item) => (
            <details className="rounded-wobbly-md border-3 border-brand-black bg-brand-white p-4 shadow-brand-soft" id={item.id} key={item.id}>
              <summary className="cursor-pointer font-primary text-xl font-bold text-brand-black">{item.title}</summary>
              <p className="mt-3 text-brand-black/72">{item.body}</p>
            </details>
          ))}
        </div>

        <div className="grid gap-4 rounded-wobbly-md border-3 border-brand-black bg-brand-green/12 p-5 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.1em] text-brand-green-ink">Frequently asked</p>
            <div className="mt-2 grid gap-2">
              {faqItems.map((item) => (
                <details key={item.question}>
                  <summary className="cursor-pointer font-bold text-brand-black">{item.question}</summary>
                  <p className="mt-1 max-w-140 text-sm text-brand-black/72">{item.answer}</p>
                </details>
              ))}
            </div>
          </div>
          <OutlineLink href="mailto:hello@zama.bt">Ask a question</OutlineLink>
        </div>
      </section>

      <section className={`grid gap-5 border-y-4 border-dashed border-brand-black/42 py-[clamp(2.8rem,6vw,5rem)] ${sectionShell}`} id="about" aria-labelledby="about-title">
        <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_minmax(260px,0.8fr)] sm:items-end sm:gap-10">
          <div className="grid gap-2">
            <YellowTag>About Zama</YellowTag>
          <h2 id="about-title" className="font-primary text-[clamp(2.35rem,5vw,5rem)] font-bold leading-[1.02] text-brand-green-ink">A more useful way to eat at home.</h2>
          </div>
          <div className="grid gap-3 text-[1.05rem] text-brand-black/72">
            <p>Zama is being built for people in Thimphu who want better ingredients and less planning between work, study, training, and home.</p>
            <p>We will earn trust one clear product, one careful pack, and one honest delivery update at a time.</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-3">
          <PrimaryLink href="#shop">Explore the range</PrimaryLink>
          <OutlineLink href="#farmers">Meet the farmers</OutlineLink>
          <OutlineLink href="#b2b">Partner with Zama</OutlineLink>
        </div>
      </section>

      <section className={`grid gap-4 py-[clamp(2.8rem,6vw,5rem)] ${sectionShell}`} id="b2b" aria-labelledby="b2b-title">
        <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_minmax(260px,0.65fr)] sm:items-end sm:gap-8">
          <div className="grid gap-2">
            <OutlineTag>For partners</OutlineTag>
          <h2 id="b2b-title" className="font-primary text-[clamp(2.2rem,4vw,4rem)] font-bold leading-[1.02] text-brand-green-ink">Bring better food closer to your people.</h2>
          </div>
          <p className="text-brand-black/72">Gyms, offices, hotels, universities, and farms can join the early partnership list while the Thimphu operating model is finalized.</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <PrimaryLink href="mailto:hello@zama.bt?subject=Zama%20partnership%20enquiry">Start a partnership conversation</PrimaryLink>
          <OutlineLink href="#waitlist">Join launch updates</OutlineLink>
        </div>
      </section>
    </>
  );
}
