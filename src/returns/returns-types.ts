import type { Order } from "../admin/commerce-types";

export const RETURN_REASONS = [
  { value: "damaged", label: "Damaged" },
  { value: "incorrect_item", label: "Incorrect item" },
  { value: "missing_item", label: "Missing item" },
  { value: "quality_issue", label: "Quality issue" },
  { value: "not_as_expected", label: "Not as expected" },
  { value: "other", label: "Other" },
] as const;

export type ReturnReason = typeof RETURN_REASONS[number]["value"];
export type ReturnStatus = "pending" | "approved" | "rejected" | "refunded" | "cancelled";

export type NotificationType =
  | "return_submitted"
  | "return_approved"
  | "return_rejected"
  | "return_refunded"
  | "return_cancelled"
  | "pickup_schedule_updated"
  | "order_placed"
  | "order_status_updated"
  | "payment_status_updated"
  | "coupon_available"
  | "product_available"
  | "membership_request"
  | "membership_approved"
  | "membership_rejected"
  | "membership_updated"
  | "membership_delivery_invoice"
  | "membership_delivery_payment_submitted"
  | "membership_delivery_paid"
  | "membership_delivery_skipped"
  | "membership_delivery_updated"
  | "membership_freebie"
  | "member_early_access";
export type NotificationReadState = "unread" | "read";

export type ReturnPickupWindow = {
  startsAt: string;
  endsAt: string;
};

export type CustomerNotification = {
  id: string;
  customerId: string;
  returnId: string | null;
  orderId: string | null;
  type: NotificationType;
  title: string;
  message: string;
  status: string | null;
  link: string | null;
  readAt: string | null;
  createdAt: string;
};

export type ReturnItemRequest = {
  productId: string;
  quantity: number;
};

export type CustomerReturnItem = ReturnItemRequest & {
  name: string;
  unitPrice: number;
};

export type CustomerReturn = {
  id: string;
  customerId: string;
  orderId: string;
  status: ReturnStatus;
  reason: ReturnReason;
  note: string;
  items: CustomerReturnItem[];
  refundAmount: number | null;
  refundMethod: string | null;
  pickupWindowStart: string | null;
  pickupWindowEnd: string | null;
  rejectionReason: string | null;
  requestedAt: string;
  reviewedAt: string | null;
  reviewedBy: string | null;
  updatedAt: string;
};

export type ReturnEligibility = {
  eligible: boolean;
  deliveredAt: string | null;
  windowEndsAt: string | null;
  reason: "eligible" | "not_delivered" | "missing_delivery_time" | "window_closed" | "already_requested";
};

export type ReturnRequestInput = {
  orderId: string;
  items: ReturnItemRequest[];
  reason: ReturnReason;
  note: string;
};

export type AdminReturnRequest = CustomerReturn & {
  customerName: string;
  customerEmail: string;
  paymentMethod: string;
  orderTotal: number;
};

export type AdminReturnUpdateInput = {
  status: Exclude<ReturnStatus, "pending">;
  refundAmount: number | null;
  refundMethod: string | null;
  pickupWindowStart: string | null;
  pickupWindowEnd: string | null;
  rejectionReason: string | null;
};

export function returnReasonLabel(reason: ReturnReason): string {
  return RETURN_REASONS.find((item) => item.value === reason)?.label ?? "Other";
}

export function deliveredAtForOrder(order: Pick<Order, "status" | "history" | "delivered_at">): string | null {
  if (order.delivered_at) return order.delivered_at;
  const deliveredEntries = order.history.filter((entry) => entry.status === "delivered" && entry.at);
  return deliveredEntries.at(-1)?.at ?? null;
}
