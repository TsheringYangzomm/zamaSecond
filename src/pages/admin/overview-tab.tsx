import { useEffect, useMemo, useState } from "react";
import { inventoryTableExists, listInventory, listProducts, listReviews, listWaitlist, type WaitlistEntry } from "../../admin/admin-api";
import type { InventoryRow, ProductRow, ReviewRow } from "../../cms/types";
import {
  CommerceStatusBadge,
  DevDataNotice,
  formatDate,
  formatMoney,
  stockInfo,
  stockLevel,
  useCommerceStore,
} from "./commerce-shared";

const statusColors: Record<string, string> = {
  pending: "bg-brand-yellow",
  confirmed: "bg-brand-forest/70",
  preparing: "bg-brand-forest",
  out_for_delivery: "bg-brand-orange-ink",
  delivered: "bg-brand-mint",
  cancelled: "bg-brand-orange/40",
  failed: "bg-brand-orange/40",
  refunded: "bg-brand-orange/40",
};

function BarChart({ segments, total }: { segments: { label: string; count: number; color: string }[]; total: number }) {
  const filled = segments.reduce((s, seg) => s + seg.count, 0);
  return (
    <div className="grid gap-2">
      <div className="flex h-5 overflow-hidden rounded-full border border-brand-forest/20">
        {segments.map((seg) =>
          seg.count > 0 ? (
            <div
              key={seg.label}
              className={`${seg.color} transition-all duration-300`}
              style={{ width: total > 0 ? `${(seg.count / total) * 100}%` : "0%" }}
              title={`${seg.label}: ${seg.count}`}
            />
          ) : null,
        )}
        {filled < total ? <div className="flex-1 bg-brand-black/6" /> : null}
      </div>
      <div className="flex flex-wrap gap-x-3 gap-y-1">
        {segments.map((seg) => (
          <span className="flex items-center gap-1 text-xs text-brand-black/68" key={seg.label}>
            <span className={`inline-block h-2 w-2 rounded-full ${seg.color}`} />
            {seg.label} {seg.count}
          </span>
        ))}
      </div>
    </div>
  );
}

function HorizontalBar({ label, count, max, color }: { label: string; count: number; max: number; color: string }) {
  return (
    <div className="grid items-center gap-1" style={{ gridTemplateColumns: "3rem 1fr 2rem" }}>
      <span className="text-right text-xs font-bold text-brand-black/72">{label}</span>
      <div className="h-4 overflow-hidden rounded-full bg-brand-black/6">
        <div className={`h-full rounded-full ${color} transition-all duration-300`} style={{ width: max > 0 ? `${(count / max) * 100}%` : "0%" }} />
      </div>
      <span className="text-xs font-bold text-brand-black/56">{count}</span>
    </div>
  );
}

function DonutRing({ segments, size = 80, stroke = 10 }: { segments: { count: number; color: string }[]; size?: number; stroke?: number }) {
  const total = segments.reduce((s, seg) => s + seg.count, 0);
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  let offset = 0;

  return (
    <svg className="shrink-0" height={size} width={size} viewBox={`0 0 ${size} ${size}`}>
      <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="var(--color-brand-black, #1a1a1a)" strokeOpacity={0.06} strokeWidth={stroke} />
      {segments.map((seg, i) => {
        if (seg.count === 0 || total === 0) return null;
        const dash = (seg.count / total) * circumference;
        const currentOffset = offset;
        offset += dash;
        return (
          <circle
            key={i}
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={seg.color}
            strokeWidth={stroke}
            strokeDasharray={`${dash} ${circumference - dash}`}
            strokeDashoffset={-currentOffset}
            strokeLinecap="round"
            className="transition-all duration-500"
          />
        );
      })}
      <text className="font-primary text-sm font-bold" fill="var(--color-brand-green-ink, #2d5016)" textAnchor="middle" dominantBaseline="central" x={size / 2} y={size / 2}>
        {total}
      </text>
    </svg>
  );
}

function ActivityItem({ children, time }: { children: React.ReactNode; time: string }) {
  return (
    <li className="flex items-start gap-3 text-sm">
      <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-brand-forest" />
      <div className="min-w-0 flex-1">
        <p className="truncate text-brand-black">{children}</p>
        <p className="text-xs text-brand-black/52">{time}</p>
      </div>
    </li>
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

  const orders = data?.orders ?? [];
  const customers = data?.customers ?? [];

  const stats = {
    orders: orders.length,
    revenue: orders.filter((o) => o.status !== "cancelled").reduce((sum, o) => sum + o.total, 0),
    customers: customers.length,
    activeSubscriptions: (data?.subscriptions ?? []).filter((s) => s.status === "active").length,
    pendingOrders: orders.filter((o) => o.status === "pending").length,
  };

  const statusBreakdown = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const order of orders) {
      counts[order.status] = (counts[order.status] || 0) + 1;
    }
    return ["pending", "confirmed", "preparing", "out_for_delivery", "delivered", "cancelled"]
      .filter((s) => (counts[s] ?? 0) > 0)
      .map((s) => ({ label: s.replace(/_/g, " "), count: counts[s], color: statusColors[s] ?? "bg-brand-black/20" }));
  }, [orders]);

  const stockHealth = useMemo(() => {
    if (!products) return { inStock: 0, low: 0, out: 0, untracked: 0 };
    let inStock = 0;
    let low = 0;
    let out = 0;
    let untracked = 0;
    for (const product of products) {
      const stock = stockInfo(product.id, inventoryMap, stockAvailable);
      const level = stockLevel(stock.quantity, stock.alertAt);
      if (level === "in") inStock++;
      else if (level === "low") low++;
      else if (level === "out") out++;
      else untracked++;
    }
    return { inStock, low, out, untracked };
  }, [products, inventoryMap, stockAvailable]);

  const waitlistBySource = useMemo(() => {
    if (!waitlist) return [];
    const counts: Record<string, number> = {};
    for (const entry of waitlist) {
      counts[entry.source] = (counts[entry.source] || 0) + 1;
    }
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .map(([source, count]) => ({ source, count }));
  }, [waitlist]);

  const reviewRatingDist = useMemo(() => {
    if (!reviews) return [];
    const counts: Record<number, number> = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    for (const review of reviews) {
      counts[review.rating] = (counts[review.rating] || 0) + 1;
    }
    const max = Math.max(...Object.values(counts), 1);
    return [5, 4, 3, 2, 1].map((rating) => ({ rating, count: counts[rating], max }));
  }, [reviews]);

  const recentActivity = useMemo(() => {
    const items: { text: string; time: string; sort: string }[] = [];
    for (const order of orders.slice(0, 5)) {
      items.push({ text: `Order ${order.id} — ${order.status.replace(/_/g, " ")}`, time: formatDate(order.created_at), sort: order.created_at });
    }
    for (const entry of (waitlist ?? []).slice(0, 3)) {
      items.push({ text: `${entry.email} joined waitlist`, time: formatDate(entry.created_at), sort: entry.created_at });
    }
    for (const review of (reviews ?? []).slice(0, 3)) {
      items.push({ text: `${review.author} left a ${review.rating}★ review`, time: review.date, sort: review.date });
    }
    return items.sort((a, b) => b.sort.localeCompare(a.sort)).slice(0, 8);
  }, [orders, waitlist, reviews]);

  const statCards = [
    { label: "Orders", value: stats.orders, accent: "border-t-brand-forest" },
    { label: "Revenue", value: formatMoney(stats.revenue), accent: "border-t-brand-orange-ink" },
    { label: "Customers", value: stats.customers, accent: "border-t-brand-leaf" },
    { label: "Subscriptions", value: stats.activeSubscriptions, accent: "border-t-brand-mint" },
    { label: "Pending", value: stats.pendingOrders, accent: "border-t-brand-yellow" },
  ];

  const recentOrders = orders
    .slice()
    .sort((a, b) => b.created_at.localeCompare(a.created_at))
    .slice(0, 5);

  return (
    <div className="grid gap-5">
      <div className="grid gap-1">
        <h1 className="font-primary text-[clamp(1.5rem,3vw,2.2rem)] font-bold leading-[1.02] text-brand-green-ink">Dashboard</h1>
      </div>

      {commerce.phase === "ready" && !commerce.writable ? <DevDataNotice /> : null}
      {error ? <p className="rounded-wobbly-card border-3 border-dashed border-brand-orange bg-brand-orange/10 p-4 text-sm font-semibold text-brand-black" role="alert">{error}</p> : null}

      <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {statCards.map((card) => (
          <div className={`grid gap-1 rounded-wobbly-card border-3 border-brand-forest border-t-[6px] ${card.accent} bg-brand-white p-4 shadow-brand-soft`} key={card.label}>
            <span className="text-[0.65rem] font-bold uppercase tracking-[0.1em] text-brand-black/56">{card.label}</span>
            <span className="font-primary text-[clamp(1.3rem,2.5vw,1.8rem)] font-bold leading-none text-brand-green-ink">{card.value}</span>
          </div>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2 lg:gap-5">
        <div className="grid gap-4 rounded-wobbly-card border-3 border-brand-forest bg-brand-white p-5 shadow-brand-soft">
          <h2 className="text-xs font-bold uppercase tracking-[0.1em] text-brand-orange-ink">Order status</h2>
          {orders.length === 0 ? (
            <p className="text-sm text-brand-black/56">No orders yet.</p>
          ) : (
            <BarChart segments={statusBreakdown} total={orders.length} />
          )}
        </div>

        <div className="grid gap-4 rounded-wobbly-card border-3 border-brand-forest bg-brand-white p-5 shadow-brand-soft">
          <h2 className="text-xs font-bold uppercase tracking-[0.1em] text-brand-orange-ink">Stock health</h2>
          {!products ? (
            <p className="text-sm text-brand-black/56">Loading...</p>
          ) : (
            <div className="flex items-center gap-5">
              <DonutRing
                segments={[
                  { count: stockHealth.inStock, color: "var(--color-brand-forest)" },
                  { count: stockHealth.low, color: "var(--color-brand-orange-ink)" },
                  { count: stockHealth.out, color: "var(--color-brand-orange)" },
                  { count: stockHealth.untracked, color: "var(--color-brand-black)" },
                ]}
              />
              <div className="grid flex-1 gap-2">
                <HorizontalBar label="In stock" count={stockHealth.inStock} max={Math.max(stockHealth.inStock + stockHealth.low + stockHealth.out + stockHealth.untracked, 1)} color="bg-brand-forest" />
                <HorizontalBar label="Low" count={stockHealth.low} max={Math.max(stockHealth.inStock + stockHealth.low + stockHealth.out + stockHealth.untracked, 1)} color="bg-brand-orange-ink" />
                <HorizontalBar label="Out" count={stockHealth.out} max={Math.max(stockHealth.inStock + stockHealth.low + stockHealth.out + stockHealth.untracked, 1)} color="bg-brand-orange" />
                {stockHealth.untracked > 0 ? <HorizontalBar label="N/A" count={stockHealth.untracked} max={Math.max(stockHealth.inStock + stockHealth.low + stockHealth.out + stockHealth.untracked, 1)} color="bg-brand-black/20" /> : null}
              </div>
            </div>
          )}
        </div>

        <div className="grid gap-4 rounded-wobbly-card border-3 border-brand-forest bg-brand-white p-5 shadow-brand-soft">
          <h2 className="text-xs font-bold uppercase tracking-[0.1em] text-brand-orange-ink">Waitlist by source</h2>
          {!waitlist ? (
            <p className="text-sm text-brand-black/56">Loading...</p>
          ) : waitlist.length === 0 ? (
            <p className="text-sm text-brand-black/56">No signups yet.</p>
          ) : (
            <div className="grid gap-1.5">
              {waitlistBySource.map((item) => (
                <HorizontalBar
                  key={item.source}
                  label={item.source}
                  count={item.count}
                  max={Math.max(...waitlistBySource.map((w) => w.count), 1)}
                  color="bg-brand-forest"
                />
              ))}
            </div>
          )}
        </div>

        <div className="grid gap-4 rounded-wobbly-card border-3 border-brand-forest bg-brand-white p-5 shadow-brand-soft">
          <h2 className="text-xs font-bold uppercase tracking-[0.1em] text-brand-orange-ink">Review ratings</h2>
          {!reviews ? (
            <p className="text-sm text-brand-black/56">Loading...</p>
          ) : reviews.length === 0 ? (
            <p className="text-sm text-brand-black/56">No reviews yet.</p>
          ) : (
            <div className="grid gap-1.5">
              {reviewRatingDist.map((row) => (
                <HorizontalBar key={row.rating} label={`${row.rating}★`} count={row.count} max={row.max} color={row.rating >= 4 ? "bg-brand-forest" : row.rating === 3 ? "bg-brand-yellow" : "bg-brand-orange"} />
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2 lg:gap-5">
        <div className="grid gap-4 rounded-wobbly-card border-3 border-brand-forest bg-brand-white p-5 shadow-brand-soft">
          <h2 className="text-xs font-bold uppercase tracking-[0.1em] text-brand-orange-ink">Recent orders</h2>
          {recentOrders.length === 0 ? (
            <p className="text-sm text-brand-black/56">No orders yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-80 border-collapse text-left">
                <thead>
                  <tr className="border-b-2 border-dashed border-brand-forest/30 text-[0.65rem] font-bold uppercase tracking-[0.08em] text-brand-green-ink">
                    <th className="px-2 py-1.5">Order</th>
                    <th className="px-2 py-1.5">Date</th>
                    <th className="px-2 py-1.5">Total</th>
                    <th className="px-2 py-1.5">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {recentOrders.map((order) => (
                    <tr className="border-b border-brand-forest/10 text-sm last:border-b-0" key={order.id}>
                      <td className="px-2 py-1.5 font-bold text-brand-black">{order.id}</td>
                      <td className="px-2 py-1.5 text-brand-black/68">{formatDate(order.created_at)}</td>
                      <td className="px-2 py-1.5 text-brand-black/68">{formatMoney(order.total)}</td>
                      <td className="px-2 py-1.5"><CommerceStatusBadge status={order.status} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="grid gap-4 rounded-wobbly-card border-3 border-brand-forest bg-brand-white p-5 shadow-brand-soft">
          <h2 className="text-xs font-bold uppercase tracking-[0.1em] text-brand-orange-ink">Recent activity</h2>
          {recentActivity.length === 0 ? (
            <p className="text-sm text-brand-black/56">No activity yet.</p>
          ) : (
            <ul className="grid gap-2.5">
              {recentActivity.map((item, i) => (
                <ActivityItem key={i} time={item.time}>{item.text}</ActivityItem>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
