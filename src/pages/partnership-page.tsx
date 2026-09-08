import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Building2, Handshake, MapPin, UsersRound } from "lucide-react";
import { useContent } from "../cms/content-context";
import { farmerDzongkhags } from "../data/farmers";
import { farmProducerTypeId, normalisePartnershipPageSettings } from "../partnerships/partnership-defaults";
import { submitPartnershipRequest } from "../partnerships/partnership-api";
import { PrimaryButton } from "../components/ui/action-link";
import { OutlineTag } from "../components/ui/tag";
import { btnOutlineSm, sectionShell, sectionTitle } from "../components/ui/styles";

const fieldClasses =
  "min-h-11.5 w-full min-w-0 rounded-[20px_28px_16px_24px/24px_16px_28px_20px] border-3 border-brand-forest bg-brand-white px-4 py-[0.65rem] text-brand-black shadow-brand-soft outline-none placeholder:text-brand-black/46 focus-visible:border-brand-green-ink focus-visible:ring-4 focus-visible:ring-brand-leaf/20";

const labelClasses = "text-xs font-bold uppercase tracking-[0.1em] text-brand-green-ink";

const highlightIcons = [Building2, UsersRound, MapPin] as const;

export function PartnershipPage() {
  const { blocks } = useContent();
  const settings = useMemo(() => normalisePartnershipPageSettings(blocks.partnership), [blocks.partnership]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [status, setStatus] = useState("");
  const [partnerType, setPartnerType] = useState(settings.partnerTypes[0]?.id ?? "");
  const isFarmRequest = partnerType === farmProducerTypeId;

  useEffect(() => {
    if (settings.partnerTypes.some((type) => type.id === partnerType)) return;
    setPartnerType(settings.partnerTypes[0]?.id ?? "");
  }, [partnerType, settings.partnerTypes]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    setIsSubmitting(true);
    setStatus("");
    try {
      await submitPartnershipRequest({
        contactName: String(formData.get("name") ?? ""),
        organisationName: String(formData.get("organisation") ?? ""),
        email: String(formData.get("email") ?? ""),
        phone: String(formData.get("phone") ?? ""),
        partnerType,
        message: String(formData.get("message") ?? ""),
        location: isFarmRequest ? String(formData.get("location") ?? "") : "",
        dzongkhag: isFarmRequest ? String(formData.get("dzongkhag") ?? "") : "",
      }, settings);
      form.reset();
      setPartnerType(settings.partnerTypes[0]?.id ?? "");
      setSuccess(true);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "We could not save your partnership request. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section className={`full-bleed-safe relative overflow-hidden py-[clamp(2.5rem,5vw,4.5rem)] ${sectionShell}`} aria-labelledby="partnership-title">
      <div className="grid gap-7">
        <nav className="breadcrumb" aria-label="Breadcrumb">
          <ol className="flex flex-wrap items-center gap-1.5 text-sm">
            <li><a className="font-bold text-brand-green-ink underline decoration-dashed underline-offset-4 hover:text-brand-forest" href="#/">Home</a></li>
            <li aria-hidden="true" className="text-brand-black/40">/</li>
            <li aria-current="page" className="font-bold text-brand-black">Partner with us</li>
          </ol>
        </nav>

        <div className="grid max-w-210 gap-3">
          <OutlineTag>{settings.tag}</OutlineTag>
          <h1 id="partnership-title" className={`${sectionTitle} max-w-210 text-brand-green-ink`}>{settings.heading}</h1>
          <p className="max-w-170 text-[1.05rem] leading-[1.5] text-brand-black/72">{settings.intro}</p>
        </div>

        <div className="grid gap-5 lg:grid-cols-[minmax(0,0.82fr)_minmax(22rem,1.18fr)] lg:items-start">
          <div className="grid gap-4">
            {settings.highlights.map(({ title, copy }, index) => {
              const Icon = highlightIcons[index % highlightIcons.length];
              return <article className="grid grid-cols-[auto_1fr] gap-3 rounded-wobbly-card border-3 border-brand-forest bg-brand-white p-5 shadow-brand-soft" key={`${title}-${index}`}>
                <span className="grid h-11 w-11 place-items-center rounded-full border-2 border-brand-forest bg-brand-yellow text-brand-green-ink"><Icon className="h-5 w-5" aria-hidden="true" /></span>
                <div className="grid gap-1"><h2 className="font-primary text-xl font-bold text-brand-green-ink">{title}</h2><p className="text-sm leading-relaxed text-brand-black/68">{copy}</p></div>
              </article>;
            })}
            <div className="rounded-wobbly-card border-3 border-dashed border-brand-forest/35 bg-brand-mint p-5 shadow-brand-soft">
              <p className="flex items-center gap-2 font-primary text-xl font-bold text-brand-green-ink"><Handshake className="h-5 w-5" aria-hidden="true" />A straightforward first step.</p>
              <p className="mt-2 text-sm leading-relaxed text-brand-black/70">{settings.privacyCopy}</p>
            </div>
          </div>

          <div className="rounded-wobbly-card border-3 border-brand-forest bg-brand-yellow p-5 shadow-brand sm:p-6">
            {success ? (
              <div className="grid gap-4">
                <OutlineTag>Request received</OutlineTag>
                <h2 className="font-primary text-[clamp(1.7rem,3vw,2.4rem)] font-bold leading-[1.04] text-brand-green-ink">Thanks — we&apos;ll be in touch.</h2>
                <p className="text-[1.02rem] leading-relaxed text-brand-black/72">Your partnership request is now with the Zama team. We&apos;ll review the details and use the contact information you shared when we are ready to talk.</p>
                <div><a className={btnOutlineSm} href="#/">Back to Zama</a></div>
              </div>
            ) : !settings.intakeOpen ? (
              <div className="grid gap-4">
                <OutlineTag>Applications paused</OutlineTag>
                <h2 className="font-primary text-[clamp(1.7rem,3vw,2.4rem)] font-bold leading-[1.04] text-brand-green-ink">{settings.pausedTitle}</h2>
                <p className="text-[1.02rem] leading-relaxed text-brand-black/72">{settings.pausedCopy}</p>
              </div>
            ) : (
              <form className="grid gap-4" noValidate onSubmit={(event) => void handleSubmit(event)} aria-label="Partnership enquiry form">
                <div className="grid gap-1"><p className="text-xs font-bold uppercase tracking-[0.12em] text-brand-orange-ink">{settings.formEyebrow}</p><h2 className="font-primary text-[clamp(1.7rem,3vw,2.4rem)] font-bold leading-[1.04] text-brand-green-ink">{settings.formHeading}</h2><p className="text-sm leading-relaxed text-brand-black/70">{settings.formCopy}</p></div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="grid gap-2"><span className={labelClasses}>Your name</span><input className={fieldClasses} name="name" autoComplete="name" required placeholder="Your name" onChange={() => setStatus("")} /></label>
                  <label className="grid gap-2"><span className={labelClasses}>Organisation or farm name</span><input className={fieldClasses} name="organisation" autoComplete="organization" required placeholder="Organisation or farm name" onChange={() => setStatus("")} /></label>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="grid gap-2"><span className={labelClasses}>Email address</span><input className={fieldClasses} name="email" type="email" autoComplete="email" required placeholder="you@example.com" onChange={() => setStatus("")} /></label>
                  <label className="grid gap-2"><span className={labelClasses}>Phone <span className="normal-case font-normal tracking-normal text-brand-black/55">(optional)</span></span><input className={fieldClasses} name="phone" type="tel" autoComplete="tel" placeholder="Your contact number" onChange={() => setStatus("")} /></label>
                </div>
                <label className="grid gap-2"><span className={labelClasses}>Partnership type</span><select className={fieldClasses} name="partnerType" value={partnerType} onChange={(event) => { setPartnerType(event.target.value); setStatus(""); }} required><option value="" disabled>Select one</option>{settings.partnerTypes.map((type) => <option key={type.id} value={type.id}>{type.label}</option>)}</select></label>
                {isFarmRequest ? <div className="grid gap-4 rounded-wobbly-md border-2 border-dashed border-brand-forest/35 bg-brand-white/70 p-4 sm:grid-cols-2"><label className="grid gap-2"><span className={labelClasses}>Farm location</span><input className={fieldClasses} name="location" required placeholder="Village or town" onChange={() => setStatus("")} /></label><label className="grid gap-2"><span className={labelClasses}>Dzongkhag</span><select className={fieldClasses} name="dzongkhag" required defaultValue=""><option value="" disabled>Select Dzongkhag</option>{farmerDzongkhags.map((dzongkhag) => <option key={dzongkhag} value={dzongkhag}>{dzongkhag}</option>)}</select></label><p className="sm:col-span-2 text-xs leading-relaxed text-brand-black/60">If approved, these details create an unpublished farmer draft for Zama to review before anything is shown publicly.</p></div> : null}
                <label className="grid gap-2"><span className={labelClasses}>How would you like to work together?</span><textarea className={`${fieldClasses} resize-y`} name="message" rows={5} required placeholder="Tell us what you need and how Zama could help…" onChange={() => setStatus("")} /></label>
                <div className="flex flex-wrap items-center gap-3"><PrimaryButton disabled={isSubmitting}>{isSubmitting ? "Sending…" : <>{settings.submitLabel} <span aria-hidden="true">→</span></>}</PrimaryButton>{status ? <p className="text-sm font-bold text-brand-black" role="alert">{status}</p> : null}</div>
              </form>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
