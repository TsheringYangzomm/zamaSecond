import { useEffect, useMemo, useState, type FormEvent } from "react";
import {
  BadgeCheck,
  CalendarCheck,
  ChevronRight,
  CircleHelp,
  Clock3,
  Crown,
  Gift,
  Heart,
  History,
  MapPin,
  PackageCheck,
  RotateCcw,
  Settings,
  ShoppingBag,
  Sparkles,
  Star,
  TicketPercent,
  Truck,
  UserRound,
  Users,
  WalletCards,
} from "lucide-react";
import type { Order } from "../admin/commerce-types";
import { fetchCustomerOrders, type CustomerProfile } from "../checkout/checkout-api";
import { useCustomerAuth, type CustomerProfileUpdate } from "../checkout/customer-auth";
import { listMyCoupons } from "../coupons/coupons-api";
import { claimDailyCheckIn, fetchAccountRewards, migrateLegacySavedItems, requestPointsRedemption, submitCustomerReview, toggleSavedItem } from "../account-rewards/account-rewards-api";
import { addDays, checkInStreak, localThimphuDateKey, rewardForNextCheckIn } from "../account-rewards/account-rewards-rules";
import { defaultRewardSettings, type AccountRewardsSnapshot } from "../account-rewards/account-rewards-types";
import { fetchCustomerReturns, requestCustomerReturn } from "../returns/returns-api";
import { isReturnQuantityValid, remainingReturnableItems, returnEligibility, sortReceivedOrders } from "../returns/returns-rules";
import { deliveredAtForOrder, RETURN_REASONS, type CustomerReturn, type ReturnRequestInput } from "../returns/returns-types";
import { fetchMyMembership } from "../membership/membership-api";
import type { MembershipSnapshot } from "../membership/membership-types";
import { useCart } from "../cart-context";
import { useContent } from "../cms/content-context";
import { inputClasses } from "../components/shop/auth-pane";
import { AddToCartButton } from "../components/shop/product-cards";
import { btnOutlineSm, btnPrimarySm } from "../components/ui/styles";
import { isProductActive, productDetailHref, productPrice, type ShopProduct } from "../components/shop/shop-utils";

type OrderFilter = "all" | "unpaid" | "processing" | "shipped" | "review" | "returns";
type LibraryTab = "wishlist" | "history" | "following";

const orderFilterLabels: { key: Exclude<OrderFilter, "all">; label: string; icon: typeof ShoppingBag }[] = [
  { key: "unpaid", label: "Unpaid", icon: WalletCards },
  { key: "processing", label: "Processing", icon: Clock3 },
  { key: "shipped", label: "Shipped", icon: Truck },
  { key: "review", label: "Review", icon: BadgeCheck },
  { key: "returns", label: "Returns", icon: RotateCcw },
];

function initials(profile: CustomerProfile): string {
  const words = profile.name.trim().split(/\s+/).filter(Boolean);
  if (words.length > 1) return `${words[0][0]}${words.at(-1)?.[0] ?? ""}`.toUpperCase();
  return (words[0]?.slice(0, 2) || profile.email.slice(0, 2)).toUpperCase();
}

function formatDate(date: string): string {
  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) return date;
  return new Intl.DateTimeFormat("en-BT", { day: "numeric", month: "short", year: "numeric" }).format(parsed);
}

function formatMoney(amount: number): string {
  return `Nu. ${new Intl.NumberFormat("en-BT").format(amount)}`;
}

function orderLabel(order: Order): string {
  return order.status.replace(/_/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function orderTone(order: Order): string {
  if (order.payment_status === "refunded" || order.status === "cancelled") return "border-brand-orange bg-brand-orange/15 text-brand-orange-ink";
  if (order.status === "delivered") return "border-brand-forest bg-brand-mint text-brand-green-ink";
  if (order.status === "out_for_delivery") return "border-brand-orange-ink bg-brand-buff text-brand-orange-ink";
  return "border-brand-forest bg-brand-yellow text-brand-black";
}

function matchesOrder(order: Order, filter: OrderFilter): boolean {
  if (filter === "all") return true;
  if (filter === "unpaid") return order.payment_status !== "paid" && order.status !== "cancelled";
  if (filter === "processing") return ["pending", "confirmed", "preparing"].includes(order.status);
  if (filter === "shipped") return ["out_for_delivery", "delivered"].includes(order.status);
  if (filter === "review") return order.status === "delivered";
  return order.status === "delivered";
}

function returnStatusLabel(status: CustomerReturn["status"]): string {
  return status.charAt(0).toUpperCase() + status.slice(1);
}

function membershipStatusLabel(status: MembershipSnapshot["status"]): string {
  if (status === "active") return "Zama+ Member";
  if (status === "pending") return "Membership pending";
  if (status === "paused") return "Membership paused";
  if (status === "cancelled") return "Membership cancelled";
  if (status === "rejected") return "Membership request declined";
  return "Not a member";
}

function membershipStatusClasses(status: MembershipSnapshot["status"]): string {
  if (status === "active") return "border-brand-forest bg-brand-mint text-brand-green-ink";
  if (status === "pending") return "border-brand-orange-ink bg-brand-buff text-brand-orange-ink";
  if (status === "rejected" || status === "cancelled") return "border-brand-orange bg-brand-orange/15 text-brand-orange-ink";
  return "border-brand-forest/20 bg-brand-warm-white text-brand-black/65";
}

function pickupWindowLabel(returnRequest: CustomerReturn): string | null {
  if (!returnRequest.pickupWindowStart || !returnRequest.pickupWindowEnd) return null;
  const date = new Intl.DateTimeFormat("en-BT", { timeZone: "Asia/Thimphu", day: "numeric", month: "short", year: "numeric" }).format(new Date(returnRequest.pickupWindowStart));
  const time = new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Thimphu", hour: "2-digit", minute: "2-digit", hour12: false });
  return `${date}, ${time.format(new Date(returnRequest.pickupWindowStart))}–${time.format(new Date(returnRequest.pickupWindowEnd))} Bhutan time`;
}

function OrderCard({ order, productById, detailed, reviewed, rewardPoints = 20, onReview, onReturn, returnRequest, latestReturnRequest, returnIsEligible, returnWindowClosed }: { order: Order; productById: Map<string, ShopProduct>; detailed?: boolean; reviewed?: boolean; rewardPoints?: number; onReview?: () => void; onReturn?: () => void; returnRequest?: CustomerReturn; latestReturnRequest?: CustomerReturn; returnIsEligible?: boolean; returnWindowClosed?: boolean }) {
  const itemCount = order.items.reduce((sum, item) => sum + item.quantity, 0);
  const deliveredAt = deliveredAtForOrder(order);

  return (
    <article className="grid gap-3 rounded-wobbly-md border-2 border-brand-forest/20 bg-brand-warm-white p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="grid min-w-0 gap-1">
          <span className="truncate text-sm font-bold text-brand-black">{order.id}</span>
          <span className="text-xs text-brand-black/56">Placed {formatDate(order.created_at)}</span>
        </div>
        <span className={`rounded-full border-2 px-2 py-1 text-[0.65rem] font-bold ${orderTone(order)}`}>{orderLabel(order)}</span>
      </div>
      {detailed ? (
        <div className="grid gap-2 border-y border-brand-forest/12 py-3">
          {order.items.map((item) => {
            const product = productById.get(item.product_id);
            return (
              <div className="flex items-center gap-3" key={`${order.id}-${item.product_id}`}>
                <div className="grid h-14 w-14 shrink-0 place-items-center overflow-hidden rounded-wobbly-md border-2 border-brand-forest/15 bg-brand-white">
                  {product ? <img className="h-full w-full object-contain" src={product.image} alt="" loading="lazy" width="56" height="56" /> : <ShoppingBag className="h-5 w-5 text-brand-forest/55" />}
                </div>
                <div className="grid min-w-0 flex-1 gap-0.5">
                  <span className="truncate text-sm font-bold text-brand-black">{item.name}</span>
                  <span className="text-xs text-brand-black/56">Qty {item.quantity} · {formatMoney(item.price)} each</span>
                </div>
                <strong className="shrink-0 text-sm text-brand-green-ink">{formatMoney(item.price * item.quantity)}</strong>
              </div>
            );
          })}
        </div>
      ) : null}
      <div className="grid gap-2 border-t border-brand-forest/12 pt-3 sm:flex sm:items-end sm:justify-between">
        <div className="grid gap-1 text-xs text-brand-black/68">
          <span>{itemCount} item{itemCount === 1 ? "" : "s"} · {order.delivery_area || "Delivery area pending"}</span>
          {detailed ? <span>Payment: <strong className="text-brand-black">{order.payment_method || "Not recorded"}</strong> · {order.payment_status}</span> : null}
          {detailed ? <span>{order.status === "delivered" ? "Delivered" : "Delivery"}: <strong className="text-brand-black">{deliveredAt ? formatDate(deliveredAt) : order.delivery_date ? formatDate(order.delivery_date) : "Date to be confirmed"}</strong></span> : null}
          {detailed && latestReturnRequest ? <span className="grid gap-0.5 text-brand-green-ink"><strong>Return: {returnStatusLabel(latestReturnRequest.status)}</strong>{latestReturnRequest.status === "approved" && pickupWindowLabel(latestReturnRequest) ? <span className="text-brand-black/62">Pickup {pickupWindowLabel(latestReturnRequest)}</span> : null}{latestReturnRequest.status === "rejected" && latestReturnRequest.rejectionReason ? <span className="text-brand-black/62">Reason: {latestReturnRequest.rejectionReason}</span> : null}{latestReturnRequest.status === "refunded" && latestReturnRequest.refundAmount != null ? <span className="text-brand-black/62">Refund {formatMoney(latestReturnRequest.refundAmount)}{latestReturnRequest.refundMethod ? ` · ${latestReturnRequest.refundMethod}` : ""}</span> : null}</span> : null}
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2 sm:justify-end">
          {onReview && order.status === "delivered" ? <button className={`rounded-wobbly-md border-2 px-3 py-1.5 text-xs font-bold ${reviewed ? "cursor-default border-brand-forest/20 bg-brand-mint text-brand-green-ink" : "border-brand-orange-ink bg-brand-yellow text-brand-black hover:bg-brand-orange"}`} type="button" disabled={reviewed} onClick={onReview}>{reviewed ? "Points earned" : `Review · +${rewardPoints} pts`}</button> : null}
          {onReturn && order.status === "delivered" ? <button className={`rounded-wobbly-md border-2 px-3 py-1.5 text-xs font-bold ${returnRequest ? "cursor-default border-brand-forest/20 bg-brand-mint text-brand-green-ink" : returnIsEligible ? "border-brand-orange-ink bg-brand-yellow text-brand-black hover:bg-brand-orange" : "cursor-default border-brand-forest/15 bg-brand-white text-brand-black/48"}`} type="button" disabled={Boolean(returnRequest) || !returnIsEligible} onClick={onReturn}>{returnRequest ? `Return · ${returnStatusLabel(returnRequest.status)}` : returnWindowClosed ? "Return window closed" : latestReturnRequest ? "Request another return" : "Return item"}</button> : null}
          <strong className="shrink-0 font-primary text-lg text-brand-green-ink">{formatMoney(order.total)}</strong>
        </div>
      </div>
    </article>
  );
}

function ReviewForm({ order, rewardPoints, busy, onCancel, onSubmit }: { order: Order; rewardPoints: number; busy: boolean; onCancel: () => void; onSubmit: (rating: number, comment: string) => void }) {
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (rating === 0) return;
    onSubmit(rating, comment.trim());
  }

  return (
    <form className="grid gap-3 rounded-wobbly-md border-2 border-brand-forest/20 bg-brand-white p-4" onSubmit={submit}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="grid gap-0.5"><span className="text-xs font-bold uppercase tracking-[0.1em] text-brand-orange-ink">Reviewing order</span><strong className="text-sm text-brand-green-ink">{order.id}</strong></div>
        <button className="text-xs font-bold text-brand-green-ink underline decoration-dashed underline-offset-4" type="button" onClick={onCancel}>Choose another</button>
      </div>
      <fieldset className="grid gap-2">
        <legend className="text-sm font-bold text-brand-black">How was your order?</legend>
        <div className="flex gap-1">
          {[1, 2, 3, 4, 5].map((value) => <button className="grid h-9 w-9 place-items-center rounded-full border-2 border-brand-forest/15 text-brand-orange-ink hover:border-brand-orange-ink hover:bg-brand-yellow" key={value} type="button" aria-label={`${value} star${value === 1 ? "" : "s"}`} aria-pressed={rating === value} onClick={() => setRating(value)}><Star className={`h-5 w-5 ${rating >= value ? "fill-brand-orange" : ""}`} /></button>)}
        </div>
      </fieldset>
      <label className="grid gap-1.5 text-xs font-bold uppercase tracking-[0.1em] text-brand-green-ink">Tell us about it <textarea className={`${inputClasses} min-h-24 resize-y`} value={comment} onChange={(event) => setComment(event.target.value)} placeholder="What did you enjoy?" /></label>
      <div className="flex flex-wrap items-center justify-between gap-2"><span className="text-xs text-brand-black/56">You’ll receive {rewardPoints} points after submitting.</span><button className={btnPrimarySm} type="submit" disabled={rating === 0 || busy}>{busy ? "Submitting..." : "Submit review"}</button></div>
    </form>
  );
}

function ReturnForm({ order, existingReturns, busy, onCancel, onSubmit }: { order: Order; existingReturns: CustomerReturn[]; busy: boolean; onCancel: () => void; onSubmit: (input: ReturnRequestInput) => void }) {
  const availableItems = remainingReturnableItems(order, existingReturns);
  const [quantities, setQuantities] = useState<Record<string, number>>(() => Object.fromEntries(availableItems.map((item) => [item.productId, item.quantity])));
  const [reason, setReason] = useState<(typeof RETURN_REASONS)[number]["value"]>(RETURN_REASONS[0].value);
  const [note, setNote] = useState("");

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const items = availableItems.map((item) => ({ productId: item.productId, quantity: quantities[item.productId] ?? 0 })).filter((item) => item.quantity > 0);
    if (!isReturnQuantityValid(order, items)) return;
    onSubmit({ orderId: order.id, items, reason, note: note.trim() });
  }

  return (
    <form className="grid gap-3 rounded-wobbly-md border-2 border-brand-forest/20 bg-brand-white p-4" onSubmit={submit}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="grid gap-0.5"><span className="text-xs font-bold uppercase tracking-[0.1em] text-brand-orange-ink">Step 2 of 2 · Choose items</span><strong className="text-sm text-brand-green-ink">{order.id}</strong></div>
        <button className="text-xs font-bold text-brand-green-ink underline decoration-dashed underline-offset-4" type="button" onClick={onCancel}>← Back to delivered orders</button>
      </div>
      <fieldset className="grid gap-2">
        <legend className="text-sm font-bold text-brand-black">Which items would you like to return?</legend>
        {availableItems.length === 0 ? <p className="rounded-wobbly-md border-2 border-dashed border-brand-forest/20 bg-brand-warm-white p-3 text-sm text-brand-black/68">All items from this order are already included in a return request.</p> : availableItems.map((available) => {
          const orderItem = order.items.find((item) => item.product_id === available.productId);
          if (!orderItem) return null;
          const selected = (quantities[available.productId] ?? 0) > 0;
          return <label className={`flex items-center gap-3 rounded-wobbly-md border-2 p-3 ${selected ? "border-brand-forest bg-brand-mint" : "border-brand-forest/15 bg-brand-warm-white"}`} key={available.productId}><input className="h-4 w-4 accent-brand-forest" type="checkbox" checked={selected} onChange={(event) => setQuantities((current) => ({ ...current, [available.productId]: event.target.checked ? Math.min(1, available.quantity) : 0 }))} /><span className="min-w-0 flex-1"><strong className="block truncate text-sm text-brand-green-ink">{orderItem.name}</strong><span className="text-xs text-brand-black/56">Up to {available.quantity} · {formatMoney(orderItem.price)} each</span></span><input className={`${inputClasses} w-20 px-2 py-1.5`} aria-label={`Return quantity for ${orderItem.name}`} type="number" min="1" max={available.quantity} value={selected ? quantities[available.productId] : ""} disabled={!selected} onChange={(event) => setQuantities((current) => ({ ...current, [available.productId]: Math.max(1, Math.min(available.quantity, Number(event.target.value) || 1)) }))} /></label>;
        })}
      </fieldset>
      <label className="grid gap-1.5 text-xs font-bold uppercase tracking-[0.1em] text-brand-green-ink">Why are you returning it?<select className={inputClasses} value={reason} onChange={(event) => setReason(event.target.value as ReturnRequestInput["reason"])}>{RETURN_REASONS.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></label>
      <label className="grid gap-1.5 text-xs font-bold uppercase tracking-[0.1em] text-brand-green-ink">Optional note<textarea className={`${inputClasses} min-h-20 resize-y`} maxLength={1000} value={note} onChange={(event) => setNote(event.target.value)} placeholder="Tell us what happened." /></label>
      <div className="flex flex-wrap items-center justify-between gap-2"><span className="text-xs text-brand-black/56">We’ll review this request and process the refund manually.</span><button className={btnPrimarySm} type="submit" disabled={busy || availableItems.length === 0}>{busy ? "Sending..." : "Send return request"}</button></div>
    </form>
  );
}

function ReturnCenter({ deliveredOrderCount, eligibleOrder, returningOrder, existingReturns, busy, notice, onStart, onViewOrders, onCancel, onSubmit }: { deliveredOrderCount: number; eligibleOrder: Order | null; returningOrder: Order | null; existingReturns: CustomerReturn[]; busy: boolean; notice: string | null; onStart: () => void; onViewOrders: () => void; onCancel: () => void; onSubmit: (input: ReturnRequestInput) => void }) {
  return (
    <div id="return-center" className="grid gap-3 rounded-wobbly-md border-2 border-brand-orange bg-brand-yellow/15 p-4">
      <div className="grid gap-1">
        <span className="text-xs font-bold uppercase tracking-[0.1em] text-brand-orange-ink">Returns & refunds</span>
        <h3 className="font-primary text-xl font-bold text-brand-green-ink">Need to return something?</h3>
        <p className="text-sm text-brand-black/68">You have {deliveredOrderCount} delivered order{deliveredOrderCount === 1 ? "" : "s"}. Returns are available until the end of the second local calendar day after delivery.</p>
      </div>
      {returningOrder ? <ReturnForm order={returningOrder} existingReturns={existingReturns} busy={busy} onCancel={onCancel} onSubmit={onSubmit} /> : <div className="grid gap-3 rounded-wobbly-md border-2 border-dashed border-brand-orange/70 bg-brand-white/65 p-3"><div className="flex items-start gap-3"><span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-brand-yellow text-sm font-bold text-brand-green-ink">1</span><p className="text-sm text-brand-black/68">Choose a delivered order below. We’ll show which items are still eligible for return.</p></div><div className="flex items-start gap-3"><span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-brand-yellow text-sm font-bold text-brand-green-ink">2</span><p className="text-sm text-brand-black/68">Select the items, tell us why, and send your request for refund processing.</p></div><div className="flex flex-wrap gap-2 pt-1"><button className={btnPrimarySm} type="button" disabled={!eligibleOrder} onClick={onStart}>{eligibleOrder ? "Start a return" : "No eligible order right now"}</button><button className={btnOutlineSm} type="button" onClick={onViewOrders}>View delivered orders</button></div></div>}
      {notice ? <p className="rounded-wobbly-md border-2 border-brand-forest bg-brand-mint p-3 text-sm font-bold text-brand-green-ink" role="status">{notice}</p> : null}
    </div>
  );
}

function ProductTile({ product, saved, onToggle, onAdd }: { product: ShopProduct; saved: boolean; onToggle: () => void; onAdd: () => void }) {
  return (
    <article className="grid gap-3 rounded-wobbly-card border-3 border-brand-forest bg-brand-white p-3 shadow-brand-soft">
      <a className="brand-pattern relative grid h-44 place-items-center overflow-hidden rounded-wobbly-md border-2 border-dashed border-brand-forest/25 p-3" href={productDetailHref(product)} aria-label={`View ${product.name}`}>
        <img className="h-full w-full object-contain" src={product.image} alt={product.alt} loading="lazy" width="260" height="200" />
        <span className="absolute left-2 top-2 rounded-full border-2 border-brand-forest bg-brand-yellow px-2 py-1 text-[0.62rem] font-bold text-brand-black">{product.category}</span>
      </a>
      <div className="grid min-w-0 gap-1.5">
        <a className="truncate font-primary text-lg font-bold leading-tight text-brand-black hover:text-brand-green-ink" href={productDetailHref(product)}>{product.name}</a>
        <span className="text-sm font-bold text-brand-orange-ink">{productPrice(product)}</span>
      </div>
      <div className="grid gap-2">
        <button className="min-h-9 rounded-wobbly-md border-2 border-brand-forest/35 px-2 text-xs font-bold text-brand-green-ink hover:bg-brand-mint" type="button" aria-pressed={saved} onClick={onToggle}>
          <Heart className={`mr-1 inline h-3.5 w-3.5 ${saved ? "fill-brand-orange text-brand-orange-ink" : ""}`} />{saved ? "Saved" : "Save"}
        </button>
        <AddToCartButton product={product} onAdd={() => onAdd()} />
      </div>
    </article>
  );
}

function AccountDashboard({ profile }: { profile: CustomerProfile }) {
  const { addToCart, cartQuantity, openCart } = useCart();
  const { products } = useContent();
  const { signOut, updateProfile } = useCustomerAuth();
  const [orders, setOrders] = useState<Order[] | null>(null);
  const [ordersError, setOrdersError] = useState<string | null>(null);
  const [rewards, setRewards] = useState<AccountRewardsSnapshot | null>(null);
  const [rewardsError, setRewardsError] = useState<string | null>(null);
  const [orderFilter, setOrderFilter] = useState<OrderFilter>(() => typeof window !== "undefined" && window.location.hash.includes("section=returns") ? "returns" : "all");
  const [reviewingOrder, setReviewingOrder] = useState<Order | null>(null);
  const [reviewNotice, setReviewNotice] = useState<string | null>(null);
  const [reviewBusy, setReviewBusy] = useState(false);
  const [returns, setReturns] = useState<CustomerReturn[]>([]);
  const [returningOrder, setReturningOrder] = useState<Order | null>(null);
  const [returnNotice, setReturnNotice] = useState<string | null>(null);
  const [returnBusy, setReturnBusy] = useState(false);
  const [checkInNotice, setCheckInNotice] = useState<string | null>(null);
  const [checkInBusy, setCheckInBusy] = useState(false);
  const [redemptionOpen, setRedemptionOpen] = useState(false);
  const [redemptionPoints, setRedemptionPoints] = useState(100);
  const [redemptionNotice, setRedemptionNotice] = useState<string | null>(null);
  const [redemptionBusy, setRedemptionBusy] = useState(false);
  const [libraryTab, setLibraryTab] = useState<LibraryTab>("wishlist");
  const [profileEditing, setProfileEditing] = useState(false);
  const [profileForm, setProfileForm] = useState<CustomerProfileUpdate>(() => ({
    name: profile.name,
    phone: profile.phone,
    area: profile.area,
    dzongkhag: profile.dzongkhag,
    address: profile.address,
  }));
  const [profileBusy, setProfileBusy] = useState(false);
  const [profileNotice, setProfileNotice] = useState<string | null>(null);
  const [couponCount, setCouponCount] = useState<number | null>(null);
  const [membership, setMembership] = useState<MembershipSnapshot | null>(null);

  useEffect(() => {
    let active = true;
    setOrders(null);
    setOrdersError(null);
    void fetchCustomerOrders(profile.email).then((nextOrders) => {
      if (active) setOrders(nextOrders);
    }).catch((error) => {
      if (active) setOrdersError(error instanceof Error ? error.message : "Your orders could not be loaded.");
    });
    return () => {
      active = false;
    };
  }, [profile.email]);

  useEffect(() => {
    let active = true;
    void fetchCustomerReturns(profile.email).then((nextReturns) => {
      if (active) setReturns(nextReturns);
    }).catch((error) => {
      if (active) setReturnNotice(error instanceof Error ? error.message : "Your return requests could not be loaded.");
    });
    return () => {
      active = false;
    };
  }, [profile.email]);

  useEffect(() => {
    setProfileForm({ name: profile.name, phone: profile.phone, area: profile.area, dzongkhag: profile.dzongkhag, address: profile.address });
    setRewards(null);
    setRewardsError(null);
    void migrateLegacySavedItems(profile.email).finally(() => {
      void fetchAccountRewards(profile.email)
        .then(setRewards)
        .catch((error) => setRewardsError(error instanceof Error ? error.message : "Your rewards could not be loaded."));
    });
  }, [profile]);

  useEffect(() => {
    let active = true;
    void listMyCoupons(profile.email).then((coupons) => {
      if (active) setCouponCount(coupons.length);
    });
    return () => {
      active = false;
    };
  }, [profile.email]);

  useEffect(() => {
    let active = true;
    void fetchMyMembership(profile.email).then((nextMembership) => {
      if (active) setMembership(nextMembership);
    }).catch(() => {
      if (active) setMembership(null);
    });
    return () => {
      active = false;
    };
  }, [profile.email]);

  const productById = useMemo(() => new Map(products.map((product) => [product.id, product])), [products]);
  const wishlistIds = useMemo(() => rewards?.savedItems.filter((item) => item.kind === "wishlist").map((item) => item.productId) ?? [], [rewards]);
  const historyIds = useMemo(() => rewards?.savedItems.filter((item) => item.kind === "history").sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)).map((item) => item.productId) ?? [], [rewards]);
  const wishlistProducts = useMemo(() => wishlistIds.map((id) => productById.get(id)).filter((product): product is ShopProduct => Boolean(product)), [wishlistIds, productById]);
  const historyProducts = useMemo(() => historyIds.map((id) => productById.get(id)).filter((product): product is ShopProduct => Boolean(product)), [historyIds, productById]);
  const featuredProducts = useMemo(() => products.filter(isProductActive).slice(0, 4), [products]);
  const visibleOrders = useMemo(() => {
    const filtered = (orders ?? []).filter((order) => matchesOrder(order, orderFilter));
    return orderFilter === "returns" ? sortReceivedOrders(filtered) : filtered;
  }, [orders, orderFilter]);
  const eligibleReturnOrder = useMemo(() => visibleOrders.find((order) => {
    const orderReturns = returns.filter((item) => item.orderId === order.id);
    return returnEligibility(order, new Date(), orderReturns).eligible && remainingReturnableItems(order, orderReturns).length > 0;
  }) ?? null, [returns, visibleOrders]);
  const rewardSettings = rewards?.settings ?? defaultRewardSettings;
  const checkInRecords = rewards?.checkIns ?? [];
  const todayKey = localThimphuDateKey();
  const checkedInToday = checkInRecords.some((record) => record.checkInDate === todayKey);
  const currentCheckInStreak = rewards?.currentStreak ?? checkInStreak(checkInRecords, todayKey);
  const todayCheckInReward = rewardForNextCheckIn(checkInRecords, rewardSettings, todayKey);
  const firstCheckInDay = Math.max(1, Math.min(checkedInToday ? currentCheckInStreak : currentCheckInStreak + 1, rewardSettings.dailyCheckInRewards.length));
  const checkInDays = Array.from({ length: rewardSettings.dailyCheckInRewards.length }, (_, index) => {
    const dateKey = addDays(todayKey, index);
    const dayNumber = Math.min(firstCheckInDay + index, rewardSettings.dailyCheckInRewards.length);
    return { dateKey, label: dateKey.slice(5).replace("-", "/"), dayNumber, reward: rewardSettings.dailyCheckInRewards[dayNumber - 1] ?? 0 };
  });
  const reviewedOrderIds = useMemo(() => new Set((rewards?.reviews ?? []).map((review) => review.orderId)), [rewards]);

  function focusSection(id: string) {
    requestAnimationFrame(() => document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" }));
  }

  function openReview(order: Order) {
    setOrderFilter("review");
    setReviewingOrder(order);
    setReviewNotice(null);
    focusSection("review-center");
  }

  function openReviewCenter() {
    const nextOrder = (orders ?? []).find((order) => matchesOrder(order, "review") && !reviewedOrderIds.has(order.id));
    setOrderFilter("review");
    setReviewingOrder(nextOrder ?? null);
    setReviewNotice(null);
    focusSection("review-center");
  }

  function openReturn(order: Order) {
    setOrderFilter("returns");
    setReturningOrder(order);
    setReturnNotice(null);
    focusSection("return-center");
  }

  async function submitReturn(input: ReturnRequestInput) {
    if (returnBusy) return;
    setReturnBusy(true);
    setReturnNotice(null);
    try {
      const nextReturn = await requestCustomerReturn(profile.email, input);
      setReturns((current) => [nextReturn, ...current]);
      setReturningOrder(null);
      setReturnNotice("Your return request was sent. We’ll review the refund and update you here.");
    } catch (error) {
      setReturnNotice(error instanceof Error ? error.message : "Your return request could not be submitted.");
    } finally {
      setReturnBusy(false);
    }
  }

  async function submitReview(order: Order, rating: number, comment: string) {
    if (reviewedOrderIds.has(order.id) || reviewBusy) return;
    setReviewBusy(true);
    setReviewNotice(null);
    try {
      const result = await submitCustomerReview(profile.email, order.id, rating, comment);
      setRewards(result.snapshot);
      setReviewingOrder(null);
      setReviewNotice(`Thanks for sharing! ${result.review.pointsAwarded} points were added to your account.`);
    } catch (error) {
      setReviewNotice(error instanceof Error ? error.message : "Your review could not be submitted.");
    } finally {
      setReviewBusy(false);
    }
  }

  async function handleDailyCheckIn() {
    if (checkedInToday || checkInBusy) return;
    setCheckInBusy(true);
    setCheckInNotice(null);
    try {
      const result = await claimDailyCheckIn(profile.email);
      setRewards(result.snapshot);
      setCheckInNotice(result.pointsAwarded > 0 ? `Daily check-in complete! +${result.pointsAwarded} points added.` : "You have already checked in today.");
    } catch (error) {
      setCheckInNotice(error instanceof Error ? error.message : "Daily check-in could not be completed.");
    } finally {
      setCheckInBusy(false);
    }
  }

  async function toggleWishlist(productId: string) {
    try {
      setRewards(await toggleSavedItem(profile.email, productId, "wishlist"));
    } catch (error) {
      setCheckInNotice(error instanceof Error ? error.message : "The saved item could not be updated.");
    }
  }

  async function redeemPoints(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!rewards || redemptionBusy) return;
    setRedemptionBusy(true);
    setRedemptionNotice(null);
    try {
      setRewards(await requestPointsRedemption(profile.email, redemptionPoints));
      setRedemptionNotice("Redemption requested. An admin will review it before wallet credit is added.");
    } catch (error) {
      setRedemptionNotice(error instanceof Error ? error.message : "Your points redemption could not be requested.");
    } finally {
      setRedemptionBusy(false);
    }
  }

  async function saveProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setProfileBusy(true);
    setProfileNotice(null);
    const result = await updateProfile(profileForm);
    setProfileBusy(false);
    if (!result.ok) {
      setProfileNotice(result.error ?? "Could not update your profile.");
      return;
    }
    setProfileNotice("Your profile was updated.");
    setProfileEditing(false);
  }

  const rewardCards = [
    { label: "Coupons", value: couponCount == null ? "…" : String(couponCount), note: "Deals saved", icon: TicketPercent, color: "bg-brand-yellow", href: "#/coupons" },
    { label: "Points", value: rewards ? String(rewards.pointsBalance) : "…", note: `${rewards?.reviews.length ?? 0} review${rewards?.reviews.length === 1 ? "" : "s"} completed`, icon: Sparkles, color: "bg-brand-mint" },
    { label: "Wallet", value: rewards ? formatMoney(rewards.walletBalance) : "…", note: "Available balance", icon: WalletCards, color: "bg-brand-buff", href: "#/account/wallet" },
    { label: "Gift card", value: "Nu. 0", note: "No gift cards yet", icon: Gift, color: "bg-brand-lime" },
  ];

  return (
    <div className="mx-auto grid w-full max-w-[90rem] gap-5 px-4 pb-28 pt-6 sm:px-6 lg:px-10 lg:pb-12">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <a className="inline-flex min-h-10 items-center gap-1 font-bold text-brand-green-ink underline decoration-dashed underline-offset-4 hover:text-brand-forest" href="#/">← Continue shopping</a>
        <button className={btnOutlineSm} type="button" onClick={() => void signOut()}><span className="inline-flex items-center gap-1.5"><span>Sign out</span></span></button>
      </div>

      <section className="relative overflow-hidden rounded-[28px_20px_32px_24px/22px_32px_20px_28px] border-3 border-brand-forest bg-brand-yellow p-5 shadow-brand-big sm:p-7" aria-labelledby="account-title">
        <div className="pointer-events-none absolute -right-8 -top-12 h-40 w-40 rounded-full border-[18px] border-brand-orange/25" />
        <div className="relative flex flex-wrap items-center justify-between gap-5">
          <div className="flex min-w-0 items-center gap-4">
            <div className="grid h-18 w-18 shrink-0 place-items-center rounded-full border-3 border-brand-forest bg-brand-white font-primary text-2xl font-bold text-brand-green-ink shadow-brand-soft">{initials(profile)}</div>
            <div className="grid min-w-0 gap-1">
              <span className="text-xs font-bold uppercase tracking-[0.12em] text-brand-orange-ink">Your Zama account</span>
              <h1 id="account-title" className="truncate font-primary text-[clamp(1.8rem,5vw,3rem)] font-bold leading-none text-brand-forest">{profile.name || "Fresh market member"}</h1>
              <span className="truncate text-sm text-brand-forest/72">{profile.email}</span>
            </div>
          </div>
          <button className="grid h-12 w-12 shrink-0 place-items-center rounded-full border-3 border-brand-forest bg-brand-white text-brand-forest shadow-brand-soft hover:bg-brand-mint" type="button" aria-label="Edit profile" onClick={() => { setProfileEditing((open) => !open); setProfileNotice(null); }}><Settings className="h-5 w-5" /></button>
        </div>
        <div className="relative mt-5 flex flex-wrap items-center gap-x-5 gap-y-2 border-t-2 border-dashed border-brand-forest/25 pt-4 text-sm text-brand-forest/72">
          <span className={"inline-flex w-fit items-center gap-1.5 rounded-full border-2 px-2.5 py-1 text-xs font-bold " + membershipStatusClasses(membership?.status ?? "none")}><BadgeCheck className="h-4 w-4" /> {membership ? membershipStatusLabel(membership.status) : "Account member"}</span>
          {profile.area ? <span className="inline-flex items-center gap-1.5"><MapPin className="h-4 w-4" /> {profile.area}</span> : <span>Complete your profile for faster checkout.</span>}
        </div>
      </section>

      {membership ? <section className={"grid gap-4 rounded-wobbly-card border-3 p-5 shadow-brand-soft sm:p-6 " + (membership.status === "active" ? "border-brand-forest bg-brand-yellow" : "border-brand-forest/25 bg-brand-warm-white")} aria-labelledby="account-membership-title">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex min-w-0 items-start gap-3"><span className="grid h-11 w-11 shrink-0 place-items-center rounded-full border-2 border-brand-forest bg-brand-mint text-brand-green-ink"><Crown className="h-5 w-5" /></span><div className="grid min-w-0 gap-1"><span className="text-xs font-bold uppercase tracking-[0.1em] text-brand-orange-ink">Membership</span><h2 id="account-membership-title" className="font-primary text-xl font-bold text-brand-green-ink">{membership.plan?.name ?? "Zama+ Membership"}</h2><span className={"w-fit rounded-full border-2 px-2 py-0.5 text-xs font-bold " + membershipStatusClasses(membership.status)}>{membershipStatusLabel(membership.status)}</span></div></div>
          <a className="inline-flex items-center gap-1 text-sm font-bold text-brand-green-ink underline decoration-dashed underline-offset-4" href="#/account/membership">{membership.status === "none" ? "See member benefits" : "Manage membership"} <ChevronRight className="h-4 w-4" /></a>
        </div>
        {membership.status === "active" && membership.subscription ? <div className="grid gap-2 border-t-2 border-dashed border-brand-forest/20 pt-3 text-sm sm:grid-cols-3"><span><strong className="block text-xs uppercase tracking-[0.08em] text-brand-black/55">Plan</strong>{membership.plan?.name ?? "Zama+"}</span><span><strong className="block text-xs uppercase tracking-[0.08em] text-brand-black/55">Automatic saving</strong>{membership.memberDiscountPercent}% off eligible items</span><span><strong className="block text-xs uppercase tracking-[0.08em] text-brand-black/55">Next renewal</strong>{membership.subscription.nextRenewalDate ? formatDate(membership.subscription.nextRenewalDate) : "One-time plan"}</span></div> : membership.status === "pending" ? <p className="rounded-wobbly-md border-2 border-brand-orange-ink bg-brand-buff p-3 text-sm text-brand-black">Your bank transfer is waiting for verification. We’ll update your account when the request is reviewed.</p> : <p className="text-sm leading-relaxed text-brand-black/68">Join Zama+ for automatic savings, member-only offers, and early access to selected seasonal products.</p>}
      </section> : null}

      {profileEditing ? (
        <form className="grid gap-4 rounded-wobbly-card border-3 border-brand-forest bg-brand-warm-white p-5 shadow-brand-soft" onSubmit={(event) => void saveProfile(event)}>
          <div className="grid gap-1"><h2 className="font-primary text-xl font-bold text-brand-green-ink">Edit profile</h2><p className="text-sm text-brand-black/68">Keep your delivery details ready for the next order.</p></div>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="grid gap-1.5 text-xs font-bold uppercase tracking-[0.1em] text-brand-green-ink">Name<input className={inputClasses} value={profileForm.name} onChange={(event) => setProfileForm((current) => ({ ...current, name: event.target.value }))} /></label>
            <label className="grid gap-1.5 text-xs font-bold uppercase tracking-[0.1em] text-brand-green-ink">Phone<input className={inputClasses} type="tel" value={profileForm.phone} onChange={(event) => setProfileForm((current) => ({ ...current, phone: event.target.value }))} /></label>
            <label className="grid gap-1.5 text-xs font-bold uppercase tracking-[0.1em] text-brand-green-ink">Area<input className={inputClasses} value={profileForm.area} onChange={(event) => setProfileForm((current) => ({ ...current, area: event.target.value }))} placeholder="Thimphu" /></label>
            <label className="grid gap-1.5 text-xs font-bold uppercase tracking-[0.1em] text-brand-green-ink">Dzongkhag<input className={inputClasses} value={profileForm.dzongkhag} onChange={(event) => setProfileForm((current) => ({ ...current, dzongkhag: event.target.value }))} /></label>
            <label className="grid gap-1.5 text-xs font-bold uppercase tracking-[0.1em] text-brand-green-ink sm:col-span-2">Address<input className={inputClasses} value={profileForm.address} onChange={(event) => setProfileForm((current) => ({ ...current, address: event.target.value }))} placeholder="Street, building, landmark" /></label>
          </div>
          {profileNotice ? <p className="rounded-wobbly-md border-2 border-dashed border-brand-orange bg-brand-orange/10 p-3 text-sm font-semibold text-brand-black" role="status">{profileNotice}</p> : null}
          <div className="flex flex-wrap justify-end gap-2"><button className={btnOutlineSm} type="button" onClick={() => setProfileEditing(false)}>Cancel</button><button className={btnPrimarySm} type="submit" disabled={profileBusy}>{profileBusy ? "Saving..." : "Save profile"}</button></div>
        </form>
      ) : null}

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4" aria-label="Rewards summary">
        {rewardCards.map((card) => {
          const Icon = card.icon;
          const cardContent = <><span className={`grid h-11 w-11 shrink-0 place-items-center rounded-full border-2 border-brand-forest ${card.color} text-brand-green-ink`}><Icon className="h-5 w-5" /></span><span className="grid min-w-0 gap-0.5"><span className="text-xs font-bold uppercase tracking-[0.1em] text-brand-black/56">{card.label}</span><strong className="font-primary text-xl leading-none text-brand-green-ink">{card.value}</strong><span className="truncate text-xs text-brand-black/56">{card.note}</span></span>{card.href ? <ChevronRight className="ml-auto h-4 w-4 shrink-0 text-brand-forest" /> : null}</>;
          const cardClass = "flex items-center gap-3 rounded-wobbly-card border-3 border-brand-forest bg-brand-white p-4 text-left shadow-brand-soft";
          if (card.label === "Points") return <button className={`${cardClass} hover:bg-brand-warm-white`} key={card.label} type="button" onClick={() => { setRedemptionOpen((open) => !open); setRedemptionNotice(null); setRedemptionPoints(rewardSettings.minimumRedemptionPoints); }} aria-expanded={redemptionOpen}>{cardContent}<ChevronRight className={`ml-auto h-4 w-4 shrink-0 text-brand-forest transition-transform ${redemptionOpen ? "rotate-90" : ""}`} /></button>;
          return card.href ? <a className={`${cardClass} hover:bg-brand-warm-white`} key={card.label} href={card.href} aria-label={`Open ${card.label.toLowerCase()}`}>{cardContent}</a> : <div className={cardClass} key={card.label}>{cardContent}</div>;
        })}
      </section>

      {rewardsError ? <p className="rounded-wobbly-md border-2 border-dashed border-brand-orange bg-brand-orange/10 p-3 text-sm font-semibold text-brand-black" role="alert">{rewardsError}</p> : null}

      {redemptionOpen ? <form className="grid gap-3 rounded-wobbly-card border-3 border-brand-forest bg-brand-mint p-5 shadow-brand-soft" onSubmit={(event) => void redeemPoints(event)}>
        <div className="grid gap-1"><span className="text-xs font-bold uppercase tracking-[0.1em] text-brand-orange-ink">Redeem points</span><h2 className="font-primary text-xl font-bold text-brand-green-ink">Turn points into wallet credit</h2><p className="text-sm text-brand-black/68">Every {rewardSettings.pointsPerNgultrum} points is worth Nu. 1. An admin will approve your request before credit is added.</p></div>
        <div className="flex flex-wrap items-end gap-3"><label className="grid min-w-48 gap-1.5 text-xs font-bold uppercase tracking-[0.1em] text-brand-green-ink">Points to redeem<input className={inputClasses} type="number" min={rewardSettings.minimumRedemptionPoints} max={rewards?.pointsBalance ?? 0} step={1} value={redemptionPoints} onChange={(event) => setRedemptionPoints(Number(event.target.value))} /></label><span className="pb-3 text-sm font-bold text-brand-green-ink">≈ {formatMoney(Math.floor(redemptionPoints / rewardSettings.pointsPerNgultrum))}</span><button className={btnPrimarySm} type="submit" disabled={!rewards || redemptionBusy}>{redemptionBusy ? "Requesting..." : "Request redemption"}</button><button className={btnOutlineSm} type="button" onClick={() => setRedemptionOpen(false)}>Cancel</button></div>
        {redemptionNotice ? <p className="rounded-wobbly-md border-2 border-brand-forest bg-brand-white p-3 text-sm font-semibold text-brand-green-ink" role="status">{redemptionNotice}</p> : null}
      </form> : null}

      <section id="daily-check-in" className="grid gap-4 rounded-wobbly-card border-3 border-brand-forest bg-brand-white p-5 shadow-brand-soft" aria-labelledby="daily-check-in-title">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex min-w-0 items-center gap-3"><span className="grid h-12 w-12 shrink-0 place-items-center rounded-full border-2 border-brand-forest bg-brand-yellow text-brand-green-ink"><CalendarCheck className="h-6 w-6" /></span><div className="grid min-w-0 gap-1"><span className="text-xs font-bold uppercase tracking-[0.1em] text-brand-orange-ink">Daily check-in</span><h2 id="daily-check-in-title" className="font-primary text-2xl font-bold text-brand-green-ink">Collect points every day</h2><p className="text-sm text-brand-black/68">{currentCheckInStreak > 0 ? `${currentCheckInStreak} day streak — keep it going for bigger rewards.` : "Check in today to start your points streak."}</p></div></div>
          <button className={checkedInToday ? btnOutlineSm : btnPrimarySm} type="button" disabled={checkedInToday || checkInBusy} onClick={() => void handleDailyCheckIn()}>{checkedInToday ? "Checked in today" : checkInBusy ? "Checking in..." : `Check in · +${todayCheckInReward} pts`}</button>
        </div>
        <div className="grid grid-cols-4 gap-2 sm:grid-cols-7">
          {checkInDays.map((day, index) => {
            const completed = checkInRecords.some((record) => record.checkInDate === day.dateKey);
            const isToday = index === 0;
            return <div className={`grid min-h-24 content-center justify-items-center gap-1 rounded-wobbly-md border-2 p-2 text-center ${completed ? "border-brand-forest bg-brand-mint text-brand-green-ink" : isToday ? "border-brand-orange-ink bg-brand-yellow/55 text-brand-black" : "border-brand-forest/10 bg-brand-warm-white text-brand-black/48"}`} key={day.dateKey}><span className="text-[0.65rem] font-bold uppercase tracking-[0.08em]">Day {day.dayNumber}</span><strong className="font-primary text-xl">+{day.reward}</strong><span className="text-xs">{isToday ? "Today" : day.label}</span>{completed ? <CalendarCheck className="h-4 w-4" aria-label="Collected" /> : null}</div>;
          })}
        </div>
        {checkInNotice ? <p className="rounded-wobbly-md border-2 border-brand-forest bg-brand-mint p-3 text-sm font-bold text-brand-green-ink" role="status">{checkInNotice}</p> : null}
      </section>

      <section id="my-orders" className="grid gap-4 rounded-wobbly-card border-3 border-brand-forest bg-brand-white p-5 shadow-brand-soft" aria-labelledby="my-orders-title">
        <div className="flex flex-wrap items-end justify-between gap-3"><div className="grid gap-1"><span className="text-xs font-bold uppercase tracking-[0.1em] text-brand-orange-ink">Your order journey</span><h2 id="my-orders-title" className="font-primary text-2xl font-bold text-brand-green-ink">My orders</h2></div><a className="inline-flex items-center gap-1 text-sm font-bold text-brand-green-ink underline decoration-dashed underline-offset-4" href="#/account/orders">View all <ChevronRight className="h-4 w-4" /></a></div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
          {orderFilterLabels.map((item) => {
            const Icon = item.icon;
            const count = orders ? item.key === "review" ? orders.filter((order) => matchesOrder(order, item.key) && !reviewedOrderIds.has(order.id)).length : orders.filter((order) => matchesOrder(order, item.key)).length : "…";
            return <button className={`grid min-h-24 content-center justify-items-center gap-2 rounded-wobbly-md border-2 p-2 text-center transition-colors ${orderFilter === item.key ? "border-brand-forest bg-brand-yellow text-brand-green-ink" : "border-brand-forest/15 bg-brand-warm-white text-brand-black/68 hover:border-brand-forest hover:bg-brand-mint"}`} key={item.key} type="button" aria-pressed={orderFilter === item.key} onClick={() => { if (item.key === "review") { openReviewCenter(); return; } setOrderFilter(item.key); setReviewingOrder(null); setReturningOrder(null); setReviewNotice(null); setReturnNotice(null); if (item.key === "returns") focusSection("return-center"); }}><Icon className="h-6 w-6" /><span className="text-xs font-bold">{item.label}</span><span className="text-xs font-bold opacity-60">{count}</span></button>;
          })}
        </div>
        {orderFilter === "review" ? <div id="review-center" className="grid gap-3 rounded-wobbly-md border-2 border-brand-orange bg-brand-yellow/15 p-4">
          <div className="grid gap-1"><span className="text-xs font-bold uppercase tracking-[0.1em] text-brand-orange-ink">Earn points</span><h3 className="font-primary text-xl font-bold text-brand-green-ink">Review your previous orders</h3><p className="text-sm text-brand-black/68">Choose a delivered order, leave a rating, and we’ll add {rewardSettings.reviewRewardPoints} points to your Zama account.</p></div>
          {reviewingOrder ? <ReviewForm order={reviewingOrder} rewardPoints={rewardSettings.reviewRewardPoints} busy={reviewBusy} onCancel={() => setReviewingOrder(null)} onSubmit={(rating, comment) => void submitReview(reviewingOrder, rating, comment)} /> : <p className="rounded-wobbly-md border-2 border-dashed border-brand-orange/70 bg-brand-white/65 p-3 text-sm text-brand-black/68">Select the “Review · +{rewardSettings.reviewRewardPoints} pts” button on a delivered order below to get started.</p>}
          {reviewNotice ? <p className="rounded-wobbly-md border-2 border-brand-forest bg-brand-mint p-3 text-sm font-bold text-brand-green-ink" role="status">{reviewNotice}</p> : null}
        </div> : null}
        {orderFilter === "returns" ? <ReturnCenter deliveredOrderCount={visibleOrders.length} eligibleOrder={eligibleReturnOrder} returningOrder={returningOrder} existingReturns={returningOrder ? returns.filter((item) => item.orderId === returningOrder.id) : []} busy={returnBusy} notice={returnNotice} onStart={() => { if (eligibleReturnOrder) openReturn(eligibleReturnOrder); }} onViewOrders={() => focusSection("return-orders")} onCancel={() => setReturningOrder(null)} onSubmit={(input) => void submitReturn(input)} /> : null}
        {ordersError ? <p className="rounded-wobbly-md border-2 border-dashed border-brand-orange bg-brand-orange/10 p-3 text-sm font-semibold text-brand-black" role="alert">{ordersError}</p> : null}
        {!orders ? <p className="rounded-wobbly-md border-2 border-dashed border-brand-forest/25 bg-brand-warm-white p-5 text-center text-sm text-brand-black/56">Loading your orders...</p> : orders.length === 0 ? <p className="rounded-wobbly-md border-2 border-dashed border-brand-forest/25 bg-brand-warm-white p-5 text-center text-sm text-brand-black/56">Your Zama orders will appear here after checkout. <a className="font-bold text-brand-green-ink underline" href="#/shop">Browse the market</a></p> : visibleOrders.length === 0 ? <p className="rounded-wobbly-md border-2 border-dashed border-brand-forest/25 bg-brand-warm-white p-5 text-center text-sm text-brand-black/56">No orders in this section yet.</p> : <div id="return-orders" className="grid gap-3 md:grid-cols-2">{visibleOrders.slice(0, 6).map((order) => { const orderReturns = returns.filter((item) => item.orderId === order.id); const eligibility = returnEligibility(order, new Date(), orderReturns); const activeRequest = orderReturns.find((item) => ["pending", "approved"].includes(item.status)); const latestRequest = orderReturns[0]; return <OrderCard key={order.id} order={order} productById={productById} detailed={orderFilter === "review" || orderFilter === "returns"} rewardPoints={rewardSettings.reviewRewardPoints} reviewed={reviewedOrderIds.has(order.id)} onReview={() => openReview(order)} onReturn={orderFilter === "returns" ? () => openReturn(order) : undefined} returnRequest={activeRequest} latestReturnRequest={latestRequest} returnIsEligible={eligibility.eligible} returnWindowClosed={eligibility.reason === "window_closed"} />; })}</div>}
      </section>

      <section className="grid gap-4" aria-labelledby="account-services-title">
        <div className="grid gap-1"><span className="text-xs font-bold uppercase tracking-[0.1em] text-brand-orange-ink">Help & discovery</span><h2 id="account-services-title" className="font-primary text-2xl font-bold text-brand-green-ink">Make Zama yours</h2></div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { title: "Customer service", copy: "Questions about an order?", href: "#/contact", icon: CircleHelp, color: "bg-brand-yellow" },
            { title: "Delivery & freshness", copy: "See how we handle your box.", href: "#/meal-kit-trust", icon: PackageCheck, color: "bg-brand-mint" },
            { title: "Zama+ membership", copy: membership?.status === "active" ? "See your savings and member offers." : "See plans and join Zama+.", href: "#/account/membership", icon: Users, color: "bg-brand-lime" },
            { title: "Our policies", copy: "Clear information before you buy.", href: "#/meal-kit-trust", icon: ShieldIcon, color: "bg-brand-buff" },
          ].map((item) => { const Icon = item.icon; return <a className="group flex items-center gap-3 rounded-wobbly-card border-3 border-brand-forest bg-brand-white p-4 shadow-brand-soft hover:-translate-y-px hover:bg-brand-warm-white" href={item.href} key={item.title}><span className={`grid h-11 w-11 shrink-0 place-items-center rounded-full border-2 border-brand-forest ${item.color} text-brand-green-ink`}><Icon className="h-5 w-5" /></span><span className="grid min-w-0 gap-0.5"><strong className="text-sm text-brand-green-ink">{item.title}</strong><span className="text-xs text-brand-black/56">{item.copy}</span></span><ChevronRight className="ml-auto h-4 w-4 shrink-0 text-brand-forest transition-transform group-hover:translate-x-1" /></a>; })}
        </div>
      </section>

      <section className="grid gap-4" aria-labelledby="account-library-title">
        <div className="flex flex-wrap items-end justify-between gap-3"><div className="grid gap-1"><span className="text-xs font-bold uppercase tracking-[0.1em] text-brand-orange-ink">Your library</span><h2 id="account-library-title" className="font-primary text-2xl font-bold text-brand-green-ink">Saved for later</h2></div><a className="text-sm font-bold text-brand-green-ink underline decoration-dashed underline-offset-4" href="#/shop">Find more products →</a></div>
        <div className="grid grid-cols-3 rounded-wobbly-md border-2 border-brand-forest/20 bg-brand-warm-white p-1">
          {([{ key: "wishlist", label: "Wishlist", count: wishlistIds.length, icon: Heart }, { key: "history", label: "History", count: historyIds.length, icon: History }, { key: "following", label: "Following", count: 0, icon: Users }] as const).map((item) => { const Icon = item.icon; return <button className={`flex min-h-11 items-center justify-center gap-1.5 rounded-[12px] px-2 text-xs font-bold sm:text-sm ${libraryTab === item.key ? "bg-brand-forest text-brand-white" : "text-brand-green-ink hover:bg-brand-yellow"}`} key={item.key} type="button" aria-pressed={libraryTab === item.key} onClick={() => setLibraryTab(item.key)}><Icon className="h-4 w-4" />{item.label}<span className="opacity-65">{item.count}</span></button>; })}
        </div>
        {libraryTab === "following" ? <div className="grid justify-items-center gap-3 rounded-wobbly-card border-3 border-dashed border-brand-forest/30 bg-brand-warm-white p-8 text-center"><Users className="h-9 w-9 text-brand-forest" /><h3 className="font-primary text-xl font-bold text-brand-green-ink">Follow the people behind your food</h3><p className="max-w-120 text-sm text-brand-black/68">Meet Zama farmers and discover the stories behind the ingredients.</p><a className={btnOutlineSm} href="#/farmers">Meet our farmers</a></div> : <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{(libraryTab === "wishlist" ? wishlistProducts : historyProducts).length > 0 ? (libraryTab === "wishlist" ? wishlistProducts : historyProducts).map((product) => <ProductTile key={product.id} product={product} saved={wishlistIds.includes(product.id)} onToggle={() => void toggleWishlist(product.id)} onAdd={() => addToCart(product.id)} />) : <div className="grid gap-3 rounded-wobbly-card border-3 border-dashed border-brand-forest/30 bg-brand-warm-white p-6 text-center sm:col-span-2 lg:col-span-4"><Heart className="mx-auto h-8 w-8 text-brand-orange-ink" /><h3 className="font-primary text-xl font-bold text-brand-green-ink">Nothing here yet</h3><p className="text-sm text-brand-black/68">Save products you love, and they’ll be waiting in your account.</p><div><a className={btnPrimarySm} href="#/shop">Browse the market</a></div></div>}</div>}
      </section>

      <section className="grid gap-4" aria-labelledby="account-picks-title"><div className="flex flex-wrap items-end justify-between gap-3"><div className="grid gap-1"><span className="text-xs font-bold uppercase tracking-[0.1em] text-brand-orange-ink">A little inspiration</span><h2 id="account-picks-title" className="font-primary text-2xl font-bold text-brand-green-ink">Picked for your kitchen</h2></div><span className="text-sm text-brand-black/56">Tap a product to save it or add it to your cart.</span></div><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{featuredProducts.map((product) => <ProductTile key={product.id} product={product} saved={wishlistIds.includes(product.id)} onToggle={() => void toggleWishlist(product.id)} onAdd={() => addToCart(product.id)} />)}</div></section>

      <nav className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-4 border-t-3 border-brand-forest bg-brand-white/96 px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2 shadow-[0_-6px_0_color-mix(in_srgb,var(--color-brand-forest)_12%,transparent)] md:hidden" aria-label="Account navigation">
        <a className="grid min-h-12 justify-items-center gap-0.5 rounded-wobbly-md py-1 text-[0.68rem] font-bold text-brand-black/62 hover:bg-brand-yellow" href="#/"><ShoppingBag className="h-5 w-5" />Shop</a>
        <a className="grid min-h-12 justify-items-center gap-0.5 rounded-wobbly-md py-1 text-[0.68rem] font-bold text-brand-black/62 hover:bg-brand-yellow" href="#/shop"><CircleHelp className="h-5 w-5" />Categories</a>
        <button className="relative grid min-h-12 justify-items-center gap-0.5 rounded-wobbly-md py-1 text-[0.68rem] font-bold text-brand-black/62 hover:bg-brand-yellow" type="button" onClick={openCart}><WalletCards className="h-5 w-5" />Cart{cartQuantity > 0 ? <span className="absolute right-5 top-0 grid min-h-4 min-w-4 place-items-center rounded-full border border-brand-forest bg-brand-orange px-1 text-[0.58rem] text-brand-white">{cartQuantity > 99 ? "99+" : cartQuantity}</span> : null}</button>
        <a className="grid min-h-12 justify-items-center gap-0.5 rounded-wobbly-md bg-brand-yellow py-1 text-[0.68rem] font-bold text-brand-green-ink" href="#/account" aria-current="page"><UserRound className="h-5 w-5" />Me</a>
      </nav>
    </div>
  );
}

export function AccountOrdersPage() {
  const { status, profile, signOut } = useCustomerAuth();
  const { openAuth } = useCart();
  const { products } = useContent();
  const [orders, setOrders] = useState<Order[] | null>(null);
  const [ordersError, setOrdersError] = useState<string | null>(null);
  const [rewards, setRewards] = useState<AccountRewardsSnapshot | null>(null);
  const [rewardsError, setRewardsError] = useState<string | null>(null);
  const [orderFilter, setOrderFilter] = useState<OrderFilter>("all");
  const [reviewingOrder, setReviewingOrder] = useState<Order | null>(null);
  const [reviewNotice, setReviewNotice] = useState<string | null>(null);
  const [reviewBusy, setReviewBusy] = useState(false);
  const [returns, setReturns] = useState<CustomerReturn[]>([]);
  const [returningOrder, setReturningOrder] = useState<Order | null>(null);
  const [returnNotice, setReturnNotice] = useState<string | null>(null);
  const [returnBusy, setReturnBusy] = useState(false);

  useEffect(() => {
    if (!profile) return;
    let active = true;
    setOrders(null);
    setOrdersError(null);
    void fetchCustomerOrders(profile.email).then((nextOrders) => {
      if (active) setOrders(nextOrders);
    }).catch((error) => {
      if (active) setOrdersError(error instanceof Error ? error.message : "Your orders could not be loaded.");
    });
    return () => {
      active = false;
    };
  }, [profile]);

  const productById = useMemo(() => new Map(products.map((product) => [product.id, product])), [products]);
  const visibleOrders = useMemo(() => {
    const filtered = (orders ?? []).filter((order) => matchesOrder(order, orderFilter));
    return orderFilter === "returns" ? sortReceivedOrders(filtered) : filtered;
  }, [orders, orderFilter]);
  const eligibleReturnOrder = useMemo(() => visibleOrders.find((order) => {
    const orderReturns = returns.filter((item) => item.orderId === order.id);
    return returnEligibility(order, new Date(), orderReturns).eligible && remainingReturnableItems(order, orderReturns).length > 0;
  }) ?? null, [returns, visibleOrders]);
  const reviewedOrderIds = useMemo(() => new Set((rewards?.reviews ?? []).map((review) => review.orderId)), [rewards]);
  const rewardPoints = rewards?.settings.reviewRewardPoints ?? defaultRewardSettings.reviewRewardPoints;

  useEffect(() => {
    if (!profile) return;
    setRewards(null);
    setRewardsError(null);
    void fetchAccountRewards(profile.email).then(setRewards).catch((error) => setRewardsError(error instanceof Error ? error.message : "Your rewards could not be loaded."));
  }, [profile]);

  useEffect(() => {
    if (!profile) return;
    void fetchCustomerReturns(profile.email).then(setReturns).catch((error) => setReturnNotice(error instanceof Error ? error.message : "Your return requests could not be loaded."));
  }, [profile]);

  useEffect(() => {
    const syncReturnSection = () => {
      if (!window.location.hash.startsWith("#/account/orders") || !window.location.hash.includes("section=returns")) return;
      setOrderFilter("returns");
      setReviewingOrder(null);
      setReturningOrder(null);
      requestAnimationFrame(() => document.getElementById("return-center")?.scrollIntoView({ behavior: "smooth", block: "start" }));
    };
    window.addEventListener("hashchange", syncReturnSection);
    syncReturnSection();
    return () => window.removeEventListener("hashchange", syncReturnSection);
  }, []);

  function focusSection(id: string) {
    requestAnimationFrame(() => document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" }));
  }

  function openReview(order: Order) {
    setOrderFilter("review");
    setReviewingOrder(order);
    setReviewNotice(null);
    focusSection("review-center");
  }

  function chooseReviewFilter() {
    const nextOrder = (orders ?? []).find((order) => matchesOrder(order, "review") && !reviewedOrderIds.has(order.id));
    setOrderFilter("review");
    setReviewingOrder(nextOrder ?? null);
    setReviewNotice(null);
    focusSection("review-center");
  }

  function openReturn(order: Order) {
    setOrderFilter("returns");
    setReturningOrder(order);
    setReturnNotice(null);
    focusSection("return-center");
  }

  async function submitReturn(input: ReturnRequestInput) {
    if (!profile || returnBusy) return;
    setReturnBusy(true);
    setReturnNotice(null);
    try {
      const nextReturn = await requestCustomerReturn(profile.email, input);
      setReturns((current) => [nextReturn, ...current]);
      setReturningOrder(null);
      setReturnNotice("Your return request was sent. We’ll review the refund and update you here.");
    } catch (error) {
      setReturnNotice(error instanceof Error ? error.message : "Your return request could not be submitted.");
    } finally {
      setReturnBusy(false);
    }
  }

  async function submitReview(order: Order, rating: number, comment: string) {
    if (!profile || reviewedOrderIds.has(order.id) || reviewBusy) return;
    setReviewBusy(true);
    setReviewNotice(null);
    try {
      const result = await submitCustomerReview(profile.email, order.id, rating, comment);
      setRewards(result.snapshot);
      setReviewingOrder(null);
      setReviewNotice(`Thanks for sharing! ${result.review.pointsAwarded} points were added to your account.`);
    } catch (error) {
      setReviewNotice(error instanceof Error ? error.message : "Your review could not be submitted.");
    } finally {
      setReviewBusy(false);
    }
  }

  if (status === "bootstrapping") {
    return <section className="mx-auto grid min-h-[60vh] max-w-180 place-content-center justify-items-center gap-3 px-4 py-16 text-center"><Sparkles className="h-9 w-9 text-brand-orange-ink" /><p className="font-semibold text-brand-black/68">Checking your Zama account...</p></section>;
  }

  if (status !== "signed-in" || !profile) {
    return <section className="mx-auto grid min-h-[65vh] w-full max-w-180 place-content-center gap-5 px-4 py-16 text-center sm:px-6"><div className="mx-auto grid h-20 w-20 place-items-center rounded-full border-3 border-brand-forest bg-brand-yellow text-brand-green-ink shadow-brand-soft"><UserRound className="h-9 w-9" /></div><div className="grid gap-2"><span className="text-xs font-bold uppercase tracking-[0.12em] text-brand-orange-ink">Your Zama orders</span><h1 className="font-primary text-[clamp(2rem,5vw,3.2rem)] font-bold leading-none text-brand-green-ink">Sign in to see your order history.</h1><p className="text-[1.05rem] leading-relaxed text-brand-black/68">Your orders, delivery updates, and review rewards are waiting in your account.</p></div><div><button className={btnPrimarySm} type="button" onClick={openAuth}>Create an account or sign in</button></div></section>;
  }

  return (
    <div className="mx-auto grid w-full max-w-[90rem] gap-5 px-4 pb-12 pt-6 sm:px-6 lg:px-10">
      <div className="flex flex-wrap items-center justify-between gap-3"><a className="inline-flex min-h-10 items-center gap-1 font-bold text-brand-green-ink underline decoration-dashed underline-offset-4 hover:text-brand-forest" href="#/account">← Back to account</a><button className={btnOutlineSm} type="button" onClick={() => void signOut()}>Sign out</button></div>

      <section className="relative overflow-hidden rounded-[28px_20px_32px_24px/22px_32px_20px_28px] border-3 border-brand-forest bg-brand-yellow p-5 shadow-brand-big sm:p-7" aria-labelledby="all-orders-title">
        <div className="pointer-events-none absolute -right-8 -top-12 h-40 w-40 rounded-full border-[18px] border-brand-orange/25" />
        <div className="relative grid gap-2"><span className="text-xs font-bold uppercase tracking-[0.12em] text-brand-orange-ink">Your order journey</span><h1 id="all-orders-title" className="font-primary text-[clamp(2rem,5vw,3.2rem)] font-bold leading-none text-brand-forest">All orders</h1><p className="max-w-160 text-sm leading-relaxed text-brand-forest/75">A complete history of everything you’ve ordered from Zama, with delivery and payment details in one place.</p></div>
      </section>

      <section id="all-orders" className="grid gap-4 rounded-wobbly-card border-3 border-brand-forest bg-brand-white p-5 shadow-brand-soft" aria-labelledby="order-history-title">
        <div className="flex flex-wrap items-end justify-between gap-3"><div className="grid gap-1"><span className="text-xs font-bold uppercase tracking-[0.1em] text-brand-orange-ink">Order history</span><h2 id="order-history-title" className="font-primary text-2xl font-bold text-brand-green-ink">{orderFilter === "all" ? "Every order" : orderFilterLabels.find((item) => item.key === orderFilter)?.label ?? "Orders"}</h2></div><span className="text-sm text-brand-black/56">{orders ? `${visibleOrders.length} order${visibleOrders.length === 1 ? "" : "s"}` : "Loading..."}</span></div>
        <div className="flex gap-2 overflow-x-auto pb-1" role="tablist" aria-label="Order filters">
          <button className={`shrink-0 rounded-full border-2 px-4 py-2 text-sm font-bold ${orderFilter === "all" ? "border-brand-forest bg-brand-forest text-brand-white" : "border-brand-forest/20 bg-brand-warm-white text-brand-green-ink hover:bg-brand-yellow"}`} type="button" role="tab" aria-selected={orderFilter === "all"} onClick={() => { setOrderFilter("all"); setReviewingOrder(null); setReviewNotice(null); }}>All orders</button>
          {orderFilterLabels.map((item) => { const Icon = item.icon; const count = orders ? item.key === "review" ? orders.filter((order) => matchesOrder(order, item.key) && !reviewedOrderIds.has(order.id)).length : orders.filter((order) => matchesOrder(order, item.key)).length : "…"; return <button className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border-2 px-4 py-2 text-sm font-bold ${orderFilter === item.key ? "border-brand-forest bg-brand-forest text-brand-white" : "border-brand-forest/20 bg-brand-warm-white text-brand-green-ink hover:bg-brand-yellow"}`} key={item.key} type="button" role="tab" aria-selected={orderFilter === item.key} onClick={() => { if (item.key === "review") { chooseReviewFilter(); return; } setOrderFilter(item.key); setReviewingOrder(null); setReturningOrder(null); setReviewNotice(null); setReturnNotice(null); if (item.key === "returns") focusSection("return-center"); }}><Icon className="h-4 w-4" />{item.label}<span className="opacity-70">{count}</span></button>; })}
        </div>

        {rewardsError ? <p className="rounded-wobbly-md border-2 border-dashed border-brand-orange bg-brand-orange/10 p-3 text-sm font-semibold text-brand-black" role="alert">{rewardsError}</p> : null}
        {orderFilter === "review" ? <div id="review-center" className="grid gap-3 rounded-wobbly-md border-2 border-brand-orange bg-brand-yellow/15 p-4"><div className="grid gap-1"><span className="text-xs font-bold uppercase tracking-[0.1em] text-brand-orange-ink">Earn points</span><h3 className="font-primary text-xl font-bold text-brand-green-ink">Review your previous orders</h3><p className="text-sm text-brand-black/68">Choose a delivered order, leave a rating, and we’ll add {rewardPoints} points to your Zama account.</p></div>{reviewingOrder ? <ReviewForm order={reviewingOrder} rewardPoints={rewardPoints} busy={reviewBusy} onCancel={() => setReviewingOrder(null)} onSubmit={(rating, comment) => void submitReview(reviewingOrder, rating, comment)} /> : <p className="rounded-wobbly-md border-2 border-dashed border-brand-orange/70 bg-brand-white/65 p-3 text-sm text-brand-black/68">Select the “Review · +{rewardPoints} pts” button on a delivered order below to get started.</p>}{reviewNotice ? <p className="rounded-wobbly-md border-2 border-brand-forest bg-brand-mint p-3 text-sm font-bold text-brand-green-ink" role="status">{reviewNotice}</p> : null}</div> : null}
        {orderFilter === "returns" ? <ReturnCenter deliveredOrderCount={visibleOrders.length} eligibleOrder={eligibleReturnOrder} returningOrder={returningOrder} existingReturns={returningOrder ? returns.filter((item) => item.orderId === returningOrder.id) : []} busy={returnBusy} notice={returnNotice} onStart={() => { if (eligibleReturnOrder) openReturn(eligibleReturnOrder); }} onViewOrders={() => focusSection("return-orders")} onCancel={() => setReturningOrder(null)} onSubmit={(input) => void submitReturn(input)} /> : null}
        {ordersError ? <p className="rounded-wobbly-md border-2 border-dashed border-brand-orange bg-brand-orange/10 p-3 text-sm font-semibold text-brand-black" role="alert">{ordersError}</p> : null}
        {!orders ? <p className="rounded-wobbly-md border-2 border-dashed border-brand-forest/25 bg-brand-warm-white p-5 text-center text-sm text-brand-black/56">Loading your orders...</p> : orders.length === 0 ? <p className="rounded-wobbly-md border-2 border-dashed border-brand-forest/25 bg-brand-warm-white p-5 text-center text-sm text-brand-black/56">Your Zama orders will appear here after checkout. <a className="font-bold text-brand-green-ink underline" href="#/shop">Browse the market</a></p> : visibleOrders.length === 0 ? <p className="rounded-wobbly-md border-2 border-dashed border-brand-forest/25 bg-brand-warm-white p-5 text-center text-sm text-brand-black/56">No orders in this section yet.</p> : <div id="return-orders" className="grid gap-3">{visibleOrders.map((order) => { const orderReturns = returns.filter((item) => item.orderId === order.id); const eligibility = returnEligibility(order, new Date(), orderReturns); const activeRequest = orderReturns.find((item) => ["pending", "approved"].includes(item.status)); const latestRequest = orderReturns[0]; return <OrderCard key={order.id} order={order} productById={productById} detailed={orderFilter === "returns" || orderFilter === "review"} returnRequest={activeRequest} latestReturnRequest={latestRequest} returnIsEligible={eligibility.eligible} returnWindowClosed={eligibility.reason === "window_closed"} rewardPoints={rewardPoints} reviewed={reviewedOrderIds.has(order.id)} onReview={() => openReview(order)} onReturn={orderFilter === "returns" ? () => openReturn(order) : undefined} />; })}</div>}
      </section>
    </div>
  );
}

function ShieldIcon(props: { className?: string }) {
  return <svg className={props.className} viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M12 3 20 6v5.5c0 4.8-3.3 8.2-8 9.5-4.7-1.3-8-4.7-8-9.5V6l8-3Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" /><path d="m8.5 12 2.2 2.2 4.8-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>;
}

export function AccountPage() {
  const { status, profile } = useCustomerAuth();
  const { openAuth } = useCart();

  if (status === "bootstrapping") {
    return <section className="mx-auto grid min-h-[60vh] max-w-180 place-content-center justify-items-center gap-3 px-4 py-16 text-center"><Sparkles className="h-9 w-9 text-brand-orange-ink" /><p className="font-semibold text-brand-black/68">Checking your Zama account...</p></section>;
  }

  if (status !== "signed-in" || !profile) {
    return (
      <section className="mx-auto grid min-h-[65vh] w-full max-w-180 place-content-center gap-5 px-4 py-16 text-center sm:px-6">
        <div className="mx-auto grid h-20 w-20 place-items-center rounded-full border-3 border-brand-forest bg-brand-yellow text-brand-green-ink shadow-brand-soft"><UserRound className="h-9 w-9" /></div>
        <div className="grid gap-2"><span className="text-xs font-bold uppercase tracking-[0.12em] text-brand-orange-ink">Your Zama account</span><h1 className="font-primary text-[clamp(2rem,5vw,3.2rem)] font-bold leading-none text-brand-green-ink">Your fresh market, all in one place.</h1><p className="text-[1.05rem] leading-relaxed text-brand-black/68">Create an account to keep orders, delivery details, saved products, and future rewards together.</p></div>
        <div><button className={btnPrimarySm} type="button" onClick={openAuth}>Create an account or sign in</button></div>
      </section>
    );
  }

  return <AccountDashboard profile={profile} />;
}
