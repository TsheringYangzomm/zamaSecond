export type CustomerStatus = "active" | "suspended";

export type Customer = {
  id: string;
  name: string;
  email: string;
  phone: string;
  area: string;
  dzongkhag: string;
  address: string;
  status: CustomerStatus;
  created_at: string;
};

export type OrderStatus = "pending" | "confirmed" | "preparing" | "out_for_delivery" | "delivered" | "cancelled";

export type PaymentStatus = "paid" | "pending" | "failed" | "refunded";

export type OrderItem = {
  product_id: string;
  name: string;
  quantity: number;
  price: number;
};

export type OrderHistoryEntry = {
  status: OrderStatus;
  at: string;
};

export type Order = {
  id: string;
  customer_id: string;
  status: OrderStatus;
  items: OrderItem[];
  total: number;
  subtotal?: number;
  coupon_id?: string | null;
  coupon_code?: string | null;
  coupon_discount?: number;
  payment_status: PaymentStatus;
  payment_method: string;
  payment_reference: string | null;
  delivery_date: string | null;
  delivery_area: string;
  notes: string;
  created_at: string;
  history: OrderHistoryEntry[];
};

export type SubscriptionStatus = "active" | "paused" | "cancelled";

export type SubscriptionHistoryEntry = {
  status: SubscriptionStatus;
  at: string;
};

export type Subscription = {
  id: string;
  customer_id: string;
  plan: string;
  price: number;
  status: SubscriptionStatus;
  start_date: string;
  next_delivery_date: string | null;
  history: SubscriptionHistoryEntry[];
};

export type DeliveryStatus = "preparing" | "out_for_delivery" | "delivered" | "failed" | "cancelled";

export type Delivery = {
  id: string;
  order_id: string;
  customer_id: string;
  area: string;
  delivery_date: string;
  status: DeliveryStatus;
  driver: string | null;
};

export type Payment = {
  id: string;
  order_id: string;
  customer_id: string;
  amount: number;
  status: PaymentStatus;
  date: string;
  reference: string;
  method: string;
  refund_method?: string | null;
};

export const orderStatuses: OrderStatus[] = [
  "pending",
  "confirmed",
  "preparing",
  "out_for_delivery",
  "delivered",
  "cancelled",
];

export const deliveryStatuses: DeliveryStatus[] = [
  "preparing",
  "out_for_delivery",
  "delivered",
  "failed",
  "cancelled",
];

export const subscriptionStatuses: SubscriptionStatus[] = ["active", "paused", "cancelled"];

export const customerStatuses: CustomerStatus[] = ["active", "suspended"];

export const paymentStatuses: PaymentStatus[] = ["paid", "pending", "failed", "refunded"];
