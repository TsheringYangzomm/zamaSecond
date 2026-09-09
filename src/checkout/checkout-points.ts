import type { RewardSettings } from "../account-rewards/account-rewards-types";

export type CheckoutPointsPreview = {
  ok: boolean;
  points: number;
  discountAmount: number;
  finalTotal: number;
  error?: string;
};

export function checkoutPointsPreview(points: number, balance: number, settings: RewardSettings, payableTotal: number): CheckoutPointsPreview {
  const normalizedPoints = Number.isFinite(points) ? Math.max(0, Math.floor(points)) : 0;
  const total = Math.max(0, payableTotal);
  if (normalizedPoints === 0) return { ok: true, points: 0, discountAmount: 0, finalTotal: total };
  if (normalizedPoints > Math.max(0, Math.floor(balance))) {
    return { ok: false, points: normalizedPoints, discountAmount: 0, finalTotal: total, error: "You cannot redeem more points than your available balance." };
  }
  if (settings.pointsPerNgultrum <= 0) {
    return { ok: false, points: normalizedPoints, discountAmount: 0, finalTotal: total, error: "Point redemption is not available right now." };
  }
  const maximumUsefulPoints = Math.max(0, Math.floor(total * settings.pointsPerNgultrum));
  const appliedPoints = Math.min(normalizedPoints, maximumUsefulPoints);
  const discountAmount = Math.min(total, Math.round((appliedPoints / settings.pointsPerNgultrum) * 100) / 100);
  return { ok: true, points: appliedPoints, discountAmount, finalTotal: Math.max(0, total - discountAmount) };
}

export function maximumCheckoutPoints(balance: number, settings: RewardSettings, payableTotal: number): number {
  void settings;
  void payableTotal;
  return Math.max(0, Math.floor(balance));
}
