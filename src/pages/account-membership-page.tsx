import { useEffect, useState, type ChangeEvent, type FormEvent } from "react";
import { BadgeCheck, Banknote, ChevronRight, Crown, Gift, LockKeyhole, Sparkles, Upload, WalletCards } from "lucide-react";
import { useCart } from "../cart-context";
import { useCustomerAuth } from "../checkout/customer-auth";
import { listPublicCoupons } from "../coupons/coupons-api";
import type { Coupon } from "../coupons/coupon-types";
import { cadenceLabel } from "../membership/membership-rules";
import { MembershipDeliveryPanel } from "../membership/membership-delivery-panel";
import {
  fetchMembershipPlans,
  fetchMyMembership,
  requestMembership,
  uploadMembershipProof,
} from "../membership/membership-api";
import type { MembershipPlan, MembershipRequestInput, MembershipSnapshot } from "../membership/membership-types";
import { btnOutlineSm, btnPrimarySm, sectionShell, sectionTitleCompact } from "../components/ui/styles";
import { OutlineTag } from "../components/ui/tag";

function formatMoney(value: number): string {
  return "Nu. " + new Intl.NumberFormat("en-BT").format(value);
}

function formatDate(value: string | null | undefined): string {
  if (!value) return "Not set";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Not set" : new Intl.DateTimeFormat("en-BT", { day: "numeric", month: "short", year: "numeric" }).format(date);
}

function statusLabel(status: MembershipSnapshot["status"]): string {
  if (status === "active") return "Zama+ Member";
  if (status === "pending") return "Membership pending";
  if (status === "paused") return "Membership paused";
  if (status === "cancelled") return "Membership cancelled";
  if (status === "rejected") return "Membership request declined";
  return "Not a member";
}

function statusClasses(status: MembershipSnapshot["status"]): string {
  if (status === "active") return "border-brand-forest bg-brand-mint text-brand-green-ink";
  if (status === "pending") return "border-brand-orange-ink bg-brand-buff text-brand-orange-ink";
  if (status === "rejected" || status === "cancelled") return "border-brand-orange bg-brand-orange/15 text-brand-orange-ink";
  return "border-brand-forest/20 bg-brand-warm-white text-brand-black/65";
}

function planSummary(plan: MembershipPlan): string {
  return formatMoney(plan.price) + " " + cadenceLabel(plan.cadence);
}

function PlanCard({ plan, selected, onSelect }: { plan: MembershipPlan; selected: boolean; onSelect: () => void }) {
  const serviceBenefits = [
    plan.scheduledDeliveryEnabled ? "Recurring saved-box delivery" : null,
    plan.earlyAccessEnabled ? "Early access and account notifications for selected products" : null,
    plan.freebieEnabled ? "One freebie per paid scheduled delivery" : null,
  ].filter((benefit): benefit is string => Boolean(benefit));

  return (
    <button
      className={"grid content-start gap-4 rounded-wobbly-card border-3 p-5 text-left shadow-brand-soft transition-colors " + (selected ? "border-brand-forest bg-brand-yellow" : "border-brand-forest/25 bg-brand-white hover:border-brand-forest hover:bg-brand-warm-white")}
      type="button"
      aria-pressed={selected}
      onClick={onSelect}
    >
      <div className="flex items-start justify-between gap-3">
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full border-2 border-brand-forest bg-brand-mint text-brand-green-ink"><Crown className="h-5 w-5" /></span>
        <span className="rounded-full border-2 border-brand-forest/20 bg-brand-white/70 px-2 py-1 text-xs font-bold text-brand-green-ink">{plan.discountPercent}% member discount</span>
      </div>
      <div className="grid gap-1">
        <h2 className="font-primary text-2xl font-bold text-brand-green-ink">{plan.name}</h2>
        <p className="font-bold text-brand-black">{planSummary(plan)}</p>
        <p className="text-sm leading-relaxed text-brand-black/68">{plan.description}</p>
      </div>
      <ul className="grid gap-2 border-t-2 border-dashed border-brand-forest/20 pt-3 text-sm text-brand-black/72">
        {plan.benefits.slice(0, 4).map((benefit) => <li className="flex items-start gap-2" key={benefit.title}><BadgeCheck className="mt-0.5 h-4 w-4 shrink-0 text-brand-green-ink" /><span>{benefit.title}</span></li>)}
        {serviceBenefits.map((benefit) => <li className="flex items-start gap-2 font-semibold text-brand-green-ink" key={benefit}><BadgeCheck className="mt-0.5 h-4 w-4 shrink-0" /><span>{benefit}</span></li>)}
      </ul>
      <span className="inline-flex items-center gap-1 text-sm font-bold text-brand-green-ink">{selected ? "Selected plan" : "Choose this plan"} <ChevronRight className="h-4 w-4" /></span>
    </button>
  );
}

function RequestForm({ plans, selectedPlanId, onPlanChange, email, onSuccess }: { plans: MembershipPlan[]; selectedPlanId: string; onPlanChange: (planId: string) => void; email: string; onSuccess: (snapshot: MembershipSnapshot) => void }) {
  const [reference, setReference] = useState("");
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [proof, setProof] = useState<MembershipRequestInput["proof"]>(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const plan = plans.find((item) => item.id === selectedPlanId) ?? plans[0] ?? null;

  function selectProof(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null;
    setProofFile(file);
    setProof(null);
    setNotice(null);
    setError(null);
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!plan) return;
    setBusy(true);
    setNotice(null);
    setError(null);
    try {
      let uploadedProof = proof;
      if (proofFile && !uploadedProof) {
        uploadedProof = await uploadMembershipProof(email, proofFile);
        if (!uploadedProof) setNotice("Your transfer reference will be used. The optional image could not be attached.");
        setProof(uploadedProof);
      }
      const result = await requestMembership(email, { planId: plan.id, paymentReference: reference, proof: uploadedProof });
      onSuccess(result);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Your membership request could not be submitted.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="grid gap-4 rounded-wobbly-card border-3 border-brand-forest bg-brand-white p-5 shadow-brand-soft" onSubmit={(event) => void submit(event)}>
      <div className="grid gap-1">
        <OutlineTag>Join Zama+</OutlineTag>
        <h2 className="font-primary text-2xl font-bold text-brand-green-ink">Send your membership request</h2>
        <p className="text-sm leading-relaxed text-brand-black/68">Pay by bank transfer, then add the transfer reference below. An admin will verify it before your membership becomes active.</p>
      </div>
      <label className="grid gap-1.5 text-xs font-bold uppercase tracking-[0.1em] text-brand-green-ink">Plan<select className="min-h-11.5 rounded-wobbly-md border-3 border-brand-forest bg-brand-white px-3 text-sm font-normal text-brand-black outline-none focus-visible:ring-4 focus-visible:ring-brand-leaf/20" value={selectedPlanId} onChange={(event) => onPlanChange(event.target.value)}>{plans.map((item) => <option value={item.id} key={item.id}>{item.name} · {planSummary(item)}</option>)}</select></label>
      {plan ? <div className="flex flex-wrap items-center justify-between gap-2 rounded-wobbly-md border-2 border-brand-forest/20 bg-brand-mint p-3 text-sm"><span className="font-bold text-brand-green-ink">Transfer amount</span><strong className="font-primary text-xl text-brand-green-ink">{formatMoney(plan.price)}</strong></div> : null}
      <label className="grid gap-1.5 text-xs font-bold uppercase tracking-[0.1em] text-brand-green-ink">Bank-transfer reference<input className="min-h-11.5 rounded-wobbly-md border-3 border-brand-forest bg-brand-white px-3 py-[0.65rem] text-sm font-normal text-brand-black outline-none placeholder:text-brand-black/46 focus-visible:ring-4 focus-visible:ring-brand-leaf/20" required maxLength={120} value={reference} onChange={(event) => setReference(event.target.value)} placeholder="e.g. BOB-2026-0815-1234" /></label>
      <label className="grid gap-1.5 text-xs font-bold uppercase tracking-[0.1em] text-brand-green-ink">Transfer proof <span className="font-normal normal-case tracking-normal text-brand-black/55">Optional image</span><span className="flex min-h-11.5 items-center gap-2 rounded-wobbly-md border-2 border-dashed border-brand-forest/25 bg-brand-warm-white px-3 text-sm font-normal text-brand-black/68"><Upload className="h-4 w-4 text-brand-green-ink" /><input className="min-w-0 flex-1 text-xs" type="file" accept="image/*" onChange={selectProof} /></span></label>
      {proofFile ? <p className="text-xs text-brand-black/58">Selected: {proofFile.name}</p> : null}
      {notice ? <p className="rounded-wobbly-md border-2 border-brand-orange-ink bg-brand-buff p-3 text-sm font-semibold text-brand-black" role="status">{notice}</p> : null}
      {error ? <p className="rounded-wobbly-md border-2 border-dashed border-brand-orange bg-brand-orange/10 p-3 text-sm font-semibold text-brand-black" role="alert">{error}</p> : null}
      <div className="flex flex-wrap items-center justify-between gap-3"><p className="max-w-110 text-xs text-brand-black/55">Your membership stays pending until the transfer is verified.</p><button className={btnPrimarySm} type="submit" disabled={busy || !plan}>{busy ? "Submitting..." : "Submit membership request"}</button></div>
    </form>
  );
}

function MemberBenefits({ plan }: { plan: MembershipPlan }) {
  const deliveryChoices = plan.deliveryTiers
    .filter((tier) => tier.enabled)
    .map((tier) => `${tier.label}${tier.fee > 0 ? ` · Nu. ${new Intl.NumberFormat("en-BT").format(tier.fee)}` : " · included"}`)
    .join(" · ");
  const included = [
    ...plan.benefits,
    ...(plan.scheduledDeliveryEnabled ? [{ title: "Saved-box delivery", description: `Build a box once, choose weekly, fortnightly, or monthly delivery, and pay each cycle only when you are ready.${deliveryChoices ? ` Delivery choices: ${deliveryChoices}.` : ""}` }] : []),
    ...(plan.earlyAccessEnabled ? [{ title: "Member early access", description: "Shop selected new products before they are released to the public. We’ll notify you in your account when early access opens." }] : []),
    ...(plan.freebieEnabled ? [{ title: "Delivery-cycle freebie", description: "Receive one admin-configured freebie at Nu. 0 with each paid scheduled delivery cycle." }] : []),
  ];
  return (
    <section id="membership-benefits" className="grid gap-4 scroll-mt-26" aria-labelledby="membership-benefits-title">
      <div className="grid gap-1"><span className="text-xs font-bold uppercase tracking-[0.1em] text-brand-orange-ink">Your perks</span><h2 id="membership-benefits-title" className="font-primary text-2xl font-bold text-brand-green-ink">Benefits included with {plan.name}</h2></div>
      <div className="grid gap-3 sm:grid-cols-2">
        {included.map((benefit, index) => {
          const Icon = [WalletCards, TicketIcon, Sparkles, Gift][index % 4];
          return <article className="grid gap-2 rounded-wobbly-card border-3 border-brand-forest bg-brand-white p-4 shadow-brand-soft" key={benefit.title}><span className="grid h-10 w-10 place-items-center rounded-full border-2 border-brand-forest bg-brand-yellow text-brand-green-ink"><Icon className="h-5 w-5" /></span><h3 className="font-primary text-lg font-bold text-brand-green-ink">{benefit.title}</h3><p className="text-sm leading-relaxed text-brand-black/68">{benefit.description}</p></article>;
        })}
      </div>
    </section>
  );
}

function TicketIcon(props: { className?: string }) {
  return <span className={props.className} aria-hidden="true">%</span>;
}

export function AccountMembershipPage() {
  const { status, profile } = useCustomerAuth();
  const { openAuth } = useCart();
  const [plans, setPlans] = useState<MembershipPlan[]>([]);
  const [snapshot, setSnapshot] = useState<MembershipSnapshot | null>(null);
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [selectedPlanId, setSelectedPlanId] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (status !== "signed-in" || !profile) {
      setLoading(false);
      return;
    }
    let active = true;
    setLoading(true);
    void Promise.all([fetchMembershipPlans(), fetchMyMembership(profile.email), listPublicCoupons()])
      .then(([nextPlans, nextSnapshot, nextCoupons]) => {
        if (!active) return;
        setPlans(nextPlans);
        setSnapshot(nextSnapshot);
        setSelectedPlanId(nextSnapshot.plan?.id ?? nextPlans[0]?.id ?? "");
        setCoupons(nextCoupons.filter((coupon) => coupon.memberOnly));
        setError(null);
      })
      .catch((loadError) => {
        if (active) setError(loadError instanceof Error ? loadError.message : "Membership details could not be loaded.");
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [profile, status]);

  if (status === "bootstrapping" || loading) {
    return <section className="mx-auto grid min-h-[60vh] place-content-center justify-items-center gap-3 px-4 py-16 text-center"><Sparkles className="h-9 w-9 text-brand-orange-ink" /><p className="font-semibold text-brand-black/68">Loading your membership...</p></section>;
  }

  if (status !== "signed-in" || !profile) {
    return <section className="mx-auto grid min-h-[65vh] max-w-150 place-content-center justify-items-center gap-4 px-4 py-16 text-center"><LockKeyhole className="h-10 w-10 text-brand-green-ink" /><h1 className="font-primary text-3xl font-bold text-brand-green-ink">Sign in to manage Zama+</h1><p className="text-sm leading-relaxed text-brand-black/68">Your membership status, benefits, and payment verification will appear here after you sign in.</p><button className={btnPrimarySm} type="button" onClick={openAuth}>Sign in or create an account</button></section>;
  }

  const currentPlan = snapshot?.plan ?? plans.find((plan) => plan.id === selectedPlanId) ?? plans[0] ?? null;
  const canRequest = snapshot?.status !== "active" && snapshot?.status !== "paused" && snapshot?.status !== "pending";

  return (
    <div className={"mx-auto grid w-full max-w-[90rem] gap-7 px-4 pb-28 pt-6 sm:px-6 lg:px-10 lg:pb-12 " + sectionShell}>
      <nav className="breadcrumb" aria-label="Breadcrumb"><ol className="flex flex-wrap items-center gap-1.5 text-sm"><li><a className="font-bold text-brand-green-ink underline decoration-dashed underline-offset-4" href="#/account">My account</a></li><li aria-hidden="true" className="text-brand-black/40">/</li><li aria-current="page" className="font-bold text-brand-black">Membership</li></ol></nav>
      <div className="flex flex-wrap items-end justify-between gap-4"><div className="grid gap-2"><OutlineTag>Zama+ Membership</OutlineTag><h1 className={sectionTitleCompact + " text-brand-green-ink"}>Membership that rewards your kitchen.</h1><p className="max-w-150 text-[1.05rem] leading-relaxed text-brand-black/68">See your plan, member savings, and exclusive offers in one place.</p></div><a className={btnOutlineSm} href="#/account">← Back to account</a></div>

      {error ? <p className="rounded-wobbly-md border-2 border-dashed border-brand-orange bg-brand-orange/10 p-3 text-sm font-semibold text-brand-black" role="alert">{error}</p> : null}

      {snapshot && currentPlan ? (
        <section className={"grid gap-5 rounded-[28px_20px_32px_24px/22px_32px_20px_28px] border-3 p-5 shadow-brand-big sm:p-7 " + (snapshot.status === "active" ? "border-brand-forest bg-brand-yellow" : "border-brand-forest/30 bg-brand-warm-white")} aria-labelledby="membership-status-title">
          <div className="flex flex-wrap items-start justify-between gap-4"><div className="flex items-start gap-3"><span className="grid h-14 w-14 shrink-0 place-items-center rounded-full border-3 border-brand-forest bg-brand-white text-brand-green-ink"><Crown className="h-7 w-7" /></span><div className="grid gap-1"><span className={"inline-flex w-fit rounded-full border-2 px-2.5 py-1 text-xs font-bold " + statusClasses(snapshot.status)}>{statusLabel(snapshot.status)}</span><h2 id="membership-status-title" className="font-primary text-2xl font-bold text-brand-green-ink">{currentPlan.name}</h2><p className="text-sm text-brand-black/68">{planSummary(currentPlan)}</p></div></div><button className={btnOutlineSm} type="button" onClick={() => document.getElementById(snapshot.status === "active" ? "member-exclusive-offers" : "membership-plans")?.scrollIntoView({ behavior: "smooth", block: "start" })}>{snapshot.status === "active" ? "View exclusive offers" : "Explore Zama+"}</button></div>
          {snapshot.status === "active" && snapshot.subscription ? <div className="grid gap-3 border-t-2 border-dashed border-brand-forest/25 pt-4 sm:grid-cols-4"><div><span className="text-xs font-bold uppercase tracking-[0.08em] text-brand-black/56">Member since</span><strong className="mt-1 block text-sm text-brand-green-ink">{formatDate(snapshot.subscription.startDate)}</strong></div><div><span className="text-xs font-bold uppercase tracking-[0.08em] text-brand-black/56">Next renewal</span><strong className="mt-1 block text-sm text-brand-green-ink">{formatDate(snapshot.subscription.nextRenewalDate)}</strong></div><div><span className="text-xs font-bold uppercase tracking-[0.08em] text-brand-black/56">Checkout saving</span><strong className="mt-1 block text-sm text-brand-green-ink">{snapshot.memberDiscountPercent}% off</strong></div><div><span className="text-xs font-bold uppercase tracking-[0.08em] text-brand-black/56">Savings to date</span><strong className="mt-1 block text-sm text-brand-green-ink">{formatMoney(snapshot.savingsTotal)}</strong></div></div> : null}
          {snapshot.status === "pending" && snapshot.request ? <div className="grid gap-2 rounded-wobbly-md border-2 border-brand-orange-ink bg-brand-buff p-3 text-sm text-brand-black"><strong>Payment verification in progress</strong><span>Reference: {snapshot.request.paymentReference} · Submitted {formatDate(snapshot.request.submittedAt)}</span><span>We’ll notify you in your account when your membership is approved.</span></div> : null}
          {snapshot.status === "rejected" && snapshot.request?.rejectionReason ? <div className="rounded-wobbly-md border-2 border-brand-orange bg-brand-orange/10 p-3 text-sm text-brand-black"><strong>Admin note:</strong> {snapshot.request.rejectionReason}</div> : null}
        </section>
      ) : null}

      {snapshot?.status === "active" && currentPlan ? <><MemberBenefits plan={currentPlan} /><MembershipDeliveryPanel email={profile.email} plan={currentPlan} customerArea={profile.area} customerAddress={profile.address} /></> : null}

      {canRequest && plans.length > 0 ? <section id="membership-plans" className="grid gap-4 scroll-mt-26" aria-labelledby="membership-plans-title"><div className="grid gap-1"><span className="text-xs font-bold uppercase tracking-[0.1em] text-brand-orange-ink">{snapshot?.status === "rejected" ? "Try again" : "Choose your plan"}</span><h2 id="membership-plans-title" className="font-primary text-2xl font-bold text-brand-green-ink">Join Zama+</h2><p className="text-sm text-brand-black/68">Choose a plan, transfer the amount, and submit your reference for verification.</p></div><div className="grid gap-4 lg:grid-cols-2">{plans.map((plan) => <PlanCard key={plan.id} plan={plan} selected={plan.id === selectedPlanId} onSelect={() => setSelectedPlanId(plan.id)} />)}</div><RequestForm plans={plans} selectedPlanId={selectedPlanId} onPlanChange={setSelectedPlanId} email={profile.email} onSuccess={(nextSnapshot) => { setSnapshot(nextSnapshot); setSelectedPlanId(nextSnapshot.plan?.id ?? selectedPlanId); }} /></section> : null}

      {snapshot?.status === "active" ? <section id="member-exclusive-offers" className="grid gap-4 scroll-mt-26" aria-labelledby="member-offers-title"><div className="grid gap-1"><span className="text-xs font-bold uppercase tracking-[0.1em] text-brand-orange-ink">Member-only offers</span><h2 id="member-offers-title" className="font-primary text-2xl font-bold text-brand-green-ink">Fresh savings reserved for Zama+</h2><p className="text-sm text-brand-black/68">These offers are shown only in your membership hub. Use one when it gives you a better saving than your automatic member discount.</p></div>{coupons.length === 0 ? <div className="rounded-wobbly-card border-3 border-dashed border-brand-forest/25 bg-brand-warm-white p-5 text-sm text-brand-black/65">New member-only offers will appear here when Zama publishes them. Public coupons stay separate from this membership page.</div> : <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{coupons.slice(0, 3).map((coupon) => <article className="grid gap-2 rounded-wobbly-card border-3 border-brand-forest bg-brand-white p-4 shadow-brand-soft" key={coupon.id}><div className="flex items-start justify-between gap-2"><TicketIcon className="grid h-10 w-10 place-items-center rounded-full border-2 border-brand-forest bg-brand-mint text-lg font-bold text-brand-green-ink" /><span className="select-all rounded-full border border-brand-forest/20 bg-brand-warm-white px-2 py-1 text-xs font-bold text-brand-orange-ink">{coupon.code}</span></div><h3 className="font-primary text-lg font-bold text-brand-green-ink">{coupon.title}</h3><p className="text-sm text-brand-black/68">{coupon.description}</p><p className="text-xs font-bold text-brand-green-ink">Copy this code at checkout</p></article>)}</div>}</section> : null}

      {snapshot?.status === "active" ? <p className="flex items-start gap-2 rounded-wobbly-md border-2 border-dashed border-brand-forest/20 bg-brand-warm-white p-3 text-xs text-brand-black/58"><Banknote className="mt-0.5 h-4 w-4 shrink-0 text-brand-green-ink" />Membership payments are verified manually by Zama. Your active plan and discount are always shown from your account record.</p> : null}
    </div>
  );
}
