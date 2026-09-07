import { getSupabaseClient } from "../supabase";
import { recordDevAdminNotification } from "../admin/admin-notifications-api";
import { getDevCustomerByEmail, getDevCustomers, loadDevOrders } from "../checkout/checkout-api";
import { isReturnQuantityValid, remainingReturnableItems, returnEligibility } from "./returns-rules";
import { createDevReturnNotification } from "./returns-notifications-api";
import type { AdminReturnRequest, AdminReturnUpdateInput, CustomerReturn, CustomerReturnItem, ReturnReason, ReturnRequestInput, ReturnStatus } from "./returns-types";

const devKey = "zama-returns-dev";

type DevReturnState = Record<string, CustomerReturn[]>;

function readDevReturns(): DevReturnState {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(devKey);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as DevReturnState;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function writeDevReturns(state: DevReturnState): void {
  if (typeof window !== "undefined") window.localStorage.setItem(devKey, JSON.stringify(state));
}

function valueOf<T>(row: Record<string, unknown>, camel: string, snake: string, fallback: T): T {
  const value = row[camel] ?? row[snake];
  return value === undefined || value === null ? fallback : value as T;
}

function numberValue(row: Record<string, unknown>, camel: string, snake: string, fallback = 0): number {
  const value = Number(valueOf(row, camel, snake, fallback));
  return Number.isFinite(value) ? value : fallback;
}

function mapItem(row: Record<string, unknown>): CustomerReturnItem {
  return {
    productId: String(valueOf(row, "productId", "product_id", "")),
    name: String(valueOf(row, "name", "name", "Item")),
    unitPrice: numberValue(row, "unitPrice", "unit_price"),
    quantity: numberValue(row, "quantity", "quantity"),
  };
}

function mapReturn(row: Record<string, unknown>, items: CustomerReturnItem[] = []): CustomerReturn {
  const rawItems = valueOf<unknown>(row, "items", "items", null);
  return {
    id: String(valueOf(row, "id", "id", "")),
    customerId: String(valueOf(row, "customerId", "customer_id", "")),
    orderId: String(valueOf(row, "orderId", "order_id", "")),
    status: valueOf(row, "status", "status", "pending") as ReturnStatus,
    reason: valueOf(row, "reason", "reason", "other") as ReturnReason,
    note: String(valueOf(row, "note", "note", "")),
    items: items.length > 0 ? items : Array.isArray(rawItems) ? rawItems.filter((item): item is Record<string, unknown> => Boolean(item && typeof item === "object")).map(mapItem) : [],
    refundAmount: valueOf(row, "refundAmount", "refund_amount", null) as number | null,
    refundMethod: valueOf(row, "refundMethod", "refund_method", null) as string | null,
    pickupWindowStart: valueOf(row, "pickupWindowStart", "pickup_window_start", null) as string | null,
    pickupWindowEnd: valueOf(row, "pickupWindowEnd", "pickup_window_end", null) as string | null,
    rejectionReason: valueOf(row, "rejectionReason", "rejection_reason", null) as string | null,
    requestedAt: String(valueOf(row, "requestedAt", "requested_at", "")),
    reviewedAt: valueOf(row, "reviewedAt", "reviewed_at", null) as string | null,
    reviewedBy: valueOf(row, "reviewedBy", "reviewed_by", null) as string | null,
    updatedAt: String(valueOf(row, "updatedAt", "updated_at", "")),
  };
}

function missingSchema(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error ?? "");
  const normalized = message.toLowerCase();
  return normalized.includes("schema cache") || normalized.includes("does not exist") || normalized.includes("could not find the function");
}

function customerIdForEmail(email: string): string {
  return getDevCustomerByEmail(email)?.id ?? `cus-${email.trim().toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 16)}`;
}

function customerReturns(email: string): CustomerReturn[] {
  return readDevReturns()[customerIdForEmail(email)] ?? [];
}

function saveCustomerReturns(email: string, returns: CustomerReturn[]): void {
  const state = readDevReturns();
  state[customerIdForEmail(email)] = returns;
  writeDevReturns(state);
}

export async function fetchCustomerReturns(email: string): Promise<CustomerReturn[]> {
  const client = getSupabaseClient();
  if (client) {
    try {
      const { data, error } = await client.rpc("get_my_returns");
      if (error) throw new Error(error.message);
      return Array.isArray(data) ? data.map((row) => mapReturn(row as Record<string, unknown>)) : [];
    } catch (error) {
      if (!missingSchema(error)) throw error;
    }
  }
  return customerReturns(email).sort((left, right) => right.requestedAt.localeCompare(left.requestedAt));
}

export async function requestCustomerReturn(email: string, input: ReturnRequestInput): Promise<CustomerReturn> {
  const client = getSupabaseClient();
  if (client) {
    try {
      const { data, error } = await client.rpc("request_order_return", {
        p_order_id: input.orderId,
        p_items: input.items.map((item) => ({ product_id: item.productId, quantity: item.quantity })),
        p_reason: input.reason,
        p_note: input.note,
      });
      if (error) throw new Error(error.message);
      const result = data as Record<string, unknown> | null;
      if (result?.status !== "ok") throw new Error(String(result?.error ?? "This order cannot be returned."));
      return mapReturn((result?.return ?? {}) as Record<string, unknown>);
    } catch (error) {
      if (!missingSchema(error)) throw error;
    }
  }

  const customerId = customerIdForEmail(email);
  const order = loadDevOrders().find((candidate) => candidate.id === input.orderId && candidate.customer_id === customerId);
  if (!order) throw new Error("We could not find that order in your account.");
  const existing = customerReturns(email);
  const eligibility = returnEligibility(order, new Date(), existing.filter((item) => item.orderId === order.id));
  if (!eligibility.eligible) throw new Error(eligibility.reason === "window_closed" ? "The return window for this order has closed." : "This order is not eligible for a return.");
  if (!isReturnQuantityValid(order, input.items)) throw new Error("Choose valid quantities from this order.");
  const remaining = remainingReturnableItems(order, existing.filter((item) => item.orderId === order.id));
  const remainingMap = new Map(remaining.map((item) => [item.productId, item.quantity]));
  if (input.items.some((item) => item.quantity > (remainingMap.get(item.productId) ?? 0))) throw new Error("Some selected items have already been included in a return request.");
  const items = input.items.map((item) => {
    const orderItem = order.items.find((candidate) => candidate.product_id === item.productId);
    return { productId: item.productId, quantity: item.quantity, name: orderItem?.name ?? "Item", unitPrice: orderItem?.price ?? 0 };
  });
  const now = new Date().toISOString();
  const next: CustomerReturn = {
    id: `return-${Date.now()}`,
    customerId,
    orderId: order.id,
    status: "pending",
    reason: input.reason,
    note: input.note.trim(),
    items,
    refundAmount: items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0),
    refundMethod: order.payment_method ? `Original ${order.payment_method}` : null,
    pickupWindowStart: null,
    pickupWindowEnd: null,
    rejectionReason: null,
    requestedAt: now,
    reviewedAt: null,
    reviewedBy: null,
    updatedAt: now,
  };
  saveCustomerReturns(email, [next, ...existing]);
  createDevReturnNotification(next);
  recordDevAdminNotification({
    type: "return_requested",
    title: "New return request",
    message: "A customer requested a return for order " + next.orderId + ".",
    link: "#/admin?tab=orders&view=returns",
  });
  return next;
}

export async function listAdminReturns(): Promise<{ mode: "live" | "dev"; returns: AdminReturnRequest[] }> {
  const client = getSupabaseClient();
  if (client) {
    try {
      const [returnsResult, itemsResult, customersResult, ordersResult] = await Promise.all([
        client.from("order_returns").select("*").order("requested_at", { ascending: false }),
        client.from("order_return_items").select("*"),
        client.from("customers").select("id,name,email"),
        client.from("orders").select("id,total,payment_method"),
      ]);
      for (const result of [returnsResult, itemsResult, customersResult, ordersResult]) if (result.error) throw new Error(result.error.message);
      const itemMap = new Map<string, CustomerReturnItem[]>();
      for (const row of (itemsResult.data ?? []) as Record<string, unknown>[]) {
        const key = String(valueOf(row, "returnId", "return_id", ""));
        itemMap.set(key, [...(itemMap.get(key) ?? []), mapItem(row)]);
      }
      const customers = new Map(((customersResult.data ?? []) as Record<string, unknown>[]).map((row) => [String(row.id), row]));
      const orders = new Map(((ordersResult.data ?? []) as Record<string, unknown>[]).map((row) => [String(row.id), row]));
      return {
        mode: "live",
        returns: ((returnsResult.data ?? []) as Record<string, unknown>[]).map((row) => {
          const mapped = mapReturn(row, itemMap.get(String(row.id)) ?? []);
          const customer = customers.get(mapped.customerId) ?? {};
          const order = orders.get(mapped.orderId) ?? {};
          return { ...mapped, customerName: String(customer.name ?? "Unknown customer"), customerEmail: String(customer.email ?? ""), paymentMethod: String(order.payment_method ?? ""), orderTotal: Number(order.total ?? 0) };
        }),
      };
    } catch (error) {
      if (!missingSchema(error)) throw error;
    }
  }
  const orders = loadDevOrders();
  const customers = new Map(getDevCustomers().map((customer) => [customer.id, customer]));
  const orderMap = new Map(orders.map((order) => [order.id, order]));
  const returns = Object.values(readDevReturns()).flat().sort((left, right) => right.requestedAt.localeCompare(left.requestedAt));
  return {
    mode: "dev",
    returns: returns.map((item) => {
      const customer = customers.get(item.customerId);
      const order = orderMap.get(item.orderId);
      return { ...item, customerName: customer?.name ?? "Unknown customer", customerEmail: customer?.email ?? "", paymentMethod: order?.payment_method ?? "", orderTotal: order?.total ?? 0 };
    }),
  };
}

export async function updateAdminReturn(id: string, input: AdminReturnUpdateInput, adminEmail: string): Promise<{ notificationStatus: "created" | "failed"; notificationError?: string }> {
  const client = getSupabaseClient();
  if (client) {
    try {
      const { data, error } = await client.rpc("admin_update_return", { p_return_id: id, p_status: input.status, p_refund_amount: input.refundAmount, p_refund_method: input.refundMethod, p_pickup_window_start: input.pickupWindowStart, p_pickup_window_end: input.pickupWindowEnd, p_rejection_reason: input.rejectionReason, p_admin_email: adminEmail });
      if (error) throw new Error(error.message);
      const result = data as Record<string, unknown> | null;
      if (result?.status !== "ok") throw new Error(String(result?.error ?? "The return could not be updated."));
      return { notificationStatus: result?.notification_status === "failed" ? "failed" : "created", notificationError: typeof result?.notification_error === "string" ? result.notification_error : undefined };
    } catch (error) {
      if (!missingSchema(error)) throw error;
    }
  }
  const state = readDevReturns();
  let notificationStatus: "created" | "failed" = "created";
  let notificationReturn: CustomerReturn | null = null;
  let notificationType: Parameters<typeof createDevReturnNotification>[1] | undefined;
  for (const customerId of Object.keys(state)) {
    state[customerId] = state[customerId].map((item) => {
      if (item.id !== id) return item;
      notificationType = input.status === "approved" && item.status === "approved" ? "pickup_schedule_updated" : undefined;
      notificationReturn = { ...item, status: input.status, refundAmount: input.refundAmount, refundMethod: input.refundMethod, pickupWindowStart: input.status === "rejected" ? null : input.pickupWindowStart, pickupWindowEnd: input.status === "rejected" ? null : input.pickupWindowEnd, rejectionReason: input.rejectionReason, reviewedAt: new Date().toISOString(), reviewedBy: adminEmail, updatedAt: new Date().toISOString() };
      return notificationReturn;
    });
  }
  writeDevReturns(state);
  if (notificationReturn) createDevReturnNotification(notificationReturn, notificationType);
  return { notificationStatus };
}
