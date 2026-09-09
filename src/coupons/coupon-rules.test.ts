import { describe, expect, it } from "vitest";
import { calculateCouponPreview } from "./coupon-rules";
import type { Coupon } from "./coupon-types";

const baseCoupon: Coupon = {
  id: "coupon-test",
  code: "TEST10",
  title: "Test offer",
  description: "",
  discountType: "percentage",
  discountValue: 10,
  maximumDiscountAmount: null,
  minimumOrderAmount: 0,
  startsAt: "2026-01-01T00:00:00.000Z",
  expiresAt: "2027-01-01T00:00:00.000Z",
  usageLimit: null,
  perCustomerLimit: 1,
  active: true,
  targets: [{ type: "category", value: "Fresh boxes" }],
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
};

const lines = [
  { productId: "veg-box", category: "Fresh boxes", quantity: 2, unitPrice: 400 },
  { productId: "pantry", category: "Groceries", quantity: 1, unitPrice: 600 },
];

describe("coupon rules", () => {
  const now = new Date("2026-06-01T00:00:00.000Z");

  it("discounts only eligible product/category lines", () => {
    const result = calculateCouponPreview(baseCoupon, lines, {}, now);
    expect(result.ok).toBe(true);
    expect(result.eligibleSubtotal).toBe(800);
    expect(result.discountAmount).toBe(80);
    expect(result.finalTotal).toBe(1320);
  });

  it("supports fixed discounts and caps percentage discounts", () => {
    const fixed = calculateCouponPreview({ ...baseCoupon, discountType: "fixed", discountValue: 250 }, lines, {}, now);
    expect(fixed.discountAmount).toBe(250);

    const capped = calculateCouponPreview({ ...baseCoupon, maximumDiscountAmount: 50 }, lines, {}, now);
    expect(capped.discountAmount).toBe(50);
  });

  it("rejects expiry, minimum spend, usage, and customer-limit failures", () => {
    expect(calculateCouponPreview({ ...baseCoupon, expiresAt: "2026-05-31T00:00:00.000Z" }, lines, {}, now).errorCode).toBe("expired");
    expect(calculateCouponPreview({ ...baseCoupon, minimumOrderAmount: 801 }, lines, {}, now).errorCode).toBe("minimum_spend");
    expect(calculateCouponPreview({ ...baseCoupon, usageLimit: 2 }, lines, { totalRedemptions: 2 }, now).errorCode).toBe("usage_limit");
    expect(calculateCouponPreview(baseCoupon, lines, { customerRedemptions: 1 }, now).errorCode).toBe("customer_limit");
  });

  it("supports exact product targets and reports ineligible baskets", () => {
    const targeted = { ...baseCoupon, targets: [{ type: "product" as const, value: "pantry" }] };
    expect(calculateCouponPreview(targeted, lines, {}, now).eligibleSubtotal).toBe(600);
    expect(calculateCouponPreview(targeted, [{ ...lines[0], category: "Other" }], {}, now).errorCode).toBe("ineligible");
  });
});
