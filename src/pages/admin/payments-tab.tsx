import { useCallback, useMemo, useState } from "react";
import { commerceStore } from "../../admin/commerce-api";
import { paymentStatuses, type Payment, type PaymentStatus } from "../../admin/commerce-types";
import { btnOutlineSm } from "../../components/ui/styles";
import { ConfirmDialog } from "../../components/ui/confirm-dialog";
import {
  CommerceError,
  CommerceLoading,
  CommerceSectionHeading,
  CommerceStatusBadge,
  DevDataNotice,
  StatusChangeSelect,
  formatDate,
  formatMoney,
  useCommerceStore,
} from "./commerce-shared";

type PendingChange = { payment: Payment; status: PaymentStatus };

function returnMethod(payment: Payment): string {
  return payment.refund_method?.trim() || (payment.method ? `Original ${payment.method}` : "Not recorded");
}

function PaymentDashboard({ payments, customerLabel, onSelect }: { payments: Payment[]; customerLabel: (customerId: string) => string; onSelect: (payment: Payment) => void }) {
  const summary = useMemo(() => {
    const result = {
      totalAmount: 0,
      paidAmount: 0,
      refundedAmount: 0,
      pendingAmount: 0,
      failedAmount: 0,
      counts: { paid: 0, pending: 0, failed: 0, refunded: 0 } as Record<PaymentStatus, number>,
    };
    for (const payment of payments) {
      result.totalAmount += payment.amount;
      result.counts[payment.status] += 1;
      if (payment.status === "paid") result.paidAmount += payment.amount;
      if (payment.status === "refunded") result.refundedAmount += payment.amount;
      if (payment.status === "pending") result.pendingAmount += payment.amount;
      if (payment.status === "failed") result.failedAmount += payment.amount;
    }
    return result;
  }, [payments]);

  const statusRows: { label: string; status: PaymentStatus; color: string; amount: number }[] = [
    { label: "Paid", status: "paid", color: "bg-brand-forest", amount: summary.paidAmount },
    { label: "Pending", status: "pending", color: "bg-brand-yellow", amount: summary.pendingAmount },
    { label: "Failed", status: "failed", color: "bg-brand-orange", amount: summary.failedAmount },
    { label: "Refunded", status: "refunded", color: "bg-brand-orange-ink", amount: summary.refundedAmount },
  ];

  const methodRows = useMemo(() => {
    const totals = new Map<string, { count: number; amount: number }>();
    for (const payment of payments) {
      const method = payment.method || "Not recorded";
      const current = totals.get(method) ?? { count: 0, amount: 0 };
      totals.set(method, { count: current.count + 1, amount: current.amount + payment.amount });
    }
    return [...totals.entries()].sort((a, b) => b[1].amount - a[1].amount).map(([method, values]) => ({ method, ...values }));
  }, [payments]);

  const recentRefunds = useMemo(
    () => payments.filter((payment) => payment.status === "refunded").slice().sort((a, b) => b.date.localeCompare(a.date)).slice(0, 4),
    [payments],
  );
  const needsAttention = useMemo(
    () => payments.filter((payment) => payment.status === "pending" || payment.status === "failed").slice(0, 4),
    [payments],
  );
  const paymentActivity = useMemo(
    () => payments.slice().sort((a, b) => b.date.localeCompare(a.date)).slice(0, 8),
    [payments],
  );
  const refundRate = payments.length > 0 ? Math.round((summary.counts.refunded / payments.length) * 100) : 0;
  const settledShare = summary.totalAmount > 0 ? Math.round((summary.paidAmount / summary.totalAmount) * 100) : 0;
  const maxMethodAmount = Math.max(...methodRows.map((row) => row.amount), 1);

  return (
    <section className="grid gap-4" aria-labelledby="payment-dashboard-title">
      <div className="grid gap-1">
        <h2 id="payment-dashboard-title" className="font-primary text-[clamp(1.35rem,2.5vw,1.8rem)] font-bold leading-[1.02] text-brand-green-ink">Payment dashboard</h2>
        <p className="text-sm text-brand-black/68">Track collected payments, refunds, pending balances, and failed attempts.</p>
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.35fr)_minmax(15rem,0.65fr)]">
        <div className="relative overflow-hidden rounded-wobbly-card border-3 border-brand-forest bg-brand-forest p-5 text-brand-white shadow-brand">
          <div className="pointer-events-none absolute -right-14 -top-16 h-40 w-40 rounded-full border-[18px] border-brand-yellow/25" />
          <div className="relative grid gap-7">
            <div className="flex items-start justify-between gap-3">
              <div className="grid gap-1">
                <span className="text-[0.65rem] font-bold uppercase tracking-[0.12em] text-brand-yellow">Money movement</span>
                <h3 className="font-primary text-xl font-bold">Collected balance</h3>
              </div>
              <span className="rounded-full border-2 border-brand-yellow/50 bg-brand-yellow px-3 py-1 text-[0.65rem] font-bold uppercase tracking-[0.08em] text-brand-green-ink">Live snapshot</span>
            </div>
            <div className="grid gap-1">
              <span className="font-primary text-[clamp(2.2rem,6vw,4rem)] font-bold leading-none">{formatMoney(summary.paidAmount)}</span>
              <span className="text-sm text-brand-white/72">{summary.counts.paid} successful payment{summary.counts.paid === 1 ? "" : "s"}</span>
            </div>
            <div className="grid gap-2 border-t border-brand-white/20 pt-4">
              <div className="flex items-center justify-between gap-3 text-xs font-bold uppercase tracking-[0.08em]">
                <span className="text-brand-white/72">Settled share</span>
                <span className="text-brand-yellow">{settledShare}%</span>
              </div>
              <div className="h-3 overflow-hidden rounded-full bg-brand-black/25" aria-label={`${settledShare}% of payment volume settled`}>
                <span className="block h-full rounded-full bg-brand-yellow transition-all duration-500" style={{ width: `${settledShare}%` }} />
              </div>
              <div className="flex flex-wrap justify-between gap-x-4 gap-y-1 text-xs text-brand-white/68">
                <span>Volume <strong className="text-brand-white">{formatMoney(summary.totalAmount)}</strong></span>
                <span>Pending <strong className="text-brand-white">{formatMoney(summary.pendingAmount)}</strong></span>
              </div>
            </div>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
          <div className="flex items-center justify-between gap-3 rounded-wobbly-card border-3 border-brand-forest border-l-[6px] border-l-brand-yellow bg-brand-warm-white p-4 shadow-brand-soft">
            <div className="grid gap-1"><span className="text-[0.65rem] font-bold uppercase tracking-[0.1em] text-brand-black/56">Pending</span><span className="font-primary text-2xl font-bold leading-none text-brand-green-ink">{formatMoney(summary.pendingAmount)}</span></div>
            <span className="rounded-full bg-brand-yellow px-2.5 py-1 text-xs font-bold text-brand-green-ink">{summary.counts.pending} open</span>
          </div>
          <div className="flex items-center justify-between gap-3 rounded-wobbly-card border-3 border-brand-forest border-l-[6px] border-l-brand-orange-ink bg-brand-warm-white p-4 shadow-brand-soft">
            <div className="grid gap-1"><span className="text-[0.65rem] font-bold uppercase tracking-[0.1em] text-brand-black/56">Refunds</span><span className="font-primary text-2xl font-bold leading-none text-brand-green-ink">{formatMoney(summary.refundedAmount)}</span></div>
            <span className="text-xs font-bold text-brand-orange-ink">{refundRate}% of records</span>
          </div>
          <div className="flex items-center justify-between gap-3 rounded-wobbly-card border-3 border-brand-forest border-l-[6px] border-l-brand-orange bg-brand-warm-white p-4 shadow-brand-soft">
            <div className="grid gap-1"><span className="text-[0.65rem] font-bold uppercase tracking-[0.1em] text-brand-black/56">Failed</span><span className="font-primary text-2xl font-bold leading-none text-brand-green-ink">{summary.counts.failed}</span></div>
            <span className="text-xs font-bold text-brand-orange-ink">{formatMoney(summary.failedAmount)} at risk</span>
          </div>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
        <div className="rounded-wobbly-card border-3 border-brand-forest bg-brand-white p-5 shadow-brand-soft">
          <div className="flex items-start justify-between gap-3">
            <div className="grid gap-1">
              <h3 className="text-sm font-bold text-brand-green-ink">Status ledger</h3>
              <p className="text-xs text-brand-black/56">Value and volume by payment state</p>
            </div>
            <span className="text-xs font-bold text-brand-black/56">{payments.length} record{payments.length === 1 ? "" : "s"}</span>
          </div>
          <div className="mt-5 grid gap-4">
            {statusRows.map((row) => (
              <div className="grid gap-2" key={row.status}>
                <div className="flex items-center justify-between gap-3 text-sm">
                  <span className="flex min-w-0 items-center gap-2 text-brand-black/72"><span className={`h-2.5 w-2.5 shrink-0 rounded-full ${row.color}`} />{row.label}<span className="rounded-full bg-brand-warm-white px-2 py-0.5 text-[0.65rem] font-bold text-brand-black/56">{summary.counts[row.status]}</span></span>
                  <span className="font-bold text-brand-black">{formatMoney(row.amount)}</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-brand-black/6"><span className={`block h-full rounded-full ${row.color} transition-all duration-500`} style={{ width: `${(row.amount / Math.max(summary.totalAmount, 1)) * 100}%` }} /></div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-wobbly-card border-3 border-brand-orange-ink bg-brand-orange/10 p-5 shadow-brand-soft">
          <div className="flex items-start justify-between gap-3">
            <div className="grid gap-1">
              <span className="text-[0.65rem] font-bold uppercase tracking-[0.1em] text-brand-orange-ink">Action queue</span>
              <h3 className="font-primary text-xl font-bold text-brand-green-ink">Needs attention</h3>
              <p className="text-xs text-brand-black/56">Pending and failed payment records</p>
            </div>
            <span className="rounded-full border-2 border-brand-orange-ink/30 bg-brand-white px-2.5 py-1 text-xs font-bold text-brand-orange-ink">{needsAttention.length} open</span>
          </div>
          {needsAttention.length === 0 ? (
            <p className="mt-5 text-sm text-brand-black/56">Nothing needs attention.</p>
          ) : (
            <div className="mt-5 grid gap-2">
              {needsAttention.map((payment) => (
                <button className="group flex w-full items-center justify-between gap-3 rounded-[14px] border-2 border-brand-forest/15 bg-brand-white/80 p-3 text-left hover:border-brand-forest hover:bg-brand-white" key={payment.id} type="button" onClick={() => onSelect(payment)}>
                  <span className="flex min-w-0 items-center gap-3">
                    <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-full text-lg font-bold ${payment.status === "failed" ? "bg-brand-orange text-brand-black" : "bg-brand-yellow text-brand-green-ink"}`}>{payment.status === "failed" ? "!" : "·"}</span>
                    <span className="grid min-w-0 gap-0.5"><span className="truncate text-sm font-bold text-brand-black">{payment.order_id}</span><span className="truncate text-xs text-brand-black/56">{customerLabel(payment.customer_id)} · {formatDate(payment.date)}</span><span className="truncate text-xs text-brand-black/56">Payment: {payment.method || "Not recorded"}</span></span>
                  </span>
                  <span className="grid shrink-0 justify-items-end gap-1"><CommerceStatusBadge status={payment.status} /><span className="text-xs font-bold text-brand-orange-ink group-hover:underline">View →</span></span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
        <div className="rounded-wobbly-card border-3 border-brand-forest bg-brand-white p-5 shadow-brand-soft">
          <div className="grid gap-1">
            <h3 className="text-sm font-bold text-brand-green-ink">Payment mix</h3>
            <p className="text-xs text-brand-black/56">How customers paid</p>
          </div>
          {methodRows.length === 0 ? (
            <p className="mt-5 text-sm text-brand-black/56">No payment methods recorded.</p>
          ) : (
            <div className="mt-5 grid gap-4">
              {methodRows.map((row) => (
                <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3" key={row.method}>
                  <span className="grid h-10 w-10 place-items-center rounded-full bg-brand-yellow font-primary text-lg font-bold text-brand-green-ink">{row.method.slice(0, 1).toUpperCase()}</span>
                  <div className="grid min-w-0 gap-1.5">
                    <div className="flex items-center justify-between gap-3 text-sm"><span className="truncate font-bold text-brand-black">{row.method}</span><span className="shrink-0 text-xs text-brand-black/56">{row.count} payment{row.count === 1 ? "" : "s"}</span></div>
                    <div className="h-2 overflow-hidden rounded-full bg-brand-black/6"><span className="block h-full rounded-full bg-brand-forest" style={{ width: `${(row.amount / maxMethodAmount) * 100}%` }} /></div>
                  </div>
                  <span className="text-sm font-bold text-brand-green-ink">{formatMoney(row.amount)}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-wobbly-card border-3 border-brand-forest bg-brand-warm-white p-5 shadow-brand-soft">
          <div className="flex items-start justify-between gap-3">
            <div className="grid gap-1">
              <span className="text-[0.65rem] font-bold uppercase tracking-[0.1em] text-brand-orange-ink">Refund activity</span>
              <h3 className="font-primary text-xl font-bold text-brand-green-ink">Recent refunds</h3>
            </div>
            <span className="text-xs font-bold text-brand-orange-ink">{summary.counts.refunded} total</span>
          </div>
          {recentRefunds.length === 0 ? (
            <p className="mt-5 text-sm text-brand-black/56">No refunds recorded.</p>
          ) : (
            <div className="mt-5 grid gap-4">
              {recentRefunds.map((payment) => (
                <button className="group flex w-full items-start gap-3 text-left" key={payment.id} type="button" onClick={() => onSelect(payment)}>
                  <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full border-2 border-brand-orange-ink bg-brand-orange/15 text-lg font-bold text-brand-orange-ink">↺</span>
                  <span className="grid min-w-0 flex-1 gap-0.5"><span className="truncate text-sm font-bold text-brand-black">{payment.order_id}</span><span className="truncate text-xs text-brand-black/56">{customerLabel(payment.customer_id)} · {formatDate(payment.date)}</span><span className="truncate text-xs text-brand-orange-ink">Return: {returnMethod(payment)}</span></span>
                  <span className="grid shrink-0 justify-items-end gap-0.5"><span className="text-sm font-bold text-brand-orange-ink">-{formatMoney(payment.amount)}</span><span className="text-xs text-brand-black/52 group-hover:underline">View →</span></span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="rounded-wobbly-card border-3 border-brand-forest bg-brand-white p-5 shadow-brand-soft">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div className="grid gap-1">
            <span className="text-[0.65rem] font-bold uppercase tracking-[0.1em] text-brand-orange-ink">Payment activity</span>
            <h3 className="font-primary text-xl font-bold text-brand-green-ink">Open a payment to edit it</h3>
            <p className="text-xs text-brand-black/56">Update the payment method or return method from the payment details.</p>
          </div>
          <span className="text-xs font-bold text-brand-black/56">{payments.length} total</span>
        </div>
        {paymentActivity.length === 0 ? (
          <p className="mt-5 text-sm text-brand-black/56">No payments recorded.</p>
        ) : (
          <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {paymentActivity.map((payment) => (
              <button className="group grid gap-3 rounded-[16px] border-2 border-brand-forest/20 bg-brand-warm-white p-3 text-left hover:border-brand-forest hover:bg-brand-yellow/10" key={payment.id} type="button" onClick={() => onSelect(payment)}>
                <div className="flex items-start justify-between gap-2"><span className="truncate text-sm font-bold text-brand-black">{payment.order_id}</span><CommerceStatusBadge status={payment.status} /></div>
                <div className="grid gap-1"><span className="font-primary text-lg font-bold text-brand-green-ink">{formatMoney(payment.amount)}</span><span className="truncate text-xs text-brand-black/56">{formatDate(payment.date)} · {payment.method || "Not recorded"}</span>{payment.status === "refunded" ? <span className="truncate text-xs text-brand-orange-ink">Return: {returnMethod(payment)}</span> : null}</div>
                <span className="text-xs font-bold text-brand-forest group-hover:underline">Edit methods →</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

export function PaymentsTab() {
  const state = useCommerceStore();
  const [selected, setSelected] = useState<Payment | null>(null);
  const [pendingChange, setPendingChange] = useState<PendingChange | null>(null);
  const [busy, setBusy] = useState(false);
  const [editingMethods, setEditingMethods] = useState(false);
  const [methodDraft, setMethodDraft] = useState("");
  const [refundMethodDraft, setRefundMethodDraft] = useState("");
  const [detailsBusy, setDetailsBusy] = useState(false);
  const [detailsError, setDetailsError] = useState<string | null>(null);

  const data = state.phase === "ready" ? state.data : null;
  const writable = state.phase === "ready" && state.writable;

  const customerLabel = useCallback((customerId: string): string => {
    if (!data) return customerId;
    const customer = data.customers.find((item) => item.id === customerId);
    return customer?.name ?? customerId;
  }, [data]);

  function selectPayment(payment: Payment) {
    setSelected(payment);
    setMethodDraft(payment.method);
    setRefundMethodDraft(payment.refund_method ?? "");
    setEditingMethods(false);
    setDetailsError(null);
  }

  async function savePaymentMethods() {
    if (!selected) return;
    const method = methodDraft.trim();
    const refundMethod = refundMethodDraft.trim() || null;
    setDetailsBusy(true);
    setDetailsError(null);
    try {
      await commerceStore.updatePaymentMethods(selected.id, method, refundMethod);
      setSelected((current) => (current && current.id === selected.id ? { ...current, method, refund_method: refundMethod } : current));
      setEditingMethods(false);
    } catch (saveError) {
      setDetailsError(saveError instanceof Error ? saveError.message : "Could not save payment methods.");
    } finally {
      setDetailsBusy(false);
    }
  }

  async function applyStatusChange() {
    if (!pendingChange) return;
    const { payment, status } = pendingChange;
    setBusy(true);
    try {
      await commerceStore.updatePaymentStatus(payment.id, status);
      setSelected((current) => (current && current.id === payment.id ? { ...current, status } : current));
    } finally {
      setBusy(false);
      setPendingChange(null);
    }
  }

  if (state.phase === "loading" || state.phase === "idle") {
    return <div className="grid gap-5"><CommerceSectionHeading title="Payments" subtitle="Loading payments..." /><CommerceLoading /></div>;
  }
  if (state.phase === "error") {
    return (
      <div className="grid gap-5">
        <CommerceSectionHeading title="Payments" subtitle="Payments could not be loaded." />
        <CommerceError message={state.message} onRetry={() => void commerceStore.load(true)} />
      </div>
    );
  }
  if (!data) {
    return <div className="grid gap-5"><CommerceSectionHeading title="Payments" subtitle="Loading payments..." /><CommerceLoading /></div>;
  }

  if (selected) {
    const order = data.orders.find((item) => item.id === selected.order_id);
    return (
      <div className="grid gap-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="grid gap-1">
            <h1 className="font-primary text-[clamp(1.7rem,3.5vw,2.4rem)] font-bold leading-[1.02] text-brand-green-ink">Payment {selected.id}</h1>
            <p className="text-sm text-brand-black/68">{formatDate(selected.date)}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button className={btnOutlineSm} type="button" onClick={() => setSelected(null)}>← Back to payments</button>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <div className="grid gap-1 rounded-wobbly-card border-3 border-brand-forest bg-brand-white p-4 shadow-brand-soft">
            <span className="text-xs font-bold uppercase tracking-[0.1em] text-brand-orange-ink">Order</span>
            <span className="font-bold text-brand-black">{selected.order_id}</span>
            {order ? <span className="text-sm text-brand-black/68">{formatMoney(order.total)}</span> : null}
          </div>
          <div className="grid gap-1 rounded-wobbly-card border-3 border-brand-forest bg-brand-white p-4 shadow-brand-soft">
            <span className="text-xs font-bold uppercase tracking-[0.1em] text-brand-orange-ink">Customer</span>
            <span className="font-bold text-brand-black">{customerLabel(selected.customer_id)}</span>
          </div>
          <div className="grid gap-1 rounded-wobbly-card border-3 border-brand-forest bg-brand-white p-4 shadow-brand-soft">
            <span className="text-xs font-bold uppercase tracking-[0.1em] text-brand-orange-ink">Amount</span>
            <span className="font-primary text-2xl font-bold text-brand-green-ink">{formatMoney(selected.amount)}</span>
            <span className="text-xs text-brand-black/56">Payment method: {selected.method || "Not recorded"}</span>
          </div>
        </div>

        <div className="grid gap-3 rounded-wobbly-card border-3 border-brand-forest bg-brand-white p-4 shadow-brand-soft">
          <span className="text-xs font-bold uppercase tracking-[0.1em] text-brand-orange-ink">Details</span>
          <p className="text-sm text-brand-black/72">Date: <span className="font-bold text-brand-black">{formatDate(selected.date)}</span></p>
          <p className="text-sm text-brand-black/72">Reference: <span className="font-bold text-brand-black">{selected.reference || "—"}</span></p>
          <p className="text-sm text-brand-black/72">Payment method: <span className="font-bold text-brand-black">{selected.method || "—"}</span></p>
          {selected.status === "refunded" ? <p className="text-sm text-brand-black/72">Return method: <span className="font-bold text-brand-orange-ink">{returnMethod(selected)}</span></p> : null}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-[0.1em] text-brand-orange-ink">Status</span>
            <CommerceStatusBadge status={selected.status} />
            <StatusChangeSelect
              value={selected.status}
              options={paymentStatuses}
              writable={writable}
              busy={busy}
              onChange={(next) => setPendingChange({ payment: selected, status: next as PaymentStatus })}
            />
            <button
              className={btnOutlineSm}
              type="button"
              disabled={!writable || detailsBusy}
              onClick={() => {
                setMethodDraft(selected.method);
                setRefundMethodDraft(selected.refund_method ?? "");
                setDetailsError(null);
                setEditingMethods(true);
              }}
            >
              Edit methods
            </button>
            {state.phase === "ready" && !writable ? <span className="text-xs text-brand-black/52">Writes need the live tables.</span> : null}
          </div>
        </div>

        {editingMethods ? (
          <div className="grid gap-4 rounded-wobbly-card border-3 border-brand-forest bg-brand-warm-white p-4 shadow-brand-soft">
            <div className="grid gap-1">
              <h2 className="font-primary text-xl font-bold text-brand-green-ink">Edit payment methods</h2>
              <p className="text-sm text-brand-black/68">Update how the payment was made and where a refund was returned.</p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="grid gap-1.5 text-sm font-bold text-brand-green-ink">
                Payment method
                <input
                  className="min-h-11 rounded-[14px] border-2 border-brand-forest bg-brand-white px-3 py-2 font-normal text-brand-black outline-none focus-visible:ring-4 focus-visible:ring-brand-leaf/20"
                  value={methodDraft}
                  onChange={(event) => setMethodDraft(event.target.value)}
                  placeholder="Card, COD, bank transfer..."
                />
              </label>
              <label className="grid gap-1.5 text-sm font-bold text-brand-green-ink">
                Return method
                <input
                  className="min-h-11 rounded-[14px] border-2 border-brand-forest bg-brand-white px-3 py-2 font-normal text-brand-black outline-none focus-visible:ring-4 focus-visible:ring-brand-leaf/20"
                  value={refundMethodDraft}
                  onChange={(event) => setRefundMethodDraft(event.target.value)}
                  placeholder="Original Card, bank transfer..."
                />
                <span className="text-xs font-normal text-brand-black/56">Used when this payment is refunded.</span>
              </label>
            </div>
            {detailsError ? <p className="rounded-wobbly-card border-3 border-dashed border-brand-orange bg-brand-orange/10 p-3 text-sm font-semibold text-brand-black" role="alert">{detailsError}</p> : null}
            <div className="flex flex-wrap justify-end gap-2">
              <button className={btnOutlineSm} type="button" disabled={detailsBusy} onClick={() => setEditingMethods(false)}>Cancel</button>
              <button className="min-h-9 touch-manipulation rounded-full border-2 border-brand-forest bg-brand-forest px-4 py-1.5 text-sm font-bold text-brand-white hover:bg-brand-leaf disabled:cursor-not-allowed disabled:opacity-50" type="button" disabled={detailsBusy} onClick={() => void savePaymentMethods()}>
                {detailsBusy ? "Saving..." : "Save methods"}
              </button>
            </div>
          </div>
        ) : null}

        <ConfirmDialog
          open={pendingChange !== null}
          title="Update payment status"
          message={pendingChange ? `Mark payment ${pendingChange.payment.id} as "${pendingChange.status}"?` : ""}
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
      <CommerceSectionHeading title="Payments" subtitle={data ? `${data.payments.length} payment${data.payments.length === 1 ? "" : "s"}` : "Loading payments..."}>
        <button className={btnOutlineSm} type="button" onClick={() => void commerceStore.load(true)} disabled={!data}>Refresh</button>
      </CommerceSectionHeading>

      {state.phase === "ready" && !writable ? <DevDataNotice /> : null}

      <PaymentDashboard payments={data.payments} customerLabel={customerLabel} onSelect={selectPayment} />
    </div>
  );
}
