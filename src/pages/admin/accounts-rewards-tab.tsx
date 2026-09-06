import { useEffect, useMemo, useState } from "react";
import { Coins, Eye, History, Landmark, RefreshCw, Save, Star, Trash2, WalletCards } from "lucide-react";
import {
  adjustCustomerPoints,
  fetchAdminAccountDetails,
  listAdminAccountSummaries,
  removeSavedItem,
  revealAdminBankAccount,
  reviewPointsRedemption,
  reviewWithdrawal,
  saveRewardSettings,
  updateAdminCustomerProfile,
} from "../../account-rewards/account-rewards-api";
import type { AdminAccountDetails, AdminAccountSummary, RewardSettings } from "../../account-rewards/account-rewards-types";
import { useAdminAuth } from "../../admin/admin-auth";
import { btnOutlineSm, btnPrimarySm } from "../../components/ui/styles";
import { inputClasses, textAreaClasses } from "./admin-fields";

function formatMoney(value: number): string {
  return `Nu. ${new Intl.NumberFormat("en-BT").format(value)}`;
}

function formatDate(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value || "—" : new Intl.DateTimeFormat("en-BT", { day: "numeric", month: "short", year: "numeric" }).format(date);
}

function statusClass(status: string): string {
  if (["approved", "paid", "completed"].includes(status)) return "border-brand-forest bg-brand-mint text-brand-green-ink";
  if (["rejected", "failed"].includes(status)) return "border-brand-orange bg-brand-orange/15 text-brand-orange-ink";
  return "border-brand-orange-ink bg-brand-yellow text-brand-black";
}

export function AccountsRewardsTab() {
  const { email: adminEmail } = useAdminAuth();
  const [summaries, setSummaries] = useState<AdminAccountSummary[] | null>(null);
  const [selectedId, setSelectedId] = useState("");
  const [detail, setDetail] = useState<AdminAccountDetails | null>(null);
  const [query, setQuery] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [profileForm, setProfileForm] = useState({ name: "", phone: "", area: "", dzongkhag: "", address: "" });
  const [pointsDelta, setPointsDelta] = useState(0);
  const [pointsReason, setPointsReason] = useState("");
  const [settingsDraft, setSettingsDraft] = useState<RewardSettings | null>(null);
  const [revealed, setRevealed] = useState<Record<string, string>>({});

  async function loadSummaries() {
    setError(null);
    try {
      setSummaries(await listAdminAccountSummaries());
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Accounts and rewards could not be loaded. Apply the account rewards migration in Supabase first.");
    }
  }

  async function loadDetail(customerId: string) {
    setSelectedId(customerId);
    setError(null);
    try {
      const next = await fetchAdminAccountDetails(customerId);
      setDetail(next);
      setProfileForm(next.customer);
      setSettingsDraft(next.settings);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "The customer account could not be loaded.");
    }
  }

  useEffect(() => {
    void loadSummaries();
  }, []);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return (summaries ?? []).filter((summary) => !needle || `${summary.name} ${summary.email} ${summary.phone} ${summary.area}`.toLowerCase().includes(needle));
  }, [summaries, query]);

  async function refreshDetail() {
    if (!selectedId) return;
    await loadDetail(selectedId);
    await loadSummaries();
  }

  async function saveProfile() {
    if (!detail) return;
    setBusy(true);
    setNotice(null);
    try {
      await updateAdminCustomerProfile(detail.customer.id, profileForm);
      setNotice("Customer profile updated.");
      await refreshDetail();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "The customer profile could not be updated.");
    } finally {
      setBusy(false);
    }
  }

  async function applyPoints() {
    if (!detail || !pointsDelta || !pointsReason.trim()) {
      setNotice("Enter a non-zero adjustment and a reason for the audit log.");
      return;
    }
    setBusy(true);
    setNotice(null);
    try {
      await adjustCustomerPoints({ customerId: detail.customer.id, pointsDelta, reason: pointsReason.trim(), adminEmail: adminEmail ?? "admin" });
      setPointsDelta(0);
      setPointsReason("");
      setNotice("Points adjustment recorded in the ledger.");
      await refreshDetail();
    } catch (adjustError) {
      setError(adjustError instanceof Error ? adjustError.message : "The points adjustment could not be saved.");
    } finally {
      setBusy(false);
    }
  }

  async function saveSettings() {
    if (!settingsDraft) return;
    setBusy(true);
    try {
      await saveRewardSettings(settingsDraft);
      setNotice("Reward settings saved for future check-ins, reviews, and redemptions.");
    } catch (settingsError) {
      setError(settingsError instanceof Error ? settingsError.message : "Reward settings could not be saved.");
    } finally {
      setBusy(false);
    }
  }

  async function handleRedemption(id: string, action: "approve" | "reject") {
    setBusy(true);
    try {
      await reviewPointsRedemption(id, action, adminEmail ?? "admin");
      setNotice(`Points redemption ${action}d.`);
      await refreshDetail();
    } catch (reviewError) {
      setError(reviewError instanceof Error ? reviewError.message : "The redemption could not be updated.");
    } finally {
      setBusy(false);
    }
  }

  async function handleWithdrawal(id: string, action: "approve" | "reject" | "paid") {
    setBusy(true);
    try {
      await reviewWithdrawal(id, action, adminEmail ?? "admin");
      setNotice(`Withdrawal ${action === "paid" ? "marked paid" : `${action}d`}.`);
      await refreshDetail();
    } catch (reviewError) {
      setError(reviewError instanceof Error ? reviewError.message : "The withdrawal could not be updated.");
    } finally {
      setBusy(false);
    }
  }

  async function revealBank(id: string) {
    setBusy(true);
    try {
      setRevealed((current) => ({ ...current, [id]: "Loading..." }));
      const value = await revealAdminBankAccount(id);
      setRevealed((current) => ({ ...current, [id]: value || "Not available" }));
    } catch (revealError) {
      setError(revealError instanceof Error ? revealError.message : "The account number could not be revealed.");
    } finally {
      setBusy(false);
    }
  }

  async function deleteSaved(customerId: string, productId: string, kind: "wishlist" | "history") {
    setBusy(true);
    try {
      await removeSavedItem(customerId, productId, kind);
      setNotice("Saved item removed.");
      await refreshDetail();
    } catch (removeError) {
      setError(removeError instanceof Error ? removeError.message : "The saved item could not be removed.");
    } finally {
      setBusy(false);
    }
  }

  if (detail) {
    const pendingRedemptions = detail.redemptions.filter((item) => item.status === "pending");
    const pendingWithdrawals = detail.withdrawals.filter((item) => item.status === "pending" || item.status === "approved");
    return (
      <div className="grid gap-5">
        <div className="flex flex-wrap items-end justify-between gap-3"><div className="grid gap-1"><span className="text-xs font-bold uppercase tracking-[0.1em] text-brand-orange-ink">People · Accounts & rewards</span><h1 className="font-primary text-[clamp(1.7rem,3.5vw,2.4rem)] font-bold leading-[1.02] text-brand-green-ink">{detail.customer.name || detail.customer.email}</h1><p className="text-sm text-brand-black/68">{detail.customer.email} · Customer since {formatDate(detail.customer.createdAt)}</p></div><div className="flex gap-2"><button className={btnOutlineSm} type="button" onClick={() => setDetail(null)}>← All accounts</button><button className={btnOutlineSm} type="button" disabled={busy} onClick={() => void refreshDetail()}><RefreshCw className="mr-1 inline h-4 w-4" />Refresh</button></div></div>
        {error ? <p className="rounded-wobbly-md border-2 border-dashed border-brand-orange bg-brand-orange/10 p-3 text-sm font-semibold" role="alert">{error}</p> : null}
        {notice ? <p className="rounded-wobbly-md border-2 border-brand-forest bg-brand-mint p-3 text-sm font-semibold text-brand-green-ink" role="status">{notice}</p> : null}

        <div className="grid gap-4 lg:grid-cols-3">
          <section className="grid gap-3 rounded-wobbly-card border-3 border-brand-forest bg-brand-white p-4 shadow-brand-soft lg:col-span-2"><div className="flex items-center justify-between gap-2"><h2 className="font-primary text-xl font-bold text-brand-green-ink">Customer profile</h2><a className="text-xs font-bold text-brand-green-ink underline" href="#/account/orders">Open orders</a></div><div className="grid gap-3 sm:grid-cols-2"><label className="grid gap-1 text-xs font-bold uppercase tracking-[0.08em] text-brand-green-ink">Name<input className={inputClasses} value={profileForm.name} onChange={(event) => setProfileForm((current) => ({ ...current, name: event.target.value }))} /></label><label className="grid gap-1 text-xs font-bold uppercase tracking-[0.08em] text-brand-green-ink">Phone<input className={inputClasses} value={profileForm.phone} onChange={(event) => setProfileForm((current) => ({ ...current, phone: event.target.value }))} /></label><label className="grid gap-1 text-xs font-bold uppercase tracking-[0.08em] text-brand-green-ink">Area<input className={inputClasses} value={profileForm.area} onChange={(event) => setProfileForm((current) => ({ ...current, area: event.target.value }))} /></label><label className="grid gap-1 text-xs font-bold uppercase tracking-[0.08em] text-brand-green-ink">Dzongkhag<input className={inputClasses} value={profileForm.dzongkhag} onChange={(event) => setProfileForm((current) => ({ ...current, dzongkhag: event.target.value }))} /></label><label className="grid gap-1 text-xs font-bold uppercase tracking-[0.08em] text-brand-green-ink sm:col-span-2">Address<input className={inputClasses} value={profileForm.address} onChange={(event) => setProfileForm((current) => ({ ...current, address: event.target.value }))} /></label></div><button className={`${btnPrimarySm} justify-self-start`} type="button" disabled={busy} onClick={() => void saveProfile()}><Save className="mr-1 inline h-4 w-4" />Save profile</button></section>
          <section className="grid gap-3 rounded-wobbly-card border-3 border-brand-forest bg-brand-mint p-4 shadow-brand-soft"><div className="flex items-center gap-2"><Coins className="h-5 w-5 text-brand-orange-ink" /><h2 className="font-primary text-xl font-bold text-brand-green-ink">Rewards balance</h2></div><strong className="font-primary text-3xl text-brand-green-ink">{detail.pointsBalance} points</strong><span className="text-sm text-brand-black/68">{detail.currentStreak} day check-in streak · {detail.checkIns.length} total check-ins</span><div className="grid gap-2 border-t-2 border-dashed border-brand-forest/20 pt-3"><label className="grid gap-1 text-xs font-bold uppercase tracking-[0.08em] text-brand-green-ink">Manual points adjustment<input className={inputClasses} type="number" value={pointsDelta} onChange={(event) => setPointsDelta(Number(event.target.value))} placeholder="+20 or -20" /></label><label className="grid gap-1 text-xs font-bold uppercase tracking-[0.08em] text-brand-green-ink">Required reason<textarea className={textAreaClasses} value={pointsReason} onChange={(event) => setPointsReason(event.target.value)} placeholder="Reason for the audit ledger" /></label><button className={btnPrimarySm} type="button" disabled={busy} onClick={() => void applyPoints()}>Record adjustment</button></div></section>
        </div>

        <section className="grid gap-3 rounded-wobbly-card border-3 border-brand-forest bg-brand-white p-4 shadow-brand-soft"><div className="flex flex-wrap items-center justify-between gap-2"><div><h2 className="font-primary text-xl font-bold text-brand-green-ink">Reward settings</h2><p className="text-sm text-brand-black/68">These values drive new check-ins, reviews, and redemptions.</p></div><button className={btnOutlineSm} type="button" disabled={busy || !settingsDraft} onClick={() => void saveSettings()}><Save className="mr-1 inline h-4 w-4" />Save settings</button></div>{settingsDraft ? <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4"><label className="grid gap-1 text-xs font-bold uppercase tracking-[0.08em] text-brand-green-ink sm:col-span-2">Daily check-in rewards<input className={inputClasses} value={settingsDraft.dailyCheckInRewards.join(", ")} onChange={(event) => setSettingsDraft({ ...settingsDraft, dailyCheckInRewards: event.target.value.split(",").map((value) => Number(value.trim())).filter((value) => Number.isFinite(value) && value > 0) })} /></label><label className="grid gap-1 text-xs font-bold uppercase tracking-[0.08em] text-brand-green-ink">Review points<input className={inputClasses} type="number" min="1" value={settingsDraft.reviewRewardPoints} onChange={(event) => setSettingsDraft({ ...settingsDraft, reviewRewardPoints: Number(event.target.value) })} /></label><label className="grid gap-1 text-xs font-bold uppercase tracking-[0.08em] text-brand-green-ink">Points per Nu. 1<input className={inputClasses} type="number" min="1" value={settingsDraft.pointsPerNgultrum} onChange={(event) => setSettingsDraft({ ...settingsDraft, pointsPerNgultrum: Number(event.target.value) })} /></label><label className="grid gap-1 text-xs font-bold uppercase tracking-[0.08em] text-brand-green-ink">Minimum redemption<input className={inputClasses} type="number" min="1" value={settingsDraft.minimumRedemptionPoints} onChange={(event) => setSettingsDraft({ ...settingsDraft, minimumRedemptionPoints: Number(event.target.value) })} /></label></div> : null}</section>

        <div className="grid gap-4 lg:grid-cols-2">
          <section className="grid gap-3 rounded-wobbly-card border-3 border-brand-forest bg-brand-white p-4 shadow-brand-soft"><div className="flex items-center justify-between"><h2 className="font-primary text-xl font-bold text-brand-green-ink">Points ledger</h2><span className="text-sm text-brand-black/56">{detail.pointsLedger.length} entries</span></div>{detail.pointsLedger.length === 0 ? <p className="text-sm text-brand-black/60">No points activity yet.</p> : <div className="grid max-h-80 gap-2 overflow-y-auto">{detail.pointsLedger.map((entry) => <div className="flex items-start gap-2 rounded-wobbly-md border-2 border-brand-forest/12 bg-brand-warm-white p-2.5" key={entry.id}><span className={`mt-0.5 text-sm font-bold ${entry.pointsDelta >= 0 ? "text-brand-green-ink" : "text-brand-orange-ink"}`}>{entry.pointsDelta >= 0 ? "+" : ""}{entry.pointsDelta}</span><span className="grid min-w-0 flex-1 gap-0.5"><strong className="text-xs capitalize text-brand-green-ink">{entry.source.replaceAll("_", " ")}</strong><span className="text-xs text-brand-black/60">{entry.reason} · {formatDate(entry.createdAt)}</span></span></div>)}</div>}</section>
          <section className="grid gap-3 rounded-wobbly-card border-3 border-brand-forest bg-brand-white p-4 shadow-brand-soft"><div className="flex items-center gap-2"><History className="h-5 w-5 text-brand-orange-ink" /><h2 className="font-primary text-xl font-bold text-brand-green-ink">Check-in history</h2></div>{detail.checkIns.length === 0 ? <p className="text-sm text-brand-black/60">No check-ins yet.</p> : <div className="flex flex-wrap gap-2">{detail.checkIns.slice(0, 14).map((checkIn) => <span className="rounded-full border-2 border-brand-forest bg-brand-mint px-2 py-1 text-xs font-bold" key={checkIn.checkInDate}>{checkIn.checkInDate} · +{checkIn.pointsAwarded}</span>)}</div>}</section>
        </div>

        <section className="grid gap-3 rounded-wobbly-card border-3 border-brand-forest bg-brand-white p-4 shadow-brand-soft"><div className="flex items-center justify-between"><h2 className="font-primary text-xl font-bold text-brand-green-ink">Pending points redemptions</h2><span className="text-sm text-brand-black/56">Wallet balance {formatMoney(detail.walletBalance)}</span></div>{pendingRedemptions.length === 0 ? <p className="text-sm text-brand-black/60">No pending redemption requests.</p> : <div className="grid gap-2">{pendingRedemptions.map((redemption) => <div className="flex flex-wrap items-center gap-2 rounded-wobbly-md border-2 border-brand-forest/15 bg-brand-warm-white p-3" key={redemption.id}><span className="flex-1 text-sm font-bold text-brand-green-ink">{redemption.points} points → {formatMoney(redemption.walletAmount)}</span><button className={btnOutlineSm} type="button" disabled={busy} onClick={() => void handleRedemption(redemption.id, "reject")}>Reject</button><button className={btnPrimarySm} type="button" disabled={busy} onClick={() => void handleRedemption(redemption.id, "approve")}>Approve</button></div>)}</div>}</section>

        <div className="grid gap-4 lg:grid-cols-2"><section className="grid gap-3 rounded-wobbly-card border-3 border-brand-forest bg-brand-white p-4 shadow-brand-soft"><div className="flex items-center gap-2"><Landmark className="h-5 w-5 text-brand-orange-ink" /><h2 className="font-primary text-xl font-bold text-brand-green-ink">Bank accounts</h2></div>{detail.bankAccounts.length === 0 ? <p className="text-sm text-brand-black/60">No bank accounts saved.</p> : <div className="grid gap-2">{detail.bankAccounts.map((account) => <div className="flex flex-wrap items-center gap-2 rounded-wobbly-md border-2 border-brand-forest/15 bg-brand-warm-white p-3" key={account.id}><span className="grid min-w-0 flex-1 gap-0.5"><strong className="text-sm text-brand-green-ink">{account.bankName} · {account.accountName}</strong><span className="text-xs text-brand-black/60">{account.maskedAccountNumber} {account.isDefault ? "· Default" : ""}</span>{revealed[account.id] ? <span className="text-xs font-bold text-brand-orange-ink">Revealed: {revealed[account.id]}</span> : null}</span><button className={btnOutlineSm} type="button" disabled={busy} onClick={() => void revealBank(account.id)}><Eye className="mr-1 inline h-4 w-4" />Reveal</button></div>)}</div>}</section><section className="grid gap-3 rounded-wobbly-card border-3 border-brand-forest bg-brand-white p-4 shadow-brand-soft"><div className="flex items-center gap-2"><WalletCards className="h-5 w-5 text-brand-orange-ink" /><h2 className="font-primary text-xl font-bold text-brand-green-ink">Withdrawal queue</h2></div>{pendingWithdrawals.length === 0 ? <p className="text-sm text-brand-black/60">No pending withdrawals.</p> : <div className="grid gap-2">{pendingWithdrawals.map((withdrawal) => <div className="grid gap-2 rounded-wobbly-md border-2 border-brand-forest/15 bg-brand-warm-white p-3" key={withdrawal.id}><div className="flex items-center gap-2"><strong className="flex-1 text-sm text-brand-green-ink">{formatMoney(withdrawal.amount)}</strong><span className={`rounded-full border-2 px-2 py-0.5 text-xs font-bold ${statusClass(withdrawal.status)}`}>{withdrawal.status}</span></div><div className="flex flex-wrap gap-2"><button className={btnOutlineSm} type="button" disabled={busy || withdrawal.status !== "pending"} onClick={() => void handleWithdrawal(withdrawal.id, "reject")}>Reject</button><button className={btnOutlineSm} type="button" disabled={busy || withdrawal.status !== "pending"} onClick={() => void handleWithdrawal(withdrawal.id, "approve")}>Approve</button><button className={btnPrimarySm} type="button" disabled={busy || withdrawal.status !== "approved"} onClick={() => void handleWithdrawal(withdrawal.id, "paid")}>Mark paid</button></div></div>)}</div>}</section></div>

        <div className="grid gap-4 lg:grid-cols-2"><section className="grid gap-3 rounded-wobbly-card border-3 border-brand-forest bg-brand-white p-4 shadow-brand-soft"><h2 className="font-primary text-xl font-bold text-brand-green-ink">Saved products & history</h2>{detail.savedItems.length === 0 ? <p className="text-sm text-brand-black/60">No saved items or browsing history.</p> : <div className="grid gap-2">{detail.savedItems.map((item) => <div className="flex items-center gap-2 rounded-wobbly-md border-2 border-brand-forest/12 bg-brand-warm-white p-2.5" key={`${item.kind}-${item.productId}`}><span className="flex-1 text-sm text-brand-black"><strong className="capitalize text-brand-green-ink">{item.kind}</strong> · {item.productId}</span><button className="rounded-full border-2 border-brand-orange-ink p-2 text-brand-orange-ink" type="button" disabled={busy} aria-label={`Remove ${item.productId}`} onClick={() => void deleteSaved(detail.customer.id, item.productId, item.kind)}><Trash2 className="h-4 w-4" /></button></div>)}</div>}</section><section className="grid gap-3 rounded-wobbly-card border-3 border-brand-forest bg-brand-white p-4 shadow-brand-soft"><div className="flex items-center gap-2"><Star className="h-5 w-5 text-brand-orange-ink" /><h2 className="font-primary text-xl font-bold text-brand-green-ink">Customer reviews</h2></div>{detail.reviews.length === 0 ? <p className="text-sm text-brand-black/60">No customer reviews yet.</p> : <div className="grid gap-2">{detail.reviews.map((review) => <div className="grid gap-1 rounded-wobbly-md border-2 border-brand-forest/12 bg-brand-warm-white p-3" key={review.id}><div className="flex items-center gap-2"><span className="text-brand-orange-ink">{"★".repeat(review.rating)}</span><span className={`rounded-full border-2 px-2 py-0.5 text-xs font-bold ${statusClass(review.status)}`}>{review.status}</span><span className="ml-auto text-xs text-brand-black/56">{review.orderId}</span></div><p className="text-sm text-brand-black/72">{review.body || "No written comment."}</p></div>)}</div>}<div className="flex flex-wrap gap-2"><a className={btnOutlineSm} href="#/admin">Open Reviews</a><a className={btnOutlineSm} href="#/coupons">Open Coupons</a></div></section></div>
      </div>
    );
  }

  return <div className="grid gap-5"><div className="flex flex-wrap items-end justify-between gap-3"><div className="grid gap-1"><span className="text-xs font-bold uppercase tracking-[0.1em] text-brand-orange-ink">People</span><h1 className="font-primary text-[clamp(1.7rem,3.5vw,2.4rem)] font-bold leading-[1.02] text-brand-green-ink">Accounts & rewards</h1><p className="text-sm text-brand-black/68">Manage customer profiles, points, wallet payouts, saved items, and reviews from one source of truth.</p></div><button className={btnOutlineSm} type="button" disabled={!summaries} onClick={() => void loadSummaries()}><RefreshCw className="mr-1 inline h-4 w-4" />Refresh</button></div>{error ? <p className="rounded-wobbly-md border-2 border-dashed border-brand-orange bg-brand-orange/10 p-3 text-sm font-semibold" role="alert">{error}</p> : null}<input className={inputClasses} type="search" aria-label="Search customer accounts" placeholder="Search by name, email, phone, or area..." value={query} onChange={(event) => setQuery(event.target.value)} />{summaries ? <div className="overflow-x-auto rounded-wobbly-card border-3 border-brand-forest bg-brand-white shadow-brand-soft"><table className="w-full min-w-220 border-collapse text-left"><caption className="sr-only">Customer accounts and rewards</caption><thead><tr className="border-b-3 border-dashed border-brand-forest/30 bg-brand-warm-white text-xs font-bold uppercase tracking-[0.08em] text-brand-green-ink"><th className="px-4 py-3">Customer</th><th className="px-4 py-3">Points</th><th className="px-4 py-3">Wallet</th><th className="px-4 py-3">Check-ins</th><th className="px-4 py-3">Saved</th><th className="px-4 py-3">Requests</th><th className="px-4 py-3" /></tr></thead><tbody>{filtered.map((summary) => <tr className="border-b-2 border-dashed border-brand-forest/16 text-sm last:border-b-0" key={summary.customerId}><td className="px-4 py-3"><button className="text-left" type="button" onClick={() => void loadDetail(summary.customerId)}><strong className="block text-brand-green-ink underline decoration-dashed underline-offset-2">{summary.name || "Unnamed customer"}</strong><span className="text-xs text-brand-black/60">{summary.email} · {summary.phone}</span></button></td><td className="px-4 py-3 font-bold text-brand-green-ink">{summary.pointsBalance}</td><td className="px-4 py-3 text-brand-black/72">{formatMoney(summary.walletBalance)}</td><td className="px-4 py-3 text-brand-black/72">{summary.checkInCount}</td><td className="px-4 py-3 text-brand-black/72">{summary.savedItemCount}</td><td className="px-4 py-3 text-xs text-brand-black/72">{summary.pendingRedemptions} redemptions<br />{summary.pendingWithdrawals} withdrawals</td><td className="px-4 py-3"><button className={btnOutlineSm} type="button" onClick={() => void loadDetail(summary.customerId)}>Manage</button></td></tr>)}</tbody></table>{filtered.length === 0 ? <p className="p-6 text-center text-sm font-semibold text-brand-black/60">No accounts match your search.</p> : null}</div> : <div className="grid place-items-center rounded-wobbly-card border-3 border-dashed border-brand-forest/25 bg-brand-white p-10"><p className="font-semibold text-brand-black/60">Loading customer accounts...</p></div>}</div>;
}
