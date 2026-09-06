import type { Coupon, CouponErrorCode, CouponLine, CouponPreview } from "./coupon-types";

export type CouponUsage = {
  totalRedemptions?: number;
  customerRedemptions?: number;
};

export const couponErrorMessages: Record<CouponErrorCode, string> = {
  not_found: "That coupon code could not be found.",
  inactive: "That coupon is no longer active.",
  not_started: "That coupon is not available yet.",
  expired: "That coupon has expired.",
  usage_limit: "That coupon has reached its usage limit.",
  customer_limit: "You have already used that coupon the maximum number of times.",
  ineligible: "This coupon does not apply to the items in your order.",
  minimum_spend: "Your eligible items do not meet the minimum spend for this coupon.",
  not_authenticated: "Sign in to use coupons.",
  customer_not_found: "Your customer account could not be found.",
  invalid: "That coupon cannot be applied.",
};

function roundMoney(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export function couponIsWithinWindow(coupon: Coupon, now = new Date()): CouponErrorCode | null {
  if (!coupon.active) return "inactive";
  const start = new Date(coupon.startsAt);
  if (!Number.isNaN(start.getTime()) && now < start) return "not_started";
  if (coupon.expiresAt) {
    const expiry = new Date(coupon.expiresAt);
    if (!Number.isNaN(expiry.getTime()) && now >= expiry) return "expired";
  }
  return null;
}

export function isCouponLineEligible(coupon: Coupon, line: CouponLine): boolean {
  return coupon.targets.some((target) =>
    target.type === "product"
      ? target.value === line.productId
      : Boolean(line.category) && target.value === line.category,
  );
}

export function calculateCouponPreview(
  coupon: Coupon | null,
  lines: CouponLine[],
  usage: CouponUsage = {},
  now = new Date(),
  code = coupon?.code ?? "",
): CouponPreview {
  const subtotal = roundMoney(lines.reduce((sum, line) => sum + Math.max(0, line.unitPrice) * Math.max(0, line.quantity), 0));
  if (!coupon) {
    return { ok: false, code, eligibleSubtotal: 0, discountAmount: 0, finalTotal: subtotal, coupon: null, errorCode: "not_found", error: couponErrorMessages.not_found };
  }

  const windowError = couponIsWithinWindow(coupon, now);
  if (windowError) {
    return { ok: false, code: coupon.code, eligibleSubtotal: 0, discountAmount: 0, finalTotal: subtotal, coupon, errorCode: windowError, error: couponErrorMessages[windowError] };
  }
  if (coupon.usageLimit !== null && (usage.totalRedemptions ?? 0) >= coupon.usageLimit) {
    return { ok: false, code: coupon.code, eligibleSubtotal: 0, discountAmount: 0, finalTotal: subtotal, coupon, errorCode: "usage_limit", error: couponErrorMessages.usage_limit };
  }
  if ((usage.customerRedemptions ?? 0) >= coupon.perCustomerLimit) {
    return { ok: false, code: coupon.code, eligibleSubtotal: 0, discountAmount: 0, finalTotal: subtotal, coupon, errorCode: "customer_limit", error: couponErrorMessages.customer_limit };
  }

  const eligibleSubtotal = roundMoney(
    lines
      .filter((line) => isCouponLineEligible(coupon, line))
      .reduce((sum, line) => sum + Math.max(0, line.unitPrice) * Math.max(0, line.quantity), 0),
  );
  if (eligibleSubtotal <= 0) {
    return { ok: false, code: coupon.code, eligibleSubtotal, discountAmount: 0, finalTotal: subtotal, coupon, errorCode: "ineligible", error: couponErrorMessages.ineligible };
  }
  if (eligibleSubtotal < coupon.minimumOrderAmount) {
    return { ok: false, code: coupon.code, eligibleSubtotal, discountAmount: 0, finalTotal: subtotal, coupon, errorCode: "minimum_spend", error: couponErrorMessages.minimum_spend };
  }

  const rawDiscount = coupon.discountType === "percentage"
    ? eligibleSubtotal * coupon.discountValue / 100
    : coupon.discountValue;
  const cappedDiscount = coupon.maximumDiscountAmount == null
    ? rawDiscount
    : Math.min(rawDiscount, coupon.maximumDiscountAmount);
  const discountAmount = roundMoney(Math.min(eligibleSubtotal, Math.max(0, cappedDiscount)));
  return {
    ok: true,
    code: coupon.code,
    eligibleSubtotal,
    discountAmount,
    finalTotal: roundMoney(Math.max(0, subtotal - discountAmount)),
    coupon,
  };
}
