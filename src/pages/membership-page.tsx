import { useState, type ChangeEvent, type FormEvent } from "react";
import { PrimaryButton } from "../components/ui/action-link";
import { OutlineTag } from "../components/ui/tag";
import { btnPrimaryLg, sectionShell, sectionTitle } from "../components/ui/styles";
import { submitMembershipInterest } from "../launch-interest";

const whyItems = [
  { label: "Simpler weekly groceries", copy: "Make regular grocery shopping easier." },
  { label: "Fresh local food", copy: "Better access to produce from local farmers." },
  { label: "Meal planning", copy: "Make deciding what to eat less stressful." },
  { label: "Member benefits", copy: "Useful perks that will be clearly explained before enrollment." },
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

export function MembershipPage() {
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

        <div className="grid max-w-170 gap-3">
          <OutlineTag>Zama+ Membership</OutlineTag>
          <h1 id="membership-title" className={`${sectionTitle} max-w-170 text-brand-green-ink`}>Zama+ is coming later.</h1>
          <p className="max-w-150 text-[1.05rem] leading-[1.5] text-brand-black/72">Be the first to know when Zama+ membership opens.</p>
          <p className="max-w-170 text-[1.05rem] leading-[1.5] text-brand-black/72">Zama+ isn&apos;t open for enrollment yet. We&apos;re working out the benefits, pricing, and membership rules before asking anyone to join.</p>
        </div>

        <div className="grid gap-4">
          <div className="grid gap-2">
            <h2 className="font-primary text-[clamp(1.4rem,2.4vw,1.9rem)] font-bold text-brand-black">Why we&apos;re building it</h2>
          </div>
          <div className="grid content-start items-start gap-4 sm:grid-cols-2">
            {whyItems.map((item) => (
              <div className="grid content-start gap-1.5 rounded-wobbly-card border-3 border-dashed border-brand-forest/30 bg-brand-warm-white p-5 shadow-brand-soft" key={item.label}>
                <h3 className="font-primary text-[clamp(1.15rem,2vw,1.45rem)] font-bold text-brand-green-ink">{item.label}</h3>
                <p className="text-sm leading-[1.42] text-brand-black/72">{item.copy}</p>
              </div>
            ))}
          </div>
        </div>

        <MembershipForm />
      </div>
    </section>
  );
}
