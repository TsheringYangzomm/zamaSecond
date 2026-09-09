export type MembershipPlanStatus = "draft" | "active" | "archived";
export type MembershipCadence = "monthly" | "annual" | "one_time";
export type MembershipSubscriptionStatus = "active" | "paused" | "cancelled";
export type MembershipRequestStatus = "pending" | "approved" | "rejected" | "cancelled";
export type MembershipStatus = "none" | "pending" | "active" | "paused" | "cancelled" | "rejected";
export type MembershipDeliveryTierId = "standard" | "low_cost" | "priority";
export type MembershipDeliveryCadence = "weekly" | "fortnightly" | "monthly";
export type MembershipDeliveryProfileStatus = "active" | "paused" | "cancelled";
export type MembershipDeliveryCycleStatus = "invoice_ready" | "payment_submitted" | "paid" | "skipped" | "needs_admin_resolution" | "cancelled";
export type MembershipFreebieCampaignStatus = "draft" | "active" | "archived";

export type MembershipBenefit = {
  title: string;
  description: string;
};

export type MembershipDeliveryTier = {
  id: MembershipDeliveryTierId;
  label: string;
  description: string;
  fee: number;
  enabled: boolean;
};

export type MembershipPlan = {
  id: string;
  name: string;
  description: string;
  price: number;
  cadence: MembershipCadence;
  benefits: MembershipBenefit[];
  discountPercent: number;
  deliveryTiers: MembershipDeliveryTier[];
  scheduledDeliveryEnabled: boolean;
  earlyAccessEnabled: boolean;
  freebieEnabled: boolean;
  status: MembershipPlanStatus;
  displayOrder: number;
  createdAt: string;
  updatedAt: string;
};

export type MembershipRequest = {
  id: string;
  customerId: string;
  customerName?: string;
  customerEmail?: string;
  planId: string;
  plan?: MembershipPlan | null;
  status: MembershipRequestStatus;
  paymentMethod: string;
  paymentReference: string;
  proofPath: string | null;
  submittedAt: string;
  reviewedAt: string | null;
  reviewedBy: string | null;
  rejectionReason: string | null;
};

export type MembershipSubscription = {
  id: string;
  customerId: string;
  planId: string;
  plan?: MembershipPlan | null;
  status: MembershipSubscriptionStatus;
  price: number;
  cadence: MembershipCadence;
  startDate: string;
  nextRenewalDate: string | null;
  paymentMethod: string;
  paymentReference: string;
  history: { status: MembershipSubscriptionStatus; at: string }[];
};

export type MembershipSnapshot = {
  status: MembershipStatus;
  plan: MembershipPlan | null;
  subscription: MembershipSubscription | null;
  request: MembershipRequest | null;
  memberDiscountPercent: number;
  savingsTotal: number;
};

export type MembershipPaymentProof = {
  path: string;
  name: string;
  size: number;
  type: string;
};

export type MembershipDeliveryItem = {
  productId: string;
  name: string;
  quantity: number;
  unitPrice: number;
};

export type MembershipDeliveryProfile = {
  id: string;
  customerId: string;
  subscriptionId: string;
  planId: string;
  items: MembershipDeliveryItem[];
  cadence: MembershipDeliveryCadence;
  deliveryTier: MembershipDeliveryTierId;
  deliveryArea: string;
  deliveryAddress: string;
  nextDeliveryDate: string;
  status: MembershipDeliveryProfileStatus;
  createdAt: string;
  updatedAt: string;
};

export type MembershipDeliveryCycle = {
  id: string;
  profileId: string;
  customerId: string;
  subscriptionId: string;
  deliveryDate: string;
  invoiceCreatedAt: string;
  paymentDueAt: string;
  status: MembershipDeliveryCycleStatus;
  items: MembershipDeliveryItem[];
  subtotal: number;
  deliveryFee: number;
  total: number;
  paymentReference: string | null;
  paymentProofPath: string | null;
  paymentSubmittedAt: string | null;
  paidAt: string | null;
  reviewedAt: string | null;
  reviewedBy: string | null;
  orderId: string | null;
  deliveryId: string | null;
  freebieProductId: string | null;
  freebieProductName: string | null;
  adminNote: string | null;
  createdAt: string;
  updatedAt: string;
};

export type MembershipFreebieCampaign = {
  id: string;
  planId: string;
  productId: string;
  productName?: string;
  startsAt: string;
  endsAt: string | null;
  status: MembershipFreebieCampaignStatus;
  createdAt: string;
  updatedAt: string;
};

export type AdminMembershipDeliveryProfile = MembershipDeliveryProfile & {
  customerName: string;
  customerEmail: string;
  planName: string;
};

export type AdminMembershipDeliveryCycle = MembershipDeliveryCycle & {
  customerName: string;
  customerEmail: string;
  planName: string;
  deliveryTierLabel: string;
};

export type MembershipDeliverySnapshot = {
  profile: MembershipDeliveryProfile | null;
  cycles: MembershipDeliveryCycle[];
  freebieCampaign: MembershipFreebieCampaign | null;
};

export type AdminMembershipDeliverySnapshot = {
  profiles: AdminMembershipDeliveryProfile[];
  cycles: AdminMembershipDeliveryCycle[];
  freebieCampaigns: MembershipFreebieCampaign[];
};

export type MembershipDeliveryProfilePatch = Partial<Pick<
  MembershipDeliveryProfileInput,
  "items" | "cadence" | "deliveryTier" | "deliveryArea" | "deliveryAddress" | "nextDeliveryDate"
>> & {
  status?: MembershipDeliveryProfileStatus;
};

export type MembershipDeliveryCycleReviewInput = {
  status: Extract<MembershipDeliveryCycleStatus, "paid" | "skipped" | "needs_admin_resolution" | "cancelled">;
  adminNote?: string;
};

export type MemberEarlyAccess = {
  productId: string;
  startsAt: string;
  endsAt: string;
};

export type MembershipRequestInput = {
  planId: string;
  paymentReference: string;
  proof?: MembershipPaymentProof | null;
};

export type MembershipDeliveryProfileInput = {
  items: { productId: string; quantity: number }[];
  cadence: MembershipDeliveryCadence;
  deliveryTier: MembershipDeliveryTierId;
  deliveryArea: string;
  deliveryAddress: string;
  nextDeliveryDate: string;
};

export type MembershipCyclePaymentInput = {
  paymentReference: string;
  proof?: MembershipPaymentProof | null;
};

export type MembershipFreebieCampaignDraft = Omit<MembershipFreebieCampaign, "id" | "createdAt" | "updatedAt" | "productName">;

export type MembershipPlanDraft = Omit<MembershipPlan, "id" | "createdAt" | "updatedAt">;

export type AdminMembershipRequest = MembershipRequest & {
  customerName: string;
  customerEmail: string;
};
