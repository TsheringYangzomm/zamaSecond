import { useEffect, useMemo, useState } from "react";
import { Check, Clock3, Copy, LockKeyhole, TicketPercent } from "lucide-react";
import { useCart } from "../cart-context";
import { useCustomerAuth } from "../checkout/customer-auth";
import { collectCoupon, listMyCoupons, listPublicCoupons } from "../coupons/coupons-api";
import type { Coupon, CustomerCoupon } from "../coupons/coupon-types";
import { btnOutlineSm, btnPrimarySm } from "../components/ui/styles";

function money(value: number): string {
  return `Nu. ${new Intl.NumberFormat("en-BT").format(value)}`;
}

function dateLabel(value: string | null): string {
  if (!value) return "No expiry";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "No expiry";
  return `Ends ${new Intl.DateTimeFormat("en-BT", { day: "numeric", month: "short", year: "numeric" }).format(date)}`;
}

function discountLabel(coupon: Coupon): string {
  return coupon.discountType === "percentage" ? `${coupon.discountValue}% off` : `${money(coupon.discountValue)} off`;
}

function targetLabel(coupon: Coupon): string {
  const labels = coupon.targets.map((target) => target.label || target.value);
  if (labels.length === 0) return "Selected Zama products";
  if (labels.length === 1) return labels[0];
  return `${labels.slice(0, 2).join(" · ")}${labels.length > 2 ? ` +${labels.length - 2}` : ""}`;
}

export function CouponsPage() {
  const { status, profile } = useCustomerAuth();
  const { openAuth } = useCart();
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [myCoupons, setMyCoupons] = useState<CustomerCoupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    void Promise.all([
      listPublicCoupons(),
      status === "signed-in" && profile ? listMyCoupons(profile.email) : Promise.resolve([] as CustomerCoupon[]),
    ]).then(([publicCoupons, customerCoupons]) => {
      if (!active) return;
      setCoupons(publicCoupons);
      setMyCoupons(customerCoupons);
    }).catch((loadError) => {
      if (active) setError(loadError instanceof Error ? loadError.message : "Coupons could not be loaded.");
    }).finally(() => {
      if (active) setLoading(false);
    });
    return () => {
      active = false;
    };
  }, [profile, status]);

  const claimedById = useMemo(() => new Map(myCoupons.map((coupon) => [coupon.id, coupon])), [myCoupons]);

  async function handleCollect(coupon: Coupon) {
    if (status !== "signed-in" || !profile) {
      openAuth();
      return;
    }
    setBusyId(coupon.id);
    setError(null);
    const result = await collectCoupon(coupon, profile.email);
    setBusyId(null);
    if (!result.ok) {
      setError(result.error ?? "This coupon could not be collected.");
      return;
    }
    const refreshed = await listMyCoupons(profile.email);
    setMyCoupons(refreshed);
    setNotice(`${coupon.code} is saved to your account.`);
  }

  async function copyCode(code: string) {
    try {
      await navigator.clipboard.writeText(code);
    } catch {
      // The code remains visible if clipboard permissions are unavailable.
    }
    setCopiedCode(code);
    window.setTimeout(() => setCopiedCode((current) => current === code ? null : current), 1800);
  }

  return (
    <div className="mx-auto grid w-full max-w-[90rem] gap-5 px-4 pb-16 pt-6 sm:px-6 lg:px-10">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <a className="inline-flex min-h-10 items-center gap-1 font-bold text-brand-green-ink underline decoration-dashed underline-offset-4 hover:text-brand-forest" href="#/shop">← Continue shopping</a>
        {status === "signed-in" ? <a className={btnOutlineSm} href="#/account">My account</a> : <button className={btnOutlineSm} type="button" onClick={openAuth}>Sign in</button>}
      </div>

      <section className="relative overflow-hidden rounded-[28px_20px_32px_24px/22px_32px_20px_28px] border-3 border-brand-forest bg-brand-yellow p-5 shadow-brand-big sm:p-8" aria-labelledby="coupons-title">
        <div className="pointer-events-none absolute -right-8 -top-12 h-40 w-40 rounded-full border-[18px] border-brand-orange/25" />
        <div className="relative grid gap-2">
          <span className="text-xs font-bold uppercase tracking-[0.12em] text-brand-orange-ink">Zama rewards</span>
          <h1 id="coupons-title" className="font-primary text-[clamp(2rem,5vw,3.4rem)] font-bold leading-none text-brand-forest">Coupons for your next order</h1>
          <p className="max-w-170 text-sm leading-relaxed text-brand-forest/75">Collect a deal today and use one coupon at checkout when you fill your basket with fresh Zama products.</p>
        </div>
      </section>

      {notice ? <p className="rounded-wobbly-md border-2 border-brand-forest bg-brand-mint p-3 text-sm font-bold text-brand-green-ink" role="status">{notice}</p> : null}
      {error ? <p className="rounded-wobbly-md border-2 border-dashed border-brand-orange bg-brand-orange/10 p-3 text-sm font-semibold text-brand-black" role="alert">{error}</p> : null}

      <section className="grid gap-4" aria-labelledby="available-coupons-title">
        <div className="flex flex-wrap items-end justify-between gap-3"><div className="grid gap-1"><span className="text-xs font-bold uppercase tracking-[0.1em] text-brand-orange-ink">Available now</span><h2 id="available-coupons-title" className="font-primary text-2xl font-bold text-brand-green-ink">Fresh deals</h2></div><span className="text-sm text-brand-black/56">{loading ? "Loading..." : `${coupons.length} coupon${coupons.length === 1 ? "" : "s"}`}</span></div>
        {loading ? <p className="rounded-wobbly-card border-3 border-dashed border-brand-forest/25 bg-brand-warm-white p-8 text-center text-sm text-brand-black/60">Finding the latest Zama deals...</p> : coupons.length === 0 ? <div className="grid justify-items-center gap-3 rounded-wobbly-card border-3 border-dashed border-brand-forest/25 bg-brand-warm-white p-8 text-center"><TicketPercent className="h-9 w-9 text-brand-orange-ink" /><h3 className="font-primary text-xl font-bold text-brand-green-ink">No coupons available right now</h3><p className="max-w-120 text-sm text-brand-black/65">Check back soon — new savings will appear here when they are active.</p><a className={btnPrimarySm} href="#/shop">Browse the market</a></div> : <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{coupons.map((coupon) => <CouponCard key={coupon.id} coupon={coupon} claimed={claimedById.get(coupon.id)} signedIn={status === "signed-in"} busy={busyId === coupon.id} copied={copiedCode === coupon.code} onCollect={() => void handleCollect(coupon)} onCopy={() => void copyCode(coupon.code)} />)}</div>}
      </section>

      <section className="grid gap-3 rounded-wobbly-card border-3 border-brand-forest bg-brand-white p-5 shadow-brand-soft">
        <div className="flex items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-full border-2 border-brand-forest bg-brand-mint text-brand-green-ink"><LockKeyhole className="h-5 w-5" /></span><div className="grid gap-0.5"><h2 className="font-primary text-xl font-bold text-brand-green-ink">How coupons work</h2><p className="text-sm text-brand-black/65">Sign in to save a coupon, then select it or enter its code during checkout.</p></div></div>
        <p className="text-sm leading-relaxed text-brand-black/65">Each coupon shows its eligible products, minimum spend, and expiry date. Only one coupon can be used on an order, and the final discount is checked securely when your order is placed.</p>
      </section>
    </div>
  );
}

function CouponCard({ coupon, claimed, signedIn, busy, copied, onCollect, onCopy }: { coupon: Coupon; claimed?: CustomerCoupon; signedIn: boolean; busy: boolean; copied: boolean; onCollect: () => void; onCopy: () => void }) {
  const redeemedForCustomer = claimed?.redeemedCountForCustomer ?? 0;
  const claimLabel = redeemedForCustomer > 0
    ? claimed?.canUse ? `Saved · used ${redeemedForCustomer}×` : "Redeemed limit reached"
    : "Saved to your account";
  return (
    <article className="grid gap-4 rounded-wobbly-card border-3 border-brand-forest bg-brand-white p-5 shadow-brand-soft">
      <div className="flex items-start justify-between gap-3"><span className="grid h-12 w-12 place-items-center rounded-full border-2 border-brand-forest bg-brand-yellow text-brand-green-ink"><TicketPercent className="h-6 w-6" /></span><span className="rounded-full border-2 border-brand-forest bg-brand-mint px-3 py-1 text-xs font-bold text-brand-green-ink">{discountLabel(coupon)}</span></div>
      <div className="grid gap-1"><h3 className="font-primary text-xl font-bold text-brand-green-ink">{coupon.title}</h3><p className="text-sm leading-relaxed text-brand-black/68">{coupon.description}</p></div>
      <div className="grid gap-2 rounded-wobbly-md border-2 border-dashed border-brand-forest/25 bg-brand-warm-white p-3 text-xs text-brand-black/65"><p><strong className="text-brand-green-ink">For:</strong> {targetLabel(coupon)}</p><p><strong className="text-brand-green-ink">Minimum spend:</strong> {coupon.minimumOrderAmount > 0 ? money(coupon.minimumOrderAmount) : "None"}</p><p className="inline-flex items-center gap-1"><Clock3 className="h-3.5 w-3.5" />{dateLabel(coupon.expiresAt)}</p></div>
      <div className="flex items-center justify-between gap-2 rounded-wobbly-md border-2 border-brand-forest bg-brand-yellow/35 p-2"><code className="px-2 text-sm font-bold tracking-[0.16em] text-brand-forest">{coupon.code}</code><button className="inline-flex min-h-9 items-center gap-1.5 rounded-full border-2 border-brand-forest bg-brand-white px-3 py-1 text-xs font-bold text-brand-green-ink hover:bg-brand-mint" type="button" onClick={onCopy}><span>{copied ? "Copied" : "Copy code"}</span>{copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}</button></div>
      {redeemedForCustomer > 0 ? <p className="text-xs font-semibold text-brand-orange-ink">Redeemed {redeemedForCustomer} time{redeemedForCustomer === 1 ? "" : "s"} on your account.</p> : null}
      <button className={`${claimed?.collected ? "border-brand-forest bg-brand-mint text-brand-green-ink" : "border-brand-forest bg-brand-forest text-brand-white hover:bg-brand-leaf"} min-h-11 touch-manipulation rounded-full border-2 px-4 py-2 text-sm font-bold disabled:cursor-not-allowed disabled:opacity-55`} type="button" disabled={busy || Boolean(claimed?.collected)} onClick={onCollect}>{busy ? "Saving..." : claimed?.collected ? claimLabel : signedIn ? "Collect coupon" : "Sign in to collect"}</button>
    </article>
  );
}
