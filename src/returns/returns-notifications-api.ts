import { getSupabaseClient } from "../supabase";
import { getDevCustomerByEmail } from "../checkout/checkout-api";
import type { CustomerNotification, CustomerReturn, NotificationType } from "./returns-types";

const devKey = "zama-return-notifications-dev";
type DevNotificationState = Record<string, CustomerNotification[]>;

function readDevNotifications(): DevNotificationState {
  if (typeof window === "undefined") return {};
  try {
    const parsed = JSON.parse(window.localStorage.getItem(devKey) ?? "{}") as DevNotificationState;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function writeDevNotifications(state: DevNotificationState): void {
  if (typeof window !== "undefined") window.localStorage.setItem(devKey, JSON.stringify(state));
}

function customerIdForEmail(email: string): string {
  return getDevCustomerByEmail(email)?.id ?? `cus-${email.trim().toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 16)}`;
}

function valueOf<T>(row: Record<string, unknown>, camel: string, snake: string, fallback: T): T {
  const value = row[camel] ?? row[snake];
  return value === undefined || value === null ? fallback : value as T;
}

function mapNotification(row: Record<string, unknown>): CustomerNotification {
  return {
    id: String(valueOf(row, "id", "id", "")),
    customerId: String(valueOf(row, "customerId", "customer_id", "")),
    returnId: valueOf(row, "returnId", "return_id", null) as string | null,
    orderId: valueOf(row, "orderId", "order_id", null) as string | null,
    type: valueOf(row, "type", "type", "return_submitted") as NotificationType,
    title: String(valueOf(row, "title", "title", "Zama update")),
    message: String(valueOf(row, "message", "message", "You have a new account update.")),
    status: valueOf(row, "status", "status", null) as string | null,
    link: valueOf(row, "link", "link", null) as string | null,
    readAt: valueOf(row, "readAt", "read_at", null) as string | null,
    createdAt: String(valueOf(row, "createdAt", "created_at", "")),
  };
}

function missingSchema(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error ?? "");
  const normalized = message.toLowerCase();
  return normalized.includes("schema cache") || normalized.includes("does not exist") || normalized.includes("could not find the function");
}

function formatPickupWindow(returnItem: CustomerReturn): string {
  if (!returnItem.pickupWindowStart || !returnItem.pickupWindowEnd) return "a pickup window will be arranged soon";
  const date = new Intl.DateTimeFormat("en-BT", { timeZone: "Asia/Thimphu", day: "numeric", month: "long", year: "numeric" }).format(new Date(returnItem.pickupWindowStart));
  const time = new Intl.DateTimeFormat("en-BT", { timeZone: "Asia/Thimphu", hour: "2-digit", minute: "2-digit", hour12: false }).formatRange(new Date(returnItem.pickupWindowStart), new Date(returnItem.pickupWindowEnd));
  return `${date}, ${time} Bhutan time`;
}

export function notificationForReturn(returnItem: CustomerReturn, type: NotificationType = typeForReturn(returnItem.status)): Omit<CustomerNotification, "id" | "createdAt" | "readAt"> {
  const common = { customerId: returnItem.customerId, returnId: returnItem.id, orderId: returnItem.orderId, status: returnItem.status, link: "#/account/orders?section=returns" };
  if (type === "return_approved") return { ...common, type, title: "Return approved", message: `Your return for order ${returnItem.orderId} was approved. Pickup is scheduled for ${formatPickupWindow(returnItem)}.` };
  if (type === "pickup_schedule_updated") return { ...common, type, title: "Pickup schedule updated", message: `The pickup for order ${returnItem.orderId} is now scheduled for ${formatPickupWindow(returnItem)}.` };
  if (type === "return_rejected") return { ...common, type, title: "Return rejected", message: `Your return for order ${returnItem.orderId} was rejected${returnItem.rejectionReason ? `: ${returnItem.rejectionReason}` : "."}` };
  if (type === "return_refunded") return { ...common, type, title: "Refund processed", message: `Your refund for order ${returnItem.orderId} has been processed${returnItem.refundAmount == null ? "" : ` for Nu. ${new Intl.NumberFormat("en-BT").format(returnItem.refundAmount)}`}${returnItem.refundMethod ? ` via ${returnItem.refundMethod}` : ""}.` };
  if (type === "return_cancelled") return { ...common, type, title: "Return cancelled", message: `Your return request for order ${returnItem.orderId} was cancelled.` };
  return { ...common, type: "return_submitted", title: "Return request received", message: `Your return request for order ${returnItem.orderId} was submitted and is being reviewed.` };
}

function typeForReturn(status: CustomerReturn["status"]): NotificationType {
  if (status === "approved") return "return_approved";
  if (status === "rejected") return "return_rejected";
  if (status === "refunded") return "return_refunded";
  if (status === "cancelled") return "return_cancelled";
  return "return_submitted";
}

export function createDevReturnNotification(returnItem: CustomerReturn, type?: NotificationType): CustomerNotification {
  const state = readDevNotifications();
  const content = notificationForReturn(returnItem, type);
  const notification: CustomerNotification = { ...content, id: `notification-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, readAt: null, createdAt: new Date().toISOString() };
  state[returnItem.customerId] = [notification, ...(state[returnItem.customerId] ?? [])];
  writeDevNotifications(state);
  return notification;
}

export type CustomerNotificationInput = Omit<CustomerNotification, "id" | "createdAt" | "readAt">;

export function createDevCustomerNotification(input: CustomerNotificationInput): CustomerNotification {
  const state = readDevNotifications();
  const notification: CustomerNotification = {
    ...input,
    id: `notification-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    readAt: null,
    createdAt: new Date().toISOString(),
  };
  state[input.customerId] = [notification, ...(state[input.customerId] ?? [])];
  writeDevNotifications(state);
  return notification;
}

export async function fetchCustomerNotifications(email: string): Promise<CustomerNotification[]> {
  const client = getSupabaseClient();
  if (client) {
    try {
      const { data, error } = await client.rpc("get_my_notifications");
      if (error) throw new Error(error.message);
      return Array.isArray(data) ? data.map((row) => mapNotification(row as Record<string, unknown>)) : [];
    } catch (error) {
      if (!missingSchema(error)) throw error;
    }
  }
  return (readDevNotifications()[customerIdForEmail(email)] ?? []).sort((left, right) => right.createdAt.localeCompare(left.createdAt));
}

export async function markNotificationRead(email: string, notificationId: string): Promise<void> {
  const client = getSupabaseClient();
  if (client) {
    try {
      const { error } = await client.rpc("mark_notification_read", { p_notification_id: notificationId });
      if (error) throw new Error(error.message);
      return;
    } catch (error) {
      if (!missingSchema(error)) throw error;
    }
  }
  const state = readDevNotifications();
  const customerId = customerIdForEmail(email);
  state[customerId] = (state[customerId] ?? []).map((item) => item.id === notificationId ? { ...item, readAt: new Date().toISOString() } : item);
  writeDevNotifications(state);
}

export async function markAllNotificationsRead(email: string): Promise<void> {
  const client = getSupabaseClient();
  if (client) {
    try {
      const { error } = await client.rpc("mark_all_notifications_read");
      if (error) throw new Error(error.message);
      return;
    } catch (error) {
      if (!missingSchema(error)) throw error;
    }
  }
  const state = readDevNotifications();
  const customerId = customerIdForEmail(email);
  const readAt = new Date().toISOString();
  state[customerId] = (state[customerId] ?? []).map((item) => ({ ...item, readAt }));
  writeDevNotifications(state);
}
