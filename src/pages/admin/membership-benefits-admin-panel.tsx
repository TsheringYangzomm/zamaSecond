import { useCallback, useEffect, useMemo, useState } from "react";
import { CalendarClock, Gift, PackageCheck, RefreshCw, ShieldCheck } from "lucide-react";
import { btnOutlineSm, btnPrimarySm } from "../../components/ui/styles";
import { archiveMembershipFreebieCampaign, eligibleMembershipDeliveryProducts, fetchAdminMembershipDelivery, processMembershipDueCycles, reviewMembershipDeliveryCycle, saveMembershipFreebieCampaign } from "../../membership/membership-benefits-api";
import { getMembershipProofUrl } from "../../membership/membership-api";
import type { AdminMembershipDeliverySnapshot, MembershipFreebieCampaignDraft, MembershipPlan } from "../../membership/membership-types";

function money(value: number): string {
  return `Nu. ${new Intl.NumberFormat("en-BT").format(value)}`;
}

function shortDate(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat("en-BT", { timeZone: "Asia/Thimphu", day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", hour12: false }).format(date);
}

function statusClass(status: string): string {
  if (status === "paid" || status === "active") return "border-brand-forest bg-brand-mint text-brand-green-ink";
  if (status === "payment_submitted" || status === "needs_admin_resolution") return "border-brand-orange-ink bg-brand-yellow text-brand-orange-ink";
  if (status === "skipped" || status === "cancelled") return "border-brand-black/20 bg-brand-warm-white text-brand-black/60";
  return "border-brand-forest/20 bg-brand-white text-brand-green-ink";
}

function initialCampaign(plans: MembershipPlan[]): MembershipFreebieCampaignDraft {
  return {
    planId: plans.find((plan) => plan.status === "active")?.id ?? "",
    productId: "",
    startsAt: new Date().toISOString(),
    endsAt: null,
    status: "draft",
  };
}

function toDateTimeLocal(value: string | null): string {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Thimphu",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const part = (kind: string) => parts.find((item) => item.type === kind)?.value ?? "00";
  return `${part("year")}-${part("month")}-${part("day")}T${part("hour")}:${part("minute")}`;
}

function toIso(value: string): string {
  const date = new Date(value.length === 16 ? `${value}:00+06:00` : value);
  return Number.isNaN(date.getTime()) ? value : date.toISOString();
}

export function MembershipBenefitsAdminPanel({ plans, adminEmail }: { plans: MembershipPlan[]; adminEmail: string }) {
  const [snapshot, setSnapshot] = useState<AdminMembershipDeliverySnapshot>({ profiles: [], cycles: [], freebieCampaigns: [] });
  const [draft, setDraft] = useState<MembershipFreebieCampaignDraft>(() => initialCampaign(plans));
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const products = useMemo(() => eligibleMembershipDeliveryProducts(), []);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setSnapshot(await fetchAdminMembershipDelivery());
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Scheduled delivery data could not be loaded.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void processMembershipDueCycles()
      .catch(() => undefined)
      .finally(() => { void refresh(); });
  }, [refresh]);
  useEffect(() => {
    setDraft((current) => current.planId ? current : initialCampaign(plans));
  }, [plans]);

  async function processDue() {
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      await processMembershipDueCycles();
      await refresh();
      setNotice("Due invoice, cutoff, and early-access checks were processed.");
    } catch (processError) {
      setError(processError instanceof Error ? processError.message : "Due cycles could not be processed.");
    } finally {
      setBusy(false);
    }
  }

  async function saveCampaign() {
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      await saveMembershipFreebieCampaign({ ...draft, startsAt: toIso(draft.startsAt), endsAt: draft.endsAt ? toIso(draft.endsAt) : null });
      await refresh();
      setNotice("Freebie campaign saved. It will be added at Nu. 0 only after a scheduled-box payment is verified.");
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "The freebie campaign could not be saved.");
    } finally {
      setBusy(false);
    }
  }

  async function archiveCampaign(campaignId: string) {
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      await archiveMembershipFreebieCampaign(campaignId);
      await refresh();
      setNotice("Freebie campaign archived. It will not be added to future paid cycles.");
    } catch (archiveError) {
      setError(archiveError instanceof Error ? archiveError.message : "The freebie campaign could not be archived.");
    } finally {
      setBusy(false);
    }
  }

  async function review(cycleId: string, status: "paid" | "skipped" | "needs_admin_resolution") {
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      await reviewMembershipDeliveryCycle(cycleId, { status }, adminEmail);
      await refresh();
      setNotice(status === "paid" ? "Payment verified and a normal order was created." : status === "skipped" ? "The delivery cycle was skipped and the customer was notified." : "The cycle is flagged for admin resolution.");
    } catch (reviewError) {
      setError(reviewError instanceof Error ? reviewError.message : "The delivery cycle could not be updated.");
    } finally {
      setBusy(false);
    }
  }

  async function viewProof(path: string | null) {
    if (!path || path.startsWith("dev/")) return;
    setError(null);
    try {
      const url = await getMembershipProofUrl(path);
      if (!url) throw new Error("The payment proof is unavailable or you no longer have access to it.");
      window.open(url, "_blank", "noopener,noreferrer");
    } catch (proofError) {
      setError(proofError instanceof Error ? proofError.message : "The payment proof could not be opened.");
    }
  }

  const activePlans = plans.filter((plan) => plan.status === "active" && plan.freebieEnabled);
  const urgent = snapshot.cycles.filter((cycle) => cycle.status === "payment_submitted" || cycle.status === "needs_admin_resolution");

  return (
    <section className="grid gap-4 rounded-wobbly-card border-3 border-brand-forest bg-brand-warm-white p-4 shadow-brand-soft sm:p-5" aria-labelledby="membership-service-title">
      <div className="flex flex-wrap items-start justify-between gap-3"><div className="grid gap-1"><span className="text-xs font-bold uppercase tracking-[0.1em] text-brand-orange-ink">Zama+ service hub</span><h2 id="membership-service-title" className="font-primary text-2xl font-bold text-brand-green-ink">Saved boxes, invoices & member extras</h2><p className="max-w-170 text-sm text-brand-black/68">Manage recurring boxes, verify their bank-transfer invoices, configure per-plan freebies, and run the fallback processing check when scheduled jobs are unavailable.</p></div><button className={btnOutlineSm} type="button" disabled={busy} onClick={() => void processDue()}><RefreshCw className="h-4 w-4" /> Process due cycles</button></div>
      {error ? <p className="rounded-wobbly-md border-2 border-dashed border-brand-orange bg-brand-orange/10 p-3 text-sm font-semibold text-brand-black" role="alert">{error}</p> : null}
      {notice ? <p className="rounded-wobbly-md border-2 border-brand-forest bg-brand-mint p-3 text-sm font-semibold text-brand-green-ink" role="status">{notice}</p> : null}

      <div className="grid gap-3 rounded-wobbly-md border-2 border-dashed border-brand-forest/28 bg-brand-white p-4"><div className="flex items-center gap-2"><Gift className="h-5 w-5 text-brand-green-ink" /><h3 className="font-primary text-xl font-bold text-brand-green-ink">One freebie per paid delivery cycle</h3></div><p className="text-sm text-brand-black/64">Use one active in-stock catalog product. Zama never substitutes an unavailable gift automatically.</p><div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4"><label className="grid gap-1 text-xs font-bold uppercase tracking-[0.08em] text-brand-green-ink">Plan<select className="min-h-10 rounded-wobbly-md border-2 border-brand-forest bg-brand-white px-3 text-sm font-normal text-brand-black" value={draft.planId} onChange={(event) => setDraft((current) => ({ ...current, planId: event.target.value }))}><option value="">Choose plan</option>{activePlans.map((plan) => <option key={plan.id} value={plan.id}>{plan.name}</option>)}</select></label><label className="grid gap-1 text-xs font-bold uppercase tracking-[0.08em] text-brand-green-ink">Freebie product<select className="min-h-10 rounded-wobbly-md border-2 border-brand-forest bg-brand-white px-3 text-sm font-normal text-brand-black" value={draft.productId} onChange={(event) => setDraft((current) => ({ ...current, productId: event.target.value }))}><option value="">Choose product</option>{products.map((product) => <option key={product.id} value={product.id}>{product.name}</option>)}</select></label><label className="grid gap-1 text-xs font-bold uppercase tracking-[0.08em] text-brand-green-ink">Starts<input className="min-h-10 rounded-wobbly-md border-2 border-brand-forest bg-brand-white px-3 text-sm font-normal text-brand-black" type="datetime-local" value={toDateTimeLocal(draft.startsAt)} onChange={(event) => setDraft((current) => ({ ...current, startsAt: event.target.value }))} /></label><label className="grid gap-1 text-xs font-bold uppercase tracking-[0.08em] text-brand-green-ink">Ends <span className="normal-case font-normal tracking-normal text-brand-black/55">Optional</span><input className="min-h-10 rounded-wobbly-md border-2 border-brand-forest bg-brand-white px-3 text-sm font-normal text-brand-black" type="datetime-local" value={toDateTimeLocal(draft.endsAt)} onChange={(event) => setDraft((current) => ({ ...current, endsAt: event.target.value || null }))} /></label></div><div className="flex flex-wrap items-center justify-between gap-3"><label className="flex items-center gap-2 text-sm font-bold text-brand-green-ink"><input type="checkbox" checked={draft.status === "active"} onChange={(event) => setDraft((current) => ({ ...current, status: event.target.checked ? "active" : "draft" }))} /> Active now</label><button className={btnPrimarySm} type="button" disabled={busy || activePlans.length === 0} onClick={() => void saveCampaign()}>Save freebie campaign</button></div>{snapshot.freebieCampaigns.length > 0 ? <div className="grid gap-2 border-t-2 border-dashed border-brand-forest/20 pt-3">{snapshot.freebieCampaigns.slice(0, 4).map((campaign) => <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-brand-black/70" key={campaign.id}><span><strong className="text-brand-green-ink">{campaign.productName ?? campaign.productId}</strong> · {plans.find((plan) => plan.id === campaign.planId)?.name ?? campaign.planId}</span><span className="flex items-center gap-2"><span className={`rounded-full border px-2 py-0.5 text-xs font-bold ${statusClass(campaign.status)}`}>{campaign.status}</span>{campaign.status !== "archived" ? <button className="text-xs font-bold text-brand-orange-ink underline decoration-dashed underline-offset-4 disabled:opacity-45" type="button" disabled={busy} onClick={() => void archiveCampaign(campaign.id)}>Archive</button> : null}</span></div>)}</div> : null}</div>

      <div className="grid gap-3"><div className="flex flex-wrap items-center justify-between gap-2"><div className="flex items-center gap-2"><ShieldCheck className="h-5 w-5 text-brand-green-ink" /><h3 className="font-primary text-xl font-bold text-brand-green-ink">Payment verification queue</h3></div><span className="rounded-full border-2 border-brand-orange-ink bg-brand-yellow px-2 py-1 text-xs font-bold text-brand-orange-ink">{urgent.length} urgent</span></div>{loading ? <p className="text-sm text-brand-black/60">Loading scheduled delivery data...</p> : snapshot.cycles.length === 0 ? <p className="rounded-wobbly-md border-2 border-dashed border-brand-forest/20 bg-brand-white p-4 text-sm text-brand-black/60">No saved-box cycles have been invoiced yet.</p> : <div className="grid gap-2">{snapshot.cycles.slice(0, 10).map((cycle) => <article className="grid gap-3 rounded-wobbly-md border-2 border-brand-forest/20 bg-brand-white p-3" key={cycle.id}><div className="flex flex-wrap items-start justify-between gap-3"><div className="grid gap-1"><strong className="text-brand-green-ink">{cycle.customerName || "Customer"} · {cycle.deliveryDate}</strong><span className="text-sm text-brand-black/65">{cycle.deliveryTierLabel} · {money(cycle.total)} · {cycle.customerEmail || cycle.customerId}</span><span className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-brand-black/55">Reference: {cycle.paymentReference || "Not submitted"} · Due {shortDate(cycle.paymentDueAt)}{cycle.paymentProofPath && !cycle.paymentProofPath.startsWith("dev/") ? <button className="font-bold text-brand-green-ink underline decoration-dashed underline-offset-4" type="button" onClick={() => void viewProof(cycle.paymentProofPath)}>View receipt</button> : null}</span></div><span className={`rounded-full border-2 px-2 py-1 text-xs font-bold ${statusClass(cycle.status)}`}>{cycle.status.replaceAll("_", " ")}</span></div><p className="text-sm text-brand-black/68">{cycle.items.map((item) => `${item.quantity}× ${item.name}`).join(" · ")}{cycle.freebieProductName ? ` · Freebie: ${cycle.freebieProductName}` : ""}</p>{cycle.adminNote ? <p className="rounded-wobbly-md bg-brand-buff p-2 text-xs text-brand-black"><strong>Note:</strong> {cycle.adminNote}</p> : null}{["payment_submitted", "needs_admin_resolution"].includes(cycle.status) ? <div className="flex flex-wrap gap-2"><button className={btnPrimarySm} type="button" disabled={busy} onClick={() => void review(cycle.id, "paid")}><PackageCheck className="h-4 w-4" /> Verify & create order</button><button className={btnOutlineSm} type="button" disabled={busy} onClick={() => void review(cycle.id, "needs_admin_resolution")}>Keep for review</button><button className="min-h-10 rounded-full border-2 border-brand-orange-ink bg-brand-white px-3 py-1 text-xs font-bold text-brand-orange-ink" type="button" disabled={busy} onClick={() => void review(cycle.id, "skipped")}>Skip cycle</button></div> : null}</article>)}</div>}</div>

      <div className="grid gap-3"><div className="flex items-center gap-2"><CalendarClock className="h-5 w-5 text-brand-green-ink" /><h3 className="font-primary text-xl font-bold text-brand-green-ink">Active saved-box profiles</h3></div>{loading ? null : snapshot.profiles.length === 0 ? <p className="rounded-wobbly-md border-2 border-dashed border-brand-forest/20 bg-brand-white p-4 text-sm text-brand-black/60">No member has created a recurring saved box yet.</p> : <div className="grid gap-2 sm:grid-cols-2">{snapshot.profiles.slice(0, 8).map((profile) => <article className="grid gap-1 rounded-wobbly-md border-2 border-brand-forest/20 bg-brand-white p-3" key={profile.id}><div className="flex items-center justify-between gap-2"><strong className="text-brand-green-ink">{profile.customerName || "Customer"}</strong><span className={`rounded-full border px-2 py-0.5 text-xs font-bold ${statusClass(profile.status)}`}>{profile.status}</span></div><span className="text-sm text-brand-black/65">{profile.planName} · next: {profile.nextDeliveryDate}</span><span className="text-xs text-brand-black/55">{profile.items.map((item) => `${item.quantity}× ${item.name}`).join(" · ")}</span></article>)}</div>}</div>
    </section>
  );
}
