import { useEffect, useMemo, useState } from "react";
import { inventoryTableExists, listInventory, listProducts, listReviews, listWaitlist, type WaitlistEntry } from "../../admin/admin-api";
import type { InventoryRow, ProductRow, ReviewRow } from "../../cms/types";
import {
  CommerceStatusBadge,
  DevDataNotice,
  StatCard,
  StockBadge,
  formatDate,
  formatMoney,
  stockInfo,
  stockLevel,
  useCommerceStore,
} from "./commerce-shared";

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="grid gap-4 rounded-wobbly-card border-3 border-brand-forest bg-brand-white p-5 shadow-brand-soft">
      <h2 className="text-xs font-bold uppercase tracking-[0.1em] text-brand-orange-ink">{title}</h2>
      {children}
    </div>
  );
}

export function OverviewTab() {
  const commerce = useCommerceStore();
  const [products, setProducts] = useState<ProductRow[] | null>(null);
  const [inventory, setInventory] = useState<InventoryRow[]>([]);
  const [stockAvailable, setStockAvailable] = useState(false);
  const [waitlist, setWaitlist] = useState<WaitlistEntry[] | null>(null);
  const [reviews, setReviews] = useState<ReviewRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const inventoryMap = useMemo(
    () => new Map(inventory.map((row) => [row.product_id, row])),
    [inventory],
  );

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const [productRows, hasStock, waitlistRows, reviewRows] = await Promise.all([
          listProducts(),
          inventoryTableExists(),
          listWaitlist(),
          listReviews(),
        ]);
        const inventoryRows = hasStock ? await listInventory() : [];
        if (cancelled) return;
        setProducts(productRows);
        setStockAvailable(hasStock);
        setInventory(inventoryRows);
        setWaitlist(waitlistRows);
        setReviews(reviewRows);
      } catch (loadError) {
        if (!cancelled) setError(loadError instanceof Error ? loadError.message : "Could not load overview data.");
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  const data = commerce.phase === "ready" ? commerce.data : null;

  const stats = {
    orders: data?.orders.length ?? 0,
    revenue: (data?.orders ?? []).filter((order) => order.status !== "cancelled").reduce((sum, order) => sum + order.total, 0),
    customers: data?.customers.length ?? 0,
    activeSubscriptions: (data?.subscriptions ?? []).filter((subscription) => subscription.status === "active").length,
    pendingOrders: (data?.orders ?? []).filter((order) => order.status === "pending").length,
  };

  const recentOrders = (data?.orders ?? [])
    .slice()
    .sort((a, b) => b.created_at.localeCompare(a.created_at))
    .slice(0, 5);

  const lowStock = (products ?? [])
    .filter((product) => {
      const stock = stockInfo(product.id, inventoryMap, stockAvailable);
      const level = stockLevel(stock.quantity, stock.alertAt);
      return level === "low" || level === "out";
    })
    .sort((a, b) => {
      const stockA = stockInfo(a.id, inventoryMap, stockAvailable).quantity ?? Number.MAX_SAFE_INTEGER;
      const stockB = stockInfo(b.id, inventoryMap, stockAvailable).quantity ?? Number.MAX_SAFE_INTEGER;
      return stockA - stockB;
    })
    .slice(0, 5);

  return (
    <div className="grid gap-5">
      <div className="grid gap-1">
        <h1 className="font-primary text-[clamp(1.9rem,4vw,2.8rem)] font-bold leading-[1.02] text-brand-green-ink">Welcome to the Zama admin.</h1>
        <p className="max-w-170 text-[1.05rem] text-brand-black/72">Manage the waitlist, catalog, farmers, reviews, and landing content from here. Changes publish to the live site immediately.</p>
      </div>

      {commerce.phase === "ready" && !commerce.writable ? <DevDataNotice /> : null}
      {error ? <p className="rounded-wobbly-card border-3 border-dashed border-brand-orange bg-brand-orange/10 p-4 text-sm font-semibold text-brand-black" role="alert">{error}</p> : null}

      <div className="grid gap-4 sm:grid-cols-2 sm:gap-5 lg:grid-cols-5">
        <StatCard label="Orders" value={stats.orders} />
        <StatCard label="Revenue" value={formatMoney(stats.revenue)} />
        <StatCard label="Customers" value={stats.customers} />
        <StatCard label="Active subscriptions" value={stats.activeSubscriptions} />
        <StatCard label="Pending orders" value={stats.pendingOrders} />
      </div>

      <div className="grid gap-5 lg:grid-cols-2 lg:gap-6">
        <Panel title="Recent orders">
          {recentOrders.length === 0 ? <p className="text-sm text-brand-black/68">No orders yet.</p> : (
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
                  {recentOrders.map((order) => (
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
        </Panel>

        <Panel title="Low or out-of-stock products">
          {!products ? <p className="text-sm text-brand-black/68">Loading products...</p> : lowStock.length === 0 ? (
            <p className="text-sm text-brand-black/68">No low-stock products right now.</p>
          ) : (
            <ul className="grid gap-2">
              {lowStock.map((product) => {
                const stock = stockInfo(product.id, inventoryMap, stockAvailable);
                return (
                  <li className="flex flex-wrap items-center justify-between gap-2 text-sm" key={product.id}>
                    <span className="font-bold text-brand-black">{product.name}</span>
                    <StockBadge level={stockLevel(stock.quantity, stock.alertAt)} quantity={stock.quantity} />
                  </li>
                );
              })}
            </ul>
          )}
        </Panel>

        <Panel title="Recent waitlist signups">
          {!waitlist ? <p className="text-sm text-brand-black/68">Loading signups...</p> : waitlist.length === 0 ? (
            <p className="text-sm text-brand-black/68">No signups yet.</p>
          ) : (
            <ul className="grid gap-2">
              {waitlist.slice(0, 5).map((entry) => (
                <li className="flex flex-wrap items-center justify-between gap-2 text-sm" key={entry.id}>
                  <span className="font-bold text-brand-black">{entry.email}</span>
                  <span className="text-xs text-brand-black/56">{formatDate(entry.created_at)} · {entry.source}</span>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel title="Recent reviews">
          {!reviews ? <p className="text-sm text-brand-black/68">Loading reviews...</p> : reviews.length === 0 ? (
            <p className="text-sm text-brand-black/68">No reviews yet.</p>
          ) : (
            <ul className="grid gap-2">
              {reviews.slice(0, 5).map((review) => (
                <li className="grid gap-0.5 text-sm" key={review.id}>
                  <span className="font-bold text-brand-black">{review.author} <span className="font-normal text-brand-black/52">{"★".repeat(review.rating)} {review.rating}/5</span></span>
                  <span className="text-brand-black/68">{review.title}</span>
                  <span className="text-xs text-brand-black/56">{review.date}</span>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>
    </div>
  );
}
