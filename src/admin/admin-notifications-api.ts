import { getSupabaseClient } from "../supabase";
import type { AdminNotification, AdminNotificationInput } from "./admin-notifications-types";

const devKey = "zama-admin-notifications-dev";

type DevState = {
  notifications: AdminNotification[];
  reads: Record<string, Record<string, string>>;
};

function emptyDevState(): DevState {
  return { notifications: [], reads: {} };
}

function readDevState(): DevState {
  if (typeof window === "undefined") return emptyDevState();
  try {
    const parsed = JSON.parse(window.localStorage.getItem(devKey) ?? "") as Partial<DevState>;
    return {
      notifications: Array.isArray(parsed.notifications) ? parsed.notifications : [],
      reads: parsed.reads && typeof parsed.reads === "object" ? parsed.reads as Record<string, Record<string, string>> : {},
    };
  } catch {
    return emptyDevState();
  }
}

function writeDevState(state: DevState): void {
  if (typeof window !== "undefined") window.localStorage.setItem(devKey, JSON.stringify(state));
}

function normalizedEmail(email: string): string {
  return email.trim().toLowerCase();
}

function isMissingSchema(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error ?? "");
  const normalized = message.toLowerCase();
  return normalized.includes("schema cache") || normalized.includes("does not exist") || normalized.includes("could not find the function");
}

function mapNotification(row: Record<string, unknown>): AdminNotification {
  return {
    id: String(row.id ?? ""),
    type: String(row.type ?? "system") as AdminNotification["type"],
    title: String(row.title ?? "Admin update"),
    message: String(row.message ?? ""),
    link: row.link == null ? null : String(row.link),
    createdAt: String(row.created_at ?? row.createdAt ?? ""),
    readAt: row.read_at == null && row.readAt == null ? null : String(row.read_at ?? row.readAt),
  };
}

function devNotifications(email: string): AdminNotification[] {
  const state = readDevState();
  const reads = state.reads[normalizedEmail(email)] ?? {};
  return state.notifications
    .map((notification) => ({ ...notification, readAt: reads[notification.id] ?? notification.readAt ?? null }))
    .sort((left, right) => right.createdAt.localeCompare(left.createdAt));
}

export async function fetchAdminNotifications(email: string): Promise<AdminNotification[]> {
  const client = getSupabaseClient();
  if (client) {
    try {
      const { data, error } = await client.rpc("get_admin_notifications");
      if (error) throw new Error(error.message);
      return Array.isArray(data) ? data.map((row) => mapNotification(row as Record<string, unknown>)) : [];
    } catch (error) {
      if (!isMissingSchema(error)) throw error;
    }
  }
  return devNotifications(email);
}

export async function markAdminNotificationRead(email: string, notificationId: string): Promise<void> {
  const client = getSupabaseClient();
  if (client) {
    try {
      const { error } = await client.rpc("mark_admin_notification_read", { p_notification_id: notificationId });
      if (error) throw new Error(error.message);
      return;
    } catch (error) {
      if (!isMissingSchema(error)) throw error;
    }
  }
  const state = readDevState();
  const key = normalizedEmail(email);
  state.reads[key] = { ...(state.reads[key] ?? {}), [notificationId]: new Date().toISOString() };
  writeDevState(state);
}

export async function markAllAdminNotificationsRead(email: string): Promise<void> {
  const client = getSupabaseClient();
  if (client) {
    try {
      const { error } = await client.rpc("mark_all_admin_notifications_read");
      if (error) throw new Error(error.message);
      return;
    } catch (error) {
      if (!isMissingSchema(error)) throw error;
    }
  }
  const state = readDevState();
  const now = new Date().toISOString();
  const key = normalizedEmail(email);
  state.reads[key] = {
    ...(state.reads[key] ?? {}),
    ...Object.fromEntries(state.notifications.map((notification) => [notification.id, now])),
  };
  writeDevState(state);
}

export function subscribeToAdminNotifications(onChange: () => void): () => void {
  const client = getSupabaseClient();
  if (!client) return () => undefined;
  const channel = client
    .channel("admin-notifications")
    .on("postgres_changes", { event: "INSERT", schema: "public", table: "admin_notifications" }, onChange)
    .subscribe();
  return () => { void client.removeChannel(channel); };
}

export function recordDevAdminNotification(input: AdminNotificationInput): void {
  const state = readDevState();
  const now = new Date().toISOString();
  state.notifications = [{
    id: "admin-notification-" + Date.now() + "-" + Math.random().toString(36).slice(2, 8),
    type: input.type,
    title: input.title,
    message: input.message,
    link: input.link ?? null,
    createdAt: now,
    readAt: null,
  }, ...state.notifications].slice(0, 100);
  writeDevState(state);
}
