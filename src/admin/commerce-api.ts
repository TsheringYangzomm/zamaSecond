import { useSyncExternalStore } from "react";
import { requireClient } from "./admin-api";
import { deductInventoryForOrder } from "./inventory-fulfillment";
import { commerceDevData } from "../data/commerce-dev";
import { getDevCustomers, loadDevOrders } from "../checkout/checkout-api";
import type {
  Customer,
  CustomerStatus,
  Delivery,
  DeliveryStatus,
  Order,
  OrderStatus,
  Payment,
  PaymentStatus,
  Subscription,
  SubscriptionStatus,
} from "./commerce-types";

export type CommerceMode = "dev" | "live";

export type CommerceData = {
  customers: Customer[];
  orders: Order[];
  subscriptions: Subscription[];
  deliveries: Delivery[];
  payments: Payment[];
};

const commerceTables = ["customers", "orders", "subscriptions", "deliveries", "payments"] as const;

async function probeCommerceMode(): Promise<CommerceMode> {
  const client = requireClient();
  const results = await Promise.all(
    commerceTables.map(async (table) => {
      const { error } = await client.from(table).select("id").limit(1);
      return !error;
    }),
  );
  return results.every(Boolean) ? "live" : "dev";
}

export async function loadCommerceData(): Promise<{ mode: CommerceMode; data: CommerceData }> {
  const mode = await probeCommerceMode();
  if (mode === "dev") {
    return {
      mode,
      data: {
        ...commerceDevData,
        customers: [...getDevCustomers(), ...commerceDevData.customers],
        orders: [...loadDevOrders(), ...commerceDevData.orders],
      },
    };
  }
  const client = requireClient();
  const [customers, orders, subscriptions, deliveries, payments] = await Promise.all([
    client.from("customers").select("*").order("created_at", { ascending: false }),
    client.from("orders").select("*").order("created_at", { ascending: false }),
    client.from("subscriptions").select("*").order("start_date", { ascending: false }),
    client.from("deliveries").select("*").order("delivery_date", { ascending: false }),
    client.from("payments").select("*").order("date", { ascending: false }),
  ]);
  for (const result of [customers, orders, subscriptions, deliveries, payments]) {
    if (result.error) throw new Error(result.error.message);
  }
  return {
    mode,
    data: {
      customers: (customers.data ?? []) as Customer[],
      orders: (orders.data ?? []) as Order[],
      subscriptions: (subscriptions.data ?? []) as Subscription[],
      deliveries: (deliveries.data ?? []) as Delivery[],
      payments: (payments.data ?? []) as Payment[],
    },
  };
}

function withHistory<T extends { history: { status: string; at: string }[] }>(row: T, status: string): T {
  return { ...row, status, history: [...row.history, { status, at: new Date().toISOString() }] };
}

async function updateOrderStatusLive(orderId: string, status: OrderStatus, adminEmail: string | null): Promise<void> {
  const { data, error } = await requireClient()
    .from("orders")
    .select("history, items")
    .eq("id", orderId)
    .single();
  if (error) throw new Error(error.message);
  const history = [...((data?.history ?? []) as { status: string; at: string }[])];
  const previouslyConfirmed = history.some((entry) => entry.status === "confirmed");
  if (status === "confirmed" && !previouslyConfirmed) {
    const items = ((data?.items ?? []) as { product_id: string; quantity: number }[]).map((item) => ({
      product_id: item.product_id,
      quantity: item.quantity,
    }));
    await deductInventoryForOrder(orderId, items, adminEmail ?? "");
  }
  history.push({ status, at: new Date().toISOString() });
  const { error: updateError } = await requireClient()
    .from("orders")
    .update({ status, history })
    .eq("id", orderId);
  if (updateError) throw new Error(updateError.message);
}

async function updateSubscriptionStatusLive(subscriptionId: string, status: SubscriptionStatus): Promise<void> {
  const { data, error } = await requireClient()
    .from("subscriptions")
    .select("history")
    .eq("id", subscriptionId)
    .single();
  if (error) throw new Error(error.message);
  const history = [...(data?.history ?? [])];
  history.push({ status, at: new Date().toISOString() });
  const { error: updateError } = await requireClient()
    .from("subscriptions")
    .update({ status, history })
    .eq("id", subscriptionId);
  if (updateError) throw new Error(updateError.message);
}

async function updateDeliveryStatusLive(deliveryId: string, status: DeliveryStatus, driver: string | null): Promise<void> {
  const { error } = await requireClient()
    .from("deliveries")
    .update({ status, driver })
    .eq("id", deliveryId);
  if (error) throw new Error(error.message);
}

async function updateCustomerStatusLive(customerId: string, status: CustomerStatus): Promise<void> {
  const { error } = await requireClient().from("customers").update({ status }).eq("id", customerId);
  if (error) throw new Error(error.message);
}

async function updatePaymentStatusLive(paymentId: string, status: PaymentStatus): Promise<void> {
  const { error } = await requireClient().from("payments").update({ status }).eq("id", paymentId);
  if (error) throw new Error(error.message);
}

export type CommerceLoadState =
  | { phase: "idle" }
  | { phase: "loading" }
  | { phase: "ready"; mode: CommerceMode; writable: boolean; data: CommerceData }
  | { phase: "error"; message: string };

class CommerceDataStore {
  private state: CommerceLoadState = { phase: "idle" };
  private listeners = new Set<() => void>();
  private loadPromise: Promise<void> | null = null;

  getSnapshot(): CommerceLoadState {
    return this.state;
  }

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  async load(force = false): Promise<void> {
    if (this.state.phase === "ready" && !force) return;
    if (this.loadPromise) return this.loadPromise;
    this.loadPromise = this.runLoad();
    try {
      await this.loadPromise;
    } finally {
      this.loadPromise = null;
    }
  }

  private async runLoad(): Promise<void> {
    this.setState({ phase: "loading" });
    try {
      const { mode, data } = await loadCommerceData();
      this.setState({ phase: "ready", mode, writable: mode === "live", data });
    } catch (error) {
      this.setState({
        phase: "error",
        message: error instanceof Error ? error.message : "Failed to load commerce data.",
      });
    }
  }

  private setState(next: CommerceLoadState): void {
    this.state = next;
    for (const listener of this.listeners) listener();
  }

  private mutate(data: CommerceData): void {
    if (this.state.phase !== "ready") return;
    this.setState({ ...this.state, data });
  }

  async updateOrderStatus(orderId: string, status: OrderStatus, adminEmail?: string | null): Promise<void> {
    if (this.state.phase !== "ready") return;
    if (this.state.mode === "dev") {
      const data = {
        ...this.state.data,
        orders: this.state.data.orders.map((order) =>
          order.id === orderId
            ? withHistory(order, status)
            : order,
        ),
      };
      this.mutate(data);
      return;
    }
    await updateOrderStatusLive(orderId, status, adminEmail ?? null);
    await this.load(true);
  }

  async updateSubscriptionStatus(subscriptionId: string, status: SubscriptionStatus): Promise<void> {
    if (this.state.phase !== "ready") return;
    if (this.state.mode === "dev") {
      const data = {
        ...this.state.data,
        subscriptions: this.state.data.subscriptions.map((subscription) =>
          subscription.id === subscriptionId
            ? withHistory(subscription, status)
            : subscription,
        ),
      };
      this.mutate(data);
      return;
    }
    await updateSubscriptionStatusLive(subscriptionId, status);
    await this.load(true);
  }

  async updateDeliveryStatus(deliveryId: string, status: DeliveryStatus, driver: string | null): Promise<void> {
    if (this.state.phase !== "ready") return;
    if (this.state.mode === "dev") {
      const data = {
        ...this.state.data,
        deliveries: this.state.data.deliveries.map((delivery) =>
          delivery.id === deliveryId ? { ...delivery, status, driver } : delivery,
        ),
      };
      this.mutate(data);
      return;
    }
    await updateDeliveryStatusLive(deliveryId, status, driver);
    await this.load(true);
  }

  async updateCustomerStatus(customerId: string, status: CustomerStatus): Promise<void> {
    if (this.state.phase !== "ready") return;
    if (this.state.mode === "dev") {
      const data = {
        ...this.state.data,
        customers: this.state.data.customers.map((customer) =>
          customer.id === customerId ? { ...customer, status } : customer,
        ),
      };
      this.mutate(data);
      return;
    }
    await updateCustomerStatusLive(customerId, status);
    await this.load(true);
  }

  async updatePaymentStatus(paymentId: string, status: PaymentStatus): Promise<void> {
    if (this.state.phase !== "ready") return;
    if (this.state.mode === "dev") {
      const data = {
        ...this.state.data,
        payments: this.state.data.payments.map((payment) =>
          payment.id === paymentId ? { ...payment, status } : payment,
        ),
      };
      this.mutate(data);
      return;
    }
    await updatePaymentStatusLive(paymentId, status);
    await this.load(true);
  }
}

export const commerceStore = new CommerceDataStore();

export function useCommerceData(): CommerceLoadState {
  return useSyncExternalStore(
    (listener) => commerceStore.subscribe(listener),
    () => commerceStore.getSnapshot(),
  );
}

export function customerName(customers: Customer[], customerId: string): string {
  return customers.find((customer) => customer.id === customerId)?.name ?? customerId;
}
