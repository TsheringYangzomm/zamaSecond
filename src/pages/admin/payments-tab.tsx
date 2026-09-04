import { useCallback, useMemo, useState } from "react";
import { commerceStore } from "../../admin/commerce-api";
import { paymentStatuses, type Payment, type PaymentStatus } from "../../admin/commerce-types";
import { btnOutlineSm } from "../../components/ui/styles";
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
  formatMoney,
  useCommerceStore,
} from "./commerce-shared";

type PendingChange = { payment: Payment; status: PaymentStatus };

export function PaymentsTab() {
  const state = useCommerceStore();
  const [query, setQuery] = useState("");
  const [filters, setFilters] = useState({ customer: "", status: "", method: "", amount: "", date: "" });
  const [selected, setSelected] = useState<Payment | null>(null);
  const [pendingChange, setPendingChange] = useState<PendingChange | null>(null);
  const [busy, setBusy] = useState(false);

  const data = state.phase === "ready" ? state.data : null;
  const writable = state.phase === "ready" && state.writable;

  const customerLabel = useCallback((customerId: string): string => {
    if (!data) return customerId;
    const customer = data.customers.find((item) => item.id === customerId);
    return customer?.name ?? customerId;
  }, [data]);

  const customers = useMemo(() => {
    if (!data) return [];
    return [...new Set(data.payments.map((payment) => customerLabel(payment.customer_id)).filter(Boolean))].sort();
  }, [data, customerLabel]);

  const methods = useMemo(() => {
    if (!data) return [];
    return [...new Set(data.payments.map((payment) => payment.method).filter(Boolean))].sort();
  }, [data]);

  const amountRanges = useMemo(() => buildAmountRanges((data?.payments ?? []).map((payment) => payment.amount)), [data]);

  const activeFilterCount = (["customer", "status", "method", "amount", "date"] as const).filter((key) => filters[key] !== "").length;

  const filtered = useMemo(() => {
    if (!data) return [];
    const needle = query.trim().toLowerCase();
    return data.payments.filter((payment) => {
      if (filters.customer && customerLabel(payment.customer_id) !== filters.customer) return false;
      if (filters.status && payment.status !== filters.status) return false;
      if (filters.method && payment.method !== filters.method) return false;
      if (filters.amount && amountRangeKeyFor(amountRanges, payment.amount) !== filters.amount) return false;
      if (filters.date && dateRangeKey(payment.date) !== filters.date) return false;
      if (!needle) return true;
      return (
        payment.id.toLowerCase().includes(needle) ||
        payment.order_id.toLowerCase().includes(needle) ||
        payment.reference.toLowerCase().includes(needle) ||
        payment.method.toLowerCase().includes(needle) ||
        customerLabel(payment.customer_id).toLowerCase().includes(needle)
      );
    });
  }, [data, query, filters, customerLabel, amountRanges]);

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
            <span className="text-xs text-brand-black/56">{selected.method}</span>
          </div>
        </div>

        <div className="grid gap-3 rounded-wobbly-card border-3 border-brand-forest bg-brand-white p-4 shadow-brand-soft">
          <span className="text-xs font-bold uppercase tracking-[0.1em] text-brand-orange-ink">Details</span>
          <p className="text-sm text-brand-black/72">Date: <span className="font-bold text-brand-black">{formatDate(selected.date)}</span></p>
          <p className="text-sm text-brand-black/72">Reference: <span className="font-bold text-brand-black">{selected.reference || "—"}</span></p>
          <p className="text-sm text-brand-black/72">Method: <span className="font-bold text-brand-black">{selected.method || "—"}</span></p>
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
            {!writable ? <span className="text-xs text-brand-black/52">Writes need the live tables.</span> : null}
          </div>
        </div>

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

      {!writable ? <DevDataNotice /> : null}

      <div className="grid gap-3">
        <input
          className="min-h-11.5 w-full rounded-[18px_12px_16px_10px/12px_18px_10px_16px] border-3 border-brand-forest bg-brand-white px-4 py-[0.65rem] text-brand-black shadow-brand-soft outline-none placeholder:text-brand-black/46 focus-visible:border-brand-green-ink focus-visible:ring-4 focus-visible:ring-brand-leaf/20"
          type="search"
          aria-label="Search payments"
          placeholder="Search by payment, order, customer, reference, or method..."
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
        <div className="flex flex-wrap items-center gap-2">
          <ColumnFilterDropdown label="Customer" options={customers} value={filters.customer} onSelect={(v) => setFilters((f) => ({ ...f, customer: v }))} />
          <ColumnFilterDropdown label="Status" options={paymentStatuses} value={filters.status} onSelect={(v) => setFilters((f) => ({ ...f, status: v }))} />
          <ColumnFilterDropdown label="Method" options={methods} value={filters.method} onSelect={(v) => setFilters((f) => ({ ...f, method: v }))} />
          <ColumnFilterDropdown label="Amount" options={amountRanges} value={filters.amount} onSelect={(v) => setFilters((f) => ({ ...f, amount: v }))} />
          <ColumnFilterDropdown label="Date" options={DATE_RANGES} value={filters.date} onSelect={(v) => setFilters((f) => ({ ...f, date: v }))} />
          <ClearFiltersButton count={activeFilterCount} onClear={() => setFilters({ customer: "", status: "", method: "", amount: "", date: "" })} />
        </div>
      </div>

      {data.payments.length === 0 ? (
        <p className="rounded-wobbly-card border-3 border-dashed border-brand-forest/30 bg-brand-white p-6 text-center text-sm font-semibold text-brand-black/64">No payments yet.</p>
      ) : filtered.length === 0 ? (
        <p className="rounded-wobbly-card border-3 border-dashed border-brand-forest/30 bg-brand-white p-6 text-center text-sm font-semibold text-brand-black/64">No payments match the current search or filter.</p>
      ) : (
        <div className="overflow-x-auto rounded-wobbly-card border-3 border-brand-forest bg-brand-white shadow-brand-soft">
          <table className="w-full min-w-170 border-collapse text-left">
            <caption className="sr-only">Payments</caption>
            <thead>
              <tr className="border-b-3 border-dashed border-brand-forest/30 bg-brand-warm-white text-xs font-bold uppercase tracking-[0.08em] text-brand-green-ink">
                <th className="px-4 py-3">Payment</th>
                <th className="px-4 py-3">Order</th>
                <th className="px-4 py-3">Customer</th>
                <th className="px-4 py-3">Amount</th>
                <th className="px-4 py-3">Method</th>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((payment) => (
                <tr className="border-b-2 border-dashed border-brand-forest/16 text-sm last:border-b-0" key={payment.id}>
                  <td className="px-4 py-3 font-bold text-brand-black">{payment.id}</td>
                  <td className="px-4 py-3 text-brand-black/72">{payment.order_id}</td>
                  <td className="px-4 py-3 text-brand-black/72">{customerLabel(payment.customer_id)}</td>
                  <td className="px-4 py-3 font-bold text-brand-black">{formatMoney(payment.amount)}</td>
                  <td className="px-4 py-3 text-brand-black/72">{payment.method}</td>
                  <td className="px-4 py-3 text-brand-black/72">{formatDate(payment.date)}</td>
                  <td className="px-4 py-3"><CommerceStatusBadge status={payment.status} /></td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-2">
                      <button className="min-h-9 touch-manipulation rounded-full border-2 border-brand-forest px-3 py-1 text-xs font-bold text-brand-forest hover:bg-brand-yellow focus-visible:outline focus-visible:outline-3 focus-visible:outline-dashed focus-visible:outline-brand-green-ink focus-visible:outline-offset-2" type="button" onClick={() => setSelected(payment)}>View</button>
                      <StatusChangeSelect
                        value={payment.status}
                        options={paymentStatuses}
                        writable={writable}
                        busy={busy}
                        onChange={(next) => setPendingChange({ payment, status: next as PaymentStatus })}
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
