import { describe, expect, it } from "vitest";
import { chooseBestDiscount, deliveryPaymentDueAt, isMemberEarlyAccessWindow, membershipDiscount, nextDeliveryDate, nextRenewalDate, statusFromMembership } from "./membership-rules";

describe("membership rules", () => {
  it("calculates a safe percentage discount", () => {
    expect(membershipDiscount(1250, 10)).toBe(125);
    expect(membershipDiscount(1250, 120)).toBe(1250);
    expect(membershipDiscount(-10, 10)).toBe(0);
  });

  it("uses the larger member or coupon discount without stacking", () => {
    expect(chooseBestDiscount(100, 80)).toEqual({ memberDiscount: 100, couponDiscount: 0, totalDiscount: 100 });
    expect(chooseBestDiscount(100, 180)).toEqual({ memberDiscount: 0, couponDiscount: 180, totalDiscount: 180 });
  });

  it("derives membership status from the current subscription or request", () => {
    expect(statusFromMembership({ status: "active" } as never, null)).toBe("active");
    expect(statusFromMembership(null, { status: "pending" } as never)).toBe("pending");
    expect(statusFromMembership(null, null)).toBe("none");
  });

  it("calculates the next renewal for recurring plans", () => {
    expect(nextRenewalDate("2026-03-01T00:00:00.000Z", "monthly")).toBe("2026-04-01T00:00:00.000Z");
    expect(nextRenewalDate("2026-03-01T00:00:00.000Z", "annual")).toBe("2027-03-01T00:00:00.000Z");
    expect(nextRenewalDate("2026-03-01T00:00:00.000Z", "one_time")).toBeNull();
  });

  it("sets saved-box cadence and the Bhutan-time payment cutoff", () => {
    expect(nextDeliveryDate("2026-09-07", "weekly")).toBe("2026-09-14");
    expect(nextDeliveryDate("2026-09-07", "fortnightly")).toBe("2026-09-21");
    expect(nextDeliveryDate("2026-09-07", "monthly")).toBe("2026-10-05");
    expect(deliveryPaymentDueAt("2026-09-10")).toBe("2026-09-09T12:00:00.000Z");
  });

  it("allows a product only during its member early-access window", () => {
    const product = {
      memberEarlyAccessStartsAt: "2026-09-10T04:00:00.000Z",
      memberEarlyAccessEndsAt: "2026-09-10T10:00:00.000Z",
    };
    expect(isMemberEarlyAccessWindow(product, new Date("2026-09-10T06:00:00.000Z"))).toBe(true);
    expect(isMemberEarlyAccessWindow(product, new Date("2026-09-10T10:00:00.000Z"))).toBe(false);
  });
});
