import { useCallback, useMemo, useState } from "react";
import { commerceStore } from "../../admin/commerce-api";
import { deliveryStatuses, type Delivery, type DeliveryStatus } from "../../admin/commerce-types";
import { btnOutlineSm } from "../../components/ui/styles";
import { ConfirmDialog } from "../../components/ui/confirm-dialog";
import { selectClasses, TextInput } from "./admin-fields";
import {
  CommerceError,
  CommerceLoading,
  CommerceSectionHeading,
  CommerceStatusBadge,
  DevDataNotice,
  StatusChangeSelect,
  formatDate,
  useCommerceStore,
} from "./commerce-shared";

type PendingChange = { delivery: Delivery; status: DeliveryStatus };

export function DeliveriesTab() {
  const state = useCommerceStore();
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [selected, setSelected] = useState<Delivery | null>(null);
  const [driverDraft, setDriverDraft] = useState("");
  const [pendingChange, setPendingChange] = useState<PendingChange | null>(null);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  const data = state.phase === "ready" ? state.data : null;
  const writable = state.phase === "ready" && state.writable;

  const customerLabel = useCallback((customerId: string): string => {
    if (!data) return customerId;
    const customer = data.customers.find((item) => item.id === customerId);
    return customer?.name ?? customerId;
  }, [data]);

  const filtered = useMemo(() => {
    if (!data) return [];
    const needle = query.trim().toLowerCase();
    return data.deliveries.filter((delivery) => {
      if (statusFilter && delivery.status !== statusFilter) return false;
      if (!needle) return true;
      return (
        delivery.id.toLowerCase().includes(needle) ||
        delivery.order_id.toLowerCase().includes(needle) ||
        delivery.area.toLowerCase().includes(needle) ||
        (delivery.driver ?? "").toLowerCase().includes(needle) ||
        customerLabel(delivery.customer_id).toLowerCase().includes(needle)
      );
    });
  }, [data, query, statusFilter, customerLabel]);

  async function applyStatusChange() {
    if (!pendingChange) return;
    const { delivery, status: nextStatus } = pendingChange;
    setBusy(true);
    try {
      await commerceStore.updateDeliveryStatus(delivery.id, nextStatus, delivery.driver);
      setSelected((current) => (current && current.id === delivery.id ? { ...current, status: nextStatus } : current));
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Could not update the delivery.");
    } finally {
      setBusy(false);
      setPendingChange(null);
    }
  }

  async function handleSaveDriver() {
    if (!selected || !writable) return;
    setStatus(null);
    setBusy(true);
    try {
      await commerceStore.updateDeliveryStatus(selected.id, selected.status, driverDraft.trim() || null);
      setSelected({ ...selected, driver: driverDraft.trim() || null });
      setStatus("Driver saved.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Could not save the driver.");
    } finally {
      setBusy(false);
    }
  }

  if (state.phase === "loading" || state.phase === "idle") {
    return <div className="grid gap-5"><CommerceSectionHeading title="Deliveries" subtitle="Loading deliveries..." /><CommerceLoading /></div>;
  }
  if (state.phase === "error") {
    return (
      <div className="grid gap-5">
        <CommerceSectionHeading title="Deliveries" subtitle="Deliveries could not be loaded." />
        <CommerceError message={state.message} onRetry={() => void commerceStore.load(true)} />
      </div>
    );
  }
  if (!data) {
    return <div className="grid gap-5"><CommerceSectionHeading title="Deliveries" subtitle="Loading deliveries..." /><CommerceLoading /></div>;
  }

  if (selected) {
    const order = data.orders.find((item) => item.id === selected.order_id);
    return (
      <div className="grid gap-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="grid gap-1">
            <h1 className="font-primary text-[clamp(1.7rem,3.5vw,2.4rem)] font-bold leading-[1.02] text-brand-green-ink">Delivery {selected.id}</h1>
            <p className="text-sm text-brand-black/68">Order {selected.order_id}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button className={btnOutlineSm} type="button" onClick={() => setSelected(null)}>← Back to deliveries</button>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <div className="grid gap-1 rounded-wobbly-card border-3 border-brand-forest bg-brand-white p-4 shadow-brand-soft">
            <span className="text-xs font-bold uppercase tracking-[0.1em] text-brand-orange-ink">Customer</span>
            <span className="font-bold text-brand-black">{customerLabel(selected.customer_id)}</span>
            <span className="text-sm text-brand-black/68">{selected.area}</span>
          </div>
          <div className="grid gap-1 rounded-wobbly-card border-3 border-brand-forest bg-brand-white p-4 shadow-brand-soft">
            <span className="text-xs font-bold uppercase tracking-[0.1em] text-brand-orange-ink">Delivery date</span>
            <span className="font-bold text-brand-black">{formatDate(selected.delivery_date)}</span>
            <CommerceStatusBadge status={selected.status} />
          </div>
          <div className="grid gap-1 rounded-wobbly-card border-3 border-brand-forest bg-brand-white p-4 shadow-brand-soft">
            <span className="text-xs font-bold uppercase tracking-[0.1em] text-brand-orange-ink">Order value</span>
            <span className="font-bold text-brand-black">{order ? `Nu. ${order.total}` : "—"}</span>
            <span className="text-sm text-brand-black/68">Items: {order ? order.items.reduce((sum, item) => sum + item.quantity, 0) : "—"}</span>
          </div>
        </div>

        <div className="grid gap-3 rounded-wobbly-card border-3 border-brand-forest bg-brand-white p-4 shadow-brand-soft">
          <span className="text-xs font-bold uppercase tracking-[0.1em] text-brand-orange-ink">Driver</span>
          <div className="flex flex-wrap items-center gap-3">
            <TextInput
              className="max-w-60"
              aria-label="Driver"
              value={driverDraft}
              disabled={!writable}
              placeholder="Unassigned"
              onChange={(event) => setDriverDraft(event.target.value)}
            />
            <button className={btnOutlineSm} type="button" disabled={!writable || busy} onClick={() => void handleSaveDriver()}>Save driver</button>
            {!writable ? <span className="text-xs text-brand-black/52">Writes need the live tables.</span> : null}
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-[0.1em] text-brand-orange-ink">Update status</span>
            <StatusChangeSelect
              value={selected.status}
              options={deliveryStatuses}
              writable={writable}
              busy={busy}
              onChange={(next) => setPendingChange({ delivery: selected, status: next as DeliveryStatus })}
            />
          </div>
          {status ? <p className="text-sm font-semibold text-brand-green-ink" role="status">{status}</p> : null}
        </div>

        <ConfirmDialog
          open={pendingChange !== null}
          title="Update delivery status"
          message={pendingChange ? `Move delivery ${pendingChange.delivery.id} to "${pendingChange.status.replace(/_/g, " ")}"?` : ""}
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
      <CommerceSectionHeading title="Deliveries" subtitle={data ? `${data.deliveries.length} deliver${data.deliveries.length === 1 ? "y" : "ies"}` : "Loading deliveries..."}>
        <button className={btnOutlineSm} type="button" onClick={() => void commerceStore.load(true)} disabled={!data}>Refresh</button>
      </CommerceSectionHeading>

      {!writable ? <DevDataNotice /> : null}

      <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto]">
        <input
          className="min-h-11.5 w-full rounded-[18px_12px_16px_10px/12px_18px_10px_16px] border-3 border-brand-forest bg-brand-white px-4 py-[0.65rem] text-brand-black shadow-brand-soft outline-none placeholder:text-brand-black/46 focus-visible:border-brand-green-ink focus-visible:ring-4 focus-visible:ring-brand-leaf/20"
          type="search"
          aria-label="Search deliveries"
          placeholder="Search by delivery, order, customer, area, or driver..."
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
        <select className={`${selectClasses} min-w-48`} aria-label="Filter by status" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
          <option value="">All statuses</option>
          {deliveryStatuses.map((status) => <option key={status} value={status}>{status.replace(/_/g, " ")}</option>)}
        </select>
      </div>

      {data.deliveries.length === 0 ? (
        <p className="rounded-wobbly-card border-3 border-dashed border-brand-forest/30 bg-brand-white p-6 text-center text-sm font-semibold text-brand-black/64">No deliveries yet.</p>
      ) : filtered.length === 0 ? (
        <p className="rounded-wobbly-card border-3 border-dashed border-brand-forest/30 bg-brand-white p-6 text-center text-sm font-semibold text-brand-black/64">No deliveries match the current search or filter.</p>
      ) : (
        <div className="overflow-x-auto rounded-wobbly-card border-3 border-brand-forest bg-brand-white shadow-brand-soft">
          <table className="w-full min-w-170 border-collapse text-left">
            <caption className="sr-only">Deliveries</caption>
            <thead>
              <tr className="border-b-3 border-dashed border-brand-forest/30 bg-brand-warm-white text-xs font-bold uppercase tracking-[0.08em] text-brand-green-ink">
                <th className="px-4 py-3">Delivery</th>
                <th className="px-4 py-3">Order</th>
                <th className="px-4 py-3">Customer</th>
                <th className="px-4 py-3">Area</th>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Driver</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((delivery) => (
                <tr className="border-b-2 border-dashed border-brand-forest/16 text-sm last:border-b-0" key={delivery.id}>
                  <td className="px-4 py-3 font-bold text-brand-black">{delivery.id}</td>
                  <td className="px-4 py-3 text-brand-black/72">{delivery.order_id}</td>
                  <td className="px-4 py-3 text-brand-black/72">{customerLabel(delivery.customer_id)}</td>
                  <td className="px-4 py-3 text-brand-black/72">{delivery.area}</td>
                  <td className="px-4 py-3 text-brand-black/72">{formatDate(delivery.delivery_date)}</td>
                  <td className="px-4 py-3 text-brand-black/72">{delivery.driver ?? "Unassigned"}</td>
                  <td className="px-4 py-3"><CommerceStatusBadge status={delivery.status} /></td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-2">
                      <button className="min-h-9 touch-manipulation rounded-full border-2 border-brand-forest px-3 py-1 text-xs font-bold text-brand-forest hover:bg-brand-yellow focus-visible:outline focus-visible:outline-3 focus-visible:outline-dashed focus-visible:outline-brand-green-ink focus-visible:outline-offset-2" type="button" onClick={() => { setDriverDraft(delivery.driver ?? ""); setSelected(delivery); }}>View</button>
                      <StatusChangeSelect
                        value={delivery.status}
                        options={deliveryStatuses}
                        writable={writable}
                        busy={busy}
                        onChange={(next) => setPendingChange({ delivery, status: next as DeliveryStatus })}
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
        title="Update delivery status"
        message={pendingChange ? `Move delivery ${pendingChange.delivery.id} to "${pendingChange.status.replace(/_/g, " ")}"?` : ""}
        confirmLabel="Update"
        busy={busy}
        onConfirm={() => void applyStatusChange()}
        onCancel={() => setPendingChange(null)}
      />
    </div>
  );
}
