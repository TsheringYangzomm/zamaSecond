import { describe, expect, it } from "vitest";
import { returnEligibility, returnWindowEnd, remainingReturnableItems, sortReceivedOrders, isReturnQuantityValid } from "./returns-rules";
import type { CustomerReturn } from "./returns-types";
import type { Order } from "../admin/commerce-types";

function order(id: string, deliveredAt: string | null, createdAt = "2026-09-01T08:00:00.000Z"): Order {
  return {
    id,
    customer_id: "customer-1",
    status: "delivered",
    items: [{ product_id: "product-1", name: "Pantry box", quantity: 2, price: 100 }],
    total: 200,
    payment_status: "paid",
    payment_method: "Card",
    payment_reference: null,
    delivery_date: deliveredAt,
    delivered_at: deliveredAt,
    delivery_area: "Thimphu",
    notes: "",
    created_at: createdAt,
    history: deliveredAt ? [{ status: "delivered", at: deliveredAt }] : [],
  };
}

function customerReturn(quantity: number, status: CustomerReturn["status"] = "pending"): CustomerReturn {
  return {
    id: "return-1",
    customerId: "customer-1",
    orderId: "order-1",
    status,
    reason: "damaged",
    note: "",
    items: [{ productId: "product-1", name: "Pantry box", unitPrice: 100, quantity }],
    refundAmount: quantity * 100,
    refundMethod: "Original Card",
    pickupWindowStart: null,
    pickupWindowEnd: null,
    rejectionReason: null,
    requestedAt: "2026-09-02T08:00:00.000Z",
    reviewedAt: null,
    reviewedBy: null,
    updatedAt: "2026-09-02T08:00:00.000Z",
  };
}

describe("return rules", () => {
  it("keeps the return window open through the second Thimphu calendar day", () => {
    const deliveredAt = "2026-09-05T17:30:00.000Z";
    expect(returnWindowEnd(deliveredAt)).toBe("2026-09-08T00:00:00+06:00");
    expect(returnEligibility(order("order-1", deliveredAt), new Date("2026-09-07T17:59:59.000Z")).eligible).toBe(true);
    expect(returnEligibility(order("order-1", deliveredAt), new Date("2026-09-07T18:00:00.000Z")).reason).toBe("window_closed");
  });

  it("sorts delivered orders newest first and falls back to creation time", () => {
    const items = [order("old", "2026-09-02T02:00:00.000Z"), order("new", "2026-09-04T02:00:00.000Z"), order("fallback", null, "2026-09-06T02:00:00.000Z")];
    expect(sortReceivedOrders(items).map((item) => item.id)).toEqual(["fallback", "new", "old"]);
  });

  it("subtracts only active return quantities", () => {
    const source = order("order-1", "2026-09-05T02:00:00.000Z");
    expect(remainingReturnableItems(source, [customerReturn(1)])).toEqual([{ productId: "product-1", quantity: 1 }]);
    expect(remainingReturnableItems(source, [customerReturn(2, "rejected")])).toEqual([{ productId: "product-1", quantity: 2 }]);
    expect(isReturnQuantityValid(source, [{ productId: "product-1", quantity: 2 }])).toBe(true);
    expect(isReturnQuantityValid(source, [{ productId: "product-1", quantity: 3 }])).toBe(false);
  });
});
