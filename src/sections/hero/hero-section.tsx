import { useCallback, useState, type FormEvent } from "react";
import { PrimaryButton } from "../../components/ui/action-link";
import { YellowTag } from "../../components/ui/tag";
import { sectionShell } from "../../components/ui/styles";

function WaitlistForm() {
  const [status, setStatus] = useState("");
  const handleSubmit = useCallback((event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const email = new FormData(event.currentTarget).get("email");

    if (typeof email !== "string" || email.trim() === "") {
      setStatus("Please enter your email address.");
      return;
    }

    setStatus("You're on the list — we'll be in touch soon.");
    event.currentTarget.reset();
  }, []);

  return (
    <form
      className="waitlist-form waitlist-form-shell relative mt-[0.3rem] flex w-full max-w-125 flex-col flex-wrap gap-[0.65rem] sm:flex-row"
      id="waitlist"
      aria-label="Join waitlist"
      onSubmit={handleSubmit}
    >
      <label className="sr-only" htmlFor="email">
        Email address
      </label>
      <input
        id="email"
        name="email"
        type="email"
        placeholder="you@example.com…"
        autoComplete="email"
        aria-describedby="waitlist-status"
        required
        className="min-h-11.5 min-w-0 flex-1 rounded-[20px_28px_16px_24px/24px_16px_28px_20px] border-3 border-brand-black bg-brand-white px-4 py-[0.65rem] text-brand-black shadow-brand-soft outline-none placeholder:text-brand-black/46 focus:border-brand-green-ink focus:ring-4 focus:ring-brand-green/20"
      />
      <PrimaryButton className="w-full sm:w-auto">Join Waitlist</PrimaryButton>
      <p id="waitlist-status" className="form-status min-h-[1.4em] basis-full text-[1.05rem] text-brand-green-ink" role="status" aria-live="polite">
        {status}
      </p>
    </form>
  );
}

export function HeroSection() {
  return (
    <section
      className={`hero hero-shell relative grid min-h-auto grid-cols-1 items-center gap-[clamp(1.5rem,5vw,3.6rem)] pt-6 pb-[clamp(1.6rem,3.5vw,2.4rem)] sm:pt-[clamp(1.6rem,3.5vw,2.6rem)] lg:min-h-[min(600px,calc(100vh-118px))] lg:grid-cols-[minmax(0,1.12fr)_minmax(320px,0.88fr)] ${sectionShell}`}
      aria-labelledby="hero-title"
    >
      <div className="hero-content hero-content-shell relative z-1 flex min-w-0 flex-col items-start gap-[0.85rem]">
        <YellowTag>Thimphu launch preview</YellowTag>
        <h1 id="hero-title" className="hero-h1 relative max-w-[11.5ch] font-primary text-[clamp(2rem,7.5vw,2.4rem)] font-bold leading-[1.02] text-brand-green-ink sm:max-w-172.5 sm:text-[clamp(3rem,6.5vw,5.6rem)] lg:max-w-[13ch] lg:text-[clamp(3rem,5.5vw,4.5rem)]">
          Meal kits and fresh groceries for Thimphu.
        </h1>
        <p className="hero-copy max-w-full text-[clamp(1rem,4vw,1.1rem)] text-brand-black/72 sm:max-w-142.5 sm:text-[clamp(1.15rem,1.6vw,1.32rem)]">
          Plan dinner, choose a practical grocery top-up, and see what is in your basket before you order. Local produce is prioritized when it is in season.
        </p>
        <WaitlistForm />
      </div>

      <div className="hero-media hero-media-shell relative grid min-w-0 place-items-center rotate-[1.2deg]" aria-label="Fresh groceries and local produce">
        <img className="relative z-1 w-[min(100%,560px)] -rotate-1 object-contain" src="assets/hero.png" alt="Fresh produce, grocery bags, and delivery boxes" width="560" height="500" fetchPriority="high" />
        <div className="harvest-note harvest-note-shell absolute right-[clamp(0.2rem,2vw,1rem)] bottom-[clamp(0.5rem,4vw,2rem)] z-[2] grid w-32 gap-[0.2rem] rotate-[-4deg] rounded-[18px_28px_16px_24px/26px_18px_28px_16px] border-3 border-brand-black bg-brand-white p-[0.65rem] shadow-brand sm:w-39.5 sm:gap-1 sm:p-[0.85rem]">
          <strong className="font-primary text-[1.5rem] leading-none text-brand-orange sm:text-[2rem]">Local-first</strong>
          <span className="text-[0.85rem] leading-[1.08] sm:text-base">sourcing shown clearly</span>
        </div>
      </div>
    </section>
  );
}
