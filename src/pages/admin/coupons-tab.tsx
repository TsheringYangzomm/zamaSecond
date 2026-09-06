import { useEffect, useMemo, useState } from "react";
import { Pencil, Plus, TicketPercent } from "lucide-react";
import { listProducts } from "../../admin/admin-api";
import type { ProductRow } from "../../cms/types";
import { couponId, deactivateAdminCoupon, listAdminCoupons, saveAdminCoupon, type AdminCouponsResult } from "../../coupons/coupons-api";
import type { Coupon, CouponAdminDraft, CouponTarget } from "../../coupons/coupon-types";
import { btnOutlineSm, btnPrimarySm } from "../../components/ui/styles";
import { Checkbox, Field, inputClasses, selectClasses, textAreaClasses } from "./admin-fields";

type CouponLifecycle = "active" | "scheduled" | "expired" | "inactive";

function localDateTime(value: string | null): string {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const pad = (part: number) => String(part).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function newLocalDateTime(): string {
  return localDateTime(new Date().toISOString());
}

function lifecycle(coupon: Coupon, now = new Date()): CouponLifecycle {
  if (!coupon.active) return "inactive";
  if (new Date(coupon.startsAt) > now) return "scheduled";
  if (coupon.expiresAt && new Date(coupon.expiresAt) <= now) return "expired";
  return "active";
}

function lifecycleLabel(value: CouponLifecycle): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function formatMoney(value: number): string {
  return `Nu. ${new Intl.NumberFormat("en-BT").format(value)}`;
}

function formatDiscount(coupon: Coupon): string {
  return coupon.discountType === "percentage" ? `${coupon.discountValue}% off` : `${formatMoney(coupon.discountValue)} off`;
}

function formatDate(value: string | null): string {
  if (!value) return "No expiry";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "No expiry" : new Intl.DateTimeFormat("en-BT", { day: "numeric", month: "short", year: "numeric" }).format(date);
}

function toDraft(coupon: Coupon): CouponAdminDraft {
  return {
    id: coupon.id,
    code: coupon.code,
    title: coupon.title,
    description: coupon.description,
    discountType: coupon.discountType,
    discountValue: coupon.discountValue,
    maximumDiscountAmount: coupon.maximumDiscountAmount,
    minimumOrderAmount: coupon.minimumOrderAmount,
    startsAt: localDateTime(coupon.startsAt),
    expiresAt: localDateTime(coupon.expiresAt),
    usageLimit: coupon.usageLimit,
    perCustomerLimit: coupon.perCustomerLimit,
    active: coupon.active,
    targets: coupon.targets,
  };
}

function blankDraft(): CouponAdminDraft {
  return {
    id: couponId(),
    code: "",
    title: "",
    description: "",
    discountType: "percentage",
    discountValue: 10,
    maximumDiscountAmount: null,
    minimumOrderAmount: 0,
    startsAt: newLocalDateTime(),
    expiresAt: "",
    usageLimit: null,
    perCustomerLimit: 1,
    active: true,
    targets: [],
  };
}

export function CouponsTab() {
  const [result, setResult] = useState<AdminCouponsResult | null>(null);
  const [products, setProducts] = useState<ProductRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [editing, setEditing] = useState<CouponAdminDraft | null>(null);
  const [busy, setBusy] = useState(false);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<"all" | CouponLifecycle>("all");

  async function load() {
    setError(null);
    try {
      const [next, productRows] = await Promise.all([
        listAdminCoupons(),
        listProducts().catch(() => [] as ProductRow[]),
      ]);
      setResult(next);
      setProducts(productRows);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Could not load coupons.");
    }
  }

  useEffect(() => {
    void load();
  }, []);

  const categories = useMemo(() => [...new Set(products.map((product) => product.category).filter(Boolean))].sort(), [products]);
  const filteredCoupons = useMemo(() => {
    const coupons = result?.coupons ?? [];
    const needle = query.trim().toLowerCase();
    return coupons.filter((coupon) => {
      if (filter !== "all" && lifecycle(coupon) !== filter) return false;
      if (!needle) return true;
      return coupon.code.toLowerCase().includes(needle) || coupon.title.toLowerCase().includes(needle) || coupon.description.toLowerCase().includes(needle);
    });
  }, [filter, query, result]);

  async function handleSave(draft: CouponAdminDraft) {
    setBusy(true);
    setError(null);
    setStatus(null);
    try {
      const normalized: CouponAdminDraft = {
        ...draft,
        code: draft.code.trim().toUpperCase(),
        title: draft.title.trim(),
        description: draft.description.trim(),
        startsAt: new Date(draft.startsAt).toISOString(),
        expiresAt: draft.expiresAt ? new Date(draft.expiresAt).toISOString() : null,
      };
      if (!normalized.code || !normalized.title) throw new Error("Code and title are required.");
      if (normalized.targets.length === 0) throw new Error("Choose at least one product or category target.");
      if (normalized.discountValue <= 0 || (normalized.discountType === "percentage" && normalized.discountValue > 100)) throw new Error("Enter a valid discount value.");
      if (normalized.expiresAt && new Date(normalized.expiresAt) <= new Date(normalized.startsAt)) throw new Error("Expiry must be after the start date.");
      await saveAdminCoupon(normalized);
      setEditing(null);
      setStatus(`${normalized.code} saved.`);
      await load();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Could not save the coupon.");
    } finally {
      setBusy(false);
    }
  }

  async function handleDeactivate(coupon: Coupon) {
    setBusy(true);
    setError(null);
    try {
      await deactivateAdminCoupon(coupon.id);
      setStatus(`${coupon.code} is now inactive.`);
      await load();
    } catch (deactivateError) {
      setError(deactivateError instanceof Error ? deactivateError.message : "Could not deactivate the coupon.");
    } finally {
      setBusy(false);
    }
  }

  if (editing) {
    return <CouponForm initial={editing} products={products} categories={categories} busy={busy} error={error} onSave={(draft) => void handleSave(draft)} onCancel={() => { setEditing(null); setError(null); }} />;
  }

  return (
    <div className="grid gap-5">
      <div className="flex flex-wrap items-end justify-between gap-3"><div className="grid gap-1"><h1 className="font-primary text-[clamp(1.7rem,3.5vw,2.4rem)] font-bold leading-[1.02] text-brand-green-ink">Coupons</h1><p className="text-sm text-brand-black/68">Create targeted savings campaigns for the Zama shop.</p></div><div className="flex flex-wrap items-center gap-2"><button className={btnOutlineSm} type="button" onClick={() => void load()} disabled={busy}>Refresh</button><button className={btnPrimarySm} type="button" onClick={() => { setEditing(blankDraft()); setError(null); }} disabled={busy || result?.mode !== "live"}><Plus className="mr-1.5 inline h-4 w-4" />Add coupon</button></div></div>
      {result?.mode === "dev" ? <p className="rounded-wobbly-card border-3 border-dashed border-brand-orange bg-brand-orange/10 p-4 text-sm font-semibold text-brand-black">Showing example coupon data. Run <code className="rounded bg-brand-white px-1 py-0.5 text-xs">supabase/coupons-schema.sql</code> after the commerce and checkout schemas to enable live management.</p> : null}
      {error ? <div className="grid gap-3 rounded-wobbly-card border-3 border-dashed border-brand-orange bg-brand-orange/10 p-4"><p className="text-sm font-semibold text-brand-black" role="alert">{error}</p><div><button className={btnOutlineSm} type="button" onClick={() => void load()}>Try again</button></div></div> : null}
      {status ? <p className="text-sm font-semibold text-brand-green-ink" role="status">{status}</p> : null}

      <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto]"><input className={inputClasses} type="search" aria-label="Search coupons" placeholder="Search by code or title..." value={query} onChange={(event) => setQuery(event.target.value)} /><select className={`${selectClasses} sm:w-44`} aria-label="Coupon status" value={filter} onChange={(event) => setFilter(event.target.value as "all" | CouponLifecycle)}><option value="all">All statuses</option><option value="active">Active</option><option value="scheduled">Scheduled</option><option value="expired">Expired</option><option value="inactive">Inactive</option></select></div>

      {!result ? <p className="text-sm font-semibold text-brand-black/60">Loading coupons...</p> : filteredCoupons.length === 0 ? <p className="rounded-wobbly-card border-3 border-dashed border-brand-forest/25 bg-brand-warm-white p-6 text-center text-sm font-semibold text-brand-black/60">No coupons match the current filters.</p> : <div className="overflow-x-auto rounded-wobbly-card border-3 border-brand-forest bg-brand-white shadow-brand-soft"><table className="w-full min-w-240 border-collapse text-left"><caption className="sr-only">Coupon campaigns</caption><thead><tr className="border-b-3 border-dashed border-brand-forest/30 bg-brand-warm-white text-xs font-bold uppercase tracking-[0.08em] text-brand-green-ink"><th className="px-4 py-3">Campaign</th><th className="px-4 py-3">Discount</th><th className="px-4 py-3">Targets</th><th className="px-4 py-3">Dates</th><th className="px-4 py-3">Usage</th><th className="px-4 py-3">Status</th><th className="px-4 py-3"><span className="sr-only">Actions</span></th></tr></thead><tbody>{filteredCoupons.map((coupon) => { const state = lifecycle(coupon); const redeemed = coupon.redeemedCount ?? 0; const remaining = coupon.usageLimit == null ? "Unlimited remaining" : `${Math.max(0, coupon.usageLimit - redeemed)} remaining`; return <tr className="border-b-2 border-dashed border-brand-forest/16 text-sm last:border-b-0" key={coupon.id}><td className="px-4 py-3"><div className="grid gap-0.5"><span className="font-bold text-brand-green-ink">{coupon.title}</span><span className="inline-flex items-center gap-1 text-xs font-bold tracking-[0.12em] text-brand-orange-ink"><TicketPercent className="h-3.5 w-3.5" />{coupon.code}</span></div></td><td className="px-4 py-3 text-brand-black/72">{formatDiscount(coupon)}<span className="block text-xs text-brand-black/50">Min. {formatMoney(coupon.minimumOrderAmount)}</span></td><td className="max-w-60 px-4 py-3 text-xs text-brand-black/68">{coupon.targets.map((target) => target.label || target.value).join(" · ")}</td><td className="px-4 py-3 text-xs text-brand-black/68"><span className="block">Starts {formatDate(coupon.startsAt)}</span><span className="block">{formatDate(coupon.expiresAt)}</span></td><td className="px-4 py-3 text-xs text-brand-black/68"><span className="block">{coupon.collectedCount ?? 0} collected</span><span className="block">{redeemed}{coupon.usageLimit == null ? "" : ` / ${coupon.usageLimit}`} redeemed</span><span className="block text-brand-green-ink">{remaining}</span></td><td className="px-4 py-3"><span className={`inline-flex rounded-full border-2 px-2 py-1 text-xs font-bold ${state === "active" ? "border-brand-forest bg-brand-mint text-brand-green-ink" : state === "inactive" ? "border-brand-black/30 bg-brand-white text-brand-black/55" : "border-brand-orange-ink bg-brand-buff text-brand-orange-ink"}`}>{lifecycleLabel(state)}</span></td><td className="px-4 py-3"><div className="flex items-center justify-end gap-1.5"><button className="inline-flex min-h-9 items-center gap-1 rounded-full border-2 border-brand-forest px-3 py-1 text-xs font-bold text-brand-forest hover:bg-brand-yellow" type="button" onClick={() => { setEditing(toDraft(coupon)); setError(null); }}><Pencil className="h-3.5 w-3.5" />Edit</button>{coupon.active ? <button className="min-h-9 rounded-full border-2 border-brand-orange-ink px-3 py-1 text-xs font-bold text-brand-orange-ink hover:bg-brand-orange hover:text-brand-white" type="button" disabled={busy} onClick={() => void handleDeactivate(coupon)}>Deactivate</button> : null}</div></td></tr>; })}</tbody></table></div>}
    </div>
  );
}

function CouponForm({ initial, products, categories, busy, error, onSave, onCancel }: { initial: CouponAdminDraft; products: ProductRow[]; categories: string[]; busy: boolean; error: string | null; onSave: (draft: CouponAdminDraft) => void; onCancel: () => void }) {
  const [draft, setDraft] = useState(initial);
  const update = <K extends keyof CouponAdminDraft>(key: K, value: CouponAdminDraft[K]) => setDraft((current) => ({ ...current, [key]: value }));
  const hasProduct = (id: string) => draft.targets.some((target) => target.type === "product" && target.value === id);
  const hasCategory = (category: string) => draft.targets.some((target) => target.type === "category" && target.value === category);
  const toggleTarget = (target: CouponTarget) => setDraft((current) => ({ ...current, targets: current.targets.some((item) => item.type === target.type && item.value === target.value) ? current.targets.filter((item) => !(item.type === target.type && item.value === target.value)) : [...current.targets, target] }));

  return (
    <div className="grid gap-5"><div className="flex flex-wrap items-center justify-between gap-3"><div className="grid gap-1"><span className="text-xs font-bold uppercase tracking-[0.12em] text-brand-orange-ink">Commerce</span><h1 className="font-primary text-[clamp(1.7rem,3.5vw,2.4rem)] font-bold leading-[1.02] text-brand-green-ink">{initial.code ? "Edit coupon" : "New coupon"}</h1><p className="text-sm text-brand-black/68">Set the offer, its audience, and the dates when it can be used.</p></div><button className={btnOutlineSm} type="button" onClick={onCancel}>← Back to coupons</button></div>
      <form className="grid gap-5 rounded-wobbly-card border-3 border-brand-forest bg-brand-white p-5 shadow-brand-soft" onSubmit={(event) => { event.preventDefault(); onSave(draft); }}>
        <div className="grid gap-3 sm:grid-cols-2"><Field label="Coupon code" hint="Customers enter this code at checkout." htmlFor="coupon-code"><input className={inputClasses} id="coupon-code" required value={draft.code} onChange={(event) => update("code", event.target.value.toUpperCase())} placeholder="FRESH10" /></Field><Field label="Campaign title" htmlFor="coupon-title"><input className={inputClasses} id="coupon-title" required value={draft.title} onChange={(event) => update("title", event.target.value)} placeholder="Fresh start" /></Field></div>
        <Field label="Description" htmlFor="coupon-description"><textarea className={textAreaClasses} id="coupon-description" value={draft.description} onChange={(event) => update("description", event.target.value)} placeholder="Tell customers what this offer is for." /></Field>
        <div className="grid gap-3 sm:grid-cols-3"><Field label="Discount type" htmlFor="coupon-discount-type"><select className={selectClasses} id="coupon-discount-type" value={draft.discountType} onChange={(event) => update("discountType", event.target.value as CouponAdminDraft["discountType"])}><option value="percentage">Percentage</option><option value="fixed">Fixed amount</option></select></Field><Field label={draft.discountType === "percentage" ? "Discount percentage" : "Discount amount"} htmlFor="coupon-discount-value"><input className={inputClasses} id="coupon-discount-value" type="number" min="0.01" max={draft.discountType === "percentage" ? 100 : undefined} step="0.01" value={draft.discountValue} onChange={(event) => update("discountValue", Number(event.target.value))} /></Field><Field label="Maximum discount" hint="Optional cap for percentages." htmlFor="coupon-max-discount"><input className={inputClasses} id="coupon-max-discount" type="number" min="0.01" step="0.01" placeholder="No cap" value={draft.maximumDiscountAmount ?? ""} onChange={(event) => update("maximumDiscountAmount", event.target.value ? Number(event.target.value) : null)} disabled={draft.discountType !== "percentage"} /></Field></div>
        <div className="grid gap-3 sm:grid-cols-3"><Field label="Minimum eligible spend" htmlFor="coupon-min-spend"><input className={inputClasses} id="coupon-min-spend" type="number" min="0" step="0.01" value={draft.minimumOrderAmount} onChange={(event) => update("minimumOrderAmount", Number(event.target.value))} /></Field><Field label="Total usage limit" hint="Leave blank for unlimited." htmlFor="coupon-usage-limit"><input className={inputClasses} id="coupon-usage-limit" type="number" min="1" step="1" placeholder="Unlimited" value={draft.usageLimit ?? ""} onChange={(event) => update("usageLimit", event.target.value ? Number(event.target.value) : null)} /></Field><Field label="Uses per customer" htmlFor="coupon-customer-limit"><input className={inputClasses} id="coupon-customer-limit" type="number" min="1" step="1" value={draft.perCustomerLimit} onChange={(event) => update("perCustomerLimit", Number(event.target.value))} /></Field></div>
        <div className="grid gap-3 sm:grid-cols-2"><Field label="Starts at" htmlFor="coupon-starts"><input className={inputClasses} id="coupon-starts" type="datetime-local" required value={draft.startsAt} onChange={(event) => update("startsAt", event.target.value)} /></Field><Field label="Expires at" hint="Leave blank for no expiry." htmlFor="coupon-expires"><input className={inputClasses} id="coupon-expires" type="datetime-local" value={draft.expiresAt ?? ""} onChange={(event) => update("expiresAt", event.target.value)} /></Field></div>
        <fieldset className="grid gap-3"><legend className="text-xs font-bold uppercase tracking-[0.1em] text-brand-green-ink">Eligible products and categories</legend><p className="text-sm text-brand-black/60">The discount applies to matching products only. Product and category targets are combined with OR logic.</p><div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">{products.map((product) => <Checkbox key={product.id} label={`Product · ${product.name}`} checked={hasProduct(product.id)} onChange={() => toggleTarget({ type: "product", value: product.id, label: product.name })} />)}{categories.map((category) => <Checkbox key={`category-${category}`} label={`Category · ${category}`} checked={hasCategory(category)} onChange={() => toggleTarget({ type: "category", value: category, label: category })} />)}</div>{products.length === 0 && categories.length === 0 ? <p className="rounded-wobbly-md border-2 border-dashed border-brand-orange bg-brand-orange/10 p-3 text-sm font-semibold text-brand-black">No catalog products are available yet. Add a product before creating a targeted coupon.</p> : null}</fieldset>
        <Checkbox label="Active and visible when its dates allow" checked={draft.active} onChange={(checked) => update("active", checked)} />
        {error ? <p className="rounded-wobbly-md border-2 border-dashed border-brand-orange bg-brand-orange/10 p-3 text-sm font-semibold text-brand-black" role="alert">{error}</p> : null}
        <div className="flex flex-wrap justify-end gap-2"><button className={btnOutlineSm} type="button" onClick={onCancel}>Cancel</button><button className={btnPrimarySm} type="submit" disabled={busy}>{busy ? "Saving..." : "Save coupon"}</button></div>
      </form>
    </div>
  );
}
