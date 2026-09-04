import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Check, ChevronRight, History, Landmark, WalletCards, X } from "lucide-react";
import { loadCustomerPreferences, type CustomerPreferences, type WalletTransaction } from "../account-preferences";
import { useCart } from "../cart-context";
import { useCustomerAuth } from "../checkout/customer-auth";
import { inputClasses } from "../components/shop/auth-pane";
import { btnOutlineSm, btnPrimarySm } from "../components/ui/styles";

type WalletView = "overview" | "history";

const bankOptions = [
  { id: "bob", shortName: "BoB", name: "Bank of Bhutan" },
  { id: "bnb", shortName: "BNB", name: "Bhutan National Bank" },
  { id: "druk-pnb", shortName: "DK", name: "Druk PNB Bank" },
  { id: "t-bank", shortName: "T", name: "T-Bank" },
  { id: "bdbl", shortName: "BDBL", name: "Bhutan Development Bank" },
];

function formatMoney(amount: number): string {
  return `Nu. ${new Intl.NumberFormat("en-BT").format(amount)}`;
}

function formatDate(date: string): string {
  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) return date;
  return new Intl.DateTimeFormat("en-BT", { day: "numeric", month: "short", year: "numeric" }).format(parsed);
}

function maskPhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.length < 4) return "your registered phone number";
  return `•••• ${digits.slice(-4)}`;
}

function transactionLabel(transaction: WalletTransaction): string {
  return transaction.type === "withdrawal" ? "Withdrawal" : "Wallet credit";
}

export function AccountWalletPage() {
  const { status, profile, signOut } = useCustomerAuth();
  const { openAuth } = useCart();
  const [preferences, setPreferences] = useState<CustomerPreferences>(() => loadCustomerPreferences(profile?.email ?? ""));
  const [walletView, setWalletView] = useState<WalletView>("overview");
  const [withdrawOpen, setWithdrawOpen] = useState(false);
  const [selectedBank, setSelectedBank] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [withdrawNotice, setWithdrawNotice] = useState<string | null>(null);

  useEffect(() => {
    if (profile) setPreferences(loadCustomerPreferences(profile.email));
  }, [profile]);

  const walletHistory = preferences.walletHistory;
  const walletBalance = useMemo(() => walletHistory.reduce((balance, transaction) => {
    if (transaction.status !== "completed") return balance;
    return transaction.type === "credit" ? balance + transaction.amount : Math.max(0, balance - transaction.amount);
  }, 0), [walletHistory]);

  function openWithdraw() {
    setWithdrawNotice(null);
    setOtp("");
    setOtpSent(false);
    setWithdrawOpen(true);
  }

  function sendOtp() {
    if (!selectedBank || accountNumber.trim().length < 4) {
      setWithdrawNotice("Choose a bank and enter a valid account number first.");
      return;
    }
    setOtpSent(true);
    setOtp("");
    setWithdrawNotice(`Enter the 6-digit OTP sent to ${maskPhone(profile?.phone ?? "")}.`);
  }

  function submitWithdraw(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (walletBalance <= 0) {
      setWithdrawNotice("There is no available wallet balance to withdraw yet.");
      return;
    }
    if (!selectedBank || accountNumber.trim().length < 4) {
      setWithdrawNotice("Choose a bank and enter a valid account number.");
      return;
    }
    if (!otpSent || !/^\d{6}$/.test(otp)) {
      setWithdrawNotice("Enter the 6-digit OTP sent to your registered phone number.");
      return;
    }
    setWithdrawNotice("Withdrawal requests will be available once wallet payouts are connected.");
  }

  if (status === "bootstrapping") {
    return <section className="mx-auto grid min-h-[60vh] max-w-180 place-content-center justify-items-center gap-3 px-4 py-16 text-center"><WalletCards className="h-9 w-9 text-brand-orange-ink" /><p className="font-semibold text-brand-black/68">Checking your wallet...</p></section>;
  }

  if (status !== "signed-in" || !profile) {
    return <section className="mx-auto grid min-h-[65vh] w-full max-w-180 place-content-center gap-5 px-4 py-16 text-center sm:px-6"><div className="mx-auto grid h-20 w-20 place-items-center rounded-full border-3 border-brand-forest bg-brand-yellow text-brand-green-ink shadow-brand-soft"><WalletCards className="h-9 w-9" /></div><div className="grid gap-2"><span className="text-xs font-bold uppercase tracking-[0.12em] text-brand-orange-ink">Your Zama wallet</span><h1 className="font-primary text-[clamp(2rem,5vw,3.2rem)] font-bold leading-none text-brand-green-ink">Sign in to open your wallet.</h1><p className="text-[1.05rem] leading-relaxed text-brand-black/68">Your wallet balance, withdrawal destinations, and history are available inside your account.</p></div><div><button className={btnPrimarySm} type="button" onClick={openAuth}>Create an account or sign in</button></div></section>;
  }

  return (
    <div className="mx-auto grid w-full max-w-[90rem] gap-5 px-4 pb-12 pt-6 sm:px-6 lg:px-10">
      <div className="flex flex-wrap items-center justify-between gap-3"><a className="inline-flex min-h-10 items-center gap-1 font-bold text-brand-green-ink underline decoration-dashed underline-offset-4 hover:text-brand-forest" href="#/account">← Back to account</a><button className={btnOutlineSm} type="button" onClick={() => void signOut()}>Sign out</button></div>

      <section className="relative overflow-hidden rounded-[28px_20px_32px_24px/22px_32px_20px_28px] border-3 border-brand-forest bg-brand-mint p-5 shadow-brand-big sm:p-7" aria-labelledby="wallet-title">
        <div className="pointer-events-none absolute -right-10 -top-14 h-48 w-48 rounded-full border-[22px] border-brand-white/45" />
        <div className="relative grid gap-5">
          <div className="flex flex-wrap items-start justify-between gap-4"><div className="flex items-center gap-3"><span className="grid h-13 w-13 place-items-center rounded-full border-3 border-brand-forest bg-brand-yellow text-brand-green-ink"><WalletCards className="h-6 w-6" /></span><div className="grid gap-1"><span className="text-xs font-bold uppercase tracking-[0.12em] text-brand-orange-ink">Zama wallet</span><h1 id="wallet-title" className="font-primary text-[clamp(2rem,5vw,3.4rem)] font-bold leading-none text-brand-green-ink">{formatMoney(walletBalance)}</h1><span className="text-sm text-brand-black/68">Available wallet balance</span></div></div><button className="inline-flex min-h-10 items-center gap-2 rounded-wobbly-md border-2 border-brand-forest bg-brand-forest px-4 py-2 text-sm font-bold text-brand-white hover:bg-brand-leaf" type="button" onClick={openWithdraw}><WalletCards className="h-4 w-4" />Withdraw</button></div>
          <div className="border-t-2 border-dashed border-brand-forest/20 pt-4"><button className="flex w-full items-center gap-2 text-left hover:text-brand-orange-ink" type="button" onClick={() => { setWalletView("history"); requestAnimationFrame(() => document.getElementById("wallet-history")?.scrollIntoView({ behavior: "smooth", block: "start" })); }}><span className="inline-flex items-center gap-2 text-sm font-bold text-brand-green-ink"><History className="h-4 w-4" />History</span><strong className="ml-auto font-primary text-xl text-brand-green-ink">{walletHistory.length || "—"}</strong><ChevronRight className="h-4 w-4 shrink-0 text-brand-forest" /></button></div>
        </div>
      </section>

      {withdrawOpen ? <section className="grid gap-4 rounded-wobbly-card border-3 border-brand-forest bg-brand-white p-5 shadow-brand-soft" aria-labelledby="withdraw-title" role="dialog" aria-modal="true">
        <div className="flex items-start justify-between gap-3"><div className="grid gap-1"><span className="text-xs font-bold uppercase tracking-[0.1em] text-brand-orange-ink">Withdraw wallet balance</span><h2 id="withdraw-title" className="font-primary text-2xl font-bold text-brand-green-ink">Choose your bank account</h2><p className="text-sm text-brand-black/68">Select where you’d like your wallet balance sent.</p></div><button className="grid h-9 w-9 place-items-center rounded-full border-2 border-brand-forest/20 text-brand-green-ink hover:bg-brand-yellow" type="button" aria-label="Close withdrawal options" onClick={() => setWithdrawOpen(false)}><X className="h-4 w-4" /></button></div>
        <form className="grid gap-4" onSubmit={submitWithdraw}>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">{bankOptions.map((bank) => { const selected = selectedBank === bank.id; return <button className={`flex items-center gap-3 rounded-wobbly-md border-2 p-3 text-left ${selected ? "border-brand-forest bg-brand-yellow" : "border-brand-forest/15 bg-brand-warm-white hover:border-brand-forest hover:bg-brand-mint"}`} key={bank.id} type="button" aria-pressed={selected} onClick={() => { setSelectedBank(bank.id); setOtpSent(false); setOtp(""); }}><span className="grid h-10 w-10 shrink-0 place-items-center rounded-full border-2 border-brand-forest bg-brand-white text-xs font-bold text-brand-green-ink">{bank.shortName}</span><span className="grid min-w-0 gap-0.5"><strong className="truncate text-sm text-brand-green-ink">{bank.name}</strong><span className="text-xs text-brand-black/56">Bank account</span></span>{selected ? <Check className="ml-auto h-4 w-4 shrink-0 text-brand-green-ink" /> : null}</button>; })}</div>
          <label className="grid gap-1.5 text-xs font-bold uppercase tracking-[0.1em] text-brand-green-ink">Account number<input className={inputClasses} value={accountNumber} onChange={(event) => { setAccountNumber(event.target.value); setOtpSent(false); setOtp(""); }} placeholder="Enter your bank account number" inputMode="numeric" /></label>
          <div className="grid gap-2 sm:grid-cols-[1fr_auto] sm:items-end"><label className="grid gap-1.5 text-xs font-bold uppercase tracking-[0.1em] text-brand-green-ink">One-time password (OTP)<input className={inputClasses} value={otp} onChange={(event) => setOtp(event.target.value.replace(/\D/g, "").slice(0, 6))} placeholder="Enter 6-digit OTP" inputMode="numeric" maxLength={6} autoComplete="one-time-code" /></label><button className={btnOutlineSm} type="button" disabled={!selectedBank || accountNumber.trim().length < 4} onClick={sendOtp}>{otpSent ? "Resend OTP" : "Send OTP"}</button></div>
          {otpSent ? <p className="text-sm text-brand-black/68">OTP sent to {maskPhone(profile.phone)}. It expires soon.</p> : <p className="text-sm text-brand-black/56">We’ll send a verification code to the phone number registered with your bank account.</p>}
          {walletBalance <= 0 ? <p className="rounded-wobbly-md border-2 border-dashed border-brand-orange bg-brand-yellow/35 p-3 text-sm text-brand-black/68">Your wallet balance is currently Nu. 0. Bank options are ready for when funds are added.</p> : null}
          {withdrawNotice ? <p className="rounded-wobbly-md border-2 border-dashed border-brand-orange bg-brand-orange/10 p-3 text-sm font-semibold text-brand-black" role="status">{withdrawNotice}</p> : null}
          <div className="flex flex-wrap justify-end gap-2"><button className={btnOutlineSm} type="button" onClick={() => setWithdrawOpen(false)}>Cancel</button><button className={btnPrimarySm} type="submit" disabled={walletBalance <= 0 || !selectedBank || accountNumber.trim().length < 4 || !otpSent || !/^\d{6}$/.test(otp)}>Request withdrawal</button></div>
        </form>
      </section> : null}

      {walletView === "history" ? <section id="wallet-history" className="grid gap-4 rounded-wobbly-card border-3 border-brand-forest bg-brand-white p-5 shadow-brand-soft" aria-labelledby="wallet-history-title">
        <div className="flex flex-wrap items-end justify-between gap-3"><div className="grid gap-1"><span className="text-xs font-bold uppercase tracking-[0.1em] text-brand-orange-ink">Wallet activity</span><h2 id="wallet-history-title" className="font-primary text-2xl font-bold text-brand-green-ink">Wallet history</h2></div><button className={btnOutlineSm} type="button" onClick={() => setWalletView("overview")}>Back to wallet</button></div>
        {walletHistory.length === 0 ? <div className="grid justify-items-center gap-3 rounded-wobbly-md border-2 border-dashed border-brand-forest/20 bg-brand-warm-white p-8 text-center"><History className="h-9 w-9 text-brand-forest/65" /><h3 className="font-primary text-xl font-bold text-brand-green-ink">No wallet activity yet</h3><p className="max-w-120 text-sm text-brand-black/68">Wallet credits and completed withdrawals will appear here.</p></div> : <div className="grid gap-2">{walletHistory.map((transaction) => <div className="flex items-center gap-3 rounded-wobbly-md border-2 border-brand-forest/12 bg-brand-warm-white p-3" key={transaction.id}><span className={`grid h-10 w-10 shrink-0 place-items-center rounded-full border-2 border-brand-forest ${transaction.type === "credit" ? "bg-brand-mint" : "bg-brand-buff"} text-brand-green-ink`}>{transaction.type === "credit" ? <WalletCards className="h-4 w-4" /> : <Landmark className="h-4 w-4" />}</span><span className="grid min-w-0 flex-1 gap-0.5"><strong className="text-sm text-brand-green-ink">{transactionLabel(transaction)}</strong><span className="truncate text-xs text-brand-black/56">{transaction.description} · {formatDate(transaction.date)}</span></span><strong className={`shrink-0 text-sm ${transaction.type === "credit" ? "text-brand-green-ink" : "text-brand-orange-ink"}`}>{transaction.type === "credit" ? "+" : "-"}{formatMoney(transaction.amount)}</strong></div>)}</div>}
      </section> : <section className="grid gap-3 rounded-wobbly-card border-3 border-dashed border-brand-forest/20 bg-brand-warm-white p-5" aria-label="Wallet help"><div className="flex items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-full border-2 border-brand-forest bg-brand-yellow text-brand-green-ink"><Landmark className="h-5 w-5" /></span><div className="grid gap-0.5"><strong className="text-brand-green-ink">Wallet payouts</strong><span className="text-sm text-brand-black/68">Use Withdraw to choose a Bhutanese bank account when your wallet has available funds.</span></div></div><button className="justify-self-start text-sm font-bold text-brand-green-ink underline decoration-dashed underline-offset-4" type="button" onClick={() => { setWalletView("history"); requestAnimationFrame(() => document.getElementById("wallet-history")?.scrollIntoView({ behavior: "smooth", block: "start" })); }}>View wallet history →</button></section>}
    </div>
  );
}
