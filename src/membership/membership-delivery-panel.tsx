import { useEffect, useMemo, useState, type ChangeEvent, type FormEvent } from "react";
import { Banknote, CirclePause, CirclePlay, Gift, PackageCheck, Truck, Upload, XCircle } from "lucide-react";
import { btnOutlineSm, btnPrimarySm } from "../components/ui/styles";
import {
  defaultDeliveryDate,
  eligibleMembershipDeliveryProducts,
  fetchMyMembershipDelivery,
  saveMembershipDeliveryProfile,
  submitMembershipDeliveryPayment,
  updateMembershipDeliveryProfile,
  uploadMembershipDeliveryProof,
} from "./membership-benefits-api";
import { deliveryCadenceLabel } from "./membership-rules";
import type {
  MembershipDeliveryCycle,
  MembershipDeliveryProfile,
  MembershipDeliveryProfileInput,
  MembershipPlan,
} from "./membership-types";

const inputClass = "min-h-11.5 w-full rounded-wobbly-md border-3 border-brand-forest bg-brand-white px-3 py-2 text-sm text-brand-black outline-none placeholder:text-brand-black/45 focus-visible:ring-4 focus-visible:ring-brand-leaf/20";

function money(value: number): string {
  return `Nu. ${new Intl.NumberFormat("en-BT").format(value)}`;
}

function dateLabel(value: string): string {
  const date = new Date(`${value.slice(0, 10)}T12:00:00+06:00`);
  return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat("en-BT", { day: "numeric", month: "short", year: "numeric" }).format(date);
}

function dueLabel(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "18:00 Bhutan time on the day before delivery" : new Intl.DateTimeFormat("en-BT", { timeZone: "Asia/Thimphu", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", hour12: false }).format(date) + " Bhutan time";
}

function cycleTitle(status: MembershipDeliveryCycle["status"]): string {
  if (status === "payment_submitted") return "Payment verification in progress";
  if (status === "paid") return "Payment verified";
  if (status === "skipped") return "Delivery skipped";
  if (status === "needs_admin_resolution") return "Needs urgent verification";
  if (status === "cancelled") return "Cycle cancelled";
  return "Payment due";
}

function profileStatusLabel(status: MembershipDeliveryProfile["status"]): string {
  if (status === "paused") return "Paused";
  if (status === "cancelled") return "Cancelled";
  return "Active";
}

type Draft = Omit<MembershipDeliveryProfileInput, "items"> & { quantities: Record<string, string> };

function draftFor(profile: MembershipDeliveryProfile | null, area: string, address: string): Draft {
  return {
    quantities: Object.fromEntries((profile?.items ?? []).map((item) => [item.productId, String(item.quantity)])),
    cadence: profile?.cadence ?? "weekly",
    deliveryTier: profile?.deliveryTier ?? "standard",
    deliveryArea: profile?.deliveryArea || area,
    deliveryAddress: profile?.deliveryAddress || address,
    nextDeliveryDate: profile?.nextDeliveryDate ?? defaultDeliveryDate(),
  };
}

export function MembershipDeliveryPanel({
  email,
  plan,
  customerArea,
  customerAddress,
}: {
  email: string;
  plan: MembershipPlan;
  customerArea: string;
  customerAddress: string;
}) {
  const [profile, setProfile] = useState<MembershipDeliveryProfile | null>(null);
  const [cycles, setCycles] = useState<MembershipDeliveryCycle[]>([]);
  const [freebieName, setFreebieName] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft>(() => draftFor(null, customerArea, customerAddress));
  const [reference, setReference] = useState("");
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const products = useMemo(() => eligibleMembershipDeliveryProducts(), []);
  const availableTiers = plan.deliveryTiers.filter((tier) => tier.enabled);

  async function refresh() {
    const snapshot = await fetchMyMembershipDelivery(email);
    setProfile(snapshot.profile);
    setCycles(snapshot.cycles);
    setFreebieName(snapshot.freebieCampaign?.productName ?? null);
    setDraft(draftFor(snapshot.profile, customerArea, customerAddress));
  }

  useEffect(() => {
    let active = true;
    void fetchMyMembershipDelivery(email).then((snapshot) => {
      if (!active) return;
      setProfile(snapshot.profile);
      setCycles(snapshot.cycles);
      setFreebieName(snapshot.freebieCampaign?.productName ?? null);
      setDraft(draftFor(snapshot.profile, customerArea, customerAddress));
    }).catch((loadError) => {
      if (active) setError(loadError instanceof Error ? loadError.message : "Scheduled delivery could not be loaded.");
    });
    return () => { active = false; };
  }, [customerAddress, customerArea, email]);

  const currentCycle = cycles.find((cycle) => ["invoice_ready", "payment_submitted", "needs_admin_resolution"].includes(cycle.status)) ?? cycles[0] ?? null;

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const items = Object.entries(draft.quantities)
        .map(([productId, value]) => ({ productId, quantity: Number(value) }))
        .filter((item) => Number.isFinite(item.quantity) && item.quantity > 0);
      const updated = await saveMembershipDeliveryProfile(email, {
        items,
        cadence: draft.cadence,
        deliveryTier: draft.deliveryTier,
        deliveryArea: draft.deliveryArea,
        deliveryAddress: draft.deliveryAddress,
        nextDeliveryDate: draft.nextDeliveryDate,
      });
      setProfile(updated);
      setNotice(profile ? "Your saved box was updated. Any billed cycle stays unchanged; the update applies to the next unbilled delivery." : "Your saved box is ready. We’ll create an invoice three days before delivery.");
      await refresh();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "The saved box could not be updated.");
    } finally {
      setBusy(false);
    }
  }

  async function changeProfile(status: MembershipDeliveryProfile["status"]) {
    if (!profile) return;
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const updated = await updateMembershipDeliveryProfile(email, profile.id, { status });
      setProfile(updated);
      setNotice(status === "paused" ? "Future unbilled saved-box cycles are paused." : status === "cancelled" ? "Your saved-box delivery was cancelled. Existing billed cycles remain visible below." : "Your saved-box delivery is active again.");
      await refresh();
    } catch (changeError) {
      setError(changeError instanceof Error ? changeError.message : "The delivery profile could not be updated.");
    } finally {
      setBusy(false);
    }
  }

  function chooseProof(event: ChangeEvent<HTMLInputElement>) {
    setProofFile(event.target.files?.[0] ?? null);
  }

  async function submitPayment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!currentCycle) return;
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const proof = proofFile ? await uploadMembershipDeliveryProof(email, proofFile) : null;
      await submitMembershipDeliveryPayment(email, currentCycle.id, { paymentReference: reference, proof });
      setReference("");
      setProofFile(null);
      setNotice("Your payment reference was sent for admin verification. You’ll see the verified order in My orders.");
      await refresh();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Your payment reference could not be submitted.");
    } finally {
      setBusy(false);
    }
  }

  if (!plan.scheduledDeliveryEnabled) return null;

  return (
    <section id="scheduled-delivery" className="grid gap-4 scroll-mt-26" aria-labelledby="scheduled-delivery-title">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="grid gap-1"><span className="text-xs font-bold uppercase tracking-[0.1em] text-brand-orange-ink">Zama+ saved box</span><h2 id="scheduled-delivery-title" className="font-primary text-2xl font-bold text-brand-green-ink">Schedule the box you buy often.</h2><p className="max-w-150 text-sm leading-relaxed text-brand-black/68">Choose active catalog products once, then have the box invoiced weekly, fortnightly, or monthly. You pay each cycle by bank transfer—there are no automatic charges.</p></div>
        {profile ? <span className={`rounded-full border-2 px-3 py-1 text-xs font-bold ${profile.status === "active" ? "border-brand-forest bg-brand-mint text-brand-green-ink" : "border-brand-black/20 bg-brand-warm-white text-brand-black/60"}`}>{profileStatusLabel(profile.status)}</span> : null}
      </div>

      {profile ? <div className="grid gap-3 rounded-wobbly-card border-3 border-brand-forest bg-brand-white p-4 shadow-brand-soft sm:grid-cols-3"><div className="grid gap-1"><span className="text-xs font-bold uppercase tracking-[0.08em] text-brand-black/55">Next unbilled delivery</span><strong className="text-brand-green-ink">{dateLabel(profile.nextDeliveryDate)}</strong><span className="text-xs text-brand-black/60">{deliveryCadenceLabel(profile.cadence)}</span></div><div className="grid gap-1"><span className="text-xs font-bold uppercase tracking-[0.08em] text-brand-black/55">Delivery option</span><strong className="text-brand-green-ink">{availableTiers.find((tier) => tier.id === profile.deliveryTier)?.label ?? "Scheduled delivery"}</strong><span className="text-xs text-brand-black/60">{money(availableTiers.find((tier) => tier.id === profile.deliveryTier)?.fee ?? 0)} per delivery</span></div><div className="flex flex-wrap items-center gap-2 sm:justify-end">{profile.status === "active" ? <button className={btnOutlineSm} type="button" disabled={busy} onClick={() => void changeProfile("paused")}><CirclePause className="h-4 w-4" /> Pause</button> : profile.status === "paused" ? <button className={btnPrimarySm} type="button" disabled={busy} onClick={() => void changeProfile("active")}><CirclePlay className="h-4 w-4" /> Resume</button> : null}{profile.status !== "cancelled" ? <button className="inline-flex min-h-10 items-center gap-1.5 rounded-full border-2 border-brand-orange-ink bg-brand-white px-3 py-1.5 text-xs font-bold text-brand-orange-ink" type="button" disabled={busy} onClick={() => void changeProfile("cancelled")}><XCircle className="h-4 w-4" /> Cancel</button> : null}</div></div> : null}

      <form className="grid gap-4 rounded-wobbly-card border-3 border-brand-forest/25 bg-brand-warm-white p-4 shadow-brand-soft" onSubmit={(event) => void save(event)}>
        <div className="flex flex-wrap items-center justify-between gap-3"><div><h3 className="font-primary text-xl font-bold text-brand-green-ink">{profile ? "Update your next saved box" : "Build your saved box"}</h3><p className="text-sm text-brand-black/64">Changes do not alter a cycle that has already been invoiced.</p></div><PackageCheck className="h-7 w-7 text-brand-green-ink" /></div>
        <div className="grid gap-3 sm:grid-cols-3"><label className="grid gap-1 text-xs font-bold uppercase tracking-[0.08em] text-brand-green-ink">Repeat<select className={inputClass} value={draft.cadence} onChange={(event) => setDraft((current) => ({ ...current, cadence: event.target.value as Draft["cadence"] }))}><option value="weekly">Weekly</option><option value="fortnightly">Every 2 weeks</option><option value="monthly">Monthly</option></select></label><label className="grid gap-1 text-xs font-bold uppercase tracking-[0.08em] text-brand-green-ink">Delivery option<select className={inputClass} value={draft.deliveryTier} onChange={(event) => setDraft((current) => ({ ...current, deliveryTier: event.target.value as Draft["deliveryTier"] }))}>{availableTiers.map((tier) => <option value={tier.id} key={tier.id}>{tier.label} · {money(tier.fee)}</option>)}</select></label><label className="grid gap-1 text-xs font-bold uppercase tracking-[0.08em] text-brand-green-ink">First / next delivery<input className={inputClass} type="date" value={draft.nextDeliveryDate} onChange={(event) => setDraft((current) => ({ ...current, nextDeliveryDate: event.target.value }))} /></label></div>
        <div className="grid gap-3 sm:grid-cols-2"><label className="grid gap-1 text-xs font-bold uppercase tracking-[0.08em] text-brand-green-ink">Delivery area<input className={inputClass} value={draft.deliveryArea} onChange={(event) => setDraft((current) => ({ ...current, deliveryArea: event.target.value }))} /></label><label className="grid gap-1 text-xs font-bold uppercase tracking-[0.08em] text-brand-green-ink">Delivery address<input className={inputClass} value={draft.deliveryAddress} onChange={(event) => setDraft((current) => ({ ...current, deliveryAddress: event.target.value }))} /></label></div>
        <fieldset className="grid gap-2 border-0 p-0"><legend className="text-xs font-bold uppercase tracking-[0.08em] text-brand-green-ink">Products and quantities</legend><div className="grid gap-2 sm:grid-cols-2">{products.map((product) => <label className="grid grid-cols-[1fr_5rem] items-center gap-3 rounded-wobbly-md border-2 border-brand-forest/18 bg-brand-white px-3 py-2" key={product.id}><span className="grid gap-0.5"><strong className="text-sm text-brand-green-ink">{product.name}</strong><span className="text-xs text-brand-black/58">{product.priceAmount === null ? "Price unavailable" : money(product.priceAmount)}</span></span><input className="min-h-10 rounded-wobbly-md border-2 border-brand-forest px-2 text-center text-sm font-bold" type="number" min="0" max="20" inputMode="numeric" aria-label={`${product.name} quantity`} value={draft.quantities[product.id] ?? ""} onChange={(event) => setDraft((current) => ({ ...current, quantities: { ...current.quantities, [product.id]: event.target.value } }))} /></label>)}</div></fieldset>
        <div className="flex flex-wrap items-center justify-between gap-3 border-t-2 border-dashed border-brand-forest/20 pt-3"><p className="max-w-130 text-xs leading-relaxed text-brand-black/58"><Truck className="mr-1 inline h-3.5 w-3.5" />Choose a first delivery at least three Bhutan calendar days ahead. An invoice is created three days before delivery; submit a bank-transfer reference by 18:00 Bhutan time on the day before delivery.</p><button className={btnPrimarySm} type="submit" disabled={busy || availableTiers.length === 0}>{busy ? "Saving..." : profile ? "Save next-cycle changes" : "Create saved box"}</button></div>
      </form>

      {currentCycle ? <article className="grid gap-4 rounded-wobbly-card border-3 border-brand-forest bg-brand-white p-4 shadow-brand-soft" aria-labelledby="delivery-invoice-title"><div className="flex flex-wrap items-start justify-between gap-3"><div className="grid gap-1"><span className="text-xs font-bold uppercase tracking-[0.1em] text-brand-orange-ink">Scheduled-delivery invoice</span><h3 id="delivery-invoice-title" className="font-primary text-xl font-bold text-brand-green-ink">{dateLabel(currentCycle.deliveryDate)} · {cycleTitle(currentCycle.status)}</h3><p className="text-sm text-brand-black/64">Pay by {dueLabel(currentCycle.paymentDueAt)}.</p></div><strong className="font-primary text-2xl text-brand-green-ink">{money(currentCycle.total)}</strong></div><div className="grid gap-1 border-y-2 border-dashed border-brand-forest/20 py-3 text-sm text-brand-black/72">{currentCycle.items.map((item) => <span className="flex justify-between gap-3" key={item.productId}><span>{item.quantity}× {item.name}</span><span>{money(item.unitPrice * item.quantity)}</span></span>)}<span className="flex justify-between gap-3"><span>Delivery</span><span>{money(currentCycle.deliveryFee)}</span></span>{currentCycle.freebieProductName ? <span className="flex justify-between gap-3 font-bold text-brand-green-ink"><span><Gift className="mr-1 inline h-4 w-4" />Zama+ freebie: {currentCycle.freebieProductName}</span><span>Nu. 0</span></span> : null}</div>{currentCycle.adminNote ? <p className="rounded-wobbly-md border-2 border-brand-orange-ink bg-brand-buff p-3 text-sm text-brand-black"><strong>Update:</strong> {currentCycle.adminNote}</p> : null}{currentCycle.status === "invoice_ready" ? <form className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end" onSubmit={(event) => void submitPayment(event)}><label className="grid gap-1 text-xs font-bold uppercase tracking-[0.08em] text-brand-green-ink">Bank-transfer reference<input className={inputClass} required maxLength={120} value={reference} onChange={(event) => setReference(event.target.value)} placeholder="e.g. BOB-2026-0815-1234" /></label><label className="grid gap-1 text-xs font-bold uppercase tracking-[0.08em] text-brand-green-ink">Proof <span className="normal-case font-normal tracking-normal text-brand-black/55">Optional</span><span className="flex min-h-11.5 items-center gap-2 rounded-wobbly-md border-2 border-dashed border-brand-forest/25 bg-brand-warm-white px-3 text-sm font-normal text-brand-black/68"><Upload className="h-4 w-4" /><input className="min-w-0 text-xs" type="file" accept="image/*" onChange={chooseProof} /></span></label><button className={btnPrimarySm} type="submit" disabled={busy}><Banknote className="h-4 w-4" /> {busy ? "Submitting..." : "Submit payment"}</button></form> : <p className="rounded-wobbly-md border-2 border-brand-forest/18 bg-brand-mint p-3 text-sm text-brand-green-ink">{currentCycle.status === "payment_submitted" ? "Your payment reference is waiting for verification. We will turn this into a normal order once it is approved." : currentCycle.status === "needs_admin_resolution" ? "Your payment reference was received and is held for urgent admin review. It will not be skipped automatically." : currentCycle.status === "paid" ? "This cycle is now a normal order in My orders." : "This past cycle remains here for your records."}</p>}</article> : profile?.status === "active" ? <p className="rounded-wobbly-md border-2 border-dashed border-brand-forest/25 bg-brand-mint p-4 text-sm text-brand-green-ink">Your next invoice will appear here three days before delivery.</p> : null}

      {freebieName ? <p className="flex items-center gap-2 rounded-wobbly-md border-2 border-brand-forest/20 bg-brand-yellow/50 p-3 text-sm text-brand-green-ink"><Gift className="h-5 w-5 shrink-0" /><span><strong>This cycle’s member freebie:</strong> {freebieName}. It is added at Nu. 0 after your invoice is verified.</span></p> : null}
      {notice ? <p className="rounded-wobbly-md border-2 border-brand-forest bg-brand-mint p-3 text-sm font-semibold text-brand-green-ink" role="status">{notice}</p> : null}
      {error ? <p className="rounded-wobbly-md border-2 border-dashed border-brand-orange bg-brand-orange/10 p-3 text-sm font-semibold text-brand-black" role="alert">{error}</p> : null}
    </section>
  );
}
