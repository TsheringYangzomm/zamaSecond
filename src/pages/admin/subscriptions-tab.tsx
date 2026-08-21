import { useCallback, useMemo, useState } from "react";
import { commerceStore } from "../../admin/commerce-api";
import { subscriptionStatuses, type Subscription, type SubscriptionStatus } from "../../admin/commerce-types";
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

type PendingChange = { subscription: Subscription; status: SubscriptionStatus };

export function SubscriptionsTab() {
  const state = useCommerceStore();
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [selected, setSelected] = useState<Subscription | null>(null);
  const [pendingChange, setPendingChange] = useState<PendingChange | null>(null);
  const [busy, setBusy] = useState(false);

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
    return data.subscriptions.filter((subscription) => {
      if (statusFilter && subscription.status !== statusFilter) return false;
      if (!needle) return true;
      return (
        subscription.id.toLowerCase().includes(needle) ||
        subscription.plan.toLowerCase().includes(needle) ||
        customerLabel(subscription.customer_id).toLowerCase().includes(needle)
      );
    });
  }, [data, query, statusFilter, customerLabel]);

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
            {!writable ? <span className="text-xs text-brand-black/52">Writes need the live tables.</span> : null}
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

      {!writable ? <DevDataNotice /> : null}

      <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto]">
        <input
          className="min-h-11.5 w-full rounded-[18px_12px_16px_10px/12px_18px_10px_16px] border-3 border-brand-forest bg-brand-white px-4 py-[0.65rem] text-brand-black shadow-brand-soft outline-none placeholder:text-brand-black/46 focus-visible:border-brand-green-ink focus-visible:ring-4 focus-visible:ring-brand-leaf/20"
          type="search"
          aria-label="Search subscriptions"
          placeholder="Search by customer, plan, or subscription ID..."
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
        <select className={`${selectClasses} min-w-44`} aria-label="Filter by status" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
          <option value="">All statuses</option>
          {subscriptionStatuses.map((status) => <option key={status} value={status}>{status}</option>)}
        </select>
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
