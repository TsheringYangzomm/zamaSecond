import { useMemo, useState } from "react";
import { useAdminAuth } from "../../admin/admin-auth";
import { commerceStore, customerName } from "../../admin/commerce-api";
import { orderStatuses, paymentStatuses, type Order, type OrderStatus } from "../../admin/commerce-types";
import { btnOutlineSm } from "../../components/ui/styles";
import { ConfirmDialog } from "../../components/ui/confirm-dialog";
import { amountRangeKeyFor, buildAmountRanges, ClearFiltersButton, ColumnFilterDropdown, COUNT_RANGES, countRangeKey, DATE_RANGES, dateRangeKey } from "./column-filter-dropdown";
import {
  CommerceError,
  CommerceLoading,
  CommerceSectionHeading,
  CommerceStatusBadge,
  DevDataNotice,
  StatusChangeSelect,
  ViewButton,
  formatDate,
  formatDateTime,
  formatMoney,
  useCommerceStore,
} from "./commerce-shared";

import { DeliveriesTab } from "./deliveries-tab";
import { ReceiptView } from "./receipt-view";

type PendingChange = { order: Order; status: OrderStatus };

type ColumnFilter = {
  status: string;
  payment: string;
  location: string;
  customer: string;
  amount: string;
  placed: string;
  items: string;
  notes: string;
};

export function OrdersTab() {
  const { email: adminEmail } = useAdminAuth();
  const state = useCommerceStore();
  const [view, setView] = useState<"orders" | "deliveries">("orders");
  const [query, setQuery] = useState("");
  const [filters, setFilters] = useState<ColumnFilter>({ status: "", payment: "", location: "", customer: "", amount: "", placed: "", items: "", notes: "" });
  const [selected, setSelected] = useState<Order | null>(null);
  const [pendingChange, setPendingChange] = useState<PendingChange | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [expandedNotes, setExpandedNotes] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
const [receiptOpen, setReceiptOpen] = useState(false);

  const data = state.phase === "ready" ? state.data : null;
  const writable = state.phase === "ready" && state.writable;

  const amountRanges = useMemo(() => buildAmountRanges((data?.orders ?? []).map((order) => order.total)), [data]);

  const filtered = useMemo(() => {
    if (!data) return [];
    const needle = query.trim().toLowerCase();
    return data.orders.filter((order) => {
      if (filters.status && order.status !== filters.status) return false;
      if (filters.payment && order.payment_status !== filters.payment) return false;
      if (filters.location && order.delivery_area !== filters.location) return false;
      if (filters.customer && customerName(data.customers, order.customer_id) !== filters.customer) return false;
      if (filters.amount && amountRangeKeyFor(amountRanges, order.total) !== filters.amount) return false;
      if (filters.placed && dateRangeKey(order.created_at) !== filters.placed) return false;
      const itemCount = order.items.reduce((sum, item) => sum + item.quantity, 0);
      if (filters.items && countRangeKey(itemCount) !== filters.items) return false;
      if (filters.notes === "has" && !order.notes.trim()) return false;
      if (filters.notes === "none" && order.notes.trim()) return false;
      if (!needle) return true;
      const customer = customerName(data.customers, order.customer_id);
      return (
        order.id.toLowerCase().includes(needle) ||
        customer.toLowerCase().includes(needle) ||
        order.delivery_area.toLowerCase().includes(needle) ||
        order.items.some((item) => item.name.toLowerCase().includes(needle))
      );
    });
  }, [data, query, filters, amountRanges]);

  const locations = useMemo(() => {
    if (!data) return [];
    const set = new Set(data.orders.map((o) => o.delivery_area).filter(Boolean));
    return [...set].sort();
  }, [data]);

  const customerNames = useMemo(() => {
    if (!data) return [];
    const set = new Set(data.orders.map((o) => customerName(data.customers, o.customer_id)));
    return [...set].sort();
  }, [data]);

  function setFilter(key: keyof ColumnFilter, value: string) {
    setFilters((current) => ({ ...current, [key]: value }));
  }

  const activeFilterCount = Object.values(filters).filter(Boolean).length;

  async function applyStatusChange() {
    if (!pendingChange) return;
    const { order, status } = pendingChange;
    setBusy(true);
    setActionError(null);
    try {
      await commerceStore.updateOrderStatus(order.id, status, adminEmail);
      setSelected((current) => (current && current.id === order.id ? { ...current, status } : current));
    } catch (changeError) {
      setActionError(changeError instanceof Error ? changeError.message : "Could not update the order status.");
    } finally {
      setBusy(false);
      setPendingChange(null);
    }
  }

  if (state.phase === "loading" || state.phase === "idle") {
    return <div className="grid gap-5"><CommerceSectionHeading title="Orders" subtitle="Loading orders..." /><CommerceLoading /></div>;
  }
  if (state.phase === "error") {
    return (
      <div className="grid gap-5">
        <CommerceSectionHeading title="Orders" subtitle="Orders could not be loaded." />
        <CommerceError message={state.message} onRetry={() => void commerceStore.load(true)} />
      </div>
    );
  }
  if (!data) {
    return <div className="grid gap-5"><CommerceSectionHeading title="Orders" subtitle="Loading orders..." /><CommerceLoading /></div>;
  }

  if (selected) {
    const customer = data.customers.find((item) => item.id === selected.customer_id);
    const delivery = data.deliveries.find((item) => item.order_id === selected.id) ?? null;
    return (
      <div className="grid gap-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="grid gap-1">
            <h1 className="font-primary text-[clamp(1.7rem,3.5vw,2.4rem)] font-bold leading-[1.02] text-brand-green-ink">Order {selected.id}</h1>
            <p className="text-sm text-brand-black/68">{formatDateTime(selected.created_at)}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {selected.status === "delivered" ? (
              <button className={btnOutlineSm} type="button" onClick={() => setReceiptOpen(true)}>Print receipt</button>
            ) : null}
            <button className={btnOutlineSm} type="button" onClick={() => setSelected(null)}>← Back to orders</button>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <div className="grid gap-1 rounded-wobbly-card border-3 border-brand-forest bg-brand-white p-4 shadow-brand-soft">
            <span className="text-xs font-bold uppercase tracking-[0.1em] text-brand-orange-ink">Status</span>
            <CommerceStatusBadge status={selected.status} />
          </div>
          <div className="grid gap-1 rounded-wobbly-card border-3 border-brand-forest bg-brand-white p-4 shadow-brand-soft">
            <span className="text-xs font-bold uppercase tracking-[0.1em] text-brand-orange-ink">Customer</span>
            <span className="font-bold text-brand-black">{customer?.name ?? selected.customer_id}</span>
            {customer ? <span className="text-sm text-brand-black/68">{customer.email}</span> : null}
            <span className="text-xs text-brand-black/56">{selected.delivery_area}</span>
          </div>
          <div className="grid gap-1 rounded-wobbly-card border-3 border-brand-forest bg-brand-white p-4 shadow-brand-soft">
            <span className="text-xs font-bold uppercase tracking-[0.1em] text-brand-orange-ink">Total</span>
            <span className="font-primary text-2xl font-bold text-brand-green-ink">{formatMoney(selected.total)}</span>
            <span className="text-xs text-brand-black/56">Paid via {selected.payment_method || "—"}</span>
          </div>
        </div>

        <div className="overflow-x-auto rounded-wobbly-card border-3 border-brand-forest bg-brand-white shadow-brand-soft">
          <table className="w-full min-w-120 border-collapse text-left">
            <caption className="sr-only">Order items</caption>
            <thead>
              <tr className="border-b-3 border-dashed border-brand-forest/30 bg-brand-warm-white text-xs font-bold uppercase tracking-[0.08em] text-brand-green-ink">
                <th className="px-4 py-3">Product</th>
                <th className="px-4 py-3">Qty</th>
                <th className="px-4 py-3">Price</th>
                <th className="px-4 py-3">Line total</th>
              </tr>
            </thead>
            <tbody>
              {selected.items.map((item, index) => (
                <tr className="border-b-2 border-dashed border-brand-forest/16 text-sm last:border-b-0" key={`${item.product_id}-${index}`}>
                  <td className="px-4 py-3 font-bold text-brand-black">{item.name}</td>
                  <td className="px-4 py-3 text-brand-black/72">{item.quantity}</td>
                  <td className="px-4 py-3 text-brand-black/72">{formatMoney(item.price)}</td>
                  <td className="px-4 py-3 text-brand-black/72">{formatMoney(item.price * item.quantity)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="grid gap-2 rounded-wobbly-card border-3 border-brand-forest bg-brand-white p-4 shadow-brand-soft">
            <span className="text-xs font-bold uppercase tracking-[0.1em] text-brand-orange-ink">Payment</span>
            <div className="flex flex-wrap items-center gap-2"><CommerceStatusBadge status={selected.payment_status} /><span className="text-sm font-bold text-brand-black">{selected.payment_method || "No method"}</span></div>
            {selected.payment_reference ? <p className="text-sm text-brand-black/68">Reference: {selected.payment_reference}</p> : <p className="text-sm text-brand-black/68">No reference recorded.</p>}
          </div>
          <div className="grid gap-2 rounded-wobbly-card border-3 border-brand-forest bg-brand-white p-4 shadow-brand-soft">
            <span className="text-xs font-bold uppercase tracking-[0.1em] text-brand-orange-ink">Delivery</span>
            {selected.delivery_date ? <p className="text-sm text-brand-black/72">Date: <span className="font-bold text-brand-black">{formatDate(selected.delivery_date)}</span></p> : <p className="text-sm text-brand-black/72">No delivery date set.</p>}
            <p className="text-sm text-brand-black/72">Area: <span className="font-bold text-brand-black">{selected.delivery_area}</span></p>
            {selected.notes ? <p className="text-sm text-brand-black/68">{selected.notes}</p> : null}
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
              options={orderStatuses}
              writable={writable}
              busy={busy}
              onChange={(next) => {
                setActionError(null);
                setPendingChange({ order: selected, status: next as OrderStatus });
              }}
            />
            {!writable ? <span className="text-xs text-brand-black/52">Writes need the live tables.</span> : null}
          </div>
        </div>

        {actionError ? (
          <p className="rounded-wobbly-card border-3 border-dashed border-brand-orange bg-brand-orange/10 p-4 text-sm font-semibold text-brand-black" role="alert">{actionError}</p>
        ) : null}

        <ConfirmDialog
          open={pendingChange !== null}
          title="Update order status"
          message={pendingChange ? `Move order ${pendingChange.order.id} to "${pendingChange.status.replace(/_/g, " ")}"?` : ""}
          confirmLabel="Update"
          busy={busy}
          onConfirm={() => void applyStatusChange()}
          onCancel={() => setPendingChange(null)}
        />

        {receiptOpen ? (
          <ReceiptView
            order={selected}
            customer={customer}
            delivery={delivery}
            onClose={() => setReceiptOpen(false)}
          />
        ) : null}
      </div>
    );
  }

  return (
    <div className="grid gap-5">
      <div className="flex flex-wrap items-center gap-2">
        <ViewButton active={view === "orders"} count={data ? data.orders.length : null} onClick={() => setView("orders")}>Orders</ViewButton>
        <ViewButton active={view === "deliveries"} count={data ? data.deliveries.length : null} onClick={() => setView("deliveries")}>Deliveries</ViewButton>
      </div>

      {view === "orders" ? (
        <>
          <CommerceSectionHeading title="Orders" subtitle={data ? `${data.orders.length} order${data.orders.length === 1 ? "" : "s"}` : "Loading orders..."}>
            <button className={btnOutlineSm} type="button" onClick={() => void commerceStore.load(true)} disabled={!data}>Refresh</button>
          </CommerceSectionHeading>

          {!writable ? <DevDataNotice /> : null}

      <div className="grid gap-3">
        <input
          className="min-h-11.5 w-full rounded-[18px_16px_10px/12px_18px_10px_16px] border-3 border-brand-forest bg-brand-white px-4 py-[0.65rem] text-brand-black shadow-brand-soft outline-none placeholder:text-brand-black/46 focus-visible:border-brand-green-ink focus-visible:ring-4 focus-visible:ring-brand-leaf/20"
          type="search"
          aria-label="Search orders"
          placeholder="Search by order, customer, area, or product..."
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
        <div className="flex flex-wrap items-center gap-2">
          <ColumnFilterDropdown label="Status" options={orderStatuses} value={filters.status} onSelect={(v) => setFilter("status", v)} />
          <ColumnFilterDropdown label="Payment" options={paymentStatuses} value={filters.payment} onSelect={(v) => setFilter("payment", v)} />
          <ColumnFilterDropdown label="Location" options={locations} value={filters.location} onSelect={(v) => setFilter("location", v)} />
          <ColumnFilterDropdown label="Customer" options={customerNames} value={filters.customer} onSelect={(v) => setFilter("customer", v)} />
          <ColumnFilterDropdown label="Amount" options={amountRanges} value={filters.amount} onSelect={(v) => setFilter("amount", v)} />
          <ColumnFilterDropdown label="Placed" options={DATE_RANGES} value={filters.placed} onSelect={(v) => setFilter("placed", v)} allLabel="Any date" />
          <ColumnFilterDropdown label="Items" options={COUNT_RANGES} value={filters.items} onSelect={(v) => setFilter("items", v)} />
          <ColumnFilterDropdown label="Notes" options={[{ value: "has", label: "Has notes" }, { value: "none", label: "No notes" }]} value={filters.notes} onSelect={(v) => setFilter("notes", v)} />
          <ClearFiltersButton count={activeFilterCount} onClear={() => setFilters({ status: "", payment: "", location: "", customer: "", amount: "", placed: "", items: "", notes: "" })} />
        </div>
      </div>

      {data.orders.length === 0 ? (
        <p className="rounded-wobbly-card border-3 border-dashed border-brand-forest/30 bg-brand-white p-6 text-center text-sm font-semibold text-brand-black/64">No orders yet.</p>
      ) : filtered.length === 0 ? (
        <p className="rounded-wobbly-card border-3 border-dashed border-brand-forest/30 bg-brand-white p-6 text-center text-sm font-semibold text-brand-black/64">No orders match the current search or filter.</p>
      ) : (
        <div className="w-full max-w-full overflow-x-auto rounded-wobbly-card border-3 border-brand-forest bg-brand-white shadow-brand-soft">
          <table className="w-full min-w-[640px] border-collapse text-left text-xs sm:text-sm">
            <caption className="sr-only">Orders</caption>
            <thead>
              <tr className="border-b-3 border-dashed border-brand-forest/30 bg-brand-warm-white text-[0.65rem] font-bold uppercase tracking-[0.08em] text-brand-green-ink">
                <th className="whitespace-nowrap px-2.5 py-2.5 sm:px-3">Order</th>
                <th className="whitespace-nowrap px-2.5 py-2.5 sm:px-3">Customer</th>
                <th className="hidden md:table-cell whitespace-nowrap px-2.5 py-2.5 sm:px-3">Location</th>
                <th className="hidden lg:table-cell truncate px-2.5 py-2.5 sm:px-3">Items</th>
                <th className="whitespace-nowrap px-2.5 py-2.5 sm:px-3">Amount</th>
                <th className="hidden sm:table-cell whitespace-nowrap px-2.5 py-2.5 sm:px-3">Placed</th>
                <th className="hidden md:table-cell whitespace-nowrap px-2.5 py-2.5 sm:px-3">Payment</th>
                <th className="whitespace-nowrap px-2.5 py-2.5 sm:px-3">Order Status</th>
                <th className="hidden lg:table-cell truncate px-2.5 py-2.5 sm:px-3">Notes</th>
                <th className="px-2.5 py-2.5 sm:px-3">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((order) => (
                <tr className="border-b-2 border-dashed border-brand-forest/16 last:border-b-0" key={order.id}>
                  <td className="whitespace-nowrap px-2.5 py-2.5 sm:px-3 font-bold text-brand-black">{order.id}</td>
                  <td className="whitespace-nowrap px-2.5 py-2.5 sm:px-3 text-brand-black/72 truncate">{customerName(data.customers, order.customer_id)}</td>
                  <td className="hidden md:table-cell whitespace-nowrap px-2.5 py-2.5 sm:px-3 text-brand-black/72 truncate">{order.delivery_area || "—"}</td>
                  <td className="hidden lg:table-cell px-2.5 py-2.5 sm:px-3 text-brand-black/72 truncate" title={order.items.map((item) => `${item.quantity}× ${item.name}`).join(", ")}>{order.items.map((item) => `${item.quantity}× ${item.name}`).join(", ")}</td>
                  <td className="whitespace-nowrap px-2.5 py-2.5 sm:px-3 font-bold text-brand-black">{formatMoney(order.total)}</td>
                  <td className="hidden sm:table-cell whitespace-nowrap px-2.5 py-2.5 sm:px-3 text-brand-black/72">{formatDateTime(order.created_at)}</td>
                  <td className="hidden md:table-cell whitespace-nowrap px-2.5 py-2.5 sm:px-3"><CommerceStatusBadge status={order.payment_status} /></td>
                  <td className="whitespace-nowrap px-2.5 py-2.5 sm:px-3"><CommerceStatusBadge status={order.status} /></td>
                  <td className="hidden lg:table-cell max-w-28 px-2.5 py-2.5 sm:px-3 text-brand-black/72" title={order.notes || ""}>
                    {order.notes ? (
                      <span className="flex items-start gap-1">
                        <span className="min-w-0 truncate">{order.notes}</span>
                        {order.notes.length > 20 ? (
                          <button className="mt-0.5 shrink-0 text-brand-forest hover:text-brand-green-ink" type="button" onClick={() => setExpandedNotes(order.id)}>
                            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" /></svg>
                          </button>
                        ) : null}
                      </span>
                    ) : "—"}
                  </td>
                  <td className="whitespace-nowrap px-2.5 py-2.5 sm:px-3">
                    <div className="flex items-center justify-end gap-1">
                      <button className="min-h-7 touch-manipulation rounded-full border-2 border-brand-forest px-2 py-0.5 text-[0.65rem] font-bold text-brand-forest hover:bg-brand-yellow focus-visible:outline focus-visible:outline-3 focus-visible:outline-dashed focus-visible:outline-brand-green-ink focus-visible:outline-offset-2" type="button" onClick={() => setSelected(order)}>View</button>
                      <StatusChangeSelect
                        value={order.status}
                        options={orderStatuses}
                        writable={writable}
                        busy={busy}
                        onChange={(next) => {
                          setActionError(null);
                          setPendingChange({ order, status: next as OrderStatus });
                        }}
                      />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {actionError ? (
        <p className="rounded-wobbly-card border-3 border-dashed border-brand-orange bg-brand-orange/10 p-4 text-sm font-semibold text-brand-black" role="alert">{actionError}</p>
      ) : null}

      <ConfirmDialog
        open={pendingChange !== null}
        title="Update order status"
        message={pendingChange ? `Move order ${pendingChange.order.id} to "${pendingChange.status.replace(/_/g, " ")}"?` : ""}
        confirmLabel="Update"
        busy={busy}
        onConfirm={() => void applyStatusChange()}
        onCancel={() => setPendingChange(null)}
      />

      {expandedNotes ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-brand-black/40 p-4" role="dialog" onClick={() => setExpandedNotes(null)}>
          <div className="grid max-w-md gap-3 rounded-wobbly-card border-3 border-brand-forest bg-brand-white p-5 shadow-brand" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-sm font-bold uppercase tracking-[0.06em] text-brand-green-ink">Notes — {expandedNotes}</h3>
              <button className="rounded-full border-2 border-brand-forest p-1 text-brand-forest hover:bg-brand-yellow" type="button" onClick={() => setExpandedNotes(null)}>
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <p className="whitespace-pre-line text-sm leading-relaxed text-brand-black/72">{data?.orders.find((o) => o.id === expandedNotes)?.notes || "No notes."}</p>
          </div>
        </div>
      ) : null}
        </>
      ) : (
        <DeliveriesTab />
      )}
    </div>
  );
}
