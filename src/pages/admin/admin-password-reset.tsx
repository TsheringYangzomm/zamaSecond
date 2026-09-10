import { useEffect, useState, type FormEvent } from "react";
import { KeyRound, ShieldCheck } from "lucide-react";
import { getSupabaseClient } from "../../supabase";
import { navigateTo } from "../../router";
import { btnOutlineSm, btnPrimaryLg } from "../../components/ui/styles";

const inputClasses =
  "min-h-11.5 w-full rounded-[18px_12px_16px_10px/12px_18px_10px_16px] border-3 border-brand-forest bg-brand-white px-4 py-[0.65rem] text-brand-black shadow-brand-soft outline-none placeholder:text-brand-black/46 focus-visible:border-brand-green-ink focus-visible:ring-4 focus-visible:ring-brand-leaf/20";

function redirectToAdmin() {
  navigateTo("/admin", true);
}

export function AdminPasswordResetPage() {
  const [email, setEmail] = useState<string | null>(null);
  const [checking, setChecking] = useState(true);
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const client = getSupabaseClient();
    if (!client) {
      setError("Supabase is not configured. This reset link cannot be completed here.");
      setChecking(false);
      return;
    }

    let active = true;
    const code = new URLSearchParams(window.location.search).get("code");
    const checkSession = async () => {
      if (code) {
        const { error: exchangeError } = await client.auth.exchangeCodeForSession(code);
        if (exchangeError) {
          if (active) setError("This password-reset link is invalid or has expired. Request a new one from Supabase.");
          if (active) setChecking(false);
          return;
        }
        window.history.replaceState(window.history.state, "", window.location.pathname);
      }

      const { data, error: sessionError } = await client.auth.getSession();
      if (!active) return;
      if (sessionError || !data.session) {
        setError("This password-reset link is invalid or has expired. Request a new one from Supabase.");
      } else {
        setEmail(data.session.user.email ?? null);
      }
      setChecking(false);
    };

    const { data: authListener } = client.auth.onAuthStateChange((_event, session) => {
      if (!active || !session) return;
      setEmail(session.user.email ?? null);
      setChecking(false);
      setError(null);
    });
    void checkSession();
    return () => {
      active = false;
      authListener.subscription.unsubscribe();
    };
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (password.length < 6) {
      setError("Use at least 6 characters for your new password.");
      return;
    }
    if (password !== confirmation) {
      setError("The passwords do not match.");
      return;
    }
    const client = getSupabaseClient();
    if (!client) {
      setError("Supabase is not configured.");
      return;
    }
    setBusy(true);
    setError(null);
    const { error: updateError } = await client.auth.updateUser({ password });
    setBusy(false);
    if (updateError) {
      setError(updateError.message);
      return;
    }
    setSaved(true);
  }

  return (
    <main className="admin-shell grid min-h-screen place-items-center px-4 py-10" aria-labelledby="admin-password-reset-title">
      <section className="w-full max-w-105 rounded-[30px_40px_26px_36px/36px_26px_40px_30px] border-3 border-brand-forest bg-brand-warm-white p-6 shadow-brand-big sm:p-8">
        <div className="grid gap-3 text-center">
          <div className="mx-auto grid h-14 w-14 place-items-center rounded-full border-3 border-brand-forest bg-brand-yellow text-brand-green-ink"><KeyRound className="h-7 w-7" aria-hidden="true" /></div>
          <h1 id="admin-password-reset-title" className="font-primary text-[clamp(1.7rem,4vw,2.4rem)] font-bold leading-[1.02] text-brand-green-ink">Set a new admin password</h1>
          <p className="text-sm leading-relaxed text-brand-black/68">{email ? `Update the password for ${email}.` : "Checking your secure reset link…"}</p>
        </div>

        {checking ? <p className="mt-6 rounded-wobbly-md border-2 border-dashed border-brand-forest/25 bg-brand-white px-3 py-3 text-center text-sm font-semibold text-brand-black/68">Verifying reset link…</p> : null}
        {saved ? (
          <div className="mt-6 grid gap-4 rounded-wobbly-md border-2 border-brand-forest/25 bg-brand-mint/40 p-4 text-center">
            <ShieldCheck className="mx-auto h-7 w-7 text-brand-green-ink" aria-hidden="true" />
            <p className="text-sm font-bold text-brand-green-ink">Password updated successfully.</p>
            <button className={`${btnPrimaryLg} w-full justify-center`} type="button" onClick={redirectToAdmin}>Continue to admin sign in</button>
          </div>
        ) : email && !checking ? (
          <form className="mt-6 grid gap-4" onSubmit={handleSubmit}>
            <div className="grid gap-1.5">
              <label htmlFor="admin-new-password" className="text-xs font-bold uppercase tracking-[0.1em] text-brand-green-ink">New password</label>
              <input id="admin-new-password" className={inputClasses} type="password" autoComplete="new-password" required minLength={6} value={password} onChange={(event) => setPassword(event.target.value)} />
            </div>
            <div className="grid gap-1.5">
              <label htmlFor="admin-confirm-password" className="text-xs font-bold uppercase tracking-[0.1em] text-brand-green-ink">Confirm new password</label>
              <input id="admin-confirm-password" className={inputClasses} type="password" autoComplete="new-password" required minLength={6} value={confirmation} onChange={(event) => setConfirmation(event.target.value)} />
            </div>
            {error ? <p className="rounded-wobbly-md border-2 border-dashed border-brand-orange bg-brand-orange/10 px-3 py-2 text-sm font-semibold text-brand-black" role="alert">{error}</p> : null}
            <button className={`${btnPrimaryLg} w-full justify-center`} type="submit" disabled={busy}>{busy ? "Updating password…" : "Update password"}</button>
          </form>
        ) : null}
        {!saved && !checking && !email && error ? <p className="mt-6 rounded-wobbly-md border-2 border-dashed border-brand-orange bg-brand-orange/10 px-3 py-2 text-center text-sm font-semibold text-brand-black" role="alert">{error}</p> : null}
        <a className={`${btnOutlineSm} mx-auto mt-4 block w-fit`} href="/admin">← Back to admin sign in</a>
      </section>
    </main>
  );
}
