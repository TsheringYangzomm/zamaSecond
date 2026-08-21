import { useMemo, useState } from "react";
import { useAdminAuth } from "../../admin/admin-auth";
import { commerceStore, customerName } from "../../admin/commerce-api";
import { orderStatuses, type Order, type OrderStatus } from "../../admin/commerce-types";
import { btnOutlineSm } from "../../components/ui/styles";
import { ConfirmDialog } from "../../components/ui/confirm-dialog";
import { selectClasses } from "./admin-fields";
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

type PendingChange = { order: Order; status: OrderStatus };

export function OrdersTab() {
  const { email: adminEmail } = useAdminAuth();
  const state = useCommerceStore();
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [selected, setSelected] = useState<Order | null>(null);
  const [pendingChange, setPendingChange] = useState<PendingChange | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const data = state.phase === "ready" ? state.data : null;
  const writable = state.phase === "ready" && state.writable;

  const filtered = useMemo(() => {
    if (!data) return [];
    const needle = query.trim().toLowerCase();
    return data.orders.filter((order) => {
      if (statusFilter && order.status !== statusFilter) return false;
      if (!needle) return true;
      const customer = customerName(data.customers, order.customer_id);
      return (
        order.id.toLowerCase().includes(needle) ||
        customer.toLowerCase().includes(needle) ||
        order.delivery_area.toLowerCase().includes(needle) ||
        order.items.some((item) => item.name.toLowerCase().includes(needle))
      );
    });
  }, [data, query, statusFilter]);

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
    return (
      <div className="grid gap-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="grid gap-1">
            <h1 className="font-primary text-[clamp(1.7rem,3.5vw,2.4rem)] font-bold leading-[1.02] text-brand-green-ink">Order {selected.id}</h1>
            <p className="text-sm text-brand-black/68">{formatDateTime(selected.created_at)}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
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
      </div>
    );
  }

  return (
    <div className="grid gap-5">
      <CommerceSectionHeading title="Orders" subtitle={data ? `${data.orders.length} order${data.orders.length === 1 ? "" : "s"}` : "Loading orders..."}>
        <button className={btnOutlineSm} type="button" onClick={() => void commerceStore.load(true)} disabled={!data}>Refresh</button>
      </CommerceSectionHeading>

      {!writable ? <DevDataNotice /> : null}

      <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto]">
        <input
          className="min-h-11.5 w-full rounded-[18px_12px_16px_10px/12px_18px_10px_16px] border-3 border-brand-forest bg-brand-white px-4 py-[0.65rem] text-brand-black shadow-brand-soft outline-none placeholder:text-brand-black/46 focus-visible:border-brand-green-ink focus-visible:ring-4 focus-visible:ring-brand-leaf/20"
          type="search"
          aria-label="Search orders"
          placeholder="Search by order, customer, area, or product..."
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
        <select className={`${selectClasses} min-w-52`} aria-label="Filter by status" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
          <option value="">All statuses</option>
          {orderStatuses.map((status) => <option key={status} value={status}>{status.replace(/_/g, " ")}</option>)}
        </select>
      </div>

      {data.orders.length === 0 ? (
        <p className="rounded-wobbly-card border-3 border-dashed border-brand-forest/30 bg-brand-white p-6 text-center text-sm font-semibold text-brand-black/64">No orders yet.</p>
      ) : filtered.length === 0 ? (
        <p className="rounded-wobbly-card border-3 border-dashed border-brand-forest/30 bg-brand-white p-6 text-center text-sm font-semibold text-brand-black/64">No orders match the current search or filter.</p>
      ) : (
        <div className="overflow-x-auto rounded-wobbly-card border-3 border-brand-forest bg-brand-white shadow-brand-soft">
          <table className="w-full min-w-190 border-collapse text-left">
            <caption className="sr-only">Orders</caption>
            <thead>
              <tr className="border-b-3 border-dashed border-brand-forest/30 bg-brand-warm-white text-xs font-bold uppercase tracking-[0.08em] text-brand-green-ink">
                <th className="px-4 py-3">Order</th>
                <th className="px-4 py-3">Customer</th>
                <th className="px-4 py-3">Items</th>
                <th className="px-4 py-3">Total</th>
                <th className="px-4 py-3">Placed</th>
                <th className="px-4 py-3">Payment</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((order) => (
                <tr className="border-b-2 border-dashed border-brand-forest/16 text-sm last:border-b-0" key={order.id}>
                  <td className="px-4 py-3 font-bold text-brand-black">{order.id}</td>
                  <td className="px-4 py-3 text-brand-black/72">{customerName(data.customers, order.customer_id)}</td>
                  <td className="px-4 py-3 text-brand-black/72">{order.items.reduce((sum, item) => sum + item.quantity, 0)} item(s)</td>
                  <td className="px-4 py-3 font-bold text-brand-black">{formatMoney(order.total)}</td>
                  <td className="px-4 py-3 text-brand-black/72">{formatDateTime(order.created_at)}</td>
                  <td className="px-4 py-3"><CommerceStatusBadge status={order.payment_status} /></td>
                  <td className="px-4 py-3"><CommerceStatusBadge status={order.status} /></td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-2">
                      <button className="min-h-9 touch-manipulation rounded-full border-2 border-brand-forest px-3 py-1 text-xs font-bold text-brand-forest hover:bg-brand-yellow focus-visible:outline focus-visible:outline-3 focus-visible:outline-dashed focus-visible:outline-brand-green-ink focus-visible:outline-offset-2" type="button" onClick={() => setSelected(order)}>View</button>
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
    </div>
  );
}
