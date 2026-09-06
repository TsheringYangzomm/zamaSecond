import { useEffect, useState, type FormEvent } from "react";
import { Check, ChevronRight, History, Landmark, WalletCards, X } from "lucide-react";
import { fetchAccountRewards, requestWalletWithdrawal, requestWithdrawalOtp, saveBankAccount } from "../account-rewards/account-rewards-api";
import { bankDirectory, type AccountRewardsSnapshot, type BankCode, type WalletLedgerEntry } from "../account-rewards/account-rewards-types";
import { useCart } from "../cart-context";
import { useCustomerAuth } from "../checkout/customer-auth";
import { inputClasses } from "../components/shop/auth-pane";
import { btnOutlineSm, btnPrimarySm } from "../components/ui/styles";

type WalletView = "overview" | "history";

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

function transactionLabel(transaction: WalletLedgerEntry): string {
  if (transaction.type === "withdrawal") return "Withdrawal";
  if (transaction.type === "hold") return "Withdrawal hold";
  if (transaction.type === "release") return "Released funds";
  return "Wallet credit";
}

function transactionIsCredit(transaction: WalletLedgerEntry): boolean {
  return transaction.type === "credit" || transaction.type === "release";
}

export function AccountWalletPage() {
  const { status, profile, signOut } = useCustomerAuth();
  const { openAuth } = useCart();
  const [snapshot, setSnapshot] = useState<AccountRewardsSnapshot | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [walletView, setWalletView] = useState<WalletView>("overview");
  const [withdrawOpen, setWithdrawOpen] = useState(false);
  const [selectedBankCode, setSelectedBankCode] = useState<BankCode>("bob");
  const [selectedBankAccountId, setSelectedBankAccountId] = useState("");
  const [accountName, setAccountName] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [withdrawAmount, setWithdrawAmount] = useState(0);
  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [withdrawNotice, setWithdrawNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!profile) return;
    let active = true;
    setSnapshot(null);
    setLoadError(null);
    void fetchAccountRewards(profile.email).then((next) => { if (active) setSnapshot(next); }).catch((error) => { if (active) setLoadError(error instanceof Error ? error.message : "Your wallet could not be loaded."); });
    return () => { active = false; };
  }, [profile]);

  const walletHistory = snapshot?.walletLedger ?? [];
  const walletBalance = snapshot?.walletBalance ?? 0;
  const bankAccounts = snapshot?.bankAccounts ?? [];
  const withdrawals = snapshot?.withdrawals ?? [];

  function openWithdraw() {
    const defaultAccount = bankAccounts.find((account) => account.isDefault) ?? bankAccounts[0];
    setSelectedBankAccountId(defaultAccount?.id ?? "");
    setSelectedBankCode(defaultAccount?.bankCode ?? "bob");
    setAccountName(defaultAccount?.accountName ?? profile?.name ?? "");
    setAccountNumber("");
    setWithdrawAmount(walletBalance);
    setWithdrawNotice(null);
    setOtp("");
    setOtpSent(false);
    setWithdrawOpen(true);
  }

  async function ensureBankAccount(): Promise<{ snapshot: AccountRewardsSnapshot; id: string }> {
    if (!profile) throw new Error("Sign in to manage a bank account.");
    if (selectedBankAccountId) {
      if (!snapshot) throw new Error("Your wallet is still loading.");
      return { snapshot, id: selectedBankAccountId };
    }
    if (accountNumber.trim().length < 4) throw new Error("Enter a valid bank account number first.");
    const next = await saveBankAccount(profile.email, { bankCode: selectedBankCode, accountName: accountName.trim() || profile.name, accountNumber: accountNumber.trim(), isDefault: bankAccounts.length === 0 });
    const saved = next.bankAccounts.find((account) => account.bankCode === selectedBankCode && account.accountName === (accountName.trim() || profile.name)) ?? next.bankAccounts[0];
    if (!saved) throw new Error("The bank account could not be saved.");
    setSnapshot(next);
    setSelectedBankAccountId(saved.id);
    return { snapshot: next, id: saved.id };
  }

  async function sendOtp() {
    if (!profile || busy) return;
    setBusy(true);
    setWithdrawNotice(null);
    try {
      const bank = await ensureBankAccount();
      const result = await requestWithdrawalOtp(profile.email, bank.id);
      setSnapshot(result.snapshot);
      setOtpSent(result.sent);
      setOtp("");
      setWithdrawNotice(result.sent ? `Enter the 6-digit OTP sent to ${maskPhone(profile.phone)}.` : (result.message ?? "OTP delivery is not configured yet. Withdrawals are unavailable until an SMS provider is connected."));
    } catch (error) {
      setWithdrawNotice(error instanceof Error ? error.message : "The OTP could not be requested.");
    } finally {
      setBusy(false);
    }
  }

  async function submitWithdraw(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!profile || busy) return;
    if (walletBalance <= 0) {
      setWithdrawNotice("There is no available wallet balance to withdraw yet.");
      return;
    }
    if (withdrawAmount <= 0 || withdrawAmount > walletBalance) {
      setWithdrawNotice("Enter an amount within your available wallet balance.");
      return;
    }
    if (!otpSent || !/^\d{6}$/.test(otp)) {
      setWithdrawNotice("Enter the 6-digit OTP sent to your registered phone number.");
      return;
    }
    setBusy(true);
    setWithdrawNotice(null);
    try {
      const bank = await ensureBankAccount();
      setSnapshot(await requestWalletWithdrawal(profile.email, { bankAccountId: bank.id, amount: withdrawAmount, otp }));
      setWithdrawOpen(false);
      setOtpSent(false);
      setOtp("");
      setWithdrawNotice("Withdrawal requested. Your request is reserved and waiting for admin approval.");
    } catch (error) {
      setWithdrawNotice(error instanceof Error ? error.message : "Your withdrawal could not be requested.");
    } finally {
      setBusy(false);
    }
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

      {loadError ? <p className="rounded-wobbly-md border-2 border-dashed border-brand-orange bg-brand-orange/10 p-3 text-sm font-semibold text-brand-black" role="alert">{loadError}</p> : null}
      {withdrawNotice && !withdrawOpen ? <p className="rounded-wobbly-md border-2 border-brand-forest bg-brand-mint p-3 text-sm font-semibold text-brand-green-ink" role="status">{withdrawNotice}</p> : null}

      {withdrawOpen ? <section className="grid gap-4 rounded-wobbly-card border-3 border-brand-forest bg-brand-white p-5 shadow-brand-soft" aria-labelledby="withdraw-title" role="dialog" aria-modal="true">
        <div className="flex items-start justify-between gap-3"><div className="grid gap-1"><span className="text-xs font-bold uppercase tracking-[0.1em] text-brand-orange-ink">Withdraw wallet balance</span><h2 id="withdraw-title" className="font-primary text-2xl font-bold text-brand-green-ink">Choose your bank account</h2><p className="text-sm text-brand-black/68">Funds are reserved immediately and paid after admin approval.</p></div><button className="grid h-9 w-9 place-items-center rounded-full border-2 border-brand-forest/20 text-brand-green-ink hover:bg-brand-yellow" type="button" aria-label="Close withdrawal options" onClick={() => setWithdrawOpen(false)}><X className="h-4 w-4" /></button></div>
        <form className="grid gap-4" onSubmit={(event) => void submitWithdraw(event)}>
          {bankAccounts.length > 0 ? <div className="grid gap-2"><span className="text-xs font-bold uppercase tracking-[0.1em] text-brand-green-ink">Saved bank accounts</span><div className="grid gap-2 sm:grid-cols-2">{bankAccounts.map((account) => <button className={`flex items-center gap-3 rounded-wobbly-md border-2 p-3 text-left ${selectedBankAccountId === account.id ? "border-brand-forest bg-brand-yellow" : "border-brand-forest/15 bg-brand-warm-white hover:border-brand-forest hover:bg-brand-mint"}`} key={account.id} type="button" aria-pressed={selectedBankAccountId === account.id} onClick={() => { setSelectedBankAccountId(account.id); setSelectedBankCode(account.bankCode); setAccountName(account.accountName); setAccountNumber(""); setOtpSent(false); setOtp(""); }}><span className="grid h-10 w-10 shrink-0 place-items-center rounded-full border-2 border-brand-forest bg-brand-white text-xs font-bold text-brand-green-ink">{bankDirectory[account.bankCode]?.shortName ?? account.bankCode}</span><span className="grid min-w-0 gap-0.5"><strong className="truncate text-sm text-brand-green-ink">{account.accountName}</strong><span className="text-xs text-brand-black/56">{account.bankName} · {account.maskedAccountNumber}</span></span>{selectedBankAccountId === account.id ? <Check className="ml-auto h-4 w-4 shrink-0 text-brand-green-ink" /> : null}</button>)}</div></div> : null}
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5">{(Object.entries(bankDirectory) as [BankCode, { shortName: string; name: string }][]).map(([code, bank]) => { const selected = !selectedBankAccountId && selectedBankCode === code; return <button className={`flex items-center gap-2 rounded-wobbly-md border-2 p-3 text-left ${selected ? "border-brand-forest bg-brand-yellow" : "border-brand-forest/15 bg-brand-warm-white hover:border-brand-forest hover:bg-brand-mint"}`} key={code} type="button" aria-pressed={selected} onClick={() => { setSelectedBankAccountId(""); setSelectedBankCode(code); setOtpSent(false); setOtp(""); }}><span className="grid h-8 w-8 shrink-0 place-items-center rounded-full border-2 border-brand-forest bg-brand-white text-[0.65rem] font-bold text-brand-green-ink">{bank.shortName}</span><span className="truncate text-xs font-bold text-brand-green-ink">{bank.name}</span></button>; })}</div>
          {!selectedBankAccountId ? <><label className="grid gap-1.5 text-xs font-bold uppercase tracking-[0.1em] text-brand-green-ink">Account holder name<input className={inputClasses} value={accountName} onChange={(event) => setAccountName(event.target.value)} placeholder={profile.name} /></label><label className="grid gap-1.5 text-xs font-bold uppercase tracking-[0.1em] text-brand-green-ink">Account number<input className={inputClasses} value={accountNumber} onChange={(event) => { setAccountNumber(event.target.value); setOtpSent(false); setOtp(""); }} placeholder="Enter your bank account number" inputMode="numeric" /></label></> : <p className="rounded-wobbly-md border-2 border-brand-forest/15 bg-brand-warm-white p-3 text-sm text-brand-black/68">Using {bankAccounts.find((account) => account.id === selectedBankAccountId)?.bankName} account ending {bankAccounts.find((account) => account.id === selectedBankAccountId)?.maskedAccountNumber}.</p>}
          <label className="grid max-w-72 gap-1.5 text-xs font-bold uppercase tracking-[0.1em] text-brand-green-ink">Amount to withdraw<input className={inputClasses} type="number" min="1" max={walletBalance} step="1" value={withdrawAmount} onChange={(event) => setWithdrawAmount(Number(event.target.value))} /></label>
          <div className="grid gap-2 sm:grid-cols-[1fr_auto] sm:items-end"><label className="grid gap-1.5 text-xs font-bold uppercase tracking-[0.1em] text-brand-green-ink">One-time password (OTP)<input className={inputClasses} value={otp} onChange={(event) => setOtp(event.target.value.replace(/\D/g, "").slice(0, 6))} placeholder="Enter 6-digit OTP" inputMode="numeric" maxLength={6} autoComplete="one-time-code" /></label><button className={btnOutlineSm} type="button" disabled={busy || (!selectedBankAccountId && accountNumber.trim().length < 4)} onClick={() => void sendOtp()}>{busy ? "Working..." : otpSent ? "Resend OTP" : "Send OTP"}</button></div>
          {otpSent ? <p className="text-sm text-brand-black/68">OTP sent to {maskPhone(profile.phone)}. It expires soon.</p> : <p className="text-sm text-brand-black/56">We’ll verify the code against the phone registered with your bank account. OTP values are never shown to admins.</p>}
          {walletBalance <= 0 ? <p className="rounded-wobbly-md border-2 border-dashed border-brand-orange bg-brand-yellow/35 p-3 text-sm text-brand-black/68">Your wallet balance is currently Nu. 0. Bank options are ready for when funds are added.</p> : null}
          {withdrawNotice ? <p className="rounded-wobbly-md border-2 border-dashed border-brand-orange bg-brand-orange/10 p-3 text-sm font-semibold text-brand-black" role="status">{withdrawNotice}</p> : null}
          <div className="flex flex-wrap justify-end gap-2"><button className={btnOutlineSm} type="button" onClick={() => setWithdrawOpen(false)}>Cancel</button><button className={btnPrimarySm} type="submit" disabled={busy || walletBalance <= 0 || withdrawAmount <= 0 || withdrawAmount > walletBalance || !otpSent || !/^\d{6}$/.test(otp)}>Request withdrawal</button></div>
        </form>
      </section> : null}

      {walletView === "history" ? <section id="wallet-history" className="grid gap-4 rounded-wobbly-card border-3 border-brand-forest bg-brand-white p-5 shadow-brand-soft" aria-labelledby="wallet-history-title">
        <div className="flex flex-wrap items-end justify-between gap-3"><div className="grid gap-1"><span className="text-xs font-bold uppercase tracking-[0.1em] text-brand-orange-ink">Wallet activity</span><h2 id="wallet-history-title" className="font-primary text-2xl font-bold text-brand-green-ink">Wallet history</h2></div><button className={btnOutlineSm} type="button" onClick={() => setWalletView("overview")}>Back to wallet</button></div>
        {walletHistory.length === 0 ? <div className="grid justify-items-center gap-3 rounded-wobbly-md border-2 border-dashed border-brand-forest/20 bg-brand-warm-white p-8 text-center"><History className="h-9 w-9 text-brand-forest/65" /><h3 className="font-primary text-xl font-bold text-brand-green-ink">No wallet activity yet</h3><p className="max-w-120 text-sm text-brand-black/68">Wallet credits, holds, releases, and completed withdrawals will appear here.</p></div> : <div className="grid gap-2">{walletHistory.map((transaction) => { const credit = transactionIsCredit(transaction); return <div className="flex items-center gap-3 rounded-wobbly-md border-2 border-brand-forest/12 bg-brand-warm-white p-3" key={transaction.id}><span className={`grid h-10 w-10 shrink-0 place-items-center rounded-full border-2 border-brand-forest ${credit ? "bg-brand-mint" : "bg-brand-buff"} text-brand-green-ink`}>{credit ? <WalletCards className="h-4 w-4" /> : <Landmark className="h-4 w-4" />}</span><span className="grid min-w-0 flex-1 gap-0.5"><strong className="text-sm text-brand-green-ink">{transactionLabel(transaction)}</strong><span className="truncate text-xs text-brand-black/56">{transaction.description} · {formatDate(transaction.createdAt)} · {transaction.status}</span></span><strong className={`shrink-0 text-sm ${credit ? "text-brand-green-ink" : "text-brand-orange-ink"}`}>{credit ? "+" : "-"}{formatMoney(transaction.amount)}</strong></div>; })}</div>}
        {withdrawals.length > 0 ? <div className="grid gap-2 border-t-2 border-dashed border-brand-forest/15 pt-4"><h3 className="font-primary text-lg font-bold text-brand-green-ink">Withdrawal requests</h3>{withdrawals.map((withdrawal) => <div className="flex flex-wrap items-center gap-2 rounded-wobbly-md border-2 border-brand-forest/12 bg-brand-warm-white p-3" key={withdrawal.id}><span className="flex-1 text-sm font-bold text-brand-green-ink">{formatMoney(withdrawal.amount)}</span><span className="rounded-full border-2 border-brand-forest/20 bg-brand-white px-2 py-1 text-xs font-bold capitalize">{withdrawal.status}</span><span className="text-xs text-brand-black/56">{formatDate(withdrawal.requestedAt)}</span></div>)}</div> : null}
      </section> : <section className="grid gap-3 rounded-wobbly-card border-3 border-dashed border-brand-forest/20 bg-brand-warm-white p-5" aria-label="Wallet help"><div className="flex items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-full border-2 border-brand-forest bg-brand-yellow text-brand-green-ink"><Landmark className="h-5 w-5" /></span><div className="grid gap-0.5"><strong className="text-brand-green-ink">Wallet payouts</strong><span className="text-sm text-brand-black/68">Use Withdraw to choose a Bhutanese bank account when your wallet has available funds.</span></div></div><button className="justify-self-start text-sm font-bold text-brand-green-ink underline decoration-dashed underline-offset-4" type="button" onClick={() => { setWalletView("history"); requestAnimationFrame(() => document.getElementById("wallet-history")?.scrollIntoView({ behavior: "smooth", block: "start" })); }}>View wallet history →</button></section>}
    </div>
  );
}
