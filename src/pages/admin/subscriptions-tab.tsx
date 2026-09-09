import { useCallback, useEffect, useMemo, useState } from "react";
import { commerceStore } from "../../admin/commerce-api";
import { subscriptionStatuses, type Subscription, type SubscriptionStatus } from "../../admin/commerce-types";
import { useAdminAuth } from "../../admin/admin-auth";
import {
  archiveMembershipPlan,
  createMembershipPlan,
  fetchAdminMembershipPlans,
  fetchAdminMembershipRequests,
  getMembershipProofUrl,
  reviewMembershipRequest,
  updateMembershipPlan,
} from "../../membership/membership-api";
import type { AdminMembershipRequest, MembershipPlan, MembershipPlanDraft } from "../../membership/membership-types";
import { defaultMembershipDeliveryTiers } from "../../membership/membership-rules";
import { MembershipBenefitsAdminPanel } from "./membership-benefits-admin-panel";
import { btnOutlineSm, btnPrimarySm } from "../../components/ui/styles";
import { ConfirmDialog } from "../../components/ui/confirm-dialog";
import { amountRangeKeyFor, buildAmountRanges, ClearFiltersButton, ColumnFilterDropdown, DATE_RANGES, dateRangeKey } from "./column-filter-dropdown";
import {
  CommerceError,
  CommerceLoading,
  CommerceSectionHeading,
  CommerceStatusBadge,
  DevDataNotice,
  StatusChangeSelect,
  formatDate,
  formatDateTime,
  formatMoney,
  useCommerceStore,
} from "./commerce-shared";

type PendingChange = { subscription: Subscription; status: SubscriptionStatus };

const membershipInputClasses = "min-h-10 w-full rounded-wobbly-md border-2 border-brand-forest bg-brand-white px-3 py-2 text-sm text-brand-black outline-none focus-visible:border-brand-green-ink focus-visible:ring-4 focus-visible:ring-brand-leaf/20";
const membershipTextAreaClasses = membershipInputClasses + " min-h-20";

function emptyMembershipDraft(): MembershipPlanDraft {
  return {
    name: "",
    description: "",
    price: 0,
    cadence: "monthly",
    benefits: [],
    discountPercent: 0,
    deliveryTiers: defaultMembershipDeliveryTiers.map((tier) => ({ ...tier })),
    scheduledDeliveryEnabled: true,
    earlyAccessEnabled: true,
    freebieEnabled: true,
    status: "draft",
    displayOrder: 0,
  };
}

function membershipDraftFromPlan(plan: MembershipPlan): MembershipPlanDraft {
  return {
    name: plan.name,
    description: plan.description,
    price: plan.price,
    cadence: plan.cadence,
    benefits: plan.benefits,
    discountPercent: plan.discountPercent,
    deliveryTiers: plan.deliveryTiers.map((tier) => ({ ...tier })),
    scheduledDeliveryEnabled: plan.scheduledDeliveryEnabled,
    earlyAccessEnabled: plan.earlyAccessEnabled,
    freebieEnabled: plan.freebieEnabled,
    status: plan.status,
    displayOrder: plan.displayOrder,
  };
}

function membershipRequestLabel(status: AdminMembershipRequest["status"]): string {
  return status.charAt(0).toUpperCase() + status.slice(1);
}

export function SubscriptionsTab() {
  const { email: adminEmail } = useAdminAuth();
  const state = useCommerceStore();
  const [query, setQuery] = useState("");
  const [filters, setFilters] = useState({ customer: "", status: "", plan: "", price: "", start: "" });
  const [selected, setSelected] = useState<Subscription | null>(null);
  const [pendingChange, setPendingChange] = useState<PendingChange | null>(null);
  const [busy, setBusy] = useState(false);
  const [membershipPlans, setMembershipPlans] = useState<MembershipPlan[]>([]);
  const [membershipRequests, setMembershipRequests] = useState<AdminMembershipRequest[]>([]);
  const [membershipLoading, setMembershipLoading] = useState(true);
  const [membershipBusy, setMembershipBusy] = useState(false);
  const [membershipError, setMembershipError] = useState<string | null>(null);
  const [membershipNotice, setMembershipNotice] = useState<string | null>(null);
  const [editingMembershipPlan, setEditingMembershipPlan] = useState<string | null>(null);
  const [membershipDraft, setMembershipDraft] = useState<MembershipPlanDraft>(emptyMembershipDraft);
  const [rejectionReasons, setRejectionReasons] = useState<Record<string, string>>({});
  const [proofUrls, setProofUrls] = useState<Record<string, string>>({});

  const data = state.phase === "ready" ? state.data : null;
  const writable = state.phase === "ready" && state.writable;

  const loadMembership = useCallback(async () => {
    setMembershipLoading(true);
    setMembershipError(null);
    try {
      const [plans, requests] = await Promise.all([fetchAdminMembershipPlans(), fetchAdminMembershipRequests()]);
      setMembershipPlans(plans);
      setMembershipRequests(requests);
    } catch (error) {
      setMembershipError(error instanceof Error ? error.message : "Membership data could not be loaded.");
    } finally {
      setMembershipLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadMembership();
  }, [loadMembership]);

  async function saveMembershipPlan() {
    if (!membershipDraft.name.trim()) {
      setMembershipError("Enter a membership plan name.");
      return;
    }
    setMembershipBusy(true);
    setMembershipError(null);
    setMembershipNotice(null);
    try {
      if (editingMembershipPlan) await updateMembershipPlan(editingMembershipPlan, membershipDraft);
      else await createMembershipPlan(membershipDraft);
      setEditingMembershipPlan(null);
      setMembershipDraft(emptyMembershipDraft());
      setMembershipNotice("Membership plan saved.");
      await loadMembership();
    } catch (error) {
      setMembershipError(error instanceof Error ? error.message : "The membership plan could not be saved.");
    } finally {
      setMembershipBusy(false);
    }
  }

  async function archivePlan(plan: MembershipPlan) {
    setMembershipBusy(true);
    setMembershipError(null);
    try {
      await archiveMembershipPlan(plan.id);
      setMembershipNotice(`${plan.name} was archived.`);
      await loadMembership();
    } catch (error) {
      setMembershipError(error instanceof Error ? error.message : "The membership plan could not be archived.");
    } finally {
      setMembershipBusy(false);
    }
  }

  async function handleMembershipReview(request: AdminMembershipRequest, status: "approved" | "rejected") {
    const reason = rejectionReasons[request.id]?.trim() ?? "";
    if (status === "rejected" && !reason) {
      setMembershipError("Add a rejection reason before rejecting a membership request.");
      return;
    }
    setMembershipBusy(true);
    setMembershipError(null);
    setMembershipNotice(null);
    try {
      await reviewMembershipRequest(request.id, status, adminEmail ?? "admin", reason);
      setMembershipNotice(status === "approved" ? "Membership approved and activated." : "Membership request rejected.");
      await loadMembership();
    } catch (error) {
      setMembershipError(error instanceof Error ? error.message : "The membership request could not be updated.");
    } finally {
      setMembershipBusy(false);
    }
  }

  async function openMembershipProof(request: AdminMembershipRequest) {
    if (!request.proofPath) return;
    setMembershipBusy(true);
    try {
      const url = await getMembershipProofUrl(request.proofPath);
      if (url) setProofUrls((current) => ({ ...current, [request.id]: url }));
      else setMembershipError("The private proof image is not available in this environment.");
    } finally {
      setMembershipBusy(false);
    }
  }

  const customerLabel = useCallback((customerId: string): string => {
    if (!data) return customerId;
    const customer = data.customers.find((item) => item.id === customerId);
    return customer?.name ?? customerId;
  }, [data]);

  const customers = useMemo(() => {
    if (!data) return [];
    return [...new Set(data.subscriptions.map((subscription) => customerLabel(subscription.customer_id)).filter(Boolean))].sort();
  }, [data, customerLabel]);

  const plans = useMemo(() => {
    if (!data) return [];
    return [...new Set(data.subscriptions.map((subscription) => subscription.plan).filter(Boolean))].sort();
  }, [data]);

  const priceRanges = useMemo(() => buildAmountRanges((data?.subscriptions ?? []).map((subscription) => subscription.price)), [data]);

  const activeFilterCount = (["customer", "status", "plan", "price", "start"] as const).filter((key) => filters[key] !== "").length;

  const filtered = useMemo(() => {
    if (!data) return [];
    const needle = query.trim().toLowerCase();
    return data.subscriptions.filter((subscription) => {
      if (filters.customer && customerLabel(subscription.customer_id) !== filters.customer) return false;
      if (filters.status && subscription.status !== filters.status) return false;
      if (filters.plan && subscription.plan !== filters.plan) return false;
      if (filters.price && amountRangeKeyFor(priceRanges, subscription.price) !== filters.price) return false;
      if (filters.start && dateRangeKey(subscription.start_date) !== filters.start) return false;
      if (!needle) return true;
      return (
        subscription.id.toLowerCase().includes(needle) ||
        subscription.plan.toLowerCase().includes(needle) ||
        customerLabel(subscription.customer_id).toLowerCase().includes(needle)
      );
    });
  }, [data, query, filters, customerLabel, priceRanges]);

  async function applyStatusChange() {
    if (!pendingChange) return;
    const { subscription, status } = pendingChange;
    setBusy(true);
    try {
      await commerceStore.updateSubscriptionStatus(subscription.id, status);
      setSelected((current) => (current && current.id === subscription.id ? { ...current, status } : current));
    } finally {
      setBusy(false);
      setPendingChange(null);
    }
  }

  if (state.phase === "loading" || state.phase === "idle") {
    return <div className="grid gap-5"><CommerceSectionHeading title="Subscriptions" subtitle="Loading subscriptions..." /><CommerceLoading /></div>;
  }
  if (state.phase === "error") {
    return (
      <div className="grid gap-5">
        <CommerceSectionHeading title="Subscriptions" subtitle="Subscriptions could not be loaded." />
        <CommerceError message={state.message} onRetry={() => void commerceStore.load(true)} />
      </div>
    );
  }

  if (selected) {
    return (
      <div className="grid gap-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="grid gap-1">
            <h1 className="font-primary text-[clamp(1.7rem,3.5vw,2.4rem)] font-bold leading-[1.02] text-brand-green-ink">{selected.id}</h1>
            <p className="text-sm text-brand-black/68">{customerLabel(selected.customer_id)}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button className={btnOutlineSm} type="button" onClick={() => setSelected(null)}>← Back to subscriptions</button>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="grid gap-1 rounded-wobbly-card border-3 border-brand-forest bg-brand-white p-4 shadow-brand-soft">
            <span className="text-xs font-bold uppercase tracking-[0.1em] text-brand-orange-ink">Plan</span>
            <span className="font-bold text-brand-black">{selected.plan}</span>
            <span className="text-sm text-brand-black/68">{formatMoney(selected.price)}</span>
          </div>
          <div className="grid gap-1 rounded-wobbly-card border-3 border-brand-forest bg-brand-white p-4 shadow-brand-soft">
            <span className="text-xs font-bold uppercase tracking-[0.1em] text-brand-orange-ink">Status</span>
            <CommerceStatusBadge status={selected.status} />
          </div>
          <div className="grid gap-1 rounded-wobbly-card border-3 border-brand-forest bg-brand-white p-4 shadow-brand-soft">
            <span className="text-xs font-bold uppercase tracking-[0.1em] text-brand-orange-ink">Start date</span>
            <span className="font-bold text-brand-black">{formatDate(selected.start_date)}</span>
          </div>
          <div className="grid gap-1 rounded-wobbly-card border-3 border-brand-forest bg-brand-white p-4 shadow-brand-soft">
            <span className="text-xs font-bold uppercase tracking-[0.1em] text-brand-orange-ink">Next delivery</span>
            <span className="font-bold text-brand-black">{formatDate(selected.next_delivery_date)}</span>
          </div>
        </div>

        <div className="grid gap-2 rounded-wobbly-card border-3 border-brand-forest bg-brand-white p-4 shadow-brand-soft">
          <span className="text-xs font-bold uppercase tracking-[0.1em] text-brand-orange-ink">History</span>
          <ol className="grid gap-2">
            {[...selected.history].reverse().map((entry, index) => (
              <li className="flex flex-wrap items-center gap-3 text-sm" key={`${entry.at}-${index}`}>
                <CommerceStatusBadge status={entry.status} />
                <span className="text-brand-black/60">{formatDateTime(entry.at)}</span>
              </li>
            ))}
          </ol>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-[0.1em] text-brand-orange-ink">Update status</span>
            <StatusChangeSelect
              value={selected.status}
              options={subscriptionStatuses}
              writable={writable}
              busy={busy}
              onChange={(next) => setPendingChange({ subscription: selected, status: next as SubscriptionStatus })}
            />
            {state.phase === "ready" && !writable ? <span className="text-xs text-brand-black/52">Writes need the live tables.</span> : null}
          </div>
        </div>

        <ConfirmDialog
          open={pendingChange !== null}
          title="Update subscription"
          message={pendingChange ? `Move subscription ${pendingChange.subscription.id} to "${pendingChange.status}"?` : ""}
          confirmLabel="Update"
          busy={busy}
          onConfirm={() => void applyStatusChange()}
          onCancel={() => setPendingChange(null)}
        />
      </div>
    );
  }

  return (
    <div className="grid gap-5">
      <CommerceSectionHeading title="Subscriptions" subtitle={data ? `${data.subscriptions.length} subscription${data.subscriptions.length === 1 ? "" : "s"}` : "Loading subscriptions..."}>
        <button className={btnOutlineSm} type="button" onClick={() => void commerceStore.load(true)} disabled={!data}>Refresh</button>
      </CommerceSectionHeading>

      {state.phase === "ready" && !writable ? <DevDataNotice /> : null}

      <section className="grid gap-4 rounded-wobbly-card border-3 border-brand-forest bg-brand-mint p-4 shadow-brand-soft sm:p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="grid gap-1">
            <span className="text-xs font-bold uppercase tracking-[0.1em] text-brand-orange-ink">Zama+ Membership</span>
            <h2 className="font-primary text-2xl font-bold text-brand-green-ink">Plans & payment requests</h2>
            <p className="max-w-160 text-sm text-brand-black/68">Publish plans, verify bank-transfer references, and activate memberships from one place.</p>
          </div>
          <span className="rounded-full border-2 border-brand-forest bg-brand-white px-3 py-1 text-xs font-bold text-brand-green-ink">{membershipRequests.filter((request) => request.status === "pending").length} pending</span>
        </div>

        {membershipError ? <p className="rounded-wobbly-md border-2 border-dashed border-brand-orange bg-brand-yellow/60 p-3 text-sm font-semibold text-brand-black" role="alert">{membershipError}</p> : null}
        {membershipNotice ? <p className="rounded-wobbly-md border-2 border-brand-forest bg-brand-white p-3 text-sm font-semibold text-brand-green-ink" role="status">{membershipNotice}</p> : null}

        <div className="grid gap-3 rounded-wobbly-md border-2 border-dashed border-brand-forest/35 bg-brand-white p-4">
          <div className="flex flex-wrap items-center justify-between gap-2"><h3 className="font-primary text-xl font-bold text-brand-green-ink">{editingMembershipPlan ? "Edit plan" : "Create a plan"}</h3>{editingMembershipPlan ? <button className={btnOutlineSm} type="button" onClick={() => { setEditingMembershipPlan(null); setMembershipDraft(emptyMembershipDraft()); }}>Cancel edit</button> : null}</div>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="grid gap-1 text-xs font-bold uppercase tracking-[0.08em] text-brand-green-ink">Plan name<input className={membershipInputClasses} value={membershipDraft.name} onChange={(event) => setMembershipDraft((draft) => ({ ...draft, name: event.target.value }))} placeholder="Zama+ Membership" /></label>
            <label className="grid gap-1 text-xs font-bold uppercase tracking-[0.08em] text-brand-green-ink">Price<input className={membershipInputClasses} type="number" min="0" step="0.01" value={membershipDraft.price} onChange={(event) => setMembershipDraft((draft) => ({ ...draft, price: Number(event.target.value) }))} /></label>
            <label className="grid gap-1 text-xs font-bold uppercase tracking-[0.08em] text-brand-green-ink">Cadence<select className={membershipInputClasses} value={membershipDraft.cadence} onChange={(event) => setMembershipDraft((draft) => ({ ...draft, cadence: event.target.value as MembershipPlanDraft["cadence"] }))}><option value="monthly">Monthly</option><option value="annual">Annual</option><option value="one_time">One-time</option></select></label>
            <label className="grid gap-1 text-xs font-bold uppercase tracking-[0.08em] text-brand-green-ink">Automatic discount %<input className={membershipInputClasses} type="number" min="0" max="100" step="0.1" value={membershipDraft.discountPercent} onChange={(event) => setMembershipDraft((draft) => ({ ...draft, discountPercent: Number(event.target.value) }))} /></label>
            <label className="grid gap-1 text-xs font-bold uppercase tracking-[0.08em] text-brand-green-ink sm:col-span-2">Description<textarea className={membershipTextAreaClasses} value={membershipDraft.description} onChange={(event) => setMembershipDraft((draft) => ({ ...draft, description: event.target.value }))} placeholder="Explain the value of this plan." /></label>
            <label className="grid gap-1 text-xs font-bold uppercase tracking-[0.08em] text-brand-green-ink sm:col-span-2">Benefits <span className="font-normal normal-case tracking-normal text-brand-black/55">One benefit per line. Add more detail after a pipe: Benefit title | Short description.</span><textarea className={membershipTextAreaClasses} value={membershipDraft.benefits.map((benefit) => benefit.description ? `${benefit.title} | ${benefit.description}` : benefit.title).join("\n")} onChange={(event) => setMembershipDraft((draft) => ({ ...draft, benefits: event.target.value.split("\n").map((line) => line.trim()).filter(Boolean).map((line) => { const [title, ...description] = line.split("|"); return { title: title.trim(), description: description.join("|").trim() }; }) }))} placeholder="Automatic savings\nMember-only offers" /></label>
            <fieldset className="grid gap-2 rounded-wobbly-md border-2 border-dashed border-brand-forest/25 bg-brand-warm-white p-3 sm:col-span-2"><legend className="px-1 text-xs font-bold uppercase tracking-[0.08em] text-brand-green-ink">Zama+ service benefits</legend><div className="flex flex-wrap gap-3 text-sm text-brand-black"><label className="flex items-center gap-2"><input type="checkbox" checked={membershipDraft.scheduledDeliveryEnabled} onChange={(event) => setMembershipDraft((draft) => ({ ...draft, scheduledDeliveryEnabled: event.target.checked }))} /> Saved-box delivery</label><label className="flex items-center gap-2"><input type="checkbox" checked={membershipDraft.earlyAccessEnabled} onChange={(event) => setMembershipDraft((draft) => ({ ...draft, earlyAccessEnabled: event.target.checked }))} /> Early product access</label><label className="flex items-center gap-2"><input type="checkbox" checked={membershipDraft.freebieEnabled} onChange={(event) => setMembershipDraft((draft) => ({ ...draft, freebieEnabled: event.target.checked }))} /> One freebie per paid cycle</label></div><div className="grid gap-2 md:grid-cols-3">{membershipDraft.deliveryTiers.map((tier, index) => <div className="grid gap-1 rounded-wobbly-md border-2 border-brand-forest/18 bg-brand-white p-2" key={tier.id}><label className="flex items-center gap-2 text-xs font-bold text-brand-green-ink"><input type="checkbox" checked={tier.enabled} onChange={(event) => setMembershipDraft((draft) => ({ ...draft, deliveryTiers: draft.deliveryTiers.map((item, itemIndex) => itemIndex === index ? { ...item, enabled: event.target.checked } : item) }))} /> {tier.label}</label><label className="text-xs text-brand-black/60">Fee (Nu.)<input className={membershipInputClasses + " mt-1"} type="number" min="0" value={tier.fee} onChange={(event) => setMembershipDraft((draft) => ({ ...draft, deliveryTiers: draft.deliveryTiers.map((item, itemIndex) => itemIndex === index ? { ...item, fee: Math.max(0, Number(event.target.value)) } : item) }))} /></label></div>)}</div><p className="text-xs text-brand-black/55">Priority delivery is fulfilled first when capacity allows; standard and low-cost delivery use the fees configured above.</p></fieldset>
            <label className="grid gap-1 text-xs font-bold uppercase tracking-[0.08em] text-brand-green-ink">Status<select className={membershipInputClasses} value={membershipDraft.status} onChange={(event) => setMembershipDraft((draft) => ({ ...draft, status: event.target.value as MembershipPlanDraft["status"] }))}><option value="active">Active</option><option value="draft">Draft</option><option value="archived">Archived</option></select></label>
            <label className="grid gap-1 text-xs font-bold uppercase tracking-[0.08em] text-brand-green-ink">Display order<input className={membershipInputClasses} type="number" min="0" step="1" value={membershipDraft.displayOrder} onChange={(event) => setMembershipDraft((draft) => ({ ...draft, displayOrder: Number(event.target.value) }))} /></label>
          </div>
          <button className={btnPrimarySm} type="button" disabled={membershipBusy} onClick={() => void saveMembershipPlan()}>{membershipBusy ? "Saving..." : editingMembershipPlan ? "Save plan" : "Create plan"}</button>
        </div>

        {membershipLoading ? <p className="text-sm text-brand-black/60">Loading membership plans and requests...</p> : <>
          <div className="grid gap-2">
            <h3 className="font-primary text-xl font-bold text-brand-green-ink">Published plans</h3>
            {membershipPlans.length === 0 ? <p className="text-sm text-brand-black/60">No membership plans yet.</p> : <div className="grid gap-2 sm:grid-cols-2">{membershipPlans.map((plan) => <div className="flex items-start justify-between gap-3 rounded-wobbly-md border-2 border-brand-forest/20 bg-brand-white p-3" key={plan.id}><div className="grid min-w-0 gap-1"><strong className="text-brand-green-ink">{plan.name}</strong><span className="text-sm text-brand-black/68">{formatMoney(plan.price)} · {plan.discountPercent}% discount · {plan.status}</span><span className="text-xs text-brand-black/55">{plan.benefits.length} benefit{plan.benefits.length === 1 ? "" : "s"}</span></div><div className="flex shrink-0 flex-wrap justify-end gap-1.5"><button className={btnOutlineSm} type="button" disabled={membershipBusy} onClick={() => { setEditingMembershipPlan(plan.id); setMembershipDraft(membershipDraftFromPlan(plan)); }}>Edit</button>{plan.status !== "archived" ? <button className="min-h-9 rounded-full border-2 border-brand-orange-ink px-3 py-1 text-xs font-bold text-brand-orange-ink" type="button" disabled={membershipBusy} onClick={() => void archivePlan(plan)}>Archive</button> : null}</div></div>)}</div>}
          </div>
          <div className="grid gap-2">
            <div className="flex flex-wrap items-center justify-between gap-2"><h3 className="font-primary text-xl font-bold text-brand-green-ink">Payment verification queue</h3><span className="text-sm text-brand-black/55">Newest first</span></div>
            {membershipRequests.length === 0 ? <p className="text-sm text-brand-black/60">No membership requests yet.</p> : <div className="grid gap-2">{membershipRequests.map((request) => <article className="grid gap-3 rounded-wobbly-md border-2 border-brand-forest/20 bg-brand-white p-3" key={request.id}><div className="flex flex-wrap items-start justify-between gap-3"><div className="grid gap-1"><strong className="text-brand-green-ink">{request.customerName || "Customer"}</strong><span className="text-sm text-brand-black/65">{request.customerEmail} · {request.plan?.name ?? request.planId}</span><span className="text-xs text-brand-black/55">Submitted {formatDateTime(request.submittedAt)} · {request.paymentMethod}</span></div><span className={`rounded-full border-2 px-2 py-1 text-xs font-bold ${request.status === "approved" ? "border-brand-forest bg-brand-mint text-brand-green-ink" : request.status === "pending" ? "border-brand-orange-ink bg-brand-yellow text-brand-orange-ink" : "border-brand-black/25 bg-brand-warm-white text-brand-black/60"}`}>{membershipRequestLabel(request.status)}</span></div><div className="grid gap-1 text-sm"><span><strong>Transfer reference:</strong> {request.paymentReference}</span>{request.proofPath ? <span className="flex flex-wrap items-center gap-2 text-brand-black/60"><strong>Proof:</strong> attached privately {proofUrls[request.id] ? <a className="font-bold text-brand-green-ink underline" href={proofUrls[request.id]} target="_blank" rel="noreferrer">Open image</a> : <button className="font-bold text-brand-green-ink underline" type="button" disabled={membershipBusy} onClick={() => void openMembershipProof(request)}>View proof</button>}</span> : <span className="text-brand-black/55">No proof image attached</span>}{request.rejectionReason ? <span className="text-brand-orange-ink"><strong>Reason:</strong> {request.rejectionReason}</span> : null}</div>{request.status === "pending" ? <div className="grid gap-2 sm:grid-cols-[1fr_auto_auto]"><input className={membershipInputClasses} value={rejectionReasons[request.id] ?? ""} onChange={(event) => setRejectionReasons((current) => ({ ...current, [request.id]: event.target.value }))} placeholder="Required only when rejecting" aria-label={`Rejection reason for ${request.customerName || request.customerEmail}`} /><button className={btnOutlineSm} type="button" disabled={membershipBusy} onClick={() => void handleMembershipReview(request, "rejected")}>Reject</button><button className={btnPrimarySm} type="button" disabled={membershipBusy} onClick={() => void handleMembershipReview(request, "approved")}>Approve</button></div> : null}</article>)}</div>}
          </div>
        </>}
      </section>

      <MembershipBenefitsAdminPanel plans={membershipPlans} adminEmail={adminEmail ?? "admin"} />

      <div className="grid gap-3">
        <input
          className="min-h-11.5 w-full rounded-[18px_12px_16px_10px/12px_18px_10px_16px] border-3 border-brand-forest bg-brand-white px-4 py-[0.65rem] text-brand-black shadow-brand-soft outline-none placeholder:text-brand-black/46 focus-visible:border-brand-green-ink focus-visible:ring-4 focus-visible:ring-brand-leaf/20"
          type="search"
          aria-label="Search subscriptions"
          placeholder="Search by customer, plan, or subscription ID..."
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
        <div className="flex flex-wrap items-center gap-2">
          <ColumnFilterDropdown label="Customer" options={customers} value={filters.customer} onSelect={(v) => setFilters((f) => ({ ...f, customer: v }))} />
          <ColumnFilterDropdown label="Status" options={subscriptionStatuses} value={filters.status} onSelect={(v) => setFilters((f) => ({ ...f, status: v }))} />
          <ColumnFilterDropdown label="Plan" options={plans} value={filters.plan} onSelect={(v) => setFilters((f) => ({ ...f, plan: v }))} />
          <ColumnFilterDropdown label="Price" options={priceRanges} value={filters.price} onSelect={(v) => setFilters((f) => ({ ...f, price: v }))} />
          <ColumnFilterDropdown label="Start" options={DATE_RANGES} value={filters.start} onSelect={(v) => setFilters((f) => ({ ...f, start: v }))} allLabel="Any date" />
          <ClearFiltersButton count={activeFilterCount} onClear={() => setFilters({ customer: "", status: "", plan: "", price: "", start: "" })} />
        </div>
      </div>

      {data === null ? (
        <p className="rounded-wobbly-card border-3 border-dashed border-brand-forest/30 bg-brand-white p-6 text-center text-sm font-semibold text-brand-black/64">Loading subscriptions...</p>
      ) : data.subscriptions.length === 0 ? (
        <p className="rounded-wobbly-card border-3 border-dashed border-brand-forest/30 bg-brand-white p-6 text-center text-sm font-semibold text-brand-black/64">No subscriptions yet.</p>
      ) : filtered.length === 0 ? (
        <p className="rounded-wobbly-card border-3 border-dashed border-brand-forest/30 bg-brand-white p-6 text-center text-sm font-semibold text-brand-black/64">No subscriptions match the current search or filter.</p>
      ) : (
        <div className="overflow-x-auto rounded-wobbly-card border-3 border-brand-forest bg-brand-white shadow-brand-soft">
          <table className="w-full min-w-170 border-collapse text-left">
            <caption className="sr-only">Subscriptions</caption>
            <thead>
              <tr className="border-b-3 border-dashed border-brand-forest/30 bg-brand-warm-white text-xs font-bold uppercase tracking-[0.08em] text-brand-green-ink">
                <th className="px-4 py-3">Subscription</th>
                <th className="px-4 py-3">Customer</th>
                <th className="px-4 py-3">Plan</th>
                <th className="px-4 py-3">Price</th>
                <th className="px-4 py-3">Start</th>
                <th className="px-4 py-3">Next delivery</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((subscription) => (
                <tr className="border-b-2 border-dashed border-brand-forest/16 text-sm last:border-b-0" key={subscription.id}>
                  <td className="px-4 py-3 font-bold text-brand-black">{subscription.id}</td>
                  <td className="px-4 py-3 text-brand-black/72">{customerLabel(subscription.customer_id)}</td>
                  <td className="px-4 py-3 text-brand-black/72">{subscription.plan}</td>
                  <td className="px-4 py-3 text-brand-black/72">{formatMoney(subscription.price)}</td>
                  <td className="px-4 py-3 text-brand-black/72">{formatDate(subscription.start_date)}</td>
                  <td className="px-4 py-3 text-brand-black/72">{formatDate(subscription.next_delivery_date)}</td>
                  <td className="px-4 py-3"><CommerceStatusBadge status={subscription.status} /></td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-2">
                      <button className="min-h-9 touch-manipulation rounded-full border-2 border-brand-forest px-3 py-1 text-xs font-bold text-brand-forest hover:bg-brand-yellow focus-visible:outline focus-visible:outline-3 focus-visible:outline-dashed focus-visible:outline-brand-green-ink focus-visible:outline-offset-2" type="button" onClick={() => setSelected(subscription)}>View</button>
                      <StatusChangeSelect
                        value={subscription.status}
                        options={subscriptionStatuses}
                        writable={writable}
                        busy={busy}
                        onChange={(next) => setPendingChange({ subscription, status: next as SubscriptionStatus })}
                      />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <ConfirmDialog
        open={pendingChange !== null}
        title="Update subscription"
        message={pendingChange ? `Move subscription ${pendingChange.subscription.id} to "${pendingChange.status}"?` : ""}
        confirmLabel="Update"
        busy={busy}
        onConfirm={() => void applyStatusChange()}
        onCancel={() => setPendingChange(null)}
      />
    </div>
  );
}
