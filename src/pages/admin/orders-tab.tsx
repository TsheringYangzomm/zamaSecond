import { useEffect, useMemo, useRef, useState } from "react";
import { useAdminAuth } from "../../admin/admin-auth";
import { commerceStore, customerName } from "../../admin/commerce-api";
import { deliveryStatuses, orderStatuses, paymentStatuses, type Delivery, type DeliveryStatus, type Order, type OrderStatus } from "../../admin/commerce-types";
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
  formatCompactDateTime,
  formatDate,
  formatDateTime,
  formatMoney,
  useCommerceStore,
} from "./commerce-shared";

import { PaymentsTab } from "./payments-tab";
import { ReceiptView } from "./receipt-view";
import { ReturnsTab } from "./returns-tab";

type PendingChange = { order: Order; status: OrderStatus };
type PendingDeliveryChange = { delivery: Delivery; status: DeliveryStatus };

type ColumnFilter = {
  status: string;
  payment: string;
  location: string;
  customer: string;
  amount: string;
  placed: string;
  deliveryStatus: string;
  deliveryDate: string;
  driver: string;
  items: string;
  notes: string;
};

type OrderView = "orders" | "payments" | "returns";

function viewFromUrl(): OrderView {
  if (typeof window === "undefined") return "orders";
  const requested = new URLSearchParams(window.location.search).get("view");
  return requested === "payments" || requested === "returns" ? requested : "orders";
}

export function OrdersTab() {
  const { email: adminEmail } = useAdminAuth();
  const state = useCommerceStore();
  const [view, setView] = useState<OrderView>(viewFromUrl);
  const [query, setQuery] = useState("");
  const [filters, setFilters] = useState<ColumnFilter>({ status: "", payment: "", location: "", customer: "", amount: "", placed: "", deliveryStatus: "", deliveryDate: "", driver: "", items: "", notes: "" });
  const [selected, setSelected] = useState<Order | null>(null);
  const [pendingChange, setPendingChange] = useState<PendingChange | null>(null);
  const [pendingDeliveryChange, setPendingDeliveryChange] = useState<PendingDeliveryChange | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [expandedNotes, setExpandedNotes] = useState<string | null>(null);
  const notesCloseRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!expandedNotes) return;
    const previouslyFocused = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setExpandedNotes(null);
      if (event.key === "Tab") {
        event.preventDefault();
        notesCloseRef.current?.focus();
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    notesCloseRef.current?.focus();
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      previouslyFocused?.focus();
    };
  }, [expandedNotes]);
  const [busy, setBusy] = useState(false);
  const [receiptOpen, setReceiptOpen] = useState(false);
  const [driverDraft, setDriverDraft] = useState("");

  useEffect(() => {
    const onLocationChange = () => setView(viewFromUrl());
    window.addEventListener("popstate", onLocationChange);
    return () => window.removeEventListener("popstate", onLocationChange);
  }, []);

  const data = state.phase === "ready" ? state.data : null;
  const writable = state.phase === "ready" && state.writable;

  const amountRanges = useMemo(() => buildAmountRanges((data?.orders ?? []).map((order) => order.total)), [data]);
  const deliveryByOrderId = useMemo(() => {
    const map = new Map<string, Delivery>();
    for (const delivery of data?.deliveries ?? []) {
      if (!map.has(delivery.order_id)) map.set(delivery.order_id, delivery);
    }
    return map;
  }, [data]);

  const filtered = useMemo(() => {
    if (!data) return [];
    const needle = query.trim().toLowerCase();
    return data.orders.filter((order) => {
      const delivery = deliveryByOrderId.get(order.id);
      const deliveryArea = delivery?.area || order.delivery_area;
      if (filters.status && order.status !== filters.status) return false;
      if (filters.payment && order.payment_status !== filters.payment) return false;
      if (filters.location && deliveryArea !== filters.location) return false;
      if (filters.customer && customerName(data.customers, order.customer_id) !== filters.customer) return false;
      if (filters.amount && amountRangeKeyFor(amountRanges, order.total) !== filters.amount) return false;
      if (filters.placed && dateRangeKey(order.created_at) !== filters.placed) return false;
      if (filters.deliveryStatus && delivery?.status !== filters.deliveryStatus) return false;
      if (filters.deliveryDate && dateRangeKey(delivery?.delivery_date ?? order.delivery_date) !== filters.deliveryDate) return false;
      if (filters.driver && (delivery?.driver ?? "") !== filters.driver) return false;
      const itemCount = order.items.reduce((sum, item) => sum + item.quantity, 0);
      if (filters.items && countRangeKey(itemCount) !== filters.items) return false;
      if (filters.notes === "has" && !order.notes.trim()) return false;
      if (filters.notes === "none" && order.notes.trim()) return false;
      if (!needle) return true;
      const customer = customerName(data.customers, order.customer_id);
      return (
        order.id.toLowerCase().includes(needle) ||
        customer.toLowerCase().includes(needle) ||
        deliveryArea.toLowerCase().includes(needle) ||
        (delivery?.id ?? "").toLowerCase().includes(needle) ||
        (delivery?.driver ?? "").toLowerCase().includes(needle) ||
        order.items.some((item) => item.name.toLowerCase().includes(needle))
      );
    });
  }, [data, query, filters, amountRanges, deliveryByOrderId]);

  const locations = useMemo(() => {
    if (!data) return [];
    const set = new Set(data.orders.map((o) => deliveryByOrderId.get(o.id)?.area || o.delivery_area).filter(Boolean));
    return [...set].sort();
  }, [data, deliveryByOrderId]);

  const drivers = useMemo(() => {
    if (!data) return [];
    const set = new Set(data.deliveries.map((delivery) => delivery.driver).filter((driver): driver is string => Boolean(driver?.trim())));
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

  async function applyDeliveryStatusChange() {
    if (!pendingDeliveryChange) return;
    const { delivery, status } = pendingDeliveryChange;
    setBusy(true);
    setActionError(null);
    try {
      await commerceStore.updateDeliveryStatus(delivery.id, status, delivery.driver);
      const linkedOrderStatus: OrderStatus | null = status === "preparing" || status === "out_for_delivery" || status === "delivered" || status === "cancelled" ? status : null;
      if (linkedOrderStatus) setSelected((current) => (current && current.id === delivery.order_id ? { ...current, status: linkedOrderStatus } : current));
    } catch (changeError) {
      setActionError(changeError instanceof Error ? changeError.message : "Could not update the delivery status.");
    } finally {
      setBusy(false);
      setPendingDeliveryChange(null);
    }
  }

  async function saveDriver(delivery: Delivery) {
    setBusy(true);
    setActionError(null);
    try {
      await commerceStore.updateDeliveryStatus(delivery.id, delivery.status, driverDraft.trim() || null);
      setDriverDraft(driverDraft.trim());
    } catch (changeError) {
      setActionError(changeError instanceof Error ? changeError.message : "Could not save the driver.");
    } finally {
      setBusy(false);
    }
  }

  function selectOrder(order: Order) {
    setSelected(order);
    setDriverDraft(deliveryByOrderId.get(order.id)?.driver ?? "");
    setActionError(null);
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
    const currentOrder = data.orders.find((item) => item.id === selected.id) ?? selected;
    const customer = data.customers.find((item) => item.id === currentOrder.customer_id) ?? null;
    const delivery = deliveryByOrderId.get(currentOrder.id) ?? null;
    return (
      <div className="grid gap-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="grid gap-1">
            <h1 className="font-primary text-[clamp(1.7rem,3.5vw,2.4rem)] font-bold leading-[1.02] text-brand-green-ink">Order {currentOrder.id}</h1>
            <p className="text-sm text-brand-black/68">{formatDateTime(currentOrder.created_at)}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {currentOrder.status === "delivered" ? (
              <button className={btnOutlineSm} type="button" onClick={() => setReceiptOpen(true)}>Print receipt</button>
            ) : null}
            <button className={btnOutlineSm} type="button" onClick={() => setSelected(null)}>← Back to orders</button>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <div className="grid gap-1 rounded-wobbly-card border-3 border-brand-forest bg-brand-white p-4 shadow-brand-soft">
            <span className="text-xs font-bold uppercase tracking-[0.1em] text-brand-orange-ink">Status</span>
            <CommerceStatusBadge status={currentOrder.status} />
          </div>
          <div className="grid gap-1 rounded-wobbly-card border-3 border-brand-forest bg-brand-white p-4 shadow-brand-soft">
            <span className="text-xs font-bold uppercase tracking-[0.1em] text-brand-orange-ink">Customer</span>
            <span className="font-bold text-brand-black">{customer?.name ?? currentOrder.customer_id}</span>
            {customer ? <span className="text-sm text-brand-black/68">{customer.email}</span> : null}
            <span className="text-xs text-brand-black/56">{delivery?.area || currentOrder.delivery_area || "Area not set"}</span>
          </div>
          <div className="grid gap-1 rounded-wobbly-card border-3 border-brand-forest bg-brand-white p-4 shadow-brand-soft">
            <span className="text-xs font-bold uppercase tracking-[0.1em] text-brand-orange-ink">Total</span>
            {currentOrder.subtotal != null && currentOrder.subtotal !== currentOrder.total ? <span className="text-sm text-brand-black/60">Subtotal {formatMoney(currentOrder.subtotal)}</span> : null}
            {currentOrder.coupon_code && (currentOrder.coupon_discount ?? 0) > 0 ? <span className="text-sm font-bold text-brand-green-ink">Coupon {currentOrder.coupon_code} · − {formatMoney(currentOrder.coupon_discount ?? 0)}</span> : null}
            {(currentOrder.points_redeemed ?? 0) > 0 ? <span className="text-sm font-bold text-brand-green-ink">Points {currentOrder.points_redeemed} · − {formatMoney(currentOrder.points_discount ?? 0)}</span> : null}
            <span className="font-primary text-2xl font-bold text-brand-green-ink">{formatMoney(currentOrder.total)}</span>
            <span className="text-xs text-brand-black/56">Paid via {currentOrder.payment_method || "—"}</span>
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
              {currentOrder.items.map((item, index) => (
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
            <div className="flex flex-wrap items-center gap-2"><CommerceStatusBadge status={currentOrder.payment_status} /><span className="text-sm font-bold text-brand-black">{currentOrder.payment_method || "No method"}</span></div>
            {currentOrder.payment_reference ? <p className="text-sm text-brand-black/68">Reference: {currentOrder.payment_reference}</p> : <p className="text-sm text-brand-black/68">No reference recorded.</p>}
          </div>
          <div className="grid gap-2 rounded-wobbly-card border-3 border-brand-forest bg-brand-white p-4 shadow-brand-soft">
            <span className="text-xs font-bold uppercase tracking-[0.1em] text-brand-orange-ink">Delivery</span>
            {delivery ? (
              <>
                <div className="flex flex-wrap items-center gap-2 text-sm"><span className="text-brand-black/72">Status:</span><CommerceStatusBadge status={delivery.status} compact /><span className="text-xs text-brand-black/56">{delivery.id}</span></div>
                {delivery.delivery_date || currentOrder.delivery_date ? <p className="text-sm text-brand-black/72">Date: <span className="font-bold text-brand-black">{formatDate(delivery.delivery_date || currentOrder.delivery_date)}</span></p> : <p className="text-sm text-brand-black/72">No delivery date set.</p>}
                <p className="text-sm text-brand-black/72">Area: <span className="font-bold text-brand-black">{delivery.area || currentOrder.delivery_area || "Not set"}</span></p>
                <div className="grid gap-2 border-t-2 border-dashed border-brand-forest/18 pt-3">
                  <label className="grid gap-1 text-xs font-bold uppercase tracking-[0.08em] text-brand-green-ink" htmlFor="delivery-driver">Driver</label>
                  <div className="flex flex-wrap gap-2">
                    <input id="delivery-driver" aria-label="Delivery driver" className="min-h-10 min-w-0 flex-1 rounded-full border-2 border-brand-forest/35 bg-brand-warm-white px-3 py-2 text-sm text-brand-black outline-none placeholder:text-brand-black/45 focus-visible:border-brand-forest focus-visible:ring-4 focus-visible:ring-brand-leaf/20" value={driverDraft} onChange={(event) => setDriverDraft(event.target.value)} placeholder="Assign a driver" disabled={!writable || busy} />
                    <button className={btnOutlineSm} type="button" onClick={() => void saveDriver(delivery)} disabled={!writable || busy}>Save driver</button>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 text-sm">
                    <span className="text-brand-black/72">Update delivery status:</span>
                    <StatusChangeSelect value={delivery.status} options={deliveryStatuses} writable={writable} busy={busy} ariaLabel="Change delivery status" onChange={(next) => { setActionError(null); setPendingDeliveryChange({ delivery, status: next as DeliveryStatus }); }} />
                  </div>
                </div>
              </>
            ) : (
              <p className="text-sm text-brand-black/72">No delivery record. This order is not scheduled yet.</p>
            )}
            {currentOrder.notes ? <p className="text-sm text-brand-black/68">{currentOrder.notes}</p> : null}
          </div>
        </div>

        <div className="grid gap-2 rounded-wobbly-card border-3 border-brand-forest bg-brand-white p-4 shadow-brand-soft">
          <span className="text-xs font-bold uppercase tracking-[0.1em] text-brand-orange-ink">History</span>
          <ol className="grid gap-2">
            {[...currentOrder.history].reverse().map((entry, index) => (
              <li className="flex flex-wrap items-center gap-3 text-sm" key={`${entry.at}-${index}`}>
                <CommerceStatusBadge status={entry.status} />
                <span className="text-brand-black/60">{formatDateTime(entry.at)}</span>
              </li>
            ))}
          </ol>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-[0.1em] text-brand-orange-ink">Update status</span>
            <StatusChangeSelect
              value={currentOrder.status}
              options={orderStatuses}
              writable={writable}
              busy={busy}
              onChange={(next) => {
                setActionError(null);
                setPendingChange({ order: currentOrder, status: next as OrderStatus });
              }}
              ariaLabel="Change order status"
            />
            {state.phase === "ready" && !writable ? <span className="text-xs text-brand-black/52">Writes need the live tables.</span> : null}
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

        <ConfirmDialog
          open={pendingDeliveryChange !== null}
          title="Update delivery status"
          message={pendingDeliveryChange ? `Move delivery ${pendingDeliveryChange.delivery.id} to "${pendingDeliveryChange.status.replace(/_/g, " ")}"?` : ""}
          confirmLabel="Update delivery"
          busy={busy}
          onConfirm={() => void applyDeliveryStatusChange()}
          onCancel={() => setPendingDeliveryChange(null)}
        />

        {receiptOpen ? (
          <ReceiptView
            order={currentOrder}
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
        <ViewButton active={view === "payments"} count={data ? data.payments.length : null} onClick={() => setView("payments")}>Payments</ViewButton>
        <ViewButton active={view === "returns"} count={null} onClick={() => setView("returns")}>Returns</ViewButton>
      </div>

      {view === "orders" ? (
        <>
          <CommerceSectionHeading title="Orders" subtitle={data ? `${data.orders.length} order${data.orders.length === 1 ? "" : "s"} · ${data.deliveries.length} scheduled deliver${data.deliveries.length === 1 ? "y" : "ies"}` : "Loading orders..."}>
            <button className={btnOutlineSm} type="button" onClick={() => void commerceStore.load(true)} disabled={!data}>Refresh</button>
          </CommerceSectionHeading>

          {state.phase === "ready" && !writable ? <DevDataNotice /> : null}

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
          <ColumnFilterDropdown label="Delivery status" options={deliveryStatuses} value={filters.deliveryStatus} onSelect={(v) => setFilter("deliveryStatus", v)} />
          <ColumnFilterDropdown label="Delivery date" options={DATE_RANGES} value={filters.deliveryDate} onSelect={(v) => setFilter("deliveryDate", v)} allLabel="Any date" />
          <ColumnFilterDropdown label="Driver" options={drivers} value={filters.driver} onSelect={(v) => setFilter("driver", v)} />
          <ColumnFilterDropdown label="Items" options={COUNT_RANGES} value={filters.items} onSelect={(v) => setFilter("items", v)} />
          <ColumnFilterDropdown label="Notes" options={[{ value: "has", label: "Has notes" }, { value: "none", label: "No notes" }]} value={filters.notes} onSelect={(v) => setFilter("notes", v)} align="right" />
          <ClearFiltersButton count={activeFilterCount} onClear={() => setFilters({ status: "", payment: "", location: "", customer: "", amount: "", placed: "", deliveryStatus: "", deliveryDate: "", driver: "", items: "", notes: "" })} />
        </div>
      </div>

      {data.orders.length === 0 ? (
        <p className="rounded-wobbly-card border-3 border-dashed border-brand-forest/30 bg-brand-white p-6 text-center text-sm font-semibold text-brand-black/64">No orders yet.</p>
      ) : filtered.length === 0 ? (
        <p className="rounded-wobbly-card border-3 border-dashed border-brand-forest/30 bg-brand-white p-6 text-center text-sm font-semibold text-brand-black/64">No orders match the current search or filter.</p>
      ) : (
        <div className="w-full max-w-full overflow-x-auto rounded-wobbly-card border-3 border-brand-forest bg-brand-white shadow-brand-soft">
          <table className="w-full min-w-[760px] table-fixed border-collapse text-left text-xs sm:min-w-[860px] sm:text-sm md:min-w-[980px] xl:min-w-0">
            <caption className="sr-only">Orders</caption>
            <thead>
              <tr className="border-b-3 border-dashed border-brand-forest/30 bg-brand-warm-white text-[0.65rem] font-bold uppercase tracking-[0.08em] text-brand-green-ink">
                <th className="w-[8.5rem] px-2.5 py-2.5 sm:px-3">Order</th>
                <th className="w-[8rem] px-2.5 py-2.5 sm:px-3"><span className="block">Customer</span><span className="block text-[0.58rem] tracking-[0.12em] text-brand-black/45">Area</span></th>
                <th className="hidden w-[8rem] px-2.5 py-2.5 sm:px-3 md:table-cell">Items</th>
                <th className="w-[5.25rem] px-2.5 py-2.5 sm:px-3">Amount</th>
                <th className="hidden w-[7.5rem] px-2.5 py-2.5 sm:px-3 sm:table-cell">Delivery</th>
                <th className="hidden w-[8.5rem] px-2.5 py-2.5 sm:px-3 md:table-cell">Delivery status</th>
                <th className="hidden w-[5rem] px-2.5 py-2.5 sm:px-3 md:table-cell">Payment</th>
                <th className="w-[6.5rem] px-2.5 py-2.5 sm:px-3">Order status</th>
                <th className="w-[8.5rem] px-2.5 py-2.5 text-right sm:px-3">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((order) => {
                const delivery = deliveryByOrderId.get(order.id);
                const deliveryArea = delivery?.area || order.delivery_area;
                const itemSummary = order.items.map((item) => `${item.quantity}× ${item.name}`).join(", ");
                return (
                  <tr className="border-b-2 border-dashed border-brand-forest/16 transition-colors duration-120 hover:bg-brand-warm-white/70 last:border-b-0" key={order.id}>
                    <td className="max-w-0 overflow-hidden px-2.5 py-2.5 align-middle sm:px-3"><span className="block truncate font-bold leading-tight text-brand-black" title={order.id}>{order.id}</span><span className="block truncate text-[0.65rem] leading-tight text-brand-black/55">Placed {formatCompactDateTime(order.created_at)}</span></td>
                    <td className="max-w-0 overflow-hidden px-2.5 py-2.5 align-middle text-brand-black/72 sm:px-3"><span className="block truncate font-bold leading-tight text-brand-black">{customerName(data.customers, order.customer_id)}</span><span className="block truncate text-[0.65rem] leading-tight text-brand-black/55">{deliveryArea || "Area not set"}</span></td>
                    <td className="hidden max-w-0 overflow-hidden px-2.5 py-2.5 align-middle text-brand-black/72 sm:px-3 md:table-cell" title={itemSummary}><span className="block truncate">{itemSummary || "—"}</span></td>
                    <td className="whitespace-nowrap px-2.5 py-2.5 align-middle font-bold text-brand-black sm:px-3">{formatMoney(order.total)}</td>
                    <td className="hidden max-w-0 overflow-hidden px-2.5 py-2.5 align-middle text-xs text-brand-black/72 sm:px-3 sm:table-cell" title={delivery?.id ?? "No delivery record"}>
                      {delivery ? <><span className="block whitespace-nowrap font-bold text-brand-black">{formatCompactDateTime(delivery.delivery_date)}</span><span className="block truncate text-[0.62rem] text-brand-black/55">{delivery.id}</span></> : <span className="whitespace-nowrap">Not scheduled</span>}
                    </td>
                    <td className="hidden max-w-0 overflow-hidden px-2.5 py-2.5 align-middle sm:px-3 md:table-cell">{delivery ? <><CommerceStatusBadge status={delivery.status} compact /><span className="mt-1 block truncate text-[0.65rem] text-brand-black/55">Driver: {delivery.driver || "Unassigned"}</span></> : <span className="text-brand-black/52">No delivery</span>}</td>
                    <td className="hidden whitespace-nowrap px-2.5 py-2.5 align-middle sm:px-3 md:table-cell"><CommerceStatusBadge status={order.payment_status} compact /></td>
                    <td className="px-2.5 py-2.5 align-middle sm:px-3"><CommerceStatusBadge status={order.status} compact /></td>
                    <td className="px-2.5 py-2.5 text-right align-middle sm:px-3">
                      <button className="inline-flex min-h-8 touch-manipulation items-center justify-center gap-1 rounded-full border-2 border-brand-forest bg-brand-white px-3 py-1 text-xs font-bold text-brand-forest transition-colors duration-120 hover:bg-brand-yellow focus-visible:outline focus-visible:outline-3 focus-visible:outline-dashed focus-visible:outline-brand-green-ink focus-visible:outline-offset-2" type="button" onClick={() => selectOrder(order)}>View details <span aria-hidden="true">→</span></button>
                    </td>
                  </tr>
                );
              })}
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

      <ConfirmDialog
        open={pendingDeliveryChange !== null}
        title="Update delivery status"
        message={pendingDeliveryChange ? `Move delivery ${pendingDeliveryChange.delivery.id} to "${pendingDeliveryChange.status.replace(/_/g, " ")}"?` : ""}
        confirmLabel="Update delivery"
        busy={busy}
        onConfirm={() => void applyDeliveryStatusChange()}
        onCancel={() => setPendingDeliveryChange(null)}
      />

      {expandedNotes ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-brand-black/40 p-4" role="dialog" aria-modal="true" aria-labelledby="expanded-notes-title" onClick={() => setExpandedNotes(null)}>
          <div className="grid max-w-md gap-3 rounded-wobbly-card border-3 border-brand-forest bg-brand-white p-5 shadow-brand" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between gap-3">
              <h3 id="expanded-notes-title" className="text-sm font-bold uppercase tracking-[0.06em] text-brand-green-ink">Notes — {expandedNotes}</h3>
              <button ref={notesCloseRef} className="rounded-full border-2 border-brand-forest p-1 text-brand-forest hover:bg-brand-yellow" type="button" aria-label="Close order notes" onClick={() => setExpandedNotes(null)}>
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <p className="whitespace-pre-line text-sm leading-relaxed text-brand-black/72">{data?.orders.find((o) => o.id === expandedNotes)?.notes || "No notes."}</p>
          </div>
        </div>
      ) : null}
        </>
      ) : view === "payments" ? (
        <PaymentsTab />
      ) : (
        <ReturnsTab />
      )}
    </div>
  );
}
