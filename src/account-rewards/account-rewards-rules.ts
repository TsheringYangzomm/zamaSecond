import type { CheckInRecord, RewardSettings } from "./account-rewards-types";

export function localThimphuDateKey(date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Thimphu",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

export function addDays(dateKey: string, amount: number): string {
  const date = new Date(`${dateKey}T12:00:00+06:00`);
  date.setUTCDate(date.getUTCDate() + amount);
  return date.toISOString().slice(0, 10);
}

export function checkInStreak(records: Pick<CheckInRecord, "checkInDate">[], dateKey = localThimphuDateKey()): number {
  const dates = new Set(records.map((record) => record.checkInDate));
  let cursor = dateKey;
  if (!dates.has(cursor)) cursor = addDays(cursor, -1);
  let streak = 0;
  while (dates.has(cursor)) {
    streak += 1;
    cursor = addDays(cursor, -1);
  }
  return streak;
}

export function rewardForNextCheckIn(records: Pick<CheckInRecord, "checkInDate">[], settings: RewardSettings, dateKey = localThimphuDateKey()): number {
  const streak = checkInStreak(records, dateKey);
  const nextDay = Math.min(streak + 1, settings.dailyCheckInRewards.length);
  return settings.dailyCheckInRewards[Math.max(0, nextDay - 1)] ?? 0;
}

export function walletAmountForPoints(points: number, settings: RewardSettings): number {
  if (points <= 0 || settings.pointsPerNgultrum <= 0) return 0;
  return Math.floor(points / settings.pointsPerNgultrum);
}

export function isValidRedemption(points: number, balance: number, settings: RewardSettings): boolean {
  return Number.isInteger(points) && points >= settings.minimumRedemptionPoints && points <= balance && walletAmountForPoints(points, settings) > 0;
}

export function maskAccountNumber(accountNumber: string): string {
  const normalized = accountNumber.replace(/\s+/g, "");
  if (normalized.length <= 4) return normalized ? `•••• ${normalized}` : "Not provided";
  return `•••• ${normalized.slice(-4)}`;
}

export function walletBalance(entries: Pick<import("./account-rewards-types").WalletLedgerEntry, "type" | "amount" | "status">[]): number {
  return entries.reduce((balance, entry) => {
    if (entry.status !== "completed") return balance;
    if (entry.type === "credit" || entry.type === "release") return balance + entry.amount;
    return Math.max(0, balance - entry.amount);
  }, 0);
}
