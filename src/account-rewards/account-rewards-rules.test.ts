import { describe, expect, it } from "vitest";
import { addDays, checkInStreak, isValidRedemption, maskAccountNumber, rewardForNextCheckIn, walletAmountForPoints, walletBalance } from "./account-rewards-rules";
import { defaultRewardSettings } from "./account-rewards-types";
import { checkoutPointsPreview, maximumCheckoutPoints } from "../checkout/checkout-points";

describe("account rewards rules", () => {
  it("calculates consecutive check-in streaks by business date", () => {
    const records = [{ checkInDate: "2026-09-03" }, { checkInDate: "2026-09-02" }, { checkInDate: "2026-09-01" }];
    expect(checkInStreak(records, "2026-09-03")).toBe(3);
    expect(checkInStreak(records, "2026-09-04")).toBe(3);
    expect(checkInStreak(records, "2026-09-06")).toBe(0);
    expect(addDays("2026-09-03", 1)).toBe("2026-09-04");
  });

  it("awards the next configured check-in amount", () => {
    const records = [{ checkInDate: "2026-09-03" }, { checkInDate: "2026-09-02" }];
    expect(rewardForNextCheckIn(records, defaultRewardSettings, "2026-09-04")).toBe(5);
  });

  it("converts and validates point redemptions", () => {
    expect(walletAmountForPoints(100, defaultRewardSettings)).toBe(10);
    expect(isValidRedemption(100, 100, defaultRewardSettings)).toBe(true);
    expect(isValidRedemption(99, 100, defaultRewardSettings)).toBe(false);
    expect(isValidRedemption(200, 100, defaultRewardSettings)).toBe(false);
  });

  it("allows any available points at checkout and preserves unused points", () => {
    expect(checkoutPointsPreview(100, 250, defaultRewardSettings, 25)).toMatchObject({ ok: true, discountAmount: 10, finalTotal: 15 });
    expect(checkoutPointsPreview(1, 250, defaultRewardSettings, 25)).toMatchObject({ ok: true, points: 1, discountAmount: 0.1, finalTotal: 24.9 });
    expect(checkoutPointsPreview(300, 300, defaultRewardSettings, 25)).toMatchObject({ ok: true, points: 250, discountAmount: 25, finalTotal: 0 });
    expect(checkoutPointsPreview(301, 300, defaultRewardSettings, 25).ok).toBe(false);
    expect(maximumCheckoutPoints(250, defaultRewardSettings, 25)).toBe(250);
  });

  it("calculates wallet holds and releases from the ledger", () => {
    expect(walletBalance([
      { type: "credit", amount: 20, status: "completed" },
      { type: "hold", amount: 8, status: "completed" },
      { type: "release", amount: 3, status: "completed" },
      { type: "withdrawal", amount: 5, status: "pending" },
    ])).toBe(15);
  });

  it("masks bank account numbers", () => {
    expect(maskAccountNumber("1234 5678")).toBe("•••• 5678");
    expect(maskAccountNumber("")).toBe("Not provided");
  });
});
