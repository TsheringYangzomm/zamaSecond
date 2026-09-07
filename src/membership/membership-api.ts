import { getSupabaseClient } from "../supabase";
import { getDevCustomerByEmail, loadDevOrders } from "../checkout/checkout-api";
import { commerceDevData } from "../data/commerce-dev";
import { recordDevAdminNotification } from "../admin/admin-notifications-api";
import { createDevCustomerNotification } from "../returns/returns-notifications-api";
import type {
  AdminMembershipRequest,
  MembershipBenefit,
  MembershipDeliveryTier,
  MembershipPlan,
  MembershipPlanDraft,
  MembershipRequest,
  MembershipRequestInput,
  MembershipSnapshot,
  MembershipSubscription,
} from "./membership-types";
import { defaultMembershipDeliveryTiers, nextRenewalDate, statusFromMembership } from "./membership-rules";

const devKey = "zama-membership-dev";
type DevState = {
  plans: MembershipPlan[];
  requests: MembershipRequest[];
  subscriptions: MembershipSubscription[];
};

const initialPlan: MembershipPlan = {
  id: "zama-plus-monthly",
  name: "Zama+ Membership",
  description: "A monthly membership for easier meal planning, better value, and first access to seasonal Zama drops.",
  price: 3500,
  cadence: "monthly",
  benefits: [
    { title: "Member savings", description: "Get an automatic discount on eligible catalog products at checkout." },
    { title: "Exclusive offers", description: "See member-only coupons and limited seasonal offers in your account." },
    { title: "Early access", description: "Hear about selected new products and seasonal boxes before everyone else." },
    { title: "Reward boosts", description: "Keep your points, check-ins, and review rewards together in one account." },
  ],
  discountPercent: 10,
  deliveryTiers: defaultMembershipDeliveryTiers,
  scheduledDeliveryEnabled: true,
  earlyAccessEnabled: true,
  freebieEnabled: true,
  status: "active",
  displayOrder: 0,
  createdAt: "2026-03-01T09:00:00.000Z",
  updatedAt: "2026-03-01T09:00:00.000Z",
};

function now(): string {
  return new Date().toISOString();
}

function builtInCustomerByEmail(email: string) {
  return commerceDevData.customers.find((customer) => customer.email.toLowerCase() === email.trim().toLowerCase()) ?? null;
}

function customerIdForEmail(email: string): string {
  return getDevCustomerByEmail(email)?.id ?? builtInCustomerByEmail(email)?.id ?? "cus-" + email.trim().toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 16);
}

function seedDevSubscriptions(plans: MembershipPlan[]): MembershipSubscription[] {
  const plan = plans.find((item) => item.id === initialPlan.id) ?? plans[0] ?? initialPlan;
  return commerceDevData.subscriptions
    .filter((subscription) => subscription.plan === "Zama+ Membership")
    .map((subscription) => ({
      id: subscription.id,
      customerId: subscription.customer_id,
      planId: plan.id,
      plan,
      status: subscription.status,
      price: subscription.price,
      cadence: plan.cadence,
      startDate: subscription.start_date,
      nextRenewalDate: subscription.next_delivery_date,
      paymentMethod: "Bank transfer",
      paymentReference: "",
      history: subscription.history,
    }));
}

function readDevState(): DevState {
  if (typeof window === "undefined") return { plans: [initialPlan], requests: [], subscriptions: seedDevSubscriptions([initialPlan]) };
  try {
    const parsed = JSON.parse(window.localStorage.getItem(devKey) ?? "") as Partial<DevState>;
    const plans = Array.isArray(parsed.plans) && parsed.plans.length > 0
      ? (parsed.plans as Record<string, unknown>[]).map(mapPlan)
      : [initialPlan];
    const requests = Array.isArray(parsed.requests) ? parsed.requests as MembershipRequest[] : [];
    const subscriptions = Array.isArray(parsed.subscriptions) ? parsed.subscriptions as MembershipSubscription[] : seedDevSubscriptions(plans);
    return { plans, requests, subscriptions };
  } catch {
    return { plans: [initialPlan], requests: [], subscriptions: seedDevSubscriptions([initialPlan]) };
  }
}

function writeDevState(state: DevState): void {
  if (typeof window !== "undefined") window.localStorage.setItem(devKey, JSON.stringify(state));
}

function valueOf<T>(row: Record<string, unknown>, camel: string, snake: string, fallback: T): T {
  const value = row[camel] ?? row[snake];
  return value === undefined || value === null ? fallback : value as T;
}

function mapBenefit(value: unknown): MembershipBenefit {
  if (typeof value === "string") return { title: value, description: "" };
  const row = (value ?? {}) as Record<string, unknown>;
  return { title: String(row.title ?? ""), description: String(row.description ?? "") };
}

function mapDeliveryTier(value: unknown): MembershipDeliveryTier | null {
  const row = (value ?? {}) as Record<string, unknown>;
  const id = String(row.id ?? "");
  if (id !== "standard" && id !== "low_cost" && id !== "priority") return null;
  const fallback = defaultMembershipDeliveryTiers.find((tier) => tier.id === id);
  return {
    id,
    label: String(row.label ?? fallback?.label ?? id),
    description: String(row.description ?? fallback?.description ?? ""),
    fee: Math.max(0, Number(row.fee ?? fallback?.fee ?? 0)),
    enabled: row.enabled !== false,
  };
}

function normalizedDeliveryTiers(value: unknown): MembershipDeliveryTier[] {
  const tiers = Array.isArray(value)
    ? value.map(mapDeliveryTier).filter((tier): tier is MembershipDeliveryTier => tier !== null)
    : [];
  return tiers.length > 0 ? tiers : defaultMembershipDeliveryTiers.map((tier) => ({ ...tier }));
}

function mapPlan(row: Record<string, unknown>): MembershipPlan {
  const benefits = Array.isArray(row.benefits) ? row.benefits.map(mapBenefit) : [];
  return {
    id: String(valueOf(row, "id", "id", "")),
    name: String(valueOf(row, "name", "name", "Zama+ Membership")),
    description: String(valueOf(row, "description", "description", "")),
    price: Number(valueOf(row, "price", "price", 0)),
    cadence: valueOf(row, "cadence", "cadence", "monthly") as MembershipPlan["cadence"],
    benefits,
    discountPercent: Number(valueOf(row, "discountPercent", "discount_percent", 0)),
    deliveryTiers: normalizedDeliveryTiers(row.deliveryTiers ?? row.delivery_tiers),
    scheduledDeliveryEnabled: valueOf(row, "scheduledDeliveryEnabled", "scheduled_delivery_enabled", true),
    earlyAccessEnabled: valueOf(row, "earlyAccessEnabled", "early_access_enabled", true),
    freebieEnabled: valueOf(row, "freebieEnabled", "freebie_enabled", true),
    status: valueOf(row, "status", "status", "active") as MembershipPlan["status"],
    displayOrder: Number(valueOf(row, "displayOrder", "display_order", 0)),
    createdAt: String(valueOf(row, "createdAt", "created_at", "")),
    updatedAt: String(valueOf(row, "updatedAt", "updated_at", "")),
  };
}

function mapRequest(row: Record<string, unknown>, plans: MembershipPlan[]): MembershipRequest {
  const planId = String(valueOf(row, "planId", "plan_id", ""));
  return {
    id: String(valueOf(row, "id", "id", "")),
    customerId: String(valueOf(row, "customerId", "customer_id", "")),
    customerName: valueOf(row, "customerName", "customer_name", undefined) as string | undefined,
    customerEmail: valueOf(row, "customerEmail", "customer_email", undefined) as string | undefined,
    planId,
    plan: plans.find((plan) => plan.id === planId) ?? null,
    status: valueOf(row, "status", "status", "pending") as MembershipRequest["status"],
    paymentMethod: String(valueOf(row, "paymentMethod", "payment_method", "Bank transfer")),
    paymentReference: String(valueOf(row, "paymentReference", "payment_reference", "")),
    proofPath: valueOf(row, "proofPath", "proof_path", null) as string | null,
    submittedAt: String(valueOf(row, "submittedAt", "submitted_at", "")),
    reviewedAt: valueOf(row, "reviewedAt", "reviewed_at", null) as string | null,
    reviewedBy: valueOf(row, "reviewedBy", "reviewed_by", null) as string | null,
    rejectionReason: valueOf(row, "rejectionReason", "rejection_reason", null) as string | null,
  };
}

function mapSubscription(row: Record<string, unknown>, plans: MembershipPlan[]): MembershipSubscription {
  const planId = String(valueOf(row, "planId", "plan_id", ""));
  return {
    id: String(valueOf(row, "id", "id", "")),
    customerId: String(valueOf(row, "customerId", "customer_id", "")),
    planId,
    plan: plans.find((plan) => plan.id === planId) ?? null,
    status: valueOf(row, "status", "status", "active") as MembershipSubscription["status"],
    price: Number(valueOf(row, "price", "price", 0)),
    cadence: valueOf(row, "cadence", "cadence", "monthly") as MembershipSubscription["cadence"],
    startDate: String(valueOf(row, "startDate", "start_date", "")),
    nextRenewalDate: valueOf(row, "nextRenewalDate", "next_renewal_date", null) as string | null,
    paymentMethod: String(valueOf(row, "paymentMethod", "payment_method", "Bank transfer")),
    paymentReference: String(valueOf(row, "paymentReference", "payment_reference", "")),
    history: valueOf(row, "history", "history", []) as { status: MembershipSubscription["status"]; at: string }[],
  };
}

function snapshotFrom(subscription: MembershipSubscription | null, request: MembershipRequest | null, savingsTotal = 0): MembershipSnapshot {
  const plan = subscription?.plan ?? request?.plan ?? null;
  return {
    status: statusFromMembership(subscription, request),
    plan,
    subscription,
    request,
    memberDiscountPercent: subscription?.status === "active" ? plan?.discountPercent ?? 0 : 0,
    savingsTotal,
  };
}

function missingSchema(error: unknown): boolean {
  const normalized = (error instanceof Error ? error.message : String(error ?? "")).toLowerCase();
  return normalized.includes("schema cache") || normalized.includes("does not exist") || normalized.includes("could not find the function");
}

function mapSnapshot(data: unknown): MembershipSnapshot {
  const row = (data ?? {}) as Record<string, unknown>;
  const plan = row.plan && typeof row.plan === "object" ? mapPlan(row.plan as Record<string, unknown>) : null;
  const request = row.request && typeof row.request === "object" ? mapRequest(row.request as Record<string, unknown>, plan ? [plan] : []) : null;
  const subscription = row.subscription && typeof row.subscription === "object" ? mapSubscription(row.subscription as Record<string, unknown>, plan ? [plan] : []) : null;
  return snapshotFrom(subscription, request, Number(row.savings_total ?? row.savingsTotal ?? 0));
}

export async function fetchMembershipPlans(includeInactive = false): Promise<MembershipPlan[]> {
  const client = getSupabaseClient();
  if (client) {
    try {
      const { data, error } = await client.rpc(includeInactive ? "get_admin_membership_plans" : "get_membership_plans");
      if (error) throw new Error(error.message);
      return Array.isArray(data) ? data.map((row) => mapPlan(row as Record<string, unknown>)) : [];
    } catch (error) {
      if (!missingSchema(error)) throw error;
    }
  }
  return readDevState().plans.filter((plan) => includeInactive || plan.status === "active").sort((a, b) => a.displayOrder - b.displayOrder);
}

export async function fetchMyMembership(email: string): Promise<MembershipSnapshot> {
  const client = getSupabaseClient();
  if (client) {
    try {
      const { data, error } = await client.rpc("get_my_membership");
      if (error) throw new Error(error.message);
      return mapSnapshot(data);
    } catch (error) {
      if (!missingSchema(error)) throw error;
    }
  }
  const state = readDevState();
  const customerId = customerIdForEmail(email);
  const subscription = state.subscriptions.find((item) => item.customerId === customerId && item.status !== "cancelled") ?? null;
  const request = state.requests
    .filter((item) => item.customerId === customerId)
    .sort((a, b) => b.submittedAt.localeCompare(a.submittedAt))[0] ?? null;
  const savingsTotal = loadDevOrders()
    .filter((order) => order.customer_id === customerId)
    .reduce((total, order) => total + (order.membership_discount ?? 0), 0);
  return snapshotFrom(
    subscription ? { ...subscription, plan: state.plans.find((plan) => plan.id === subscription.planId) ?? subscription.plan ?? null } : null,
    request ? { ...request, plan: state.plans.find((plan) => plan.id === request.planId) ?? request.plan ?? null } : null,
    savingsTotal,
  );
}

export async function requestMembership(email: string, input: MembershipRequestInput): Promise<MembershipSnapshot> {
  const reference = input.paymentReference.trim();
  if (!reference) throw new Error("Enter the bank-transfer reference before submitting.");
  const client = getSupabaseClient();
  if (client) {
    try {
      const { data, error } = await client.rpc("request_membership", {
        p_plan_id: input.planId,
        p_payment_method: "Bank transfer",
        p_payment_reference: reference,
        // A dev/placeholder proof means Storage was unavailable. The transfer
        // reference remains sufficient for the request, so do not send the
        // placeholder path to the live RPC where it would fail path validation.
        p_proof_path: input.proof?.path && !input.proof.path.startsWith("dev/") ? input.proof.path : null,
      });
      if (error) throw new Error(error.message);
      const result = (data ?? {}) as Record<string, unknown>;
      if (result.status !== "ok") throw new Error(String(result.error ?? "Your membership request could not be submitted."));
      return mapSnapshot(result.snapshot);
    } catch (error) {
      if (!missingSchema(error)) throw error;
    }
  }
  const state = readDevState();
  const customerId = customerIdForEmail(email);
  const existing = state.requests.find((item) => item.customerId === customerId && item.status === "pending");
  if (existing || state.subscriptions.some((item) => item.customerId === customerId && item.status === "active")) {
    throw new Error("You already have an active or pending membership.");
  }
  const plan = state.plans.find((item) => item.id === input.planId && item.status === "active");
  if (!plan) throw new Error("That membership plan is not available.");
  const request: MembershipRequest = {
    id: "membership-request-" + Date.now(),
    customerId,
    customerName: getDevCustomerByEmail(email)?.name ?? builtInCustomerByEmail(email)?.name ?? "",
    customerEmail: email.trim().toLowerCase(),
    planId: plan.id,
    plan,
    status: "pending",
    paymentMethod: "Bank transfer",
    paymentReference: reference,
    proofPath: input.proof?.path ?? null,
    submittedAt: now(),
    reviewedAt: null,
    reviewedBy: null,
    rejectionReason: null,
  };
  state.requests = [request, ...state.requests];
  writeDevState(state);
  createDevCustomerNotification({
    customerId,
    returnId: null,
    orderId: null,
    type: "membership_request",
    title: "Membership request received",
    message: "Your request to join " + plan.name + " is waiting for payment verification.",
    status: "pending",
    link: "#/account/membership",
  });
  recordDevAdminNotification({
    type: "membership_request",
    title: "New Zama+ membership request",
    message: (request.customerName || "A customer") + " submitted a bank-transfer request for " + plan.name + ".",
    link: "#/admin?tab=subscriptions",
  });
  return snapshotFrom(null, request);
}

export async function uploadMembershipProof(email: string, file: File): Promise<{ path: string; name: string; size: number; type: string } | null> {
  if (file.size > 5 * 1024 * 1024) throw new Error("Proof images must be smaller than 5 MB.");
  if (!file.type.startsWith("image/")) throw new Error("Please choose an image of your transfer receipt.");
  const path = customerIdForEmail(email) + "/" + Date.now() + "-" + file.name.replace(/[^a-zA-Z0-9._-]/g, "-");
  const client = getSupabaseClient();
  if (client) {
    try {
      const { error } = await client.storage.from("membership-payment-proofs").upload(path, file, { upsert: false });
      if (error) throw new Error(error.message);
      return { path, name: file.name, size: file.size, type: file.type };
    } catch (error) {
      if (!missingSchema(error)) return null;
    }
  }
  return { path: "dev/" + path, name: file.name, size: file.size, type: file.type };
}

export async function getMembershipProofUrl(path: string): Promise<string | null> {
  const client = getSupabaseClient();
  if (!client || path.startsWith("dev/")) return null;
  const { data, error } = await client.storage.from("membership-payment-proofs").createSignedUrl(path, 300);
  if (error) return null;
  return data?.signedUrl ?? null;
}

export async function previewMembershipDiscount(email: string, subtotal: number): Promise<{ discountAmount: number; finalTotal: number; percent: number }> {
  const snapshot = await fetchMyMembership(email);
  const percent = snapshot.status === "active" ? snapshot.memberDiscountPercent : 0;
  const discountAmount = percent > 0 ? Math.min(Math.max(0, subtotal), Math.round(subtotal * percent) / 100) : 0;
  return { discountAmount, finalTotal: Math.max(0, subtotal - discountAmount), percent };
}

export async function fetchAdminMembershipPlans(): Promise<MembershipPlan[]> {
  return fetchMembershipPlans(true);
}

export async function fetchAdminMembershipRequests(): Promise<AdminMembershipRequest[]> {
  const client = getSupabaseClient();
  if (client) {
    try {
      const { data, error } = await client.rpc("get_admin_membership_requests");
      if (error) throw new Error(error.message);
      const plans = await fetchAdminMembershipPlans();
      return Array.isArray(data) ? data.map((row) => mapRequest(row as Record<string, unknown>, plans)) as AdminMembershipRequest[] : [];
    } catch (error) {
      if (!missingSchema(error)) throw error;
    }
  }
  const state = readDevState();
  return state.requests.map((request) => {
    const customer = commerceDevData.customers.find((item) => item.id === request.customerId);
    return {
      ...request,
      plan: state.plans.find((plan) => plan.id === request.planId) ?? request.plan ?? null,
      customerName: request.customerName ?? customer?.name ?? "Customer",
      customerEmail: request.customerEmail ?? customer?.email ?? "",
    };
  }).sort((a, b) => b.submittedAt.localeCompare(a.submittedAt));
}

export async function createMembershipPlan(draft: MembershipPlanDraft): Promise<MembershipPlan> {
  if (!draft.name.trim() || draft.price < 0 || draft.discountPercent < 0 || draft.discountPercent > 100) throw new Error("Enter a valid plan name, price, and discount.");
  const client = getSupabaseClient();
  if (client) {
    try {
      const { data, error } = await client.from("membership_plans").insert({
        name: draft.name.trim(),
        description: draft.description.trim(),
        price: draft.price,
        cadence: draft.cadence,
        benefits: draft.benefits,
        discount_percent: draft.discountPercent,
        delivery_tiers: draft.deliveryTiers,
        scheduled_delivery_enabled: draft.scheduledDeliveryEnabled,
        early_access_enabled: draft.earlyAccessEnabled,
        freebie_enabled: draft.freebieEnabled,
        status: draft.status,
        display_order: draft.displayOrder,
      }).select("*").single();
      if (error) throw new Error(error.message);
      return mapPlan(data as Record<string, unknown>);
    } catch (error) {
      if (!missingSchema(error)) throw error;
    }
  }
  const state = readDevState();
  const timestamp = now();
  const plan: MembershipPlan = { ...draft, id: "membership-plan-" + Date.now(), name: draft.name.trim(), createdAt: timestamp, updatedAt: timestamp };
  state.plans = [...state.plans, plan];
  writeDevState(state);
  return plan;
}

export async function updateMembershipPlan(id: string, draft: MembershipPlanDraft): Promise<MembershipPlan> {
  const client = getSupabaseClient();
  if (client) {
    try {
      const { data, error } = await client.from("membership_plans").update({
        name: draft.name.trim(),
        description: draft.description.trim(),
        price: draft.price,
        cadence: draft.cadence,
        benefits: draft.benefits,
        discount_percent: draft.discountPercent,
        delivery_tiers: draft.deliveryTiers,
        scheduled_delivery_enabled: draft.scheduledDeliveryEnabled,
        early_access_enabled: draft.earlyAccessEnabled,
        freebie_enabled: draft.freebieEnabled,
        status: draft.status,
        display_order: draft.displayOrder,
      }).eq("id", id).select("*").single();
      if (error) throw new Error(error.message);
      return mapPlan(data as Record<string, unknown>);
    } catch (error) {
      if (!missingSchema(error)) throw error;
    }
  }
  const state = readDevState();
  const current = state.plans.find((plan) => plan.id === id);
  if (!current) throw new Error("Membership plan not found.");
  const updated = { ...current, ...draft, name: draft.name.trim(), updatedAt: now() };
  state.plans = state.plans.map((plan) => plan.id === id ? updated : plan);
  state.subscriptions = state.subscriptions.map((subscription) => subscription.planId === id ? { ...subscription, plan: updated, price: updated.price, cadence: updated.cadence } : subscription);
  writeDevState(state);
  state.subscriptions
    .filter((subscription) => subscription.planId === id && subscription.status === "active")
    .forEach((subscription) => createDevCustomerNotification({
      customerId: subscription.customerId,
      returnId: null,
      orderId: null,
      type: "membership_updated",
      title: "Membership plan updated",
      message: `${updated.name} was updated. Your account now shows the latest member benefits and pricing details.`,
      status: "active",
      link: "#/account/membership",
    }));
  return updated;
}

export async function archiveMembershipPlan(id: string): Promise<void> {
  const current = (await fetchAdminMembershipPlans()).find((plan) => plan.id === id);
  if (!current) throw new Error("Membership plan not found.");
  await updateMembershipPlan(id, { ...current, status: "archived" });
}

export async function reviewMembershipRequest(requestId: string, status: "approved" | "rejected", adminEmail: string, rejectionReason = ""): Promise<void> {
  if (status === "rejected" && !rejectionReason.trim()) throw new Error("Add a reason before rejecting the membership request.");
  const client = getSupabaseClient();
  if (client) {
    try {
      const { data, error } = await client.rpc("admin_review_membership_request", {
        p_request_id: requestId,
        p_status: status,
        p_admin_email: adminEmail,
        p_rejection_reason: rejectionReason.trim() || null,
      });
      if (error) throw new Error(error.message);
      const result = (data ?? {}) as Record<string, unknown>;
      if (result.status !== "ok") throw new Error(String(result.error ?? "The membership request could not be updated."));
      return;
    } catch (error) {
      if (!missingSchema(error)) throw error;
    }
  }
  const state = readDevState();
  const request = state.requests.find((item) => item.id === requestId);
  if (!request) throw new Error("Membership request not found.");
  const plan = state.plans.find((item) => item.id === request.planId) ?? null;
  request.status = status;
  request.reviewedAt = now();
  request.reviewedBy = adminEmail;
  request.rejectionReason = status === "rejected" ? rejectionReason.trim() : null;
  if (status === "approved" && plan) {
    const startDate = now();
    const subscription: MembershipSubscription = {
      id: "SUB-" + Date.now(),
      customerId: request.customerId,
      planId: plan.id,
      plan,
      status: "active",
      price: plan.price,
      cadence: plan.cadence,
      startDate,
      nextRenewalDate: nextRenewalDate(startDate, plan.cadence),
      paymentMethod: request.paymentMethod,
      paymentReference: request.paymentReference,
      history: [{ status: "active", at: startDate }],
    };
    state.subscriptions = [subscription, ...state.subscriptions.filter((item) => item.customerId !== request.customerId || item.status === "cancelled")];
  }
  writeDevState(state);
  createDevCustomerNotification({
    customerId: request.customerId,
    returnId: null,
    orderId: null,
    type: status === "approved" ? "membership_approved" : "membership_rejected",
    title: status === "approved" ? "Zama+ membership approved" : "Membership request needs attention",
    message: status === "approved" ? "Your " + (plan?.name ?? "Zama+ membership") + " is now active." : "Your membership request was rejected: " + rejectionReason.trim() + ".",
    status,
    link: "#/account/membership",
  });
}
