import { useEffect, useRef, useState } from "react";
import { completeJaggleSignIn, startJaggleSignIn, type JaggleAuthAudience, type JaggleAuthStatus } from "../auth/jaggle-sso";
import { btnOutlineSm, btnPrimaryLg } from "../components/ui/styles";

function callbackParams() {
  const hash = window.location.hash;
  const query = hash.includes("?") ? hash.slice(hash.indexOf("?") + 1) : "";
  const params = new URLSearchParams(query);
  const audience: JaggleAuthAudience = params.get("audience") === "admin" ? "admin" : "customer";
  return { audience, ticket: params.get("ticket") ?? "", error: params.get("error") ?? "" };
}

function readableError(code: string): string {
  switch (code) {
    case "admin_not_allowed":
      return "This Jaggle account is not on the Zama admin allowlist.";
    case "identity_email_mismatch":
      return "This Jaggle identity is already linked to another email address.";
    case "missing_callback_data":
      return "Jaggle did not return a complete sign-in response.";
    default:
      return "We could not complete Jaggle sign-in. Please try again.";
  }
}

export function JaggleCallbackPage() {
  const initial = callbackParams();
  const [status, setStatus] = useState<JaggleAuthStatus>(initial.error || !initial.ticket ? "error" : "processing");
  const [error, setError] = useState(initial.error ? readableError(initial.error) : initial.ticket ? null : "The Jaggle sign-in link is missing.");
  const started = useRef(false);

  useEffect(() => {
    // Remove the opaque ticket from the visible URL as soon as it has been
    // captured. The one-time exchange still continues in this mounted view.
    window.history.replaceState(null, "", `${window.location.pathname}${window.location.search}`);
    if (!initial.ticket || initial.error || started.current) return;
    started.current = true;

    void completeJaggleSignIn(initial.ticket, initial.audience).then((result) => {
      if (!result.ok) {
        setStatus("error");
        setError(result.error ?? "We could not complete Jaggle sign-in. Please try again.");
        return;
      }
      setStatus("success");
      window.setTimeout(() => {
        window.location.hash = initial.audience === "admin" ? "#/admin" : "#/account";
      }, 150);
    });
  }, [initial.audience, initial.error, initial.ticket]);

  async function retry() {
    setStatus("processing");
    setError(null);
    const result = await startJaggleSignIn(initial.audience);
    if (!result.ok) {
      setStatus("error");
      setError(result.error ?? "We could not start Jaggle sign-in.");
    }
  }

  const label = initial.audience === "admin" ? "admin portal" : "your account";
  return (
    <main className="admin-shell grid min-h-screen place-items-center px-4 py-10">
      <section className="w-full max-w-105 rounded-[30px_40px_26px_36px/36px_26px_40px_30px] border-3 border-brand-forest bg-brand-warm-white p-6 text-center shadow-brand-big sm:p-8" aria-live="polite">
        <div className="mx-auto grid h-16 w-16 place-items-center rounded-full border-3 border-dashed border-brand-forest bg-brand-yellow text-3xl" aria-hidden="true">J</div>
        <p className="mt-5 text-xs font-bold uppercase tracking-[0.12em] text-brand-orange">Jaggle sign-in</p>
        {status === "processing" ? (
          <>
            <h1 className="mt-2 font-primary text-3xl font-bold text-brand-green-ink">Connecting your account…</h1>
            <p className="mt-3 text-sm text-brand-black/68">Verifying your secure sign-in and taking you to {label}.</p>
          </>
        ) : status === "success" ? (
          <>
            <h1 className="mt-2 font-primary text-3xl font-bold text-brand-green-ink">Sign-in complete</h1>
            <p className="mt-3 text-sm text-brand-black/68">Opening {label}…</p>
          </>
        ) : (
          <>
            <h1 className="mt-2 font-primary text-3xl font-bold text-brand-green-ink">Sign-in needs another try</h1>
            <p className="mt-3 text-sm text-brand-black/68">{error}</p>
            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              <button className={`${btnPrimaryLg} w-full justify-center`} type="button" onClick={() => void retry()}>Try Jaggle again</button>
              <a className={`${btnOutlineSm} w-full justify-center`} href="#/">Back to site</a>
            </div>
          </>
        )}
      </section>
    </main>
  );
}

