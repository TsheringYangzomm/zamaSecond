import { getSupabaseClient } from "../supabase";
import type { Customer, Order } from "../admin/commerce-types";

export type CustomerProfile = {
  email: string;
  name: string;
  phone: string;
  area: string;
  dzongkhag: string;
  address: string;
};

export type CheckoutLine = {
  productId: string;
  name: string;
  quantity: number;
  price: number;
};

export type SubmitOrderInput = {
  profile: CustomerProfile;
  lines: CheckoutLine[];
  paymentMethod: string;
  deliveryDate: string | null;
  notes: string;
};

export type SubmitOrderResult =
  | { ok: true; orderId: string; mode: "live" | "dev" }
  | { ok: false; error: string };

// ---------------------------------------------------------------------------
// Dev-mode storage. Mirrors the admin's commerce-dev.ts fallback: while the
// commerce tables are missing, signups and checkout orders are stored in
// sessionStorage so they still show up in the admin Customers/Orders sections.
// ---------------------------------------------------------------------------

const devCommerceKey = "zama-dev-commerce";
const devSessionKey = "zama-customer-session";

type DevCommerce = { customers: Customer[]; orders: Order[] };

function readDevCommerce(): DevCommerce {
  if (typeof window === "undefined") return { customers: [], orders: [] };
  try {
    const raw = window.sessionStorage.getItem(devCommerceKey);
    if (!raw) return { customers: [], orders: [] };
    const parsed = JSON.parse(raw) as Partial<DevCommerce>;
    return {
      customers: Array.isArray(parsed.customers) ? (parsed.customers as Customer[]) : [],
      orders: Array.isArray(parsed.orders) ? (parsed.orders as Order[]) : [],
    };
  } catch {
    return { customers: [], orders: [] };
  }
}

function writeDevCommerce(data: DevCommerce): void {
  if (typeof window === "undefined") return;
  window.sessionStorage.setItem(devCommerceKey, JSON.stringify(data));
}

function devCustomerId(email: string): string {
  return `cus-${email.replace(/[^a-z0-9]/g, "").slice(0, 16)}`;
}

export function getDevCustomers(): Customer[] {
  return readDevCommerce().customers;
}

export function loadDevOrders(): Order[] {
  return readDevCommerce().orders;
}

export function getDevCustomerByEmail(email: string): Customer | null {
  const needle = email.trim().toLowerCase();
  return readDevCommerce().customers.find((customer) => customer.email.toLowerCase() === needle) ?? null;
}

export function saveDevCustomer(profile: CustomerProfile): Customer {
  const data = readDevCommerce();
  const email = profile.email.trim().toLowerCase();
  const now = new Date().toISOString();
  const existing = data.customers.find((customer) => customer.email.toLowerCase() === email);
  const merged: Customer = existing
    ? {
        ...existing,
        name: profile.name.trim() || existing.name,
        phone: profile.phone.trim() || existing.phone,
        area: profile.area.trim() || existing.area,
        dzongkhag: profile.dzongkhag.trim() || existing.dzongkhag,
        address: profile.address.trim() || existing.address,
      }
    : {
        id: devCustomerId(email),
        name: profile.name.trim(),
        email,
        phone: profile.phone.trim(),
        area: profile.area.trim(),
        dzongkhag: profile.dzongkhag.trim(),
        address: profile.address.trim(),
        status: "active",
        created_at: now,
      };
  data.customers = existing
    ? data.customers.map((customer) => (customer.id === existing.id ? merged : customer))
    : [merged, ...data.customers];
  writeDevCommerce(data);
  return merged;
}

export function getDevSession(): { email: string; name: string } | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(devSessionKey);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { email?: string; name?: string };
    return parsed.email ? { email: parsed.email, name: parsed.name ?? "" } : null;
  } catch {
    return null;
  }
}

export function saveDevSession(email: string, name: string): void {
  if (typeof window === "undefined") return;
  window.sessionStorage.setItem(devSessionKey, JSON.stringify({ email, name }));
}

export function clearDevSession(): void {
  if (typeof window === "undefined") return;
  window.sessionStorage.removeItem(devSessionKey);
}

export function profileFromCustomer(customer: Customer): CustomerProfile {
  return {
    email: customer.email,
    name: customer.name,
    phone: customer.phone,
    area: customer.area,
    dzongkhag: customer.dzongkhag,
    address: customer.address,
  };
}

// ---------------------------------------------------------------------------
// Live mode: Supabase RPCs (see supabase/checkout-schema.sql)
// ---------------------------------------------------------------------------

type UpsertCustomerResponse = { status?: string; customerId?: string } | null;
type PlaceOrderResponse = { status?: string; orderId?: string } | null;

async function upsertCustomerLive(profile: CustomerProfile): Promise<{ ok: boolean; error: string | null; customerId?: string }> {
  const client = getSupabaseClient();
  if (!client) return { ok: false, error: "Supabase is not configured." };
  const { data, error } = await client.rpc("upsert_customer", {
    p_email: profile.email,
    p_name: profile.name,
    p_phone: profile.phone,
    p_area: profile.area,
    p_dzongkhag: profile.dzongkhag,
    p_address: profile.address,
  });
  if (error) return { ok: false, error: error.message };
  const result = data as UpsertCustomerResponse;
  if (result?.status !== "ok" || !result.customerId) {
    return { ok: false, error: "We could not save your account details." };
  }
  return { ok: true, error: null, customerId: result.customerId };
}

export async function ensureCustomer(profile: CustomerProfile): Promise<{ ok: boolean; error: string | null; customer?: Customer }> {
  const client = getSupabaseClient();
  if (client) {
    const result = await upsertCustomerLive(profile);
    return { ok: result.ok, error: result.error };
  }
  const customer = saveDevCustomer(profile);
  return { ok: true, error: null, customer };
}

export async function fetchCustomerProfile(email: string): Promise<CustomerProfile | null> {
  const client = getSupabaseClient();
  if (!client) return null;
  const { data, error } = await client.rpc("get_customer", { p_email: email });
  if (error) return null;
  const result = data as { status?: string; customer?: Customer } | null;
  if (result?.status !== "ok" || !result.customer) return null;
  return profileFromCustomer(result.customer);
}

export async function fetchCustomerOrders(email: string): Promise<Order[]> {
  const client = getSupabaseClient();
  if (!client) {
    const customer = getDevCustomerByEmail(email);
    return customer ? loadDevOrders().filter((order) => order.customer_id === customer.id) : [];
  }
  const { data, error } = await client.rpc("get_customer_orders", { p_email: email });
  if (error || !Array.isArray(data)) return [];
  return data as Order[];
}

function makeDevOrder(customer: Customer, input: SubmitOrderInput, total: number): Order {
  const existing = readDevCommerce().orders;
  const year = new Date().getFullYear();
  const sequence = 5000 + existing.length + 1;
  const now = new Date().toISOString();
  return {
    id: `ZAM-${year}-${String(sequence).padStart(4, "0")}`,
    customer_id: customer.id,
    status: "pending",
    items: input.lines.map((line) => ({
      product_id: line.productId,
      name: line.name,
      quantity: line.quantity,
      price: line.price,
    })),
    total,
    payment_status: "pending",
    payment_method: input.paymentMethod,
    payment_reference: null,
    delivery_date: input.deliveryDate,
    delivery_area: customer.area,
    notes: input.notes,
    created_at: now,
    history: [{ status: "pending", at: now }],
  };
}

export async function submitOrder(input: SubmitOrderInput): Promise<SubmitOrderResult> {
  const total = input.lines.reduce((sum, line) => sum + line.price * line.quantity, 0);
  const client = getSupabaseClient();

  if (client) {
    try {
      const upsert = await upsertCustomerLive(input.profile);
      if (!upsert.ok || !upsert.customerId) {
        throw new Error(upsert.error ?? "We could not save your account details.");
      }
      const { data, error } = await client.rpc("place_order", {
        p_customer_id: upsert.customerId,
        p_items: input.lines.map((line) => ({
          product_id: line.productId,
          name: line.name,
          quantity: line.quantity,
          price: line.price,
        })),
        p_total: total,
        p_delivery_area: input.profile.area,
        p_payment_method: input.paymentMethod,
        p_delivery_date: input.deliveryDate ?? null,
        p_notes: input.notes,
      });
      if (error) throw new Error(error.message);
      const result = data as PlaceOrderResponse;
      if (result?.status !== "ok" || !result.orderId) {
        throw new Error("The order could not be placed. Please try again.");
      }
      return { ok: true, orderId: result.orderId, mode: "live" };
    } catch {
      // Fall back to the dev store so the shopper still gets a confirmation
      // and the order is still visible in the admin (dev) sections.
    }
  }

  const customer = saveDevCustomer(input.profile);
  const order = makeDevOrder(customer, input, total);
  const data = readDevCommerce();
  data.orders = [order, ...data.orders];
  writeDevCommerce(data);
  return { ok: true, orderId: order.id, mode: "dev" };
}
