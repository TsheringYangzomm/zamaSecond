import type { MembershipDeliveryCadence, MembershipDeliveryTier, MembershipPlan, MembershipSnapshot, MembershipSubscription, MembershipRequest } from "./membership-types";

export const defaultMembershipDeliveryTiers: MembershipDeliveryTier[] = [
  { id: "standard", label: "Standard delivery", description: "Reliable delivery on the scheduled date.", fee: 60, enabled: true },
  { id: "low_cost", label: "Low-cost delivery", description: "A lower-cost route when timing is flexible.", fee: 30, enabled: true },
  { id: "priority", label: "Priority delivery", description: "First available fulfillment for your scheduled box.", fee: 0, enabled: true },
];

export function cadenceLabel(cadence: MembershipPlan["cadence"]): string {
  if (cadence === "annual") return "per year";
  if (cadence === "one_time") return "one-time";
  return "per month";
}

export function statusFromMembership(subscription: MembershipSubscription | null, request: MembershipRequest | null): MembershipSnapshot["status"] {
  if (subscription?.status === "active") return "active";
  if (subscription?.status === "paused") return "paused";
  if (subscription?.status === "cancelled") return "cancelled";
  if (request?.status === "pending") return "pending";
  if (request?.status === "rejected") return "rejected";
  if (request?.status === "cancelled") return "cancelled";
  return "none";
}

export function membershipDiscount(subtotal: number, discountPercent: number): number {
  const safeSubtotal = Math.max(0, Number.isFinite(subtotal) ? subtotal : 0);
  const safePercent = Math.max(0, Math.min(100, Number.isFinite(discountPercent) ? discountPercent : 0));
  return Math.min(safeSubtotal, Math.round(safeSubtotal * safePercent) / 100);
}

export function chooseBestDiscount(memberDiscount: number, couponDiscount: number): { memberDiscount: number; couponDiscount: number; totalDiscount: number } {
  const member = Math.max(0, memberDiscount);
  const coupon = Math.max(0, couponDiscount);
  return member >= coupon
    ? { memberDiscount: member, couponDiscount: 0, totalDiscount: member }
    : { memberDiscount: 0, couponDiscount: coupon, totalDiscount: coupon };
}

export function nextRenewalDate(startDate: string, cadence: MembershipPlan["cadence"]): string | null {
  if (cadence === "one_time") return null;
  const date = new Date(startDate);
  if (Number.isNaN(date.getTime())) return null;
  date.setUTCMonth(date.getUTCMonth() + (cadence === "annual" ? 12 : 1));
  return date.toISOString();
}

export function deliveryCadenceLabel(cadence: MembershipDeliveryCadence): string {
  if (cadence === "fortnightly") return "Every 2 weeks";
  if (cadence === "monthly") return "Every month";
  return "Every week";
}

export function nextDeliveryDate(startDate: string, cadence: MembershipDeliveryCadence): string {
  const date = new Date(`${startDate}T12:00:00+06:00`);
  if (Number.isNaN(date.getTime())) return startDate;
  date.setUTCDate(date.getUTCDate() + (cadence === "weekly" ? 7 : cadence === "fortnightly" ? 14 : 28));
  return date.toISOString().slice(0, 10);
}

export function deliveryPaymentDueAt(deliveryDate: string): string {
  const date = new Date(`${deliveryDate}T18:00:00+06:00`);
  if (Number.isNaN(date.getTime())) return `${deliveryDate}T12:00:00.000Z`;
  date.setUTCDate(date.getUTCDate() - 1);
  return date.toISOString();
}

export function isMemberEarlyAccessWindow(
  product: { memberEarlyAccessStartsAt?: string | null; memberEarlyAccessEndsAt?: string | null },
  at = new Date(),
): boolean {
  const starts = product.memberEarlyAccessStartsAt ? new Date(product.memberEarlyAccessStartsAt).getTime() : Number.NaN;
  const ends = product.memberEarlyAccessEndsAt ? new Date(product.memberEarlyAccessEndsAt).getTime() : Number.NaN;
  const timestamp = at.getTime();
  return Number.isFinite(starts) && Number.isFinite(ends) && starts <= timestamp && timestamp < ends;
}
