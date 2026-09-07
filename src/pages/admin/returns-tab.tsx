import { useEffect, useMemo, useState } from "react";
import { useAdminAuth } from "../../admin/admin-auth";
import { listAdminReturns, updateAdminReturn } from "../../returns/returns-api";
import { returnReasonLabel, type AdminReturnRequest, type AdminReturnUpdateInput, type ReturnStatus } from "../../returns/returns-types";
import { btnOutlineSm, btnPrimarySm } from "../../components/ui/styles";
import {
  CommerceError,
  CommerceLoading,
  CommerceSectionHeading,
  CommerceStatusBadge,
  DevDataNotice,
  formatCompactDateTime,
  formatMoney,
} from "./commerce-shared";

type StatusFilter = "all" | ReturnStatus;
type RefundDraft = { amount: string; method: string; pickupDate: string; pickupStart: string; pickupEnd: string; rejectionReason: string };
const statusOptions: StatusFilter[] = ["all", "pending", "approved", "rejected", "refunded", "cancelled"];

function statusLabel(status: StatusFilter): string { return status === "all" ? "All returns" : status.charAt(0).toUpperCase() + status.slice(1); }
function defaultRefundMethod(item: AdminReturnRequest): string { return item.refundMethod?.trim() || (item.paymentMethod ? `Original ${item.paymentMethod}` : "Original payment method"); }
function itemSummary(item: AdminReturnRequest): string { return item.items.map((entry) => `${entry.quantity}× ${entry.name}`).join(", "); }

function pickupParts(item: AdminReturnRequest): Pick<RefundDraft, "pickupDate" | "pickupStart" | "pickupEnd"> {
  if (!item.pickupWindowStart || !item.pickupWindowEnd) return { pickupDate: "", pickupStart: "", pickupEnd: "" };
  const dateFormatter = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Thimphu", year: "numeric", month: "2-digit", day: "2-digit" });
  const timeFormatter = new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Thimphu", hour: "2-digit", minute: "2-digit", hour12: false });
  return { pickupDate: dateFormatter.format(new Date(item.pickupWindowStart)), pickupStart: timeFormatter.format(new Date(item.pickupWindowStart)), pickupEnd: timeFormatter.format(new Date(item.pickupWindowEnd)) };
}

function draftFor(item: AdminReturnRequest): RefundDraft {
  return { amount: item.refundAmount == null ? "" : String(item.refundAmount), method: defaultRefundMethod(item), ...pickupParts(item), rejectionReason: item.rejectionReason ?? "" };
}

function pickupIso(date: string, time: string): string | null {
  if (!date || !time) return null;
  const value = new Date(`${date}T${time}:00+06:00`);
  return Number.isNaN(value.getTime()) ? null : value.toISOString();
}

export function ReturnsTab() {
  const { email: adminEmail } = useAdminAuth();
  const [result, setResult] = useState<{ mode: "live" | "dev"; returns: AdminReturnRequest[] } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<StatusFilter>("all");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Record<string, RefundDraft>>({});

  async function loadReturns() {
    setLoading(true); setError(null);
    try {
      const next = await listAdminReturns();
      setResult(next);
      setDrafts((current) => {
        const merged = { ...current };
        for (const item of next.returns) if (!merged[item.id]) merged[item.id] = draftFor(item);
        return merged;
      });
    } catch (loadError) { setError(loadError instanceof Error ? loadError.message : "Returns could not be loaded."); }
    finally { setLoading(false); }
  }

  useEffect(() => { void loadReturns(); }, []);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return (result?.returns ?? []).filter((item) => {
      if (filter !== "all" && item.status !== filter) return false;
      if (!needle) return true;
      return [item.id, item.orderId, item.customerName, item.customerEmail, item.note, item.rejectionReason ?? "", itemSummary(item)].some((value) => value.toLowerCase().includes(needle));
    });
  }, [filter, query, result]);

  async function updateStatus(item: AdminReturnRequest, status: Exclude<ReturnStatus, "pending">) {
    if (!adminEmail || busyId) return;
    const draft = drafts[item.id] ?? draftFor(item);
    setBusyId(item.id); setNotice(null);
    try {
      const amount = draft.amount.trim() ? Number(draft.amount) : item.refundAmount;
      if (amount != null && (!Number.isFinite(amount) || amount < 0)) throw new Error("Refund amount must be zero or greater.");
      const pickupWindowStart = status === "approved" ? pickupIso(draft.pickupDate, draft.pickupStart) : item.pickupWindowStart;
      const pickupWindowEnd = status === "approved" ? pickupIso(draft.pickupDate, draft.pickupEnd) : item.pickupWindowEnd;
      if (status === "approved" && (!pickupWindowStart || !pickupWindowEnd)) throw new Error("Choose a pickup date, start time, and end time before approving.");
      if (status === "approved" && new Date(pickupWindowStart as string) >= new Date(pickupWindowEnd as string)) throw new Error("Pickup start time must be earlier than the end time.");
      const rejectionReason = status === "rejected" ? draft.rejectionReason.trim() : null;
      if (status === "rejected" && !rejectionReason) throw new Error("Add a reason before rejecting this return.");
      const input: AdminReturnUpdateInput = { status, refundAmount: amount, refundMethod: draft.method.trim() || null, pickupWindowStart, pickupWindowEnd, rejectionReason };
      const updateResult = await updateAdminReturn(item.id, input, adminEmail);
      const updated = { ...item, status, refundAmount: amount, refundMethod: input.refundMethod, pickupWindowStart, pickupWindowEnd, rejectionReason, reviewedAt: new Date().toISOString(), reviewedBy: adminEmail, updatedAt: new Date().toISOString() };
      setResult((current) => current ? { ...current, returns: current.returns.map((entry) => entry.id === item.id ? updated : entry) } : current);
      setNotice(updateResult.notificationStatus === "failed" ? `Return ${item.orderId} was updated, but the account notification could not be created${updateResult.notificationError ? `: ${updateResult.notificationError}` : "."}` : `Return ${item.orderId} was marked ${status}. The customer was notified in their account.`);
    } catch (updateError) { setNotice(updateError instanceof Error ? updateError.message : "The return could not be updated."); }
    finally { setBusyId(null); }
  }

  const counts = useMemo(() => {
    const items = result?.returns ?? [];
    return Object.fromEntries(statusOptions.map((status) => [status, status === "all" ? items.length : items.filter((item) => item.status === status).length])) as Record<StatusFilter, number>;
  }, [result]);

  if (loading) return <div className="grid gap-5"><CommerceSectionHeading title="Returns" subtitle="Loading return requests..." /><CommerceLoading /></div>;
  if (error) return <div className="grid gap-5"><CommerceSectionHeading title="Returns" subtitle="Return requests could not be loaded." /><CommerceError message={error} onRetry={() => void loadReturns()} /></div>;

  return (
    <div className="grid gap-5">
      <CommerceSectionHeading title="Returns" subtitle={`${result?.returns.length ?? 0} return request${result?.returns.length === 1 ? "" : "s"}`}><button className={btnOutlineSm} type="button" onClick={() => void loadReturns()}>Refresh</button></CommerceSectionHeading>
      {result?.mode === "dev" ? <DevDataNotice /> : null}
      <div className="grid gap-3 rounded-wobbly-card border-3 border-brand-forest bg-brand-white p-4 shadow-brand-soft">
        <input className="min-h-11.5 w-full rounded-[18px_16px_10px/12px_18px_10px_16px] border-3 border-brand-forest bg-brand-white px-4 py-[0.65rem] text-brand-black shadow-brand-soft outline-none placeholder:text-brand-black/46 focus-visible:border-brand-green-ink focus-visible:ring-4 focus-visible:ring-brand-leaf/20" type="search" aria-label="Search returns" placeholder="Search by order, customer, or item..." value={query} onChange={(event) => setQuery(event.target.value)} />
        <div className="flex flex-wrap gap-2" role="tablist" aria-label="Return status filters">{statusOptions.map((status) => <button className={`rounded-full border-2 px-3 py-1.5 text-xs font-bold ${filter === status ? "border-brand-forest bg-brand-forest text-brand-white" : "border-brand-forest/20 bg-brand-warm-white text-brand-green-ink hover:bg-brand-yellow"}`} key={status} type="button" role="tab" aria-selected={filter === status} onClick={() => setFilter(status)}>{statusLabel(status)} <span className="opacity-70">{counts[status]}</span></button>)}</div>
      </div>
      {notice ? <p className="rounded-wobbly-card border-3 border-brand-forest bg-brand-mint p-4 text-sm font-semibold text-brand-green-ink" role="status">{notice}</p> : null}
      {filtered.length === 0 ? <p className="rounded-wobbly-card border-3 border-dashed border-brand-forest/30 bg-brand-white p-6 text-center text-sm font-semibold text-brand-black/64">No return requests match the current view.</p> : <div className="grid gap-4">
        {filtered.map((item) => {
          const draft = drafts[item.id] ?? draftFor(item);
          const open = item.status === "pending" || item.status === "approved";
          const canApprove = open;
          const canRefund = item.status === "approved";
          const canCancel = open;
          const setDraft = (patch: Partial<RefundDraft>) => setDrafts((current) => ({ ...current, [item.id]: { ...draft, ...patch } }));
          return <article className="grid gap-4 rounded-wobbly-card border-3 border-brand-forest bg-brand-white p-4 shadow-brand-soft" key={item.id}>
            <div className="flex flex-wrap items-start justify-between gap-3"><div className="grid min-w-0 gap-1"><div className="flex flex-wrap items-center gap-2"><span className="font-bold text-brand-green-ink">{item.orderId}</span><CommerceStatusBadge status={item.status} /></div><p className="text-sm text-brand-black/68">{item.customerName} · {item.customerEmail || "No email"}</p><p className="text-xs text-brand-black/56">Requested {formatCompactDateTime(item.requestedAt)} · Return ID {item.id}</p></div><span className="font-primary text-xl font-bold text-brand-orange-ink">{item.refundAmount == null ? "Amount pending" : formatMoney(item.refundAmount)}</span></div>
            <div className="grid gap-3 rounded-wobbly-md border-2 border-dashed border-brand-forest/20 bg-brand-warm-white p-3 text-sm sm:grid-cols-2"><div className="grid gap-1"><span className="text-xs font-bold uppercase tracking-[0.08em] text-brand-orange-ink">Items</span><span className="text-brand-black/72">{itemSummary(item) || "No items recorded"}</span></div><div className="grid gap-1"><span className="text-xs font-bold uppercase tracking-[0.08em] text-brand-orange-ink">Reason</span><span className="text-brand-black/72">{returnReasonLabel(item.reason)}</span></div><div className="grid gap-1 sm:col-span-2"><span className="text-xs font-bold uppercase tracking-[0.08em] text-brand-orange-ink">Customer note</span><span className="whitespace-pre-line text-brand-black/72">{item.note || "—"}</span></div>{item.rejectionReason ? <div className="grid gap-1 sm:col-span-2"><span className="text-xs font-bold uppercase tracking-[0.08em] text-brand-orange-ink">Rejection reason</span><span className="whitespace-pre-line text-brand-black/72">{item.rejectionReason}</span></div> : null}</div>
            {open ? <div className="grid gap-3 border-t-2 border-dashed border-brand-forest/20 pt-3"><p className="text-xs font-bold uppercase tracking-[0.08em] text-brand-green-ink">{item.status === "approved" ? "Pickup window" : "Pickup window (required to approve)"} <span className="font-normal normal-case tracking-normal text-brand-black/56">Bhutan time</span></p><div className="grid gap-3 sm:grid-cols-3"><label className="grid gap-1 text-xs font-bold text-brand-green-ink">Pickup date<input className="min-h-10 rounded-wobbly-md border-2 border-brand-forest bg-brand-white px-3 text-sm font-normal text-brand-black outline-none focus-visible:ring-4 focus-visible:ring-brand-leaf/20" type="date" value={draft.pickupDate} onChange={(event) => setDraft({ pickupDate: event.target.value })} /></label><label className="grid gap-1 text-xs font-bold text-brand-green-ink">Start time<input className="min-h-10 rounded-wobbly-md border-2 border-brand-forest bg-brand-white px-3 text-sm font-normal text-brand-black outline-none focus-visible:ring-4 focus-visible:ring-brand-leaf/20" type="time" value={draft.pickupStart} onChange={(event) => setDraft({ pickupStart: event.target.value })} /></label><label className="grid gap-1 text-xs font-bold text-brand-green-ink">End time<input className="min-h-10 rounded-wobbly-md border-2 border-brand-forest bg-brand-white px-3 text-sm font-normal text-brand-black outline-none focus-visible:ring-4 focus-visible:ring-brand-leaf/20" type="time" value={draft.pickupEnd} onChange={(event) => setDraft({ pickupEnd: event.target.value })} /></label></div><div className="grid gap-3 sm:grid-cols-[minmax(0,10rem)_minmax(0,1fr)]"><label className="grid gap-1 text-xs font-bold uppercase tracking-[0.08em] text-brand-green-ink">Refund amount<input className="min-h-10 rounded-wobbly-md border-2 border-brand-forest bg-brand-white px-3 text-sm font-normal text-brand-black outline-none focus-visible:ring-4 focus-visible:ring-brand-leaf/20" inputMode="decimal" type="number" min="0" step="0.01" value={draft.amount} onChange={(event) => setDraft({ amount: event.target.value })} /></label><label className="grid gap-1 text-xs font-bold uppercase tracking-[0.08em] text-brand-green-ink">Refund method<input className="min-h-10 rounded-wobbly-md border-2 border-brand-forest bg-brand-white px-3 text-sm font-normal text-brand-black outline-none focus-visible:ring-4 focus-visible:ring-brand-leaf/20" value={draft.method} onChange={(event) => setDraft({ method: event.target.value })} /></label></div><label className="grid gap-1 text-xs font-bold text-brand-green-ink">Rejection reason <span className="font-normal text-brand-black/56">Required when rejecting</span><textarea className="min-h-18 rounded-wobbly-md border-2 border-brand-forest bg-brand-white px-3 py-2 text-sm font-normal text-brand-black outline-none focus-visible:ring-4 focus-visible:ring-brand-leaf/20" value={draft.rejectionReason} onChange={(event) => setDraft({ rejectionReason: event.target.value })} placeholder="Explain why this return cannot be accepted" /></label><div className="flex flex-wrap justify-end gap-2">{canApprove ? <button className={btnPrimarySm} type="button" disabled={busyId === item.id} onClick={() => void updateStatus(item, "approved")}>{busyId === item.id ? "Saving..." : item.status === "approved" ? "Update pickup" : "Approve"}</button> : null}{canRefund ? <button className={btnPrimarySm} type="button" disabled={busyId === item.id} onClick={() => void updateStatus(item, "refunded")}>{busyId === item.id ? "Saving..." : "Mark refunded"}</button> : null}{canCancel ? <button className={btnOutlineSm} type="button" disabled={busyId === item.id} onClick={() => void updateStatus(item, item.status === "pending" ? "rejected" : "cancelled")}>{item.status === "pending" ? "Reject" : "Cancel"}</button> : null}</div></div> : <p className="border-t-2 border-dashed border-brand-forest/20 pt-3 text-xs font-semibold text-brand-black/56">This request is closed. The recorded refund method is {item.refundMethod || "not recorded"}.</p>}
          </article>;
        })}
      </div>}
    </div>
  );
}
