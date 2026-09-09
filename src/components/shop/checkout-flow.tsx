import { useEffect, useMemo, useRef, useState } from "react";
import { Check, Copy, LockKeyhole, TicketPercent } from "lucide-react";
import { useCart } from "../../cart-context";
import { useCustomerAuth } from "../../checkout/customer-auth";
import { submitOrder, type CustomerProfile } from "../../checkout/checkout-api";
import { fetchAccountRewards } from "../../account-rewards/account-rewards-api";
import type { AccountRewardsSnapshot } from "../../account-rewards/account-rewards-types";
import { checkoutPointsPreview, maximumCheckoutPoints } from "../../checkout/checkout-points";
import { listMyCoupons, listPublicCoupons, previewCoupon } from "../../coupons/coupons-api";
import type { Coupon, CouponPreview, CustomerCoupon } from "../../coupons/coupon-types";
import { fetchMyMembership } from "../../membership/membership-api";
import { chooseBestDiscount, membershipDiscount } from "../../membership/membership-rules";
import { btnOutlineSm, btnPrimaryLg, btnPrimarySm } from "../ui/styles";
import { PackageIcon } from "../ui/icons";
import { numberFormatter } from "./shop-utils";
import type { CartLine } from "./cart-lines";
import { Field, FlowBackLink, FlowNotice, SignInPanel, SignUpPanel, inputClasses, labelClasses, selectClasses, textAreaClasses } from "./auth-pane";

export function CheckoutFlow({ items, subtotal, onBack }: { items: CartLine[]; subtotal: number; onBack: () => void }) {
  const { status, profile, signOut } = useCustomerAuth();
  const [step, setStep] = useState<"gate" | "signup" | "login">("gate");
  const [result, setResult] = useState<{ orderId: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  function handleSignOut() {
    void signOut();
    setError(null);
    setStep("gate");
  }

  if (status === "bootstrapping") {
    return (
      <div className="grid flex-1 place-content-center justify-items-center gap-3 px-5 text-center">
        <p className="text-sm font-semibold text-brand-black/68">Checking your account...</p>
      </div>
    );
  }

  if (result) {
    return <SuccessPanel orderId={result.orderId} onDone={() => undefined} />;
  }

  if (status === "signed-in" && profile) {
    return (
      <CheckoutForm
        key={profile.email}
        items={items}
        subtotal={subtotal}
        profile={profile}
        error={error}
        onError={setError}
        onPlaced={(orderId) => setResult({ orderId })}
        onSignOut={handleSignOut}
        onBack={onBack}
      />
    );
  }

  if (step === "signup") {
    return <SignUpPanel onSwitch={() => setStep("login")} onBack={onBack} />;
  }

  if (step === "login") {
    return <SignInPanel onSwitch={() => setStep("signup")} onBack={onBack} />;
  }

  return <GuestSavingsPreview items={items} subtotal={subtotal} onSignUp={() => setStep("signup")} onSignIn={() => setStep("login")} onBack={onBack} />;
}

function OrderSummary({ items }: { items: CartLine[] }) {
  const { customBoxLines, otherLines } = useMemo(() => {
    const customBox: CartLine[] = [];
    const other: CartLine[] = [];
    for (const line of items) {
      if (line.kind === "inventory" && line.source === "custom-box") customBox.push(line);
      else other.push(line);
    }
    return { customBoxLines: customBox, otherLines: other };
  }, [items]);

  if (customBoxLines.length === 0 && otherLines.length === 0) return null;

  return (
    <section className="grid gap-3 rounded-wobbly-card border-3 border-brand-forest bg-brand-white p-4 shadow-brand-soft">
      <h4 className={`${labelClasses} text-brand-orange-ink`}>Order summary</h4>
      {otherLines.length > 0 ? (
        <ul className="grid gap-2">
          {otherLines.map((line) => (
            <li className="flex items-center justify-between gap-2 text-sm" key={line.key}>
              <div className="min-w-0">
                <p className="font-bold text-brand-black">{line.kind === "product" ? line.product.name : line.item.name}</p>
                <p className="text-xs text-brand-black/56">{line.quantity}×{line.kind === "product" && line.product.priceAmount != null ? ` · Nu. ${line.product.priceAmount}` : ""}</p>
              </div>
            </li>
          ))}
        </ul>
      ) : null}
      {customBoxLines.length > 0 ? (
        <div className="rounded-wobbly-md border-3 border-dashed border-brand-forest bg-brand-mint/40 p-3">
          <div className="flex items-center gap-2 pb-2">
            <PackageIcon className="h-4 w-4 text-brand-green-ink" />
            <p className="text-xs font-bold text-brand-black">Your custom box · {customBoxLines.reduce((s, l) => s + l.quantity, 0)} items</p>
          </div>
          <ul className="grid gap-1.5">
            {customBoxLines.map((line) => (
              line.kind !== "inventory" ? null : (
              <li className="flex items-center justify-between gap-2 text-xs" key={line.key}>
                <span className="font-bold text-brand-black">{line.item.name}</span>
                <span className="text-brand-black/56">{line.quantity}×{line.item.unit ? ` ${line.item.unit}` : ""}</span>
              </li>
              )
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
}

function guestCouponDiscount(coupon: Coupon): string {
  return coupon.discountType === "percentage"
    ? `${coupon.discountValue}% off`
    : `Nu. ${numberFormatter.format(coupon.discountValue)} off`;
}

function guestCouponTargets(coupon: Coupon): string {
  const labels = coupon.targets.map((target) => target.label || target.value).filter(Boolean);
  return labels.length > 0 ? labels.join(" · ") : "Eligible Zama products";
}

function guestCouponExpiry(coupon: Coupon): string {
  if (!coupon.expiresAt) return "No expiry listed";
  const date = new Date(coupon.expiresAt);
  if (Number.isNaN(date.getTime())) return "Check offer terms";
  return `Ends ${date.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}`;
}

function isUsablePublicCoupon(coupon: Coupon, now = new Date()): boolean {
  const startsAt = Date.parse(coupon.startsAt);
  const expiresAt = coupon.expiresAt ? Date.parse(coupon.expiresAt) : Number.NaN;
  const started = Number.isNaN(startsAt) || startsAt <= now.getTime();
  const notExpired = Number.isNaN(expiresAt) || expiresAt > now.getTime();
  const notExhausted = coupon.usageLimit == null || (coupon.redeemedCount ?? 0) < coupon.usageLimit;
  return coupon.active && !coupon.memberOnly && started && notExpired && notExhausted;
}

function GuestSavingsPreview({ items, subtotal, onSignUp, onSignIn, onBack }: {
  items: CartLine[];
  subtotal: number;
  onSignUp: () => void;
  onSignIn: () => void;
  onBack: () => void;
}) {
  const { closeCart } = useCart();
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loadingCoupons, setLoadingCoupons] = useState(true);
  const [couponError, setCouponError] = useState<string | null>(null);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    void listPublicCoupons()
      .then((nextCoupons) => {
        if (!active) return;
        setCoupons(nextCoupons.filter((coupon) => isUsablePublicCoupon(coupon)));
      })
      .catch(() => {
        if (active) setCouponError("We could not load public coupons right now.");
      })
      .finally(() => {
        if (active) setLoadingCoupons(false);
      });
    return () => {
      active = false;
    };
  }, []);

  async function copyCode(code: string) {
    try {
      await navigator.clipboard?.writeText(code);
      setCopiedCode(code);
      window.setTimeout(() => setCopiedCode((current) => current === code ? null : current), 1800);
    } catch {
      setCopiedCode(null);
    }
  }

  function browseCoupons() {
    closeCart();
    window.location.hash = "#/coupons";
  }

  return (
    <div className="grid flex-1 content-start gap-4 overflow-y-auto px-4 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-5 sm:px-5">
      <div className="grid gap-1">
        <span className={labelClasses}>Before you checkout</span>
        <h3 className="font-primary text-2xl font-bold text-brand-black">See your savings first</h3>
        <p className="text-sm leading-snug text-brand-black/68">You can browse public offers now. Sign in or create an account to collect savings, redeem points, and place your order.</p>
      </div>

      <OrderSummary items={items} />
      <div className="flex items-center justify-between gap-3 rounded-wobbly-md border-2 border-dashed border-brand-forest/25 bg-brand-warm-white px-3 py-2 text-sm">
        <span className="font-bold text-brand-black">Estimated subtotal</span>
        <strong className="text-brand-orange-ink">Nu. {numberFormatter.format(subtotal)}</strong>
      </div>

      <section className="grid gap-3 rounded-wobbly-card border-3 border-brand-forest bg-brand-white p-4 shadow-brand-soft" aria-labelledby="guest-coupons-title">
        <div className="flex items-start gap-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full border-2 border-brand-forest bg-brand-yellow text-brand-green-ink"><TicketPercent className="h-5 w-5" aria-hidden="true" /></span>
          <div className="grid gap-1">
            <h4 id="guest-coupons-title" className={`${labelClasses} text-brand-orange-ink`}>Available coupons</h4>
            <p className="text-sm text-brand-black/62">Public offers you can collect after signing in.</p>
          </div>
        </div>
        {loadingCoupons ? <p className="rounded-wobbly-md border-2 border-dashed border-brand-forest/25 bg-brand-warm-white p-3 text-sm text-brand-black/60">Finding available coupons…</p> : couponError ? <p className="rounded-wobbly-md border-2 border-dashed border-brand-orange bg-brand-orange/10 p-3 text-sm font-semibold text-brand-black" role="alert">{couponError}</p> : coupons.length === 0 ? <p className="rounded-wobbly-md border-2 border-dashed border-brand-forest/25 bg-brand-warm-white p-3 text-sm text-brand-black/60">There are no public coupons available right now.</p> : <div className="grid gap-2">{coupons.map((coupon) => <article className="grid gap-2 rounded-wobbly-md border-2 border-dashed border-brand-forest/25 bg-brand-yellow/25 p-3" key={coupon.id}><div className="flex items-start gap-2"><div className="min-w-0 flex-1"><strong className="block text-sm text-brand-green-ink">{coupon.title}</strong><span className="text-xs font-bold text-brand-orange-ink">{guestCouponDiscount(coupon)}</span></div><code className="shrink-0 rounded-full border-2 border-brand-forest bg-brand-forest px-2 py-1 text-xs font-bold tracking-[0.08em] text-brand-white">{coupon.code}</code></div><p className="text-xs leading-snug text-brand-black/65">{coupon.description}</p><div className="grid gap-1 text-[0.68rem] text-brand-black/60"><span><strong className="text-brand-green-ink">For:</strong> {guestCouponTargets(coupon)}</span><span><strong className="text-brand-green-ink">Minimum:</strong> {coupon.minimumOrderAmount > 0 ? `Nu. ${numberFormatter.format(coupon.minimumOrderAmount)}` : "None"} · {guestCouponExpiry(coupon)}</span></div><div className="flex flex-wrap gap-2"><button className="inline-flex min-h-9 items-center gap-1.5 rounded-full border-2 border-brand-forest bg-brand-white px-3 py-1 text-xs font-bold text-brand-green-ink hover:bg-brand-mint" type="button" onClick={() => void copyCode(coupon.code)}>{copiedCode === coupon.code ? <Check className="h-3.5 w-3.5" aria-hidden="true" /> : <Copy className="h-3.5 w-3.5" aria-hidden="true" />}{copiedCode === coupon.code ? "Copied" : "Copy code"}</button><button className="inline-flex min-h-9 items-center rounded-full border-2 border-brand-forest bg-brand-forest px-3 py-1 text-xs font-bold text-brand-white hover:bg-brand-leaf" type="button" onClick={onSignIn}>Sign in to collect</button></div></article>)}</div>}
        <button className="w-fit justify-self-start text-sm font-bold text-brand-green-ink underline decoration-dashed underline-offset-4" type="button" onClick={browseCoupons}>View all public coupons →</button>
      </section>

      <section className="grid gap-3 rounded-wobbly-card border-3 border-brand-forest bg-brand-mint p-4 shadow-brand-soft" aria-labelledby="guest-points-title">
        <div className="flex items-start gap-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full border-2 border-brand-forest bg-brand-white text-brand-green-ink"><LockKeyhole className="h-5 w-5" aria-hidden="true" /></span>
          <div className="grid gap-1"><h4 id="guest-points-title" className={`${labelClasses} text-brand-orange-ink`}>Redeem points</h4><p className="text-sm leading-relaxed text-brand-black/68">Your points balance is private. Sign in to view your available points and use them on this order.</p></div>
        </div>
        <button className={`${btnPrimarySm} w-full`} type="button" onClick={onSignIn}>Sign in to redeem points</button>
      </section>

      <section className="grid gap-3 rounded-wobbly-card border-3 border-brand-forest bg-brand-yellow p-4 shadow-brand-soft" aria-labelledby="guest-checkout-title">
        <div className="grid gap-1"><h4 id="guest-checkout-title" className="font-primary text-xl font-bold text-brand-green-ink">Ready to place your order?</h4><p className="text-sm leading-relaxed text-brand-black/68">An account is required so we can save your delivery details and apply your selected savings securely.</p></div>
        <div className="grid gap-2 sm:grid-cols-2"><button className={`${btnPrimaryLg} w-full`} type="button" onClick={onSignUp}>Create an account</button><button className={`${btnOutlineSm} w-full`} type="button" onClick={onSignIn}>Sign in</button></div>
      </section>

      <FlowBackLink onClick={onBack}>← Back to cart</FlowBackLink>
    </div>
  );
}

function CheckoutForm({ items, subtotal, profile, error, onError, onPlaced, onSignOut, onBack }: {
  items: CartLine[];
  subtotal: number;
  profile: CustomerProfile;
  error: string | null;
  onError: (error: string | null) => void;
  onPlaced: (orderId: string) => void;
  onSignOut: () => void;
  onBack: () => void;
}) {
  const { clearCart } = useCart();
  const [name, setName] = useState(profile.name);
  const [phone, setPhone] = useState(profile.phone);
  const [area, setArea] = useState(profile.area);
  const [dzongkhag, setDzongkhag] = useState(profile.dzongkhag);
  const [address, setAddress] = useState(profile.address);
  const [paymentMethod, setPaymentMethod] = useState("Cash on delivery");
  const [deliveryDate, setDeliveryDate] = useState("");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [couponCode, setCouponCode] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState<CouponPreview | null>(null);
  const [availableCoupons, setAvailableCoupons] = useState<CustomerCoupon[]>([]);
  const [couponBusy, setCouponBusy] = useState(false);
  const [rewards, setRewards] = useState<AccountRewardsSnapshot | null>(null);
  const [pointsToRedeem, setPointsToRedeem] = useState(0);
  const [membershipDiscountPercent, setMembershipDiscountPercent] = useState(0);
  const pointsInputRef = useRef<HTMLInputElement>(null);

  const hasCompletePricing = items.length > 0 && items.every((line) => line.kind === "product" && line.product.priceAmount !== null);
  const couponLines = useMemo(() => items.flatMap((line) => line.kind === "product" ? [{
    productId: line.product.id,
    category: line.product.category,
    quantity: line.quantity,
    unitPrice: line.product.priceAmount ?? 0,
  }] : []), [items]);
  const membershipEligibleSubtotal = useMemo(() => items.reduce((total, line) => {
    if (line.kind !== "product" || line.product.category === "Custom boxes") return total;
    return total + (line.product.priceAmount ?? 0) * line.quantity;
  }, 0), [items]);

  useEffect(() => {
    let active = true;
    void listMyCoupons(profile.email).then((coupons) => {
      if (active) setAvailableCoupons(coupons.filter((coupon) => coupon.canUse));
    });
    return () => {
      active = false;
    };
  }, [profile.email]);

  useEffect(() => {
    let active = true;
    void fetchMyMembership(profile.email).then((snapshot) => {
      if (active) setMembershipDiscountPercent(snapshot.status === "active" ? snapshot.memberDiscountPercent : 0);
    }).catch(() => {
      if (active) setMembershipDiscountPercent(0);
    });
    return () => {
      active = false;
    };
  }, [profile.email]);

  useEffect(() => {
    let active = true;
    void fetchAccountRewards(profile.email).then((snapshot) => {
      if (active) setRewards(snapshot);
    }).catch(() => {
      if (active) setRewards(null);
    });
    return () => {
      active = false;
    };
  }, [profile.email]);

  async function applyCoupon(nextCode = couponCode) {
    const code = nextCode.trim().toUpperCase();
    if (!code || !hasCompletePricing) return;
    setCouponBusy(true);
    const result = await previewCoupon(code, couponLines, profile.email);
    setCouponBusy(false);
    setCouponCode(code);
    setAppliedCoupon(result);
    onError(result.ok ? null : result.error ?? "That coupon could not be applied.");
  }

  function removeCoupon() {
    setCouponCode("");
    setAppliedCoupon(null);
    onError(null);
  }

  const automaticMembershipDiscount = hasCompletePricing ? membershipDiscount(membershipEligibleSubtotal, membershipDiscountPercent) : 0;
  const selectedDiscounts = chooseBestDiscount(automaticMembershipDiscount, appliedCoupon?.ok ? appliedCoupon.discountAmount : 0);
  const payableBeforePoints = Math.max(0, subtotal - selectedDiscounts.totalDiscount);
  const pointsPreview = rewards
    ? checkoutPointsPreview(pointsToRedeem, rewards.pointsBalance, rewards.settings, payableBeforePoints)
    : { ok: pointsToRedeem === 0, points: pointsToRedeem, discountAmount: 0, finalTotal: payableBeforePoints, error: undefined };
  const finalTotal = pointsPreview.ok ? pointsPreview.finalTotal : payableBeforePoints;
  const maxRedeemablePoints = rewards ? maximumCheckoutPoints(rewards.pointsBalance, rewards.settings, payableBeforePoints) : 0;
  const canRedeemPoints = Boolean(rewards && maxRedeemablePoints > 0 && hasCompletePricing);

  function activatePoints() {
    if (!canRedeemPoints) return;
    setPointsToRedeem((current) => current > 0 ? current : maxRedeemablePoints);
    requestAnimationFrame(() => pointsInputRef.current?.focus());
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    onError(null);
    if (!hasCompletePricing) return;
    if (!pointsPreview.ok) {
      onError(pointsPreview.error ?? "Your points could not be applied.");
      return;
    }
    setBusy(true);
    const result = await submitOrder({
      profile: {
        email: profile.email,
        name: name.trim(),
        phone: phone.trim(),
        area: area.trim(),
        dzongkhag: dzongkhag.trim(),
        address: address.trim(),
      },
      lines: items.map((line) =>
        line.kind === "product"
          ? {
              productId: line.product.id,
              name: line.product.name,
              category: line.product.category,
              quantity: line.quantity,
              price: line.product.priceAmount ?? 0,
            }
          : {
              productId: line.item.id,
              name: line.item.name,
              quantity: line.quantity,
              price: 0,
            },
      ),
      paymentMethod,
      deliveryDate: deliveryDate || null,
      notes: notes.trim(),
      couponCode: selectedDiscounts.couponDiscount > 0 && appliedCoupon?.ok ? appliedCoupon.coupon?.code ?? couponCode : null,
      pointsToRedeem: pointsPreview.points || null,
    });
    setBusy(false);
    if (!result.ok) {
      onError(result.error);
      return;
    }
    clearCart();
    onPlaced(result.orderId);
  }

  return (
    <form className="grid flex-1 content-start gap-4 overflow-y-auto px-4 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-5 sm:px-5" onSubmit={(event) => void handleSubmit(event)}>
      <div className="grid gap-2">
        <h3 className="font-primary text-2xl font-bold text-brand-black">Checkout</h3>
        <p className="max-w-86 text-sm leading-snug text-brand-black/68">Signed in as <span className="font-bold text-brand-green-ink">{profile.email}</span>. Ordering as <span className="font-bold text-brand-green-ink">{name || "you"}</span>.</p>
      </div>

      <OrderSummary items={items} />

      <section className="grid gap-3 rounded-wobbly-card border-3 border-brand-forest bg-brand-white p-4 shadow-brand-soft">
        <div className="grid gap-1">
          <h4 className={`${labelClasses} text-brand-orange-ink`}>Coupon</h4>
          <p className="text-sm text-brand-black/62">Use one coupon per order. Discounts apply only to eligible products.</p>
        </div>
        {availableCoupons.length > 0 ? (
          <div className="grid gap-2">
            <span className="text-xs font-bold uppercase tracking-[0.1em] text-brand-green-ink">Your collected coupons</span>
            {availableCoupons.map((coupon) => (
              <button className="flex items-center gap-3 rounded-wobbly-md border-2 border-dashed border-brand-forest/35 bg-brand-yellow/30 p-3 text-left hover:bg-brand-yellow disabled:opacity-55" type="button" key={coupon.id} disabled={couponBusy || !hasCompletePricing} onClick={() => void applyCoupon(coupon.code)}>
                <span className="grid min-w-18 place-items-center rounded-full border-2 border-brand-forest bg-brand-forest px-2 py-1 text-xs font-bold text-brand-white">{coupon.code}</span>
                <span className="min-w-0 flex-1"><strong className="block text-sm text-brand-green-ink">{coupon.title}</strong><span className="text-xs text-brand-black/58">{coupon.description}</span></span>
                <span className="text-xs font-bold text-brand-orange-ink">Use</span>
              </button>
            ))}
          </div>
        ) : null}
        <div className="flex flex-col gap-2 sm:flex-row">
          <input className={inputClasses} aria-label="Coupon code" value={couponCode} onChange={(event) => { setCouponCode(event.target.value.toUpperCase()); setAppliedCoupon(null); }} placeholder="Enter coupon code" disabled={!hasCompletePricing} />
          {appliedCoupon?.ok ? <button className={btnOutlineSm} type="button" onClick={removeCoupon}>Remove</button> : <button className={btnOutlineSm} type="button" onClick={() => void applyCoupon()} disabled={couponBusy || !hasCompletePricing || !couponCode.trim()}>{couponBusy ? "Checking..." : "Apply"}</button>}
        </div>
        {appliedCoupon?.ok ? <p className="rounded-wobbly-md border-2 border-brand-forest bg-brand-mint p-3 text-sm font-bold text-brand-green-ink" role="status">{selectedDiscounts.couponDiscount > 0 ? `${appliedCoupon.coupon?.code} applied — you saved Nu. ${numberFormatter.format(appliedCoupon.discountAmount)}.` : `Your Zama+ member saving is higher, so it will be used instead of ${appliedCoupon.coupon?.code}.`}</p> : null}
      </section>

      <section className="grid gap-3 rounded-wobbly-card border-3 border-brand-forest bg-brand-mint p-4 shadow-brand-soft">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="grid gap-1">
            <h4 className={`${labelClasses} text-brand-orange-ink`}>Redeem points</h4>
            <p className="text-sm text-brand-black/62">Use your points directly on this order. Every {rewards?.settings.pointsPerNgultrum ?? 10} points is worth Nu. 1.</p>
          </div>
          <button className={pointsToRedeem > 0 ? btnOutlineSm : btnPrimarySm} type="button" disabled={!canRedeemPoints} onClick={activatePoints}>{pointsToRedeem > 0 ? "Adjust points" : "Redeem points"}</button>
        </div>
        {rewards ? <>
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-wobbly-md border-2 border-brand-forest/20 bg-brand-white/70 p-3 text-sm"><span className="font-bold text-brand-green-ink">Available points</span><strong className="font-primary text-xl text-brand-green-ink">{rewards.pointsBalance}</strong></div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
            <label className="grid flex-1 gap-1.5 text-xs font-bold uppercase tracking-[0.1em] text-brand-green-ink">Points to use<input className={inputClasses} ref={pointsInputRef} aria-label="Points to use at checkout" type="number" min="0" max={maxRedeemablePoints} step="1" value={pointsToRedeem || ""} onChange={(event) => setPointsToRedeem(Math.max(0, Math.floor(Number(event.target.value) || 0)))} placeholder={`Up to ${rewards.pointsBalance} points`} disabled={!hasCompletePricing || !canRedeemPoints} /></label>
            <button className={btnOutlineSm} type="button" disabled={!canRedeemPoints} onClick={() => setPointsToRedeem(maxRedeemablePoints)}>Use maximum</button>
            {pointsToRedeem > 0 ? <button className={btnOutlineSm} type="button" onClick={() => setPointsToRedeem(0)}>Clear</button> : null}
          </div>
          {pointsToRedeem > 0 && !pointsPreview.ok ? <p className="rounded-wobbly-md border-2 border-dashed border-brand-orange bg-brand-yellow/50 p-3 text-sm font-semibold text-brand-black" role="alert">{pointsPreview.error}</p> : null}
          {pointsPreview.ok && pointsPreview.points > 0 ? <p className="rounded-wobbly-md border-2 border-brand-forest bg-brand-white p-3 text-sm font-bold text-brand-green-ink" role="status">{pointsPreview.points} points applied — you save Nu. {numberFormatter.format(pointsPreview.discountAmount)}.</p> : null}
          {pointsPreview.ok && pointsToRedeem > pointsPreview.points ? <p className="text-xs text-brand-black/58">Only {pointsPreview.points} points are needed for this order. The remaining points stay in your balance.</p> : null}
          {!canRedeemPoints && rewards.pointsBalance <= 0 ? <p className="text-xs text-brand-black/58">You do not have any points available yet.</p> : null}
        </> : <p className="text-sm text-brand-black/58">Loading your available points...</p>}
      </section>

      <section className="grid gap-3 rounded-wobbly-card border-3 border-brand-forest bg-brand-white p-4 shadow-brand-soft">
        <h4 className={`${labelClasses} text-brand-orange-ink`}>Delivery details</h4>
        <Field label="Full name" htmlFor="checkout-name">
          <input className={inputClasses} id="checkout-name" type="text" autoComplete="name" required value={name} onChange={(event) => setName(event.target.value)} />
        </Field>
        <Field label="Phone" htmlFor="checkout-phone">
          <input className={inputClasses} id="checkout-phone" type="tel" autoComplete="tel" required value={phone} onChange={(event) => setPhone(event.target.value)} />
        </Field>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Area" htmlFor="checkout-area">
            <input className={inputClasses} id="checkout-area" type="text" autoComplete="address-level2" required value={area} onChange={(event) => setArea(event.target.value)} placeholder="e.g. Thimphu" />
          </Field>
          <Field label="Dzongkhag" htmlFor="checkout-dzongkhag">
            <input className={inputClasses} id="checkout-dzongkhag" type="text" autoComplete="address-level1" value={dzongkhag} onChange={(event) => setDzongkhag(event.target.value)} />
          </Field>
        </div>
        <Field label="Street address" htmlFor="checkout-address">
          <input className={inputClasses} id="checkout-address" type="text" autoComplete="street-address" value={address} onChange={(event) => setAddress(event.target.value)} placeholder="Optional notes like landmarks" />
        </Field>
      </section>

      <section className="grid gap-3 rounded-wobbly-card border-3 border-brand-forest bg-brand-white p-4 shadow-brand-soft">
        <h4 className={`${labelClasses} text-brand-orange-ink`}>Payment</h4>
        <Field label="Payment method" htmlFor="checkout-payment">
          <select className={selectClasses} id="checkout-payment" value={paymentMethod} onChange={(event) => setPaymentMethod(event.target.value)}>
            <option value="Cash on delivery">Cash on delivery</option>
            <option value="Bank transfer">Bank transfer</option>
          </select>
        </Field>
        <Field label="Preferred delivery date (optional)" htmlFor="checkout-delivery-date">
          <input className={inputClasses} id="checkout-delivery-date" type="date" value={deliveryDate} onChange={(event) => setDeliveryDate(event.target.value)} />
        </Field>
        <Field label="Order notes (optional)" htmlFor="checkout-notes">
          <textarea className={textAreaClasses} id="checkout-notes" value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Anything we should know about this order?" />
        </Field>
      </section>

      {error ? <FlowNotice>{error}</FlowNotice> : null}
      {!hasCompletePricing ? <FlowNotice>Some items don't have final prices yet. We'll confirm the total before payment.</FlowNotice> : null}

      <div className="rounded-wobbly-card border-3 border-brand-forest bg-brand-yellow p-4 shadow-brand-soft">
        <div className="grid gap-1 text-sm">
          <div className="flex items-center justify-between gap-3"><p className="font-bold text-brand-black"><span className="tabular-nums">{items.length}</span> item{items.length === 1 ? "" : "s"}</p><p className="text-right font-bold text-brand-black/65">{hasCompletePricing ? `Nu. ${numberFormatter.format(subtotal)}` : "Pricing pending"}</p></div>
          {selectedDiscounts.memberDiscount > 0 ? <div className="flex items-center justify-between gap-3 text-brand-green-ink"><span>Member discount</span><strong>− Nu. {numberFormatter.format(selectedDiscounts.memberDiscount)}</strong></div> : null}
          {selectedDiscounts.couponDiscount > 0 ? <div className="flex items-center justify-between gap-3 text-brand-green-ink"><span>Coupon discount</span><strong>− Nu. {numberFormatter.format(selectedDiscounts.couponDiscount)}</strong></div> : null}
          {pointsPreview.ok && pointsPreview.points > 0 ? <div className="flex items-center justify-between gap-3 text-brand-green-ink"><span>Points discount</span><strong>− Nu. {numberFormatter.format(pointsPreview.discountAmount)}</strong></div> : null}
          {(selectedDiscounts.totalDiscount > 0 || pointsPreview.points > 0) ? <div className="mt-1 flex items-center justify-between gap-3 border-t-2 border-dashed border-brand-forest/25 pt-2"><span className="font-bold text-brand-black">Total</span><strong className="text-lg text-brand-orange-ink">Nu. {numberFormatter.format(finalTotal)}</strong></div> : null}
        </div>
        <button className={`${btnPrimaryLg} mt-3 w-full`} type="submit" disabled={busy || !hasCompletePricing}>
          {busy ? "Placing order..." : `Place order · ${hasCompletePricing ? `Nu. ${numberFormatter.format(finalTotal)}` : "pending"}`}
        </button>
        <p className="mt-2 text-xs text-brand-black/58">Orders appear in the admin Orders section as "pending" once placed.</p>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <FlowBackLink onClick={onBack}>← Back to cart</FlowBackLink>
        <button className="min-h-8 touch-manipulation px-1 text-sm font-bold text-brand-black/64 underline decoration-dashed underline-offset-4 hover:text-brand-green-ink" type="button" onClick={onSignOut}>Sign out</button>
      </div>
    </form>
  );
}

function SuccessPanel({ orderId, onDone }: { orderId: string; onDone: () => void }) {
  const { clearCart, closeCart } = useCart();
  function done() {
    clearCart();
    closeCart();
    onDone();
  }
  return (
    <div className="grid flex-1 place-content-center justify-items-center gap-4 px-5 text-center">
      <div className="brand-pattern grid h-24 w-24 place-items-center rounded-full border-3 border-dashed border-brand-forest text-brand-forest">
        <svg width="44" height="44" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="M5 12.5l4.5 4.5L19 7.5" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
      <div>
        <h3 className="font-primary text-2xl font-bold text-brand-black">Order placed!</h3>
        <p className="mx-auto mt-1 max-w-72 text-sm leading-snug text-brand-black/68">Your order <span className="font-bold text-brand-green-ink">{orderId}</span> is confirmed and waiting in the admin Orders section.</p>
      </div>
      <button className={`${btnPrimaryLg} w-full`} type="button" onClick={done}>Done</button>
    </div>
  );
}
