import type { Order } from "../admin/commerce-types";
import { addDays, localThimphuDateKey } from "../account-rewards/account-rewards-rules";
import type { CustomerReturn, ReturnEligibility, ReturnItemRequest } from "./returns-types";
import { deliveredAtForOrder } from "./returns-types";

const RETURN_WINDOW_DAYS = 2;

export function returnWindowEnd(deliveredAt: string): string {
  const deliveredDate = localThimphuDateKey(new Date(deliveredAt));
  const endDate = addDays(deliveredDate, RETURN_WINDOW_DAYS + 1);
  return `${endDate}T00:00:00+06:00`;
}

export function returnEligibility(order: Pick<Order, "status" | "history" | "delivered_at">, now = new Date(), returns: CustomerReturn[] = []): ReturnEligibility {
  if (order.status !== "delivered") {
    return { eligible: false, deliveredAt: null, windowEndsAt: null, reason: "not_delivered" };
  }
  const deliveredAt = deliveredAtForOrder(order);
  if (!deliveredAt) {
    return { eligible: false, deliveredAt: null, windowEndsAt: null, reason: "missing_delivery_time" };
  }
  const windowEndsAt = returnWindowEnd(deliveredAt);
  const hasActiveRequest = returns.some((item) => ["pending", "approved"].includes(item.status));
  if (hasActiveRequest) {
    return { eligible: false, deliveredAt, windowEndsAt, reason: "already_requested" };
  }
  return {
    eligible: now < new Date(windowEndsAt),
    deliveredAt,
    windowEndsAt,
    reason: now < new Date(windowEndsAt) ? "eligible" : "window_closed",
  };
}

export function sortReceivedOrders<T extends Pick<Order, "status" | "history" | "created_at" | "delivered_at">>(orders: T[]): T[] {
  return [...orders].sort((left, right) => {
    const leftDate = deliveredAtForOrder(left) ?? left.created_at;
    const rightDate = deliveredAtForOrder(right) ?? right.created_at;
    return rightDate.localeCompare(leftDate);
  });
}

export function remainingReturnableItems(order: Pick<Order, "items">, returns: CustomerReturn[]): ReturnItemRequest[] {
  const returned = new Map<string, number>();
  for (const request of returns) {
    if (["rejected", "cancelled"].includes(request.status)) continue;
    for (const item of request.items) returned.set(item.productId, (returned.get(item.productId) ?? 0) + item.quantity);
  }
  return order.items
    .map((item) => ({ productId: item.product_id, quantity: Math.max(0, item.quantity - (returned.get(item.product_id) ?? 0)) }))
    .filter((item) => item.quantity > 0);
}

export function isReturnQuantityValid(order: Pick<Order, "items">, items: ReturnItemRequest[]): boolean {
  if (items.length === 0) return false;
  const available = new Map(order.items.map((item) => [item.product_id, item.quantity]));
  const requested = new Map<string, number>();
  for (const item of items) {
    if (!Number.isInteger(item.quantity) || item.quantity <= 0) return false;
    requested.set(item.productId, (requested.get(item.productId) ?? 0) + item.quantity);
  }
  return [...requested].every(([productId, quantity]) => quantity <= (available.get(productId) ?? 0));
}
