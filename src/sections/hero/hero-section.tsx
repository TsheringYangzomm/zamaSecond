import { useCallback, useRef, useState, type FormEvent } from "react";
import { PrimaryButton } from "../../components/ui/action-link";
import { YellowTag } from "../../components/ui/tag";
import { sectionShell } from "../../components/ui/styles";
import { submitLaunchInterest } from "../../launch-interest";

function WaitlistForm() {
  const emailRef = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasError, setHasError] = useState(false);
  const handleSubmit = useCallback(async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    const emailInput = form.elements.namedItem("email");

    if (!(emailInput instanceof HTMLInputElement) || !emailInput.validity.valid) {
      setStatus(emailInput instanceof HTMLInputElement && emailInput.validity.typeMismatch ? "Enter a complete email address, such as name@example.com." : "Enter your email address to join the launch updates.");
      setHasError(true);
      emailRef.current?.focus();
      return;
    }

    const email = emailInput.value.trim();

    setIsSubmitting(true);
    setHasError(false);
    setStatus("");

    try {
      const result = await submitLaunchInterest({ email, source: "hero-waitlist" });
      setStatus(result.mode === "preview" ? "Preview saved for this browser session. Connect the launch endpoint before publishing." : "You’re on the list — Zama will be in touch soon.");
      form.reset();
    } catch (error) {
      setHasError(true);
      setStatus(error instanceof Error ? error.message : "We could not save your request. Please try again or email hello@zama.bt.");
      emailRef.current?.focus();
    } finally {
      setIsSubmitting(false);
    }
  }, []);

  return (
    <form
      className="waitlist-form relative mt-1 flex w-full max-w-135 flex-col flex-wrap gap-2 rounded-[22px_30px_18px_26px/28px_18px_30px_20px] border-2 border-dashed border-brand-yellow/70 bg-brand-warm-white p-2.5 text-brand-black shadow-brand sm:flex-row"
      id="waitlist"
      aria-label="Join waitlist"
      noValidate
      onSubmit={handleSubmit}
    >
      <p className="basis-full px-1 text-xs font-bold uppercase tracking-[0.1em] text-brand-orange-ink">Get first access · no payment today</p>
      <label className="sr-only" htmlFor="email">
        Email address
      </label>
      <input
        id="email"
        ref={emailRef}
        name="email"
        type="email"
        placeholder="you@example.com…"
        autoComplete="email"
        spellCheck={false}
        aria-describedby="waitlist-status"
        aria-invalid={hasError}
        required
        onChange={() => {
          if (hasError) setHasError(false);
          if (status) setStatus("");
        }}
        className="min-h-11.5 min-w-0 flex-1 rounded-[20px_28px_16px_24px/24px_16px_28px_20px] border-3 border-brand-forest bg-brand-white px-4 py-[0.65rem] text-brand-black shadow-brand-soft outline-none placeholder:text-brand-black/46 focus-visible:border-brand-green-ink focus-visible:ring-4 focus-visible:ring-brand-leaf/20"
      />
      <PrimaryButton className="w-full sm:w-auto" disabled={isSubmitting}>{isSubmitting ? "Joining…" : "Join Launch Updates"}</PrimaryButton>
      <p id="waitlist-status" className={`form-status min-h-[1.4em] basis-full px-1 text-sm ${hasError ? "font-bold text-brand-black" : "font-medium text-brand-green-ink"}`} role="status" aria-live="polite">
        {status}
      </p>
    </form>
  );
}

export function HeroSection() {
  return (
    <section
      className="hero hero-shell full-bleed-safe relative isolate overflow-hidden border-y-4 border-brand-forest bg-brand-forest text-brand-warm-white"
      aria-labelledby="hero-title"
    >
      <div className={`hero-layout relative z-[1] grid min-h-auto grid-cols-1 items-center gap-5 py-7 sm:py-9 lg:min-h-[min(650px,calc(100vh-108px))] lg:grid-cols-[minmax(0,1.06fr)_minmax(380px,0.94fr)] lg:gap-2 lg:py-11 ${sectionShell}`}>
        <div className="hero-content relative z-[2] flex min-w-0 flex-col items-start gap-4">
          <YellowTag>Thimphu launch preview</YellowTag>
          <h1 id="hero-title" className="hero-h1 max-w-full text-balance font-primary text-[clamp(2.2rem,11.5vw,3.35rem)] font-bold leading-[0.94] tracking-[-0.035em] text-brand-warm-white sm:max-w-[11ch] sm:text-[clamp(4rem,8vw,5.6rem)] lg:text-[clamp(4.2rem,5.8vw,5.4rem)]">
            <span className="block">Meal kits &</span>
            <span className="hero-highlight relative inline-block text-brand-yellow">fresh groceries</span>
            <span className="block">for Thimphu<span className="inline-block rotate-6 text-brand-orange">!</span></span>
          </h1>
          <p className="hero-copy max-w-135 text-pretty text-[clamp(1rem,4vw,1.08rem)] leading-[1.55] text-brand-warm-white/76 sm:text-[1.12rem]">
            Plan dinner, top up the kitchen, and see what is in your basket before you order. Local produce comes first when it is in season.
          </p>
          <WaitlistForm />
        </div>

        <div className="hero-media hero-media-shell relative z-[1] grid min-h-80 min-w-0 place-items-center sm:min-h-105 lg:min-h-125" aria-label="Fresh groceries and local produce">
          <span className="absolute top-5 right-1 z-[3] rotate-3 rounded-wobbly-tag border-2 border-dashed border-brand-yellow bg-brand-warm-white px-3 py-2 text-xs font-bold uppercase tracking-[0.08em] text-brand-forest shadow-brand sm:right-4">Ready to cook</span>
          <div className="relative z-[2] w-[106%] max-w-none -translate-x-1 -rotate-1 sm:w-[122%] sm:-translate-x-10 sm:-rotate-2 lg:w-[132%] lg:-translate-x-12">
            <img className="hero-product h-auto w-full object-contain" src="assets/hero.webp" alt="Fresh produce, grocery bags, and delivery boxes" width="612" height="408" fetchPriority="high" />
          </div>
          <div className="harvest-note absolute bottom-5 left-0 z-[3] grid rotate-[-3deg] gap-0.5 rounded-[20px_28px_18px_24px/26px_18px_28px_20px] border-3 border-brand-forest bg-brand-warm-white px-4 py-3 text-brand-black shadow-brand sm:left-2">
            <strong className="font-primary text-xl leading-none text-brand-orange-ink">Local-first</strong>
            <span className="text-xs leading-[1.15]">Seasonal sourcing, shown clearly.</span>
          </div>
        </div>
      </div>
    </section>
  );
}
