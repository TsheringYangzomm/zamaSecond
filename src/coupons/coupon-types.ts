export type CouponDiscountType = "percentage" | "fixed";
export type CouponTargetType = "product" | "category";
export type CouponErrorCode =
  | "not_found"
  | "inactive"
  | "not_started"
  | "expired"
  | "usage_limit"
  | "customer_limit"
  | "ineligible"
  | "minimum_spend"
  | "not_authenticated"
  | "customer_not_found"
  | "invalid";

export type CouponTarget = {
  type: CouponTargetType;
  value: string;
  label?: string;
};

export type Coupon = {
  id: string;
  code: string;
  title: string;
  description: string;
  discountType: CouponDiscountType;
  discountValue: number;
  maximumDiscountAmount: number | null;
  minimumOrderAmount: number;
  startsAt: string;
  expiresAt: string | null;
  usageLimit: number | null;
  perCustomerLimit: number;
  active: boolean;
  targets: CouponTarget[];
  createdAt: string;
  updatedAt: string;
  collectedCount?: number;
  redeemedCount?: number;
};

export type CustomerCoupon = Coupon & {
  collected: boolean;
  redeemedCountForCustomer: number;
  lastRedeemedAt: string | null;
  canUse: boolean;
};

export type CouponLine = {
  productId: string;
  category?: string;
  quantity: number;
  unitPrice: number;
};

export type CouponPreview = {
  ok: boolean;
  code: string;
  eligibleSubtotal: number;
  discountAmount: number;
  finalTotal: number;
  coupon: Coupon | null;
  errorCode?: CouponErrorCode;
  error?: string;
};

export type CouponAdminDraft = Omit<
  Coupon,
  "createdAt" | "updatedAt" | "collectedCount" | "redeemedCount"
>;
