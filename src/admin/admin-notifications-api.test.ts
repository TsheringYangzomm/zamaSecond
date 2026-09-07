import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../supabase", () => ({ getSupabaseClient: () => null }));

import {
  fetchAdminNotifications,
  markAdminNotificationRead,
  markAllAdminNotificationsRead,
  recordDevAdminNotification,
} from "./admin-notifications-api";

describe("admin notifications development fallback", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("stores actionable notifications newest first", async () => {
    recordDevAdminNotification({
      type: "order_created",
      title: "New order received",
      message: "Order ZAM-2026-5002 was placed.",
      link: "#/admin?tab=orders",
    });
    recordDevAdminNotification({
      type: "return_requested",
      title: "New return request",
      message: "A return was requested.",
      link: "#/admin?tab=orders",
    });

    const notifications = await fetchAdminNotifications("Admin@zama.bt");
    expect(notifications).toHaveLength(2);
    expect(notifications[0].type).toBe("return_requested");
    expect(notifications[0].link).toBe("#/admin?tab=orders");
    expect(notifications.every((notification) => notification.readAt === null)).toBe(true);
  });

  it("keeps read state separate for each admin", async () => {
    recordDevAdminNotification({
      type: "message_received",
      title: "New customer message",
      message: "A customer sent a message.",
      link: "#/admin?tab=messages",
    });
    const [notification] = await fetchAdminNotifications("first@zama.bt");

    await markAdminNotificationRead("first@zama.bt", notification.id);
    expect((await fetchAdminNotifications("first@zama.bt"))[0].readAt).not.toBeNull();
    expect((await fetchAdminNotifications("second@zama.bt"))[0].readAt).toBeNull();

    await markAllAdminNotificationsRead("second@zama.bt");
    expect((await fetchAdminNotifications("second@zama.bt"))[0].readAt).not.toBeNull();
  });
});
