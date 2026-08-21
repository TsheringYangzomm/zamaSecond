import { useState, type FormEvent, type ReactNode } from "react";
import { useCustomerAuth } from "../../checkout/customer-auth";
import type { CustomerProfile } from "../../checkout/checkout-api";
import { btnOutlineSm, btnPrimaryLg } from "../ui/styles";

export const inputClasses =
  "min-h-11.5 w-full rounded-[18px_12px_16px_10px/12px_18px_10px_16px] border-3 border-brand-forest bg-brand-white px-4 py-[0.65rem] text-brand-black shadow-brand-soft outline-none placeholder:text-brand-black/46 focus-visible:border-brand-green-ink focus-visible:ring-4 focus-visible:ring-brand-leaf/20 disabled:cursor-not-allowed disabled:opacity-55";

export const textAreaClasses = inputClasses.replace("min-h-11.5", "min-h-24");

export const selectClasses =
  "min-h-11.5 w-full rounded-[18px_12px_16px_10px/12px_18px_10px_16px] border-3 border-brand-forest bg-brand-white px-4 py-[0.65rem] text-brand-black shadow-brand-soft outline-none focus-visible:border-brand-green-ink focus-visible:ring-4 focus-visible:ring-brand-leaf/20";

export const labelClasses = "text-xs font-bold uppercase tracking-[0.1em] text-brand-green-ink";

export function Field({ label, htmlFor, children }: { label: string; htmlFor: string; children: ReactNode }) {
  return (
    <div className="grid gap-1.5">
      <label htmlFor={htmlFor} className={labelClasses}>{label}</label>
      {children}
    </div>
  );
}

export function FlowNotice({ children }: { children: ReactNode }) {
  return (
    <div className="flex items-start gap-2 rounded-wobbly-md border-2 border-dashed border-brand-orange bg-brand-orange/10 px-3 py-2.5 text-sm font-semibold text-brand-black" role="alert">
      <span aria-hidden="true">!</span>
      <span>{children}</span>
    </div>
  );
}

export function FlowBackLink({ onClick, children }: { onClick: () => void; children: ReactNode }) {
  return (
    <button
      className="w-fit min-h-10 touch-manipulation rounded-wobbly-md px-1 text-sm font-bold text-brand-green-ink underline decoration-dashed underline-offset-4 focus-visible:outline focus-visible:outline-3 focus-visible:outline-dashed focus-visible:outline-brand-green-ink focus-visible:outline-offset-2"
      type="button"
      onClick={onClick}
    >
      {children}
    </button>
  );
}

const backToCartLabel = "← Back to cart";

export function SignUpPanel({ onSwitch, onBack, backLabel = backToCartLabel }: { onSwitch: () => void; onBack: () => void; backLabel?: string }) {
  const { signUp } = useCustomerAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    setNotice(null);
    const result = await signUp({ name, email, password, phone });
    setBusy(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    if (result.needsConfirmation) {
      setNotice("Almost there! We sent a confirmation email. Check your inbox, then sign in to continue.");
      return;
    }
  }

  return (
    <div className="grid flex-1 content-start gap-4 overflow-y-auto px-4 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-5 sm:px-5">
      <div className="grid gap-2">
        <h3 className="font-primary text-2xl font-bold text-brand-black">Create your account</h3>
        <p className="max-w-86 text-sm leading-snug text-brand-black/68">Sign up to place orders. Your profile is recorded in the admin customers section.</p>
      </div>
      <form className="grid gap-3" onSubmit={(event) => void handleSubmit(event)}>
        <Field label="Full name" htmlFor="checkout-signup-name">
          <input className={inputClasses} id="checkout-signup-name" type="text" autoComplete="name" required value={name} onChange={(event) => setName(event.target.value)} />
        </Field>
        <Field label="Email" htmlFor="checkout-signup-email">
          <input className={inputClasses} id="checkout-signup-email" type="email" autoComplete="email" required value={email} onChange={(event) => setEmail(event.target.value)} />
        </Field>
        <Field label="Phone (optional)" htmlFor="checkout-signup-phone">
          <input className={inputClasses} id="checkout-signup-phone" type="tel" autoComplete="tel" value={phone} onChange={(event) => setPhone(event.target.value)} />
        </Field>
        <Field label="Password" htmlFor="checkout-signup-password">
          <input className={inputClasses} id="checkout-signup-password" type="password" autoComplete="new-password" required minLength={6} value={password} onChange={(event) => setPassword(event.target.value)} />
        </Field>
        {error ? <FlowNotice>{error}</FlowNotice> : null}
        {notice ? <FlowNotice>{notice}</FlowNotice> : null}
        <button className={`${btnPrimaryLg} w-full`} type="submit" disabled={busy}>{busy ? "Creating account..." : "Create account and continue"}</button>
      </form>
      <div className="grid gap-1">
        <p className="text-sm text-brand-black/68">Already have an account? <button className="min-h-8 font-bold text-brand-green-ink underline decoration-dashed underline-offset-4" type="button" onClick={onSwitch}>Sign in</button></p>
        <FlowBackLink onClick={onBack}>{backLabel}</FlowBackLink>
      </div>
    </div>
  );
}

export function SignInPanel({ onSwitch, onBack, backLabel = backToCartLabel }: { onSwitch: () => void; onBack: () => void; backLabel?: string }) {
  const { signIn } = useCustomerAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    const result = await signIn({ email, password });
    setBusy(false);
    if (!result.ok) setError(result.error);
  }

  return (
    <div className="grid flex-1 content-start gap-4 overflow-y-auto px-4 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-5 sm:px-5">
      <div className="grid gap-2">
        <h3 className="font-primary text-2xl font-bold text-brand-black">Welcome back</h3>
        <p className="max-w-86 text-sm leading-snug text-brand-black/68">Sign in to continue to checkout.</p>
      </div>
      <form className="grid gap-3" onSubmit={(event) => void handleSubmit(event)}>
        <Field label="Email" htmlFor="checkout-login-email">
          <input className={inputClasses} id="checkout-login-email" type="email" autoComplete="email" required value={email} onChange={(event) => setEmail(event.target.value)} />
        </Field>
        <Field label="Password" htmlFor="checkout-login-password">
          <input className={inputClasses} id="checkout-login-password" type="password" autoComplete="current-password" required value={password} onChange={(event) => setPassword(event.target.value)} />
        </Field>
        {error ? <FlowNotice>{error}</FlowNotice> : null}
        <button className={`${btnPrimaryLg} w-full`} type="submit" disabled={busy}>{busy ? "Signing in..." : "Sign in and continue"}</button>
      </form>
      <div className="grid gap-1">
        <p className="text-sm text-brand-black/68">New to Zama? <button className="min-h-8 font-bold text-brand-green-ink underline decoration-dashed underline-offset-4" type="button" onClick={onSwitch}>Create an account</button></p>
        <FlowBackLink onClick={onBack}>{backLabel}</FlowBackLink>
      </div>
    </div>
  );
}

export function AuthGate({ mode, onSignUp, onSignIn, onBack }: {
  mode: "checkout" | "standalone";
  onSignUp: () => void;
  onSignIn: () => void;
  onBack: () => void;
}) {
  const copy = mode === "checkout"
    ? {
        heading: "Sign in to check out",
        description: "You'll need an account to place an order. Sign up or sign in — your details are saved to your Zama account and show up in the admin customers list.",
        footnote: "Your cart stays here while you decide — nothing is lost.",
        backLabel: "← Back to cart",
      }
    : {
        heading: "Sign in to Zama",
        description: "Create an account to place orders and keep your delivery details ready. Your details are saved to your Zama account.",
        footnote: "No payment is needed to create an account.",
        backLabel: "Close",
      };

  return (
    <div className="grid flex-1 content-start gap-4 px-4 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-5 sm:px-5">
      <div className="grid gap-2">
        <h3 className="font-primary text-2xl font-bold text-brand-black">{copy.heading}</h3>
        <p className="max-w-86 text-sm leading-snug text-brand-black/68">{copy.description}</p>
      </div>
      <div className="grid gap-3">
        <button className={`${btnPrimaryLg} w-full`} type="button" onClick={onSignUp}>Create an account</button>
        <button className={`${btnOutlineSm} w-full`} type="button" onClick={onSignIn}>Sign in</button>
      </div>
      <p className="text-xs text-brand-black/58">{copy.footnote}</p>
      <FlowBackLink onClick={onBack}>{copy.backLabel}</FlowBackLink>
    </div>
  );
}

function SignedInPanel({ profile, onClose }: { profile: CustomerProfile; onClose: () => void }) {
  return (
    <div className="grid flex-1 place-content-center justify-items-center gap-4 px-5 text-center">
      <div className="brand-pattern grid h-24 w-24 place-items-center rounded-full border-3 border-dashed border-brand-forest text-brand-forest">
        <svg width="44" height="44" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="M5 12.5l4.5 4.5L19 7.5" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
      <div>
        <h3 className="font-primary text-2xl font-bold text-brand-black">You're signed in</h3>
        <p className="mx-auto mt-1 max-w-72 text-sm leading-snug text-brand-black/68">
          Welcome, <span className="font-bold text-brand-green-ink">{profile.name || profile.email}</span>. Add a fresh box or meal kit to your cart, then head to checkout.
        </p>
      </div>
      <button className={`${btnPrimaryLg} w-full`} type="button" onClick={onClose}>Done</button>
    </div>
  );
}

export function AuthPane({ onClose }: { onClose: () => void }) {
  const { status, profile } = useCustomerAuth();
  const [step, setStep] = useState<"gate" | "signup" | "login">("gate");

  if (status === "bootstrapping") {
    return (
      <div className="grid flex-1 place-content-center justify-items-center gap-3 px-5 text-center">
        <p className="text-sm font-semibold text-brand-black/68">Checking your account...</p>
      </div>
    );
  }

  if (status === "signed-in" && profile) {
    return <SignedInPanel profile={profile} onClose={onClose} />;
  }

  if (step === "signup") {
    return <SignUpPanel onSwitch={() => setStep("login")} onBack={onClose} backLabel="Close" />;
  }

  if (step === "login") {
    return <SignInPanel onSwitch={() => setStep("signup")} onBack={onClose} backLabel="Close" />;
  }

  return (
    <AuthGate
      mode="standalone"
      onSignUp={() => setStep("signup")}
      onSignIn={() => setStep("login")}
      onBack={onClose}
    />
  );
}
