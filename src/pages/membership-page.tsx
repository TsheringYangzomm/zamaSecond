import { useEffect, useState, type ChangeEvent, type FormEvent } from "react";
import { BadgeCheck, Crown } from "lucide-react";
import { useCart } from "../cart-context";
import { useCustomerAuth } from "../checkout/customer-auth";
import { fetchMembershipPlans } from "../membership/membership-api";
import { cadenceLabel } from "../membership/membership-rules";
import type { MembershipPlan } from "../membership/membership-types";
import { PrimaryButton } from "../components/ui/action-link";
import { OutlineTag } from "../components/ui/tag";
import { btnOutlineLg, btnPrimaryLg, sectionShell, sectionTitle } from "../components/ui/styles";
import { submitMembershipInterest } from "../launch-interest";

const launchPreviewBenefits = [
  "Explore the Zama shop and planned range",
  "Save products that interest you",
  "Get launch and new-product updates",
  "No payment or order is created",
] as const;

const plannedMembershipBenefits = [
  "Benefits published before enrollment",
  "Pricing and billing terms shown first",
  "Pause and cancellation rules made clear",
  "Member support details shared up front",
] as const;

const interestOptions = [
  "Fresh groceries",
  "Meal kits",
  "Local farm produce",
  "Weekly grocery planning",
  "Future Zama+ benefits",
] as const;

const fieldClasses =
  "min-h-11.5 w-full min-w-0 rounded-[20px_28px_16px_24px/24px_16px_28px_20px] border-3 border-brand-forest bg-brand-white px-4 py-[0.65rem] text-brand-black shadow-brand-soft outline-none placeholder:text-brand-black/46 focus-visible:border-brand-green-ink focus-visible:ring-4 focus-visible:ring-brand-leaf/20";

const labelClasses = "text-xs font-bold uppercase tracking-[0.1em] text-brand-green-ink";

function MembershipForm() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [status, setStatus] = useState("");
  const [selectedInterests, setSelectedInterests] = useState<string[]>([]);
  const [errors, setErrors] = useState<{ fullName?: string; email?: string }>({});

  const clearFieldError = (field: "fullName" | "email") => {
    setErrors((current) => ({ ...current, [field]: undefined }));
    if (status) setStatus("");
  };

  const handleInterestToggle = (event: ChangeEvent<HTMLInputElement>) => {
    const { value, checked } = event.target;
    setSelectedInterests((current) => checked ? [...current, value] : current.filter((item) => item !== value));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const form = event.currentTarget;
    const formData = new FormData(form);
    const fullName = String(formData.get("fullName") ?? "").trim();
    const email = String(formData.get("email") ?? "").trim();
    const nextErrors: { fullName?: string; email?: string } = {};

    if (!fullName) {
      nextErrors.fullName = "Please enter your full name.";
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      nextErrors.email = "Enter a complete email address, such as name@example.com.";
    }

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      setStatus("");
      return;
    }

    setErrors({});
    setStatus("");
    setIsSubmitting(true);

    try {
      const result = await submitMembershipInterest({
        fullName,
        email,
        interests: selectedInterests,
      });

      if (result.mode === "duplicate" || result.mode === "remote" || result.mode === "preview") {
        setIsSuccess(true);
        form.reset();
        setSelectedInterests([]);
      }
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Something went wrong. Please try again.");
      setIsSuccess(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSuccess) {
    return (
      <div className="grid gap-5 rounded-[26px_38px_22px_34px/34px_24px_38px_22px] border-3 border-dashed border-brand-forest/30 bg-brand-warm-white p-6 shadow-brand-soft sm:p-8">
        <div className="grid gap-3">
          <OutlineTag>You’re on the list</OutlineTag>
          <h3 className="font-primary text-[clamp(1.8rem,3vw,2.5rem)] font-bold leading-[1.05] text-brand-green-ink">You&apos;re on the list.</h3>
          <p className="text-[1.05rem] leading-[1.5] text-brand-black/72">Thanks for your interest in Zama+.</p>
          <p className="text-[1.05rem] leading-[1.5] text-brand-black/72">Membership isn&apos;t open yet. We&apos;ll let you know when enrollment is ready.</p>
          <p className="font-bold text-brand-green-ink">No payment has been taken.</p>
        </div>
        <a className={`${btnPrimaryLg} w-fit`} href="#/">
          <span className="inline-flex items-center gap-2">
            Explore Zama <span aria-hidden="true">→</span>
          </span>
        </a>
      </div>
    );
  }

  return (
    <form className="grid gap-5 rounded-[26px_38px_22px_34px/34px_24px_38px_22px] border-3 border-dashed border-brand-forest/30 bg-brand-warm-white p-6 shadow-brand-soft sm:p-8" onSubmit={handleSubmit} noValidate aria-label="Zama+ membership interest form">
      <div className="grid gap-2">
        <h2 className="font-primary text-[clamp(1.6rem,3vw,2.4rem)] font-bold text-brand-black">Get Zama+ Membership Updates</h2>
        <p className="text-[1.03rem] leading-[1.5] text-brand-black/72">Tell us you&apos;re interested and we&apos;ll let you know when membership is ready.</p>
      </div>

      <div className="grid gap-2">
        <label className={labelClasses} htmlFor="membership-full-name">
          Full name
        </label>
        <input
          id="membership-full-name"
          name="fullName"
          type="text"
          autoComplete="name"
          required
          aria-invalid={Boolean(errors.fullName)}
          aria-describedby={errors.fullName ? "membership-full-name-error" : undefined}
          className={fieldClasses}
          placeholder="Your full name"
          onChange={() => clearFieldError("fullName")}
        />
        {errors.fullName ? <p id="membership-full-name-error" className="text-sm font-bold text-brand-black">{errors.fullName}</p> : null}
      </div>

      <div className="grid gap-2">
        <label className={labelClasses} htmlFor="membership-email">
          Email address
        </label>
        <input
          id="membership-email"
          name="email"
          type="email"
          autoComplete="email"
          spellCheck={false}
          required
          aria-invalid={Boolean(errors.email)}
          aria-describedby={errors.email ? "membership-email-error" : undefined}
          className={fieldClasses}
          placeholder="you@example.com"
          onChange={() => clearFieldError("email")}
        />
        {errors.email ? <p id="membership-email-error" className="text-sm font-bold text-brand-black">{errors.email}</p> : null}
      </div>

      <fieldset className="grid gap-3 border-0 p-0">
        <legend className={labelClasses}>What are you most interested in?</legend>
        <div className="grid gap-2 sm:grid-cols-2">
          {interestOptions.map((option) => (
            <label key={option} className="flex items-start gap-3 rounded-[18px_22px_16px_20px/22px_16px_20px_18px] border-2 border-dashed border-brand-forest/30 bg-brand-white px-3 py-2 text-sm text-brand-black/80 shadow-brand-soft">
              <input
                type="checkbox"
                name="interests"
                value={option}
                checked={selectedInterests.includes(option)}
                onChange={handleInterestToggle}
                className="mt-0.5 h-4 w-4 accent-brand-leaf"
              />
              <span>{option}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <div className="grid gap-3">
        <PrimaryButton disabled={isSubmitting} aria-busy={isSubmitting} className="w-full justify-center sm:w-fit">
          {isSubmitting ? "Joining..." : "Notify Me About Zama+ →"}
        </PrimaryButton>
        <div className="grid gap-1 text-sm text-brand-black/72">
          <p>No payment today.</p>
          <p>Membership pricing, benefits, renewal, pause, and cancellation terms will be published before enrollment opens.</p>
        </div>
        {status ? <p className="font-bold text-brand-black" role="alert">{status}</p> : null}
      </div>
    </form>
  );
}

function scrollToMembershipUpdates() {
  document.getElementById("membership-updates")?.scrollIntoView({ behavior: "smooth", block: "start" });
}

function LaunchPreviewCard() {
  return (
    <article className="grid content-start gap-5 rounded-wobbly-card border-3 border-brand-black bg-brand-white p-5 shadow-brand sm:p-6">
      <OutlineTag>Available now</OutlineTag>
      <div className="grid gap-2">
        <h2 className="font-primary text-[clamp(1.8rem,3vw,2.5rem)] font-bold leading-[1.04] text-brand-black">Launch Preview</h2>
        <p className="font-primary text-[clamp(2rem,4vw,3.25rem)] font-bold leading-none text-brand-orange-ink">Free</p>
      </div>
      <ul className="grid gap-2 text-sm leading-relaxed text-brand-black/70 sm:text-base">
        {launchPreviewBenefits.map((benefit) => (
          <li className="flex items-start gap-2" key={benefit}>
            <span aria-hidden="true" className="font-bold text-brand-green-ink">+</span>
            <span>{benefit}</span>
          </li>
        ))}
      </ul>
      <button className={`${btnOutlineLg} mt-auto w-full`} type="button" onClick={scrollToMembershipUpdates}>
        Join launch updates <span aria-hidden="true">→</span>
      </button>
    </article>
  );
}

function membershipBenefits(plan: MembershipPlan | null): string[] {
  if (!plan) return [...plannedMembershipBenefits];

  return [
    ...plan.benefits.map((benefit) => benefit.title),
    plan.scheduledDeliveryEnabled ? "Scheduled saved-box delivery" : null,
    plan.earlyAccessEnabled ? "Early access to selected new products" : null,
    plan.freebieEnabled ? "A freebie with each paid scheduled delivery" : null,
  ].filter((benefit): benefit is string => Boolean(benefit)).slice(0, 4);
}

function MembershipPlanCard({ plan, loading, signedIn, onSignIn }: {
  plan: MembershipPlan | null;
  loading: boolean;
  signedIn: boolean;
  onSignIn: () => void;
}) {
  const benefits = membershipBenefits(plan);

  return (
    <article className="relative grid content-start gap-5 overflow-hidden rounded-wobbly-card border-3 border-brand-forest bg-brand-yellow p-5 shadow-brand sm:p-6">
      <span aria-hidden="true" className="pointer-events-none absolute -right-7 -top-7 h-24 w-24 rounded-full border-3 border-dashed border-brand-orange-ink/70" />
      <OutlineTag>{loading ? "Loading plan" : plan ? "Available now" : "Planned after launch"}</OutlineTag>
      <div className="relative grid gap-2">
        <div className="flex items-start gap-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full border-2 border-brand-forest bg-brand-white text-brand-green-ink"><Crown className="h-5 w-5" /></span>
          <h2 className="font-primary text-[clamp(1.8rem,3vw,2.5rem)] font-bold leading-[1.04] text-brand-black">{plan?.name ?? "Zama+ Membership"}</h2>
        </div>
        {loading ? <p className="min-h-10 text-sm font-bold text-brand-black/60">Loading membership details…</p> : plan ? <><p className="font-primary text-[clamp(1.7rem,3.6vw,3rem)] font-bold leading-none text-brand-orange-ink">Nu. {new Intl.NumberFormat("en-BT").format(plan.price)}</p><p className="text-sm font-semibold text-brand-black/68">{cadenceLabel(plan.cadence)} · {plan.discountPercent}% member savings</p></> : <p className="font-primary text-[clamp(1.7rem,3.6vw,3rem)] font-bold leading-none text-brand-orange-ink">Coming later</p>}
      </div>
      {!loading ? <ul className="relative grid gap-2 text-sm leading-relaxed text-brand-black/72 sm:text-base">
        {benefits.map((benefit) => <li className="flex items-start gap-2" key={benefit}><BadgeCheck className="mt-0.5 h-4 w-4 shrink-0 text-brand-green-ink" /><span>{benefit}</span></li>)}
      </ul> : <div className="min-h-28" aria-hidden="true" />}
      {loading ? <div className={`${btnPrimaryLg} mt-auto w-full opacity-55`}>Loading…</div> : plan && signedIn ? <a className={`${btnPrimaryLg} mt-auto w-full`} href="#/account/membership">Manage Zama+ <span aria-hidden="true">→</span></a> : plan ? <button className={`${btnPrimaryLg} mt-auto w-full`} type="button" onClick={onSignIn}>Sign in to join Zama+ <span aria-hidden="true">→</span></button> : <button className={`${btnPrimaryLg} mt-auto w-full`} type="button" onClick={scrollToMembershipUpdates}>Get membership updates <span aria-hidden="true">→</span></button>}
    </article>
  );
}

function AdditionalPlanCard({ plan, signedIn, onSignIn }: { plan: MembershipPlan; signedIn: boolean; onSignIn: () => void }) {
  return (
    <article className="grid content-start gap-3 rounded-wobbly-card border-3 border-brand-forest bg-brand-white p-5 shadow-brand-soft">
      <div className="flex flex-wrap items-start justify-between gap-3"><div className="grid gap-1"><h3 className="font-primary text-xl font-bold text-brand-green-ink">{plan.name}</h3><p className="text-sm font-bold text-brand-black">Nu. {new Intl.NumberFormat("en-BT").format(plan.price)} {cadenceLabel(plan.cadence)}</p></div><span className="rounded-full border-2 border-brand-forest/20 bg-brand-mint px-2 py-1 text-xs font-bold text-brand-green-ink">{plan.discountPercent}% savings</span></div>
      <p className="text-sm leading-relaxed text-brand-black/68">{plan.description}</p>
      <a className="font-bold text-brand-green-ink underline decoration-dashed underline-offset-4" href={signedIn ? "#/account/membership" : undefined} onClick={signedIn ? undefined : (event) => { event.preventDefault(); onSignIn(); }}>{signedIn ? "Manage this plan" : "Sign in to choose this plan"} <span aria-hidden="true">→</span></a>
    </article>
  );
}

export function MembershipPage() {
  const { status } = useCustomerAuth();
  const { openAuth } = useCart();
  const [plans, setPlans] = useState<MembershipPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const signedIn = status === "signed-in";

  useEffect(() => {
    let active = true;
    void fetchMembershipPlans().then((nextPlans) => {
      if (active) setPlans(nextPlans);
    }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const featuredPlan = plans[0] ?? null;
  const additionalPlans = plans.slice(1);

  return (
    <section className="full-bleed-safe relative overflow-hidden" aria-labelledby="membership-title">
      <div className={`relative z-[1] grid gap-7 py-[clamp(2.5rem,5vw,4.5rem)] ${sectionShell}`}>
        <nav className="breadcrumb" aria-label="Breadcrumb">
          <ol className="flex flex-wrap items-center gap-1.5 text-sm">
            <li><a className="font-bold text-brand-green-ink underline decoration-dashed underline-offset-4 hover:text-brand-forest" href="#/">Home</a></li>
            <li aria-hidden="true" className="text-brand-black/40">/</li>
            <li aria-current="page" className="font-bold text-brand-black">Membership</li>
          </ol>
        </nav>

        <div className="grid max-w-220 gap-3">
          <OutlineTag>Launch access and Zama+ membership</OutlineTag>
          <h1 id="membership-title" className={`${sectionTitle} max-w-220 text-brand-green-ink`}>Start with the preview. Choose membership when you&apos;re ready.</h1>
          <p className="max-w-170 text-[1.05rem] leading-[1.5] text-brand-black/72">Browse Zama today, then join Zama+ when you want member savings, scheduled deliveries, early access, and member-only extras.</p>
        </div>

        <div className="grid items-stretch gap-5 lg:grid-cols-2">
          <LaunchPreviewCard />
          <MembershipPlanCard plan={featuredPlan} loading={loading} signedIn={signedIn} onSignIn={openAuth} />
        </div>

        {!loading && additionalPlans.length > 0 ? <section className="grid gap-4" aria-labelledby="more-membership-plans"><div className="grid gap-1"><p className="text-xs font-bold uppercase tracking-[0.12em] text-brand-orange-ink">More ways to join</p><h2 id="more-membership-plans" className="font-primary text-[clamp(1.5rem,3vw,2.25rem)] font-bold text-brand-green-ink">Choose the plan that fits your kitchen.</h2></div><div className="grid gap-4 sm:grid-cols-2">{additionalPlans.map((plan) => <AdditionalPlanCard key={plan.id} plan={plan} signedIn={signedIn} onSignIn={openAuth} />)}</div></section> : null}

        <div id="membership-updates" className="scroll-mt-6">
          <MembershipForm />
        </div>
      </div>
    </section>
  );
}
