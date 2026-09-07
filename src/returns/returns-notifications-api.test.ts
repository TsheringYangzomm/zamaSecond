import { beforeEach, describe, expect, it, vi } from "vitest";
vi.mock("../supabase", () => ({ getSupabaseClient: () => null }));
import { createDevCustomerNotification, createDevReturnNotification, fetchCustomerNotifications, markAllNotificationsRead, markNotificationRead, notificationForReturn } from "./returns-notifications-api";
import type { CustomerReturn } from "./returns-types";

const sampleReturn: CustomerReturn = {
  id: "return-1",
  customerId: "cus-customerexamplec",
  orderId: "ZAM-2026-5002",
  status: "approved",
  reason: "damaged",
  note: "The package was damaged.",
  items: [{ productId: "product-1", name: "Pantry box", unitPrice: 400, quantity: 1 }],
  refundAmount: 400,
  refundMethod: "Original COD",
  pickupWindowStart: "2026-09-12T04:00:00.000Z",
  pickupWindowEnd: "2026-09-12T06:00:00.000Z",
  rejectionReason: null,
  requestedAt: "2026-09-07T04:00:00.000Z",
  reviewedAt: "2026-09-07T05:00:00.000Z",
  reviewedBy: "admin@example.com",
  updatedAt: "2026-09-07T05:00:00.000Z",
};

describe("account return notifications", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("includes the pickup date and Bhutan time in an approval notification", () => {
    const notification = notificationForReturn(sampleReturn, "return_approved");
    expect(notification.title).toBe("Return approved");
    expect(notification.message).toContain("ZAM-2026-5002");
    expect(notification.message).toContain("Bhutan time");
  });

  it("persists development notifications and supports individual and bulk read state", async () => {
    createDevReturnNotification(sampleReturn, "return_approved");
    const submitted = { ...sampleReturn, status: "pending" as const };
    const second = createDevReturnNotification(submitted, "return_submitted");
    let notifications = await fetchCustomerNotifications("customer@example.com");
    expect(notifications).toHaveLength(2);
    expect(notifications.every((item) => item.readAt === null)).toBe(true);

    await markNotificationRead("customer@example.com", second.id);
    notifications = await fetchCustomerNotifications("customer@example.com");
    expect(notifications.find((item) => item.id === second.id)?.readAt).not.toBeNull();
    expect(notifications.filter((item) => !item.readAt)).toHaveLength(1);

    await markAllNotificationsRead("customer@example.com");
    notifications = await fetchCustomerNotifications("customer@example.com");
    expect(notifications.every((item) => item.readAt !== null)).toBe(true);
  });

  it("supports non-return account updates with destination links", async () => {
    createDevCustomerNotification({
      customerId: sampleReturn.customerId,
      returnId: null,
      orderId: sampleReturn.orderId,
      type: "order_status_updated",
      title: "Order status updated",
      message: "Your order is now delivered.",
      status: "delivered",
      link: "#/account/orders",
    });
    const notifications = await fetchCustomerNotifications("customer@example.com");
    expect(notifications[0]).toMatchObject({ type: "order_status_updated", link: "#/account/orders", orderId: sampleReturn.orderId });
  });
});
