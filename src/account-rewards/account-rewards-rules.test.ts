import { describe, expect, it } from "vitest";
import { addDays, checkInStreak, isValidRedemption, maskAccountNumber, rewardForNextCheckIn, walletAmountForPoints, walletBalance } from "./account-rewards-rules";
import { defaultRewardSettings } from "./account-rewards-types";

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
