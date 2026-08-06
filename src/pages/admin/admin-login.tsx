import { useState, type FormEvent } from "react";
import { useAdminAuth } from "../../admin/admin-auth";
import { btnOutlineSm, btnPrimaryLg } from "../../components/ui/styles";

const inputClasses =
  "min-h-11.5 w-full rounded-[18px_12px_16px_10px/12px_18px_10px_16px] border-3 border-brand-forest bg-brand-white px-4 py-[0.65rem] text-brand-black shadow-brand-soft outline-none placeholder:text-brand-black/46 focus-visible:border-brand-green-ink focus-visible:ring-4 focus-visible:ring-brand-leaf/20";

export function AdminLogin() {
  const { signIn, error } = useAdminAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setSubmitError(null);
    const result = await signIn(email, password);
    setBusy(false);
    if (!result.ok) setSubmitError(result.error);
  }

  return (
    <section className="grid min-h-screen place-items-center px-4 py-10" aria-labelledby="admin-login-title">
      <div className="w-full max-w-105 rounded-[30px_40px_26px_36px/36px_26px_40px_30px] border-3 border-brand-forest bg-brand-warm-white p-6 shadow-brand-big sm:p-8">
        <div className="grid gap-2 text-center">
          <div className="flex justify-center"><span className="inline-flex rounded-full border-2 border-brand-forest bg-brand-yellow px-3 py-1 text-xs font-bold uppercase tracking-[0.1em] text-brand-black">Owner only</span></div>
          <h1 id="admin-login-title" className="font-primary text-[clamp(1.7rem,4vw,2.4rem)] font-bold leading-[1.02] text-brand-green-ink">Zama admin</h1>
          <p className="text-sm text-brand-black/68">Sign in with your Supabase account to manage content.</p>
        </div>

        <form className="mt-6 grid gap-4" onSubmit={handleSubmit}>
          <div className="grid gap-1.5">
            <label htmlFor="admin-email" className="text-xs font-bold uppercase tracking-[0.1em] text-brand-green-ink">Email</label>
            <input id="admin-email" className={inputClasses} type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div className="grid gap-1.5">
            <label htmlFor="admin-password" className="text-xs font-bold uppercase tracking-[0.1em] text-brand-green-ink">Password</label>
            <input id="admin-password" className={inputClasses} type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>

          {(submitError || error) ? (
            <p className="rounded-wobbly-md border-2 border-dashed border-brand-orange bg-brand-orange/10 px-3 py-2 text-sm font-semibold text-brand-black" role="alert">{submitError ?? error}</p>
          ) : null}

          <button className={`${btnPrimaryLg} w-full justify-center`} type="submit" disabled={busy}>
            {busy ? "Signing in..." : "Sign in"}
          </button>
        </form>

        <a className={`${btnOutlineSm} mx-auto mt-4 block w-fit`} href="#/">← Back to site</a>
      </div>
    </section>
  );
}
