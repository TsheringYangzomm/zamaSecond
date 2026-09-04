import { describe, expect, it, vi } from "vitest";

const fakeClient = vi.hoisted(() => ({
  from: () => ({
    select: () => ({
      limit: () => ({ error: { message: "relation does not exist" } }),
      order: () => ({ data: null, error: { message: "relation does not exist" } }),
    }),
  }),
}));

vi.mock("../supabase", () => ({
  getSupabaseClient: () => fakeClient,
}));

import { commerceStore } from "./commerce-api";
import { commerceDevData } from "../data/commerce-dev";
import { formatMoney, humanizeStatus, stockLevel } from "../pages/admin/commerce-shared";

describe("commerce dev data", () => {
  it("keeps order totals consistent with their items", () => {
    for (const order of commerceDevData.orders) {
      const itemTotal = order.items.reduce((sum, item) => sum + item.price * item.quantity, 0);
      expect(order.total).toBe(itemTotal);
    }
  });

  it("references existing customers everywhere", () => {
    const customerIds = new Set(commerceDevData.customers.map((customer) => customer.id));
    for (const order of commerceDevData.orders) expect(customerIds.has(order.customer_id)).toBe(true);
    for (const subscription of commerceDevData.subscriptions) expect(customerIds.has(subscription.customer_id)).toBe(true);
    for (const delivery of commerceDevData.deliveries) expect(customerIds.has(delivery.customer_id)).toBe(true);
    for (const payment of commerceDevData.payments) expect(customerIds.has(payment.customer_id)).toBe(true);
  });

  it("references existing orders in deliveries and payments", () => {
    const orderIds = new Set(commerceDevData.orders.map((order) => order.id));
    for (const delivery of commerceDevData.deliveries) expect(orderIds.has(delivery.order_id)).toBe(true);
    for (const payment of commerceDevData.payments) expect(orderIds.has(payment.order_id)).toBe(true);
  });

  it("uses only declared status values", () => {
    const orderStatuses = new Set(["pending", "confirmed", "preparing", "out_for_delivery", "delivered", "cancelled"]);
    const paymentStatuses = new Set(["paid", "pending", "failed", "refunded"]);
    const subscriptionStatuses = new Set(["active", "paused", "cancelled"]);
    const deliveryStatuses = new Set(["preparing", "out_for_delivery", "delivered", "failed", "cancelled"]);

    for (const order of commerceDevData.orders) {
      expect(orderStatuses.has(order.status)).toBe(true);
      expect(paymentStatuses.has(order.payment_status)).toBe(true);
    }
    for (const payment of commerceDevData.payments) expect(paymentStatuses.has(payment.status)).toBe(true);
    for (const subscription of commerceDevData.subscriptions) expect(subscriptionStatuses.has(subscription.status)).toBe(true);
    for (const delivery of commerceDevData.deliveries) expect(deliveryStatuses.has(delivery.status)).toBe(true);
  });
});

describe("commerce store (dev mode)", () => {
  it("falls back to dev data when the commerce tables are missing", async () => {
    await commerceStore.load(true);
    const state = commerceStore.getSnapshot();
    expect(state.phase).toBe("ready");
    if (state.phase === "ready") {
      expect(state.mode).toBe("dev");
      expect(state.writable).toBe(false);
      expect(state.data.orders.length).toBeGreaterThan(0);
    }
  });

  it("applies status changes in memory and appends history", async () => {
    await commerceStore.load(true);
    const before = commerceStore.getSnapshot();
    if (before.phase !== "ready") throw new Error("expected ready state");
    const original = before.data.orders.find((order) => order.id === "ZAM-2026-0142");
    if (!original) throw new Error("missing test order");
    expect(original.status).toBe("delivered");

    await commerceStore.updateOrderStatus("ZAM-2026-0142", "confirmed");
    const after = commerceStore.getSnapshot();
    if (after.phase !== "ready") throw new Error("expected ready state");
    const updated = after.data.orders.find((order) => order.id === "ZAM-2026-0142");
    expect(updated?.status).toBe("confirmed");
    expect(updated?.history.length).toBe(original.history.length + 1);
  });

  it("syncs the linked order when a delivery status changes", async () => {
    await commerceStore.load(true);
    const before = commerceStore.getSnapshot();
    if (before.phase !== "ready") throw new Error("expected ready state");
    const delivery = before.data.deliveries.find((item) => item.id === "DEL-0001");
    if (!delivery) throw new Error("missing test delivery");
    expect(delivery.status).toBe("delivered");

    await commerceStore.updateDeliveryStatus("DEL-0001", "out_for_delivery", null);
    const after = commerceStore.getSnapshot();
    if (after.phase !== "ready") throw new Error("expected ready state");
    expect(after.data.deliveries.find((item) => item.id === "DEL-0001")?.status).toBe("out_for_delivery");
    const linkedOrder = after.data.orders.find((order) => order.id === delivery.order_id);
    expect(linkedOrder?.status).toBe("out_for_delivery");
  });

  it("syncs the linked delivery when an order status changes", async () => {
    await commerceStore.load(true);
    const before = commerceStore.getSnapshot();
    if (before.phase !== "ready") throw new Error("expected ready state");
    const order = before.data.orders.find((item) => item.id === "ZAM-2026-0143");
    if (!order) throw new Error("missing test order");

    await commerceStore.updateOrderStatus("ZAM-2026-0143", "delivered");
    const after = commerceStore.getSnapshot();
    if (after.phase !== "ready") throw new Error("expected ready state");
    expect(after.data.orders.find((item) => item.id === "ZAM-2026-0143")?.status).toBe("delivered");
    const linkedDelivery = after.data.deliveries.find((item) => item.order_id === "ZAM-2026-0143");
    expect(linkedDelivery?.status).toBe("delivered");
  });

  it("does not sync a delivery when an order moves to a pending-only status", async () => {
    await commerceStore.load(true);
    const before = commerceStore.getSnapshot();
    if (before.phase !== "ready") throw new Error("expected ready state");
    const deliveryBefore = before.data.deliveries.find((item) => item.order_id === "ZAM-2026-0142");
    if (!deliveryBefore) throw new Error("missing test delivery");

    await commerceStore.updateOrderStatus("ZAM-2026-0142", "confirmed");
    const after = commerceStore.getSnapshot();
    if (after.phase !== "ready") throw new Error("expected ready state");
    const deliveryAfter = after.data.deliveries.find((item) => item.order_id === "ZAM-2026-0142");
    expect(deliveryAfter?.status).toBe(deliveryBefore.status);
  });
});

describe("commerce shared helpers", () => {
  it("formats money with Nu and thousands separators", () => {
    expect(formatMoney(1700)).toBe("Nu. 1,700");
    expect(formatMoney(0)).toBe("Nu. 0");
  });

  it("humanizes underscored status values", () => {
    expect(humanizeStatus("out_for_delivery")).toBe("Out For Delivery");
    expect(humanizeStatus("delivered")).toBe("Delivered");
  });

  it("classifies stock levels", () => {
    expect(stockLevel(0, 5)).toBe("out");
    expect(stockLevel(3, 5)).toBe("low");
    expect(stockLevel(6, 5)).toBe("in");
    expect(stockLevel(null, null)).toBe("untracked");
  });
});
