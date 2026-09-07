export type AdminNotificationType =
  | "order_created"
  | "order_updated"
  | "payment_updated"
  | "return_requested"
  | "review_submitted"
  | "message_received"
  | "points_redemption_requested"
  | "withdrawal_requested"
  | "customer_created"
  | "customer_updated"
  | "membership_request"
  | "membership_delivery_invoice"
  | "membership_delivery_payment_submitted"
  | "membership_delivery_skipped"
  | "membership_delivery_paid"
  | "member_early_access"
  | "system";

export type AdminNotification = {
  id: string;
  type: AdminNotificationType;
  title: string;
  message: string;
  link: string | null;
  createdAt: string;
  readAt: string | null;
};

export type AdminNotificationInput = {
  type: AdminNotificationType;
  title: string;
  message: string;
  link?: string | null;
};
