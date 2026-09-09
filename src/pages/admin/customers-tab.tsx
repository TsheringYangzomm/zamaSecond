import { useMemo, useState } from "react";
import { commerceStore } from "../../admin/commerce-api";
import { customerStatuses, type Customer, type CustomerStatus } from "../../admin/commerce-types";
import { btnOutlineSm } from "../../components/ui/styles";
import { ConfirmDialog } from "../../components/ui/confirm-dialog";
import { amountRangeKeyFor, buildAmountRanges, ClearFiltersButton, ColumnFilterDropdown, COUNT_RANGES, countRangeKey } from "./column-filter-dropdown";
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

type PendingChange = { customer: Customer; status: CustomerStatus };

export function CustomersTab() {
  const state = useCommerceStore();
  const [query, setQuery] = useState("");
  const [filters, setFilters] = useState({ customer: "", status: "", area: "", orders: "", spend: "", subscription: "" });
  const [selected, setSelected] = useState<Customer | null>(null);
  const [pendingChange, setPendingChange] = useState<PendingChange | null>(null);
  const [busy, setBusy] = useState(false);

  const data = state.phase === "ready" ? state.data : null;
  const writable = state.phase === "ready" && state.writable;

  const stats = useMemo(() => {
    if (!data) return new Map<string, { orders: number; spend: number }>();
    const map = new Map<string, { orders: number; spend: number }>();
    for (const order of data.orders) {
      const current = map.get(order.customer_id) ?? { orders: 0, spend: 0 };
      map.set(order.customer_id, { orders: current.orders + 1, spend: current.spend + order.total });
    }
    return map;
  }, [data]);

  const customerNames = useMemo(() => {
    if (!data) return [];
    return [...new Set(data.customers.map((customer) => customer.name).filter(Boolean))].sort();
  }, [data]);

  const areas = useMemo(() => {
    if (!data) return [];
    return [...new Set(data.customers.map((customer) => customer.area).filter(Boolean))].sort();
  }, [data]);

  const spendRanges = useMemo(() => buildAmountRanges([...stats.values()].map((entry) => entry.spend)), [stats]);

  const subscriptionOptions = useMemo(() => {
    if (!data) return [{ value: "none", label: "None" }];
    const statuses = [...new Set(data.subscriptions.map((subscription) => subscription.status).filter(Boolean))].sort();
    return [...statuses, "none"].map((status) => ({ value: status, label: status === "none" ? "None" : status }));
  }, [data]);

  const activeFilterCount = (["customer", "status", "area", "orders", "spend", "subscription"] as const).filter((key) => filters[key] !== "").length;

  const filtered = useMemo(() => {
    if (!data) return [];
    const needle = query.trim().toLowerCase();
    return data.customers.filter((customer) => {
      const entry = stats.get(customer.id);
      if (filters.customer && customer.name !== filters.customer) return false;
      if (filters.status && customer.status !== filters.status) return false;
      if (filters.area && customer.area !== filters.area) return false;
      if (filters.orders && countRangeKey(entry?.orders ?? 0) !== filters.orders) return false;
      if (filters.spend && amountRangeKeyFor(spendRanges, entry?.spend ?? 0) !== filters.spend) return false;
      if (filters.subscription) {
        const subscription = data.subscriptions.find((item) => item.customer_id === customer.id);
        const current = subscription?.status ?? null;
        if (filters.subscription === "none" ? current !== null : current !== filters.subscription) return false;
      }
      if (!needle) return true;
      return (
        customer.name.toLowerCase().includes(needle) ||
        customer.email.toLowerCase().includes(needle) ||
        customer.phone.toLowerCase().includes(needle) ||
        customer.area.toLowerCase().includes(needle)
      );
    });
  }, [data, query, filters, stats, spendRanges]);

  function subscriptionStatus(customerId: string): string | null {
    if (!data) return null;
    const subscription = data.subscriptions.find((item) => item.customer_id === customerId);
    return subscription?.status ?? null;
  }

  async function applyStatusChange() {
    if (!pendingChange) return;
    const { customer, status } = pendingChange;
    setBusy(true);
    try {
      await commerceStore.updateCustomerStatus(customer.id, status);
      setSelected((current) => (current && current.id === customer.id ? { ...current, status } : current));
    } finally {
      setBusy(false);
      setPendingChange(null);
    }
  }

  if (state.phase === "loading" || state.phase === "idle") {
    return <div className="grid gap-5"><CommerceSectionHeading title="Customers" subtitle="Loading customers..." /><CommerceLoading /></div>;
  }
  if (state.phase === "error") {
    return (
      <div className="grid gap-5">
        <CommerceSectionHeading title="Customers" subtitle="Customers could not be loaded." />
        <CommerceError message={state.message} onRetry={() => void commerceStore.load(true)} />
      </div>
    );
  }
  if (!data) {
    return <div className="grid gap-5"><CommerceSectionHeading title="Customers" subtitle="Loading customers..." /><CommerceLoading /></div>;
  }

  if (selected) {
    const customerStats = stats.get(selected.id) ?? { orders: 0, spend: 0 };
    const customerOrders = data.orders
      .filter((order) => order.customer_id === selected.id)
      .sort((a, b) => b.created_at.localeCompare(a.created_at))
      .slice(0, 5);
    const subscriptions = data.subscriptions.filter((item) => item.customer_id === selected.id);

    return (
      <div className="grid gap-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="grid gap-1">
            <h1 className="font-primary text-[clamp(1.7rem,3.5vw,2.4rem)] font-bold leading-[1.02] text-brand-green-ink">{selected.name}</h1>
            <p className="text-sm text-brand-black/68">Customer since {formatDate(selected.created_at)}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button className={btnOutlineSm} type="button" onClick={() => setSelected(null)}>← Back to customers</button>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <div className="grid gap-1 rounded-wobbly-card border-3 border-brand-forest bg-brand-white p-4 shadow-brand-soft">
            <span className="text-xs font-bold uppercase tracking-[0.1em] text-brand-orange-ink">Contact</span>
            <span className="font-bold text-brand-black">{selected.email}</span>
            <span className="text-sm text-brand-black/68">{selected.phone}</span>
          </div>
          <div className="grid gap-1 rounded-wobbly-card border-3 border-brand-forest bg-brand-white p-4 shadow-brand-soft">
            <span className="text-xs font-bold uppercase tracking-[0.1em] text-brand-orange-ink">Address</span>
            <span className="text-sm text-brand-black/72">{selected.address || "—"}</span>
            <span className="text-xs text-brand-black/56">{selected.area}, {selected.dzongkhag}</span>
          </div>
          <div className="grid gap-1 rounded-wobbly-card border-3 border-brand-forest bg-brand-white p-4 shadow-brand-soft">
            <span className="text-xs font-bold uppercase tracking-[0.1em] text-brand-orange-ink">Account</span>
            <CommerceStatusBadge status={selected.status} />
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <div className="grid gap-1 rounded-wobbly-card border-3 border-brand-forest bg-brand-white p-4 shadow-brand-soft">
            <span className="text-xs font-bold uppercase tracking-[0.1em] text-brand-orange-ink">Orders</span>
            <span className="font-primary text-2xl font-bold text-brand-green-ink">{customerStats.orders}</span>
          </div>
          <div className="grid gap-1 rounded-wobbly-card border-3 border-brand-forest bg-brand-white p-4 shadow-brand-soft">
            <span className="text-xs font-bold uppercase tracking-[0.1em] text-brand-orange-ink">Total spend</span>
            <span className="font-primary text-2xl font-bold text-brand-green-ink">{formatMoney(customerStats.spend)}</span>
          </div>
          <div className="grid gap-1 rounded-wobbly-card border-3 border-brand-forest bg-brand-white p-4 shadow-brand-soft">
            <span className="text-xs font-bold uppercase tracking-[0.1em] text-brand-orange-ink">Subscriptions</span>
            {subscriptions.length === 0 ? <span className="text-sm text-brand-black/68">None</span> : (
              <div className="flex flex-wrap gap-2">
                {subscriptions.map((subscription) => (
                  <span className="flex items-center gap-2" key={subscription.id}>
                    <span className="text-sm font-bold text-brand-black">{subscription.plan}</span>
                    <CommerceStatusBadge status={subscription.status} />
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="grid gap-2 rounded-wobbly-card border-3 border-brand-forest bg-brand-white p-4 shadow-brand-soft">
          <span className="text-xs font-bold uppercase tracking-[0.1em] text-brand-orange-ink">Recent orders</span>
          {customerOrders.length === 0 ? <p className="text-sm text-brand-black/68">No orders yet.</p> : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-100 border-collapse text-left">
                <thead>
                  <tr className="border-b-2 border-dashed border-brand-forest/30 text-xs font-bold uppercase tracking-[0.08em] text-brand-green-ink">
                    <th className="px-2 py-2">Order</th>
                    <th className="px-2 py-2">Date</th>
                    <th className="px-2 py-2">Total</th>
                    <th className="px-2 py-2">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {customerOrders.map((order) => (
                    <tr className="border-b-2 border-dashed border-brand-forest/16 text-sm last:border-b-0" key={order.id}>
                      <td className="px-2 py-2 font-bold text-brand-black">{order.id}</td>
                      <td className="px-2 py-2 text-brand-black/72">{formatDate(order.created_at)}</td>
                      <td className="px-2 py-2 text-brand-black/72">{formatMoney(order.total)}</td>
                      <td className="px-2 py-2"><CommerceStatusBadge status={order.status} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-[0.1em] text-brand-orange-ink">Update account</span>
            <StatusChangeSelect
              value={selected.status}
              options={customerStatuses}
              writable={writable}
              busy={busy}
              onChange={(next) => setPendingChange({ customer: selected, status: next as CustomerStatus })}
            />
            {state.phase === "ready" && !writable ? <span className="text-xs text-brand-black/52">Writes need the live tables.</span> : null}
          </div>
        </div>

        <ConfirmDialog
          open={pendingChange !== null}
          title="Update customer account"
          message={pendingChange ? `${pendingChange.customer.name} will be set to "${pendingChange.status}".` : ""}
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
      <CommerceSectionHeading title="Customers" subtitle={data ? `${data.customers.length} customer${data.customers.length === 1 ? "" : "s"}` : "Loading customers..."}>
        <button className={btnOutlineSm} type="button" onClick={() => void commerceStore.load(true)} disabled={!data}>Refresh</button>
      </CommerceSectionHeading>

      {state.phase === "ready" && !writable ? <DevDataNotice /> : null}

      <div className="grid gap-3">
        <input
          className="min-h-11.5 w-full rounded-[18px_12px_16px_10px/12px_18px_10px_16px] border-3 border-brand-forest bg-brand-white px-4 py-[0.65rem] text-brand-black shadow-brand-soft outline-none placeholder:text-brand-black/46 focus-visible:border-brand-green-ink focus-visible:ring-4 focus-visible:ring-brand-leaf/20"
          type="search"
          aria-label="Search customers"
          placeholder="Search by name, email, phone, or area..."
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
        <div className="flex flex-wrap items-center gap-2">
          <ColumnFilterDropdown label="Customer" options={customerNames} value={filters.customer} onSelect={(v) => setFilters((f) => ({ ...f, customer: v }))} />
          <ColumnFilterDropdown label="Status" options={customerStatuses} value={filters.status} onSelect={(v) => setFilters((f) => ({ ...f, status: v }))} />
          <ColumnFilterDropdown label="Area" options={areas} value={filters.area} onSelect={(v) => setFilters((f) => ({ ...f, area: v }))} />
          <ColumnFilterDropdown label="Orders" options={COUNT_RANGES} value={filters.orders} onSelect={(v) => setFilters((f) => ({ ...f, orders: v }))} />
          <ColumnFilterDropdown label="Spend" options={spendRanges} value={filters.spend} onSelect={(v) => setFilters((f) => ({ ...f, spend: v }))} allLabel="Any amount" />
          <ColumnFilterDropdown label="Subscription" options={subscriptionOptions} value={filters.subscription} onSelect={(v) => setFilters((f) => ({ ...f, subscription: v }))} />
          <ClearFiltersButton count={activeFilterCount} onClear={() => setFilters({ customer: "", status: "", area: "", orders: "", spend: "", subscription: "" })} />
        </div>
      </div>

      {data.customers.length === 0 ? (
        <p className="rounded-wobbly-card border-3 border-dashed border-brand-forest/30 bg-brand-white p-6 text-center text-sm font-semibold text-brand-black/64">No customers yet.</p>
      ) : filtered.length === 0 ? (
        <p className="rounded-wobbly-card border-3 border-dashed border-brand-forest/30 bg-brand-white p-6 text-center text-sm font-semibold text-brand-black/64">No customers match the current search or filter.</p>
      ) : (
        <div className="overflow-x-auto rounded-wobbly-card border-3 border-brand-forest bg-brand-white shadow-brand-soft">
          <table className="w-full min-w-180 border-collapse text-left">
            <caption className="sr-only">Customers</caption>
            <thead>
              <tr className="border-b-3 border-dashed border-brand-forest/30 bg-brand-warm-white text-xs font-bold uppercase tracking-[0.08em] text-brand-green-ink">
                <th className="px-4 py-3">Customer</th>
                <th className="px-4 py-3">Area</th>
                <th className="px-4 py-3">Orders</th>
                <th className="px-4 py-3">Total spend</th>
                <th className="px-4 py-3">Subscription</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((customer) => {
                const customerStats = stats.get(customer.id) ?? { orders: 0, spend: 0 };
                const subStatus = subscriptionStatus(customer.id);
                return (
                  <tr className="border-b-2 border-dashed border-brand-forest/16 text-sm last:border-b-0" key={customer.id}>
                    <td className="px-4 py-3">
                      <div className="grid gap-0.5">
                        <span className="font-bold text-brand-black">{customer.name}</span>
                        <span className="text-xs text-brand-black/52">{customer.email}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-brand-black/72">{customer.area}</td>
                    <td className="px-4 py-3 text-brand-black/72">{customerStats.orders}</td>
                    <td className="px-4 py-3 font-bold text-brand-black">{formatMoney(customerStats.spend)}</td>
                    <td className="px-4 py-3">{subStatus ? <CommerceStatusBadge status={subStatus} /> : <span className="text-brand-black/52">None</span>}</td>
                    <td className="px-4 py-3"><CommerceStatusBadge status={customer.status} /></td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-2">
                        <button className="min-h-9 touch-manipulation rounded-full border-2 border-brand-forest px-3 py-1 text-xs font-bold text-brand-forest hover:bg-brand-yellow focus-visible:outline focus-visible:outline-3 focus-visible:outline-dashed focus-visible:outline-brand-green-ink focus-visible:outline-offset-2" type="button" onClick={() => setSelected(customer)}>View</button>
                        <StatusChangeSelect
                          value={customer.status}
                          options={customerStatuses}
                          writable={writable}
                          busy={busy}
                          onChange={(next) => setPendingChange({ customer, status: next as CustomerStatus })}
                        />
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <ConfirmDialog
        open={pendingChange !== null}
        title="Update customer account"
        message={pendingChange ? `${pendingChange.customer.name} will be set to "${pendingChange.status}".` : ""}
        confirmLabel="Update"
        busy={busy}
        onConfirm={() => void applyStatusChange()}
        onCancel={() => setPendingChange(null)}
      />
    </div>
  );
}
