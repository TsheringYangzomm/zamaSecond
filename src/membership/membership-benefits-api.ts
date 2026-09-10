import { getSupabaseClient } from "../supabase";
import { createDevMembershipCycleOrder, getDevCustomerByEmail, getDevCustomers, type CustomerProfile } from "../checkout/checkout-api";
import type { Customer } from "../admin/commerce-types";
import { recordDevAdminNotification } from "../admin/admin-notifications-api";
import { createDevCustomerNotification } from "../returns/returns-notifications-api";
import { shopProducts } from "../components/shop/shop-utils";
import { commerceDevData } from "../data/commerce-dev";
import {
  defaultMembershipDeliveryTiers,
  deliveryPaymentDueAt,
  nextDeliveryDate,
} from "./membership-rules";
import { fetchMembershipPlans, fetchMyMembership, uploadMembershipProof } from "./membership-api";
import type {
  AdminMembershipDeliverySnapshot,
  MembershipCyclePaymentInput,
  MembershipDeliveryCycle,
  MembershipDeliveryCycleReviewInput,
  MembershipDeliveryItem,
  MembershipDeliveryProfile,
  MembershipDeliveryProfileInput,
  MembershipDeliveryProfilePatch,
  MembershipDeliverySnapshot,
  MembershipFreebieCampaign,
  MembershipFreebieCampaignDraft,
  MembershipPlan,
} from "./membership-types";

const devKey = "zama-membership-benefits-dev";

type DevState = {
  profiles: MembershipDeliveryProfile[];
  cycles: MembershipDeliveryCycle[];
  freebieCampaigns: MembershipFreebieCampaign[];
  notifiedEarlyAccessProducts: string[];
  notifiedPublicReleaseProducts: string[];
};

type RawRow = Record<string, unknown>;

function now(): string {
  return new Date().toISOString();
}

function missingSchema(error: unknown): boolean {
  const text = (error instanceof Error ? error.message : String(error ?? "")).toLowerCase();
  return text.includes("schema cache") || text.includes("does not exist") || text.includes("could not find the function");
}

function valueOf<T>(row: RawRow, camel: string, snake: string, fallback: T): T {
  const value = row[camel] ?? row[snake];
  return value === null || value === undefined ? fallback : value as T;
}

function thimphuDate(value = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Thimphu",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(value);
  const part = (type: string) => parts.find((item) => item.type === type)?.value ?? "01";
  return `${part("year")}-${part("month")}-${part("day")}`;
}

function dateAtThimphuMidday(value: string): number {
  return new Date(`${value}T12:00:00+06:00`).getTime();
}

function daysFromToday(value: string): number {
  const today = dateAtThimphuMidday(thimphuDate());
  const target = dateAtThimphuMidday(value);
  return Number.isFinite(target) ? Math.round((target - today) / 86_400_000) : Number.NaN;
}

function defaultDevState(): DevState {
  return { profiles: [], cycles: [], freebieCampaigns: [], notifiedEarlyAccessProducts: [], notifiedPublicReleaseProducts: [] };
}

function readDevState(): DevState {
  if (typeof window === "undefined") return defaultDevState();
  try {
    const parsed = JSON.parse(window.localStorage.getItem(devKey) ?? "") as Partial<DevState>;
    return {
      profiles: Array.isArray(parsed.profiles) ? parsed.profiles as MembershipDeliveryProfile[] : [],
      cycles: Array.isArray(parsed.cycles) ? parsed.cycles as MembershipDeliveryCycle[] : [],
      freebieCampaigns: Array.isArray(parsed.freebieCampaigns) ? parsed.freebieCampaigns as MembershipFreebieCampaign[] : [],
      notifiedEarlyAccessProducts: Array.isArray(parsed.notifiedEarlyAccessProducts) ? parsed.notifiedEarlyAccessProducts.filter((item): item is string => typeof item === "string") : [],
      notifiedPublicReleaseProducts: Array.isArray(parsed.notifiedPublicReleaseProducts) ? parsed.notifiedPublicReleaseProducts.filter((item): item is string => typeof item === "string") : [],
    };
  } catch {
    return defaultDevState();
  }
}

function writeDevState(state: DevState): void {
  if (typeof window !== "undefined") window.localStorage.setItem(devKey, JSON.stringify(state));
}

function customerIdForEmail(email: string): string {
  return getDevCustomerByEmail(email)?.id ?? `cus-${email.trim().toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 16)}`;
}

function mapItems(value: unknown): MembershipDeliveryItem[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((entry) => {
    const row = (entry ?? {}) as RawRow;
    const productId = String(row.productId ?? row.product_id ?? "");
    const quantity = Math.max(0, Math.floor(Number(row.quantity ?? 0)));
    if (!productId || quantity < 1) return [];
    return [{
      productId,
      name: String(row.name ?? "Product"),
      quantity,
      unitPrice: Math.max(0, Number(row.unitPrice ?? row.unit_price ?? row.price ?? 0)),
    }];
  });
}

function mapProfile(row: RawRow): MembershipDeliveryProfile {
  return {
    id: String(valueOf(row, "id", "id", "")),
    customerId: String(valueOf(row, "customerId", "customer_id", "")),
    subscriptionId: String(valueOf(row, "subscriptionId", "subscription_id", "")),
    planId: String(valueOf(row, "planId", "plan_id", "")),
    items: mapItems(row.items),
    cadence: valueOf(row, "cadence", "cadence", "weekly") as MembershipDeliveryProfile["cadence"],
    deliveryTier: valueOf(row, "deliveryTier", "delivery_tier", "standard") as MembershipDeliveryProfile["deliveryTier"],
    deliveryArea: String(valueOf(row, "deliveryArea", "delivery_area", "")),
    deliveryAddress: String(valueOf(row, "deliveryAddress", "delivery_address", "")),
    nextDeliveryDate: String(valueOf(row, "nextDeliveryDate", "next_delivery_date", "")),
    status: valueOf(row, "status", "status", "active") as MembershipDeliveryProfile["status"],
    createdAt: String(valueOf(row, "createdAt", "created_at", "")),
    updatedAt: String(valueOf(row, "updatedAt", "updated_at", "")),
  };
}

function mapCycle(row: RawRow): MembershipDeliveryCycle {
  return {
    id: String(valueOf(row, "id", "id", "")),
    profileId: String(valueOf(row, "profileId", "profile_id", "")),
    customerId: String(valueOf(row, "customerId", "customer_id", "")),
    subscriptionId: String(valueOf(row, "subscriptionId", "subscription_id", "")),
    deliveryDate: String(valueOf(row, "deliveryDate", "delivery_date", "")),
    invoiceCreatedAt: String(valueOf(row, "invoiceCreatedAt", "invoice_created_at", "")),
    paymentDueAt: String(valueOf(row, "paymentDueAt", "payment_due_at", "")),
    status: valueOf(row, "status", "status", "invoice_ready") as MembershipDeliveryCycle["status"],
    items: mapItems(row.items),
    subtotal: Number(valueOf(row, "subtotal", "subtotal", 0)),
    deliveryFee: Number(valueOf(row, "deliveryFee", "delivery_fee", 0)),
    total: Number(valueOf(row, "total", "total", 0)),
    paymentReference: valueOf(row, "paymentReference", "payment_reference", null) as string | null,
    paymentProofPath: valueOf(row, "paymentProofPath", "payment_proof_path", null) as string | null,
    paymentSubmittedAt: valueOf(row, "paymentSubmittedAt", "payment_submitted_at", null) as string | null,
    paidAt: valueOf(row, "paidAt", "paid_at", null) as string | null,
    reviewedAt: valueOf(row, "reviewedAt", "reviewed_at", null) as string | null,
    reviewedBy: valueOf(row, "reviewedBy", "reviewed_by", null) as string | null,
    orderId: valueOf(row, "orderId", "order_id", null) as string | null,
    deliveryId: valueOf(row, "deliveryId", "delivery_id", null) as string | null,
    freebieProductId: valueOf(row, "freebieProductId", "freebie_product_id", null) as string | null,
    freebieProductName: valueOf(row, "freebieProductName", "freebie_product_name", null) as string | null,
    adminNote: valueOf(row, "adminNote", "admin_note", null) as string | null,
    createdAt: String(valueOf(row, "createdAt", "created_at", "")),
    updatedAt: String(valueOf(row, "updatedAt", "updated_at", "")),
  };
}

function mapFreebieCampaign(row: RawRow): MembershipFreebieCampaign {
  return {
    id: String(valueOf(row, "id", "id", "")),
    planId: String(valueOf(row, "planId", "plan_id", "")),
    productId: String(valueOf(row, "productId", "product_id", "")),
    productName: valueOf(row, "productName", "product_name", undefined) as string | undefined,
    startsAt: String(valueOf(row, "startsAt", "starts_at", "")),
    endsAt: valueOf(row, "endsAt", "ends_at", null) as string | null,
    status: valueOf(row, "status", "status", "draft") as MembershipFreebieCampaign["status"],
    createdAt: String(valueOf(row, "createdAt", "created_at", "")),
    updatedAt: String(valueOf(row, "updatedAt", "updated_at", "")),
  };
}

function activeFreebieCampaign(campaigns: MembershipFreebieCampaign[], planId: string, at = now()): MembershipFreebieCampaign | null {
  return campaigns.find((campaign) => campaign.planId === planId && campaign.status === "active" && campaign.startsAt <= at && (!campaign.endsAt || campaign.endsAt > at)) ?? null;
}

function planFor(plans: MembershipPlan[], planId: string): MembershipPlan | null {
  return plans.find((plan) => plan.id === planId) ?? null;
}

function validDeliveryItems(input: MembershipDeliveryProfileInput["items"]): MembershipDeliveryItem[] {
  const quantities = new Map<string, number>();
  for (const entry of input) {
    const productId = entry.productId.trim();
    const quantity = Math.max(0, Math.floor(Number(entry.quantity)));
    if (productId && quantity > 0) quantities.set(productId, (quantities.get(productId) ?? 0) + quantity);
  }
  const available = new Map(shopProducts
    .filter((product) => product.active !== false && product.category !== "Custom boxes" && product.priceAmount !== null)
    .map((product) => [product.id, product]));
  const lines: MembershipDeliveryItem[] = [];
  for (const [productId, quantity] of quantities) {
    const product = available.get(productId);
    if (!product || product.priceAmount === null) throw new Error("Choose only active catalog products for a saved box. Custom boxes cannot be scheduled yet.");
    if (quantity > 20) throw new Error("Keep each saved-box item to 20 or fewer units.");
    lines.push({ productId, name: product.name, quantity, unitPrice: product.priceAmount });
  }
  if (lines.length === 0) throw new Error("Add at least one eligible catalog product to your saved box.");
  return lines;
}

function validateProfileInput(input: MembershipDeliveryProfileInput, plan: MembershipPlan): MembershipDeliveryItem[] {
  if (!plan.scheduledDeliveryEnabled) throw new Error("Scheduled delivery is not included with this membership plan.");
  if (!input.deliveryArea.trim() || !input.deliveryAddress.trim()) throw new Error("Add the delivery area and address for your scheduled box.");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.nextDeliveryDate) || daysFromToday(input.nextDeliveryDate) < 0) {
    throw new Error("Choose a delivery date that is today or later in Bhutan time.");
  }
  const tier = plan.deliveryTiers.find((item) => item.id === input.deliveryTier && item.enabled);
  if (!tier) throw new Error("That delivery tier is not available with your membership plan.");
  return validDeliveryItems(input.items);
}

function devCustomerById(customerId: string): Customer | null {
  return getDevCustomers().find((customer) => customer.id === customerId)
    ?? commerceDevData.customers.find((customer) => customer.id === customerId)
    ?? null;
}

function makeCycle(profile: MembershipDeliveryProfile, plan: MembershipPlan, campaigns: MembershipFreebieCampaign[]): MembershipDeliveryCycle {
  const tier = plan.deliveryTiers.find((item) => item.id === profile.deliveryTier && item.enabled)
    ?? defaultMembershipDeliveryTiers.find((item) => item.id === profile.deliveryTier)
    ?? defaultMembershipDeliveryTiers[0];
  const campaign = plan.freebieEnabled ? activeFreebieCampaign(campaigns, plan.id) : null;
  const freebie = campaign ? shopProducts.find((product) => product.id === campaign.productId && product.active !== false) : null;
  const timestamp = now();
  const subtotal = profile.items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
  return {
    id: `membership-cycle-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    profileId: profile.id,
    customerId: profile.customerId,
    subscriptionId: profile.subscriptionId,
    deliveryDate: profile.nextDeliveryDate,
    invoiceCreatedAt: timestamp,
    paymentDueAt: deliveryPaymentDueAt(profile.nextDeliveryDate),
    status: "invoice_ready",
    items: profile.items,
    subtotal,
    deliveryFee: tier.fee,
    total: subtotal + tier.fee,
    paymentReference: null,
    paymentProofPath: null,
    paymentSubmittedAt: null,
    paidAt: null,
    reviewedAt: null,
    reviewedBy: null,
    orderId: null,
    deliveryId: null,
    freebieProductId: freebie?.id ?? null,
    freebieProductName: freebie?.name ?? null,
    adminNote: campaign && !freebie ? "The configured freebie is unavailable. An admin must resolve it before this paid cycle can be created." : null,
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

function profileForCustomer(state: DevState, customerId: string): MembershipDeliveryProfile | null {
  return state.profiles
    .filter((profile) => profile.customerId === customerId && profile.status !== "cancelled")
    .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))[0] ?? null;
}

function notifyDevInvoice(profile: MembershipDeliveryProfile, cycle: MembershipDeliveryCycle): void {
  createDevCustomerNotification({
    customerId: profile.customerId,
    returnId: null,
    orderId: null,
    type: "membership_delivery_invoice",
    title: "Your scheduled box is ready to pay",
    message: `Your ${cycle.deliveryDate} saved-box invoice is Nu. ${new Intl.NumberFormat("en-BT").format(cycle.total)}. Submit your bank-transfer reference by 18:00 Bhutan time on the day before delivery.`,
    status: cycle.status,
    link: "/account/membership",
  });
  recordDevAdminNotification({
    type: "membership_delivery_invoice",
    title: "Scheduled box invoice created",
    message: `A saved-box invoice is ready for ${cycle.deliveryDate}.`,
    link: "/admin?tab=subscriptions",
  });
}

async function processDevProductNotifications(state: DevState): Promise<boolean> {
  const current = now();
  const customers = [...commerceDevData.customers, ...getDevCustomers()].filter((customer, index, all) =>
    all.findIndex((candidate) => candidate.email.toLowerCase() === customer.email.toLowerCase()) === index,
  );
  let changed = false;
  const earlyProducts = shopProducts.filter((product) => {
    const starts = product.memberEarlyAccessStartsAt;
    const ends = product.memberEarlyAccessEndsAt;
    return Boolean(starts && ends && starts <= current && ends > current);
  });
  for (const product of earlyProducts) {
    const token = `${product.id}:${product.memberEarlyAccessStartsAt}`;
    if (state.notifiedEarlyAccessProducts.includes(token)) continue;
    const activeMemberIds = new Set((await Promise.all(customers.map(async (customer) => {
      const membership = await fetchMyMembership(customer.email);
      return membership.status === "active" && membership.plan?.earlyAccessEnabled ? customer.id : null;
    }))).filter((customerId): customerId is string => Boolean(customerId)));
    if (activeMemberIds.size === 0) continue;
    for (const customerId of activeMemberIds) {
      createDevCustomerNotification({
        customerId,
        returnId: null,
        orderId: null,
        type: "member_early_access",
        title: "Early access is open",
        message: `${product.name} is available to Zama+ members before public release.`,
        status: "active",
        link: `/shop/${product.id}`,
      });
    }
    recordDevAdminNotification({
      type: "member_early_access",
      title: "Member early access opened",
      message: `${product.name} is visible to eligible Zama+ members.`,
      link: "/admin?tab=products",
    });
    state.notifiedEarlyAccessProducts.push(token);
    changed = true;
  }

  const publicReleaseProducts = shopProducts.filter((product) => Boolean(
    product.memberEarlyAccessEndsAt && product.memberEarlyAccessEndsAt <= current,
  ));
  for (const product of publicReleaseProducts) {
    const token = `${product.id}:${product.memberEarlyAccessEndsAt}`;
    if (state.notifiedPublicReleaseProducts.includes(token)) continue;
    for (const customer of customers) {
      createDevCustomerNotification({
        customerId: customer.id,
        returnId: null,
        orderId: null,
        type: "product_available",
        title: "New product available",
        message: `${product.name} is now available in the Zama shop.`,
        status: null,
        link: `/shop/${product.id}`,
      });
    }
    state.notifiedPublicReleaseProducts.push(token);
    changed = true;
  }
  return changed;
}

export async function processMembershipDueCycles(): Promise<void> {
  const client = getSupabaseClient();
  if (client) {
    try {
      const { error } = await client.rpc("process_membership_due_cycles");
      if (error) throw new Error(error.message);
      return;
    } catch (error) {
      if (!missingSchema(error)) throw error;
    }
  }

  const state = readDevState();
  const plans = await fetchMembershipPlans(true);
  let changed = false;
  for (const profile of state.profiles.filter((item) => item.status === "active")) {
    const plan = planFor(plans, profile.planId);
    if (!plan || !plan.scheduledDeliveryEnabled) continue;
    const currentCycle = state.cycles.find((cycle) => cycle.profileId === profile.id && cycle.deliveryDate === profile.nextDeliveryDate);
    if (!currentCycle && daysFromToday(profile.nextDeliveryDate) <= 3) {
      const cycle = makeCycle(profile, plan, state.freebieCampaigns);
      state.cycles = [cycle, ...state.cycles];
      notifyDevInvoice(profile, cycle);
      changed = true;
    }
  }

  const timestamp = now();
  for (const cycle of state.cycles) {
    const profile = state.profiles.find((item) => item.id === cycle.profileId);
    if (!profile || new Date(cycle.paymentDueAt).getTime() >= Date.now()) continue;
    if (cycle.status === "invoice_ready") {
      cycle.status = "skipped";
      cycle.adminNote = "Skipped because no bank-transfer reference was submitted by the payment cutoff.";
      cycle.updatedAt = timestamp;
      if (profile.nextDeliveryDate === cycle.deliveryDate) profile.nextDeliveryDate = nextDeliveryDate(cycle.deliveryDate, profile.cadence);
      profile.updatedAt = timestamp;
      createDevCustomerNotification({
        customerId: cycle.customerId,
        returnId: null,
        orderId: null,
        type: "membership_delivery_skipped",
        title: "Scheduled delivery skipped",
        message: `We did not receive a payment reference by the 18:00 Bhutan-time cutoff, so the ${cycle.deliveryDate} delivery was skipped. Your next scheduled date has been updated.`,
        status: cycle.status,
        link: "/account/membership",
      });
      recordDevAdminNotification({
        type: "membership_delivery_skipped",
        title: "Scheduled box skipped",
        message: `The ${cycle.deliveryDate} saved-box cycle was skipped because no payment reference was submitted.`,
        link: "/admin?tab=subscriptions",
      });
      changed = true;
    } else if (cycle.status === "payment_submitted") {
      cycle.status = "needs_admin_resolution";
      cycle.adminNote = "Payment reference was submitted before the cutoff and needs urgent verification.";
      cycle.updatedAt = timestamp;
      recordDevAdminNotification({
        type: "membership_delivery_payment_submitted",
        title: "Urgent scheduled-box payment review",
        message: `A payment reference was submitted for the ${cycle.deliveryDate} saved-box cycle and needs verification.`,
        link: "/admin?tab=subscriptions",
      });
      changed = true;
    }
  }
  changed = (await processDevProductNotifications(state)) || changed;
  if (changed) writeDevState(state);
}

export async function fetchMyMembershipDelivery(email: string): Promise<MembershipDeliverySnapshot> {
  const client = getSupabaseClient();
  if (client) {
    try {
      const { data, error } = await client.rpc("get_my_membership_delivery");
      if (error) throw new Error(error.message);
      const row = (data ?? {}) as RawRow;
      return {
        profile: row.profile && typeof row.profile === "object" ? mapProfile(row.profile as RawRow) : null,
        cycles: Array.isArray(row.cycles) ? row.cycles.map((item) => mapCycle(item as RawRow)) : [],
        freebieCampaign: row.freebieCampaign && typeof row.freebieCampaign === "object"
          ? mapFreebieCampaign(row.freebieCampaign as RawRow)
          : row.freebie_campaign && typeof row.freebie_campaign === "object"
            ? mapFreebieCampaign(row.freebie_campaign as RawRow)
            : null,
      };
    } catch (error) {
      if (!missingSchema(error)) throw error;
    }
  }
  await processMembershipDueCycles();
  const state = readDevState();
  const customerId = customerIdForEmail(email);
  const profile = profileForCustomer(state, customerId);
  return {
    profile,
    cycles: state.cycles.filter((cycle) => cycle.customerId === customerId).sort((left, right) => right.deliveryDate.localeCompare(left.deliveryDate)),
    freebieCampaign: profile ? activeFreebieCampaign(state.freebieCampaigns, profile.planId) : null,
  };
}

export async function saveMembershipDeliveryProfile(email: string, input: MembershipDeliveryProfileInput): Promise<MembershipDeliveryProfile> {
  const membership = await fetchMyMembership(email);
  if (membership.status !== "active" || !membership.subscription || !membership.plan) {
    throw new Error("An active Zama+ membership is required to schedule a saved box.");
  }
  const items = validateProfileInput(input, membership.plan);
  const client = getSupabaseClient();
  if (client) {
    try {
      const { data, error } = await client.rpc("save_my_membership_delivery_profile", {
        p_items: items.map((item) => ({ product_id: item.productId, quantity: item.quantity })),
        p_cadence: input.cadence,
        p_delivery_tier: input.deliveryTier,
        p_delivery_area: input.deliveryArea.trim(),
        p_delivery_address: input.deliveryAddress.trim(),
        p_next_delivery_date: input.nextDeliveryDate,
      });
      if (error) throw new Error(error.message);
      const result = (data ?? {}) as RawRow;
      if (result.status && result.status !== "ok") throw new Error(String(result.error ?? "Your saved box could not be updated."));
      return mapProfile((result.profile ?? result) as RawRow);
    } catch (error) {
      if (!missingSchema(error)) throw error;
    }
  }
  const state = readDevState();
  const customerId = customerIdForEmail(email);
  const timestamp = now();
  const current = profileForCustomer(state, customerId);
  const openCurrentCycle = current ? state.cycles.find((cycle) =>
    cycle.profileId === current.id
    && cycle.deliveryDate === current.nextDeliveryDate
    && ["invoice_ready", "payment_submitted", "needs_admin_resolution"].includes(cycle.status),
  ) : null;
  const effectiveNextDeliveryDate = openCurrentCycle
    ? nextDeliveryDate(openCurrentCycle.deliveryDate, input.cadence)
    : input.nextDeliveryDate;
  if (!openCurrentCycle && daysFromToday(input.nextDeliveryDate) < 3) {
    throw new Error("Choose a first delivery date at least three calendar days from today in Bhutan time.");
  }
  const profile: MembershipDeliveryProfile = current
    ? {
        ...current,
        items,
        cadence: input.cadence,
        deliveryTier: input.deliveryTier,
        deliveryArea: input.deliveryArea.trim(),
        deliveryAddress: input.deliveryAddress.trim(),
        nextDeliveryDate: effectiveNextDeliveryDate,
        status: "active",
        updatedAt: timestamp,
      }
    : {
        id: `membership-delivery-profile-${Date.now()}`,
        customerId,
        subscriptionId: membership.subscription.id,
        planId: membership.plan.id,
        items,
        cadence: input.cadence,
        deliveryTier: input.deliveryTier,
        deliveryArea: input.deliveryArea.trim(),
        deliveryAddress: input.deliveryAddress.trim(),
        nextDeliveryDate: effectiveNextDeliveryDate,
        status: "active",
        createdAt: timestamp,
        updatedAt: timestamp,
      };
  state.profiles = current ? state.profiles.map((item) => item.id === current.id ? profile : item) : [profile, ...state.profiles];
  writeDevState(state);
  if (openCurrentCycle) {
    createDevCustomerNotification({
      customerId,
      returnId: null,
      orderId: null,
      type: "membership_delivery_updated",
      title: "Saved-box changes scheduled",
      message: `Your changes will start with the next unbilled cycle after the ${openCurrentCycle.deliveryDate} delivery.`,
      status: profile.status,
      link: "/account/membership",
    });
  }
  await processMembershipDueCycles();
  return profile;
}

export async function updateMembershipDeliveryProfile(email: string, profileId: string, patch: MembershipDeliveryProfilePatch): Promise<MembershipDeliveryProfile> {
  const existing = (await fetchMyMembershipDelivery(email)).profile;
  if (!existing || existing.id !== profileId) throw new Error("Saved delivery profile not found.");
  if (patch.status) {
    const client = getSupabaseClient();
    if (client) {
      try {
        const { data, error } = await client.rpc("update_my_membership_delivery_profile", { p_profile_id: profileId, p_status: patch.status });
        if (error) throw new Error(error.message);
        const result = (data ?? {}) as RawRow;
        if (result.status && result.status !== "ok") throw new Error(String(result.error ?? "The delivery profile could not be updated."));
        return mapProfile((result.profile ?? result) as RawRow);
      } catch (error) {
        if (!missingSchema(error)) throw error;
      }
    }
    const state = readDevState();
    const updated = { ...existing, status: patch.status, updatedAt: now() };
    state.profiles = state.profiles.map((profile) => profile.id === profileId ? updated : profile);
    writeDevState(state);
    createDevCustomerNotification({
      customerId: existing.customerId,
      returnId: null,
      orderId: null,
      type: "membership_delivery_updated",
      title: patch.status === "paused" ? "Scheduled delivery paused" : patch.status === "cancelled" ? "Scheduled delivery cancelled" : "Scheduled delivery resumed",
      message: `Your saved-box delivery is now ${patch.status}. Future unbilled cycles follow this change.`,
      status: patch.status,
      link: "/account/membership",
    });
    return updated;
  }
  return saveMembershipDeliveryProfile(email, {
    items: patch.items ?? existing.items.map((item) => ({ productId: item.productId, quantity: item.quantity })),
    cadence: patch.cadence ?? existing.cadence,
    deliveryTier: patch.deliveryTier ?? existing.deliveryTier,
    deliveryArea: patch.deliveryArea ?? existing.deliveryArea,
    deliveryAddress: patch.deliveryAddress ?? existing.deliveryAddress,
    nextDeliveryDate: patch.nextDeliveryDate ?? existing.nextDeliveryDate,
  });
}

export async function uploadMembershipDeliveryProof(email: string, file: File) {
  return uploadMembershipProof(email, file);
}

export async function submitMembershipDeliveryPayment(email: string, cycleId: string, input: MembershipCyclePaymentInput): Promise<MembershipDeliveryCycle> {
  const reference = input.paymentReference.trim();
  if (!reference) throw new Error("Enter the bank-transfer reference before submitting payment.");
  const client = getSupabaseClient();
  if (client) {
    try {
      const { data, error } = await client.rpc("submit_membership_delivery_cycle_payment", {
        p_cycle_id: cycleId,
        p_payment_reference: reference,
        p_proof_path: input.proof?.path && !input.proof.path.startsWith("dev/") ? input.proof.path : null,
      });
      if (error) throw new Error(error.message);
      const result = (data ?? {}) as RawRow;
      if (result.status && result.status !== "ok") throw new Error(String(result.error ?? "Your payment reference could not be submitted."));
      return mapCycle((result.cycle ?? result) as RawRow);
    } catch (error) {
      if (!missingSchema(error)) throw error;
    }
  }
  const state = readDevState();
  const customerId = customerIdForEmail(email);
  const cycle = state.cycles.find((item) => item.id === cycleId && item.customerId === customerId);
  if (!cycle) throw new Error("Scheduled delivery invoice not found.");
  if (cycle.status !== "invoice_ready") throw new Error("This scheduled-delivery invoice can no longer accept a payment reference.");
  const updated: MembershipDeliveryCycle = {
    ...cycle,
    status: "payment_submitted",
    paymentReference: reference,
    paymentProofPath: input.proof?.path ?? null,
    paymentSubmittedAt: now(),
    updatedAt: now(),
  };
  state.cycles = state.cycles.map((item) => item.id === cycleId ? updated : item);
  writeDevState(state);
  createDevCustomerNotification({
    customerId,
    returnId: null,
    orderId: null,
    type: "membership_delivery_payment_submitted",
    title: "Saved-box payment submitted",
    message: `Your bank-transfer reference for the ${updated.deliveryDate} delivery was sent for verification.`,
    status: updated.status,
    link: "/account/membership",
  });
  recordDevAdminNotification({
    type: "membership_delivery_payment_submitted",
    title: "Saved-box payment needs verification",
    message: `A bank-transfer reference was submitted for the ${updated.deliveryDate} scheduled box.`,
    link: "/admin?tab=subscriptions",
  });
  return updated;
}

export async function fetchAdminMembershipDelivery(): Promise<AdminMembershipDeliverySnapshot> {
  const client = getSupabaseClient();
  if (client) {
    try {
      const { data, error } = await client.rpc("get_admin_membership_delivery");
      if (error) throw new Error(error.message);
      const row = (data ?? {}) as RawRow;
      const rawFreebies = row.freebieCampaigns ?? row.freebie_campaigns;
      return {
        profiles: Array.isArray(row.profiles) ? row.profiles.map((item) => {
          const source = item as RawRow;
          return {
            ...mapProfile(source),
            customerName: String(source.customerName ?? source.customer_name ?? "Customer"),
            customerEmail: String(source.customerEmail ?? source.customer_email ?? ""),
            planName: String(source.planName ?? source.plan_name ?? "Zama+"),
          };
        }) : [],
        cycles: Array.isArray(row.cycles) ? row.cycles.map((item) => {
          const source = item as RawRow;
          return {
            ...mapCycle(source),
            customerName: String(source.customerName ?? source.customer_name ?? "Customer"),
            customerEmail: String(source.customerEmail ?? source.customer_email ?? ""),
            planName: String(source.planName ?? source.plan_name ?? "Zama+"),
            deliveryTierLabel: String(source.deliveryTierLabel ?? source.delivery_tier_label ?? "Scheduled delivery"),
          };
        }) : [],
        freebieCampaigns: Array.isArray(rawFreebies) ? rawFreebies.map((item) => mapFreebieCampaign(item as RawRow)) : [],
      };
    } catch (error) {
      if (!missingSchema(error)) throw error;
    }
  }
  await processMembershipDueCycles();
  const state = readDevState();
  const plans = await fetchMembershipPlans(true);
  const customerName = (customerId: string) => devCustomerById(customerId)?.name ?? "Customer";
  const customerEmail = (customerId: string) => devCustomerById(customerId)?.email ?? "";
  const profileById = new Map(state.profiles.map((profile) => [profile.id, profile]));
  return {
    profiles: state.profiles.map((profile) => ({
      ...profile,
      customerName: customerName(profile.customerId),
      customerEmail: customerEmail(profile.customerId),
      planName: planFor(plans, profile.planId)?.name ?? "Zama+",
    })),
    cycles: state.cycles.map((cycle) => {
      const profile = profileById.get(cycle.profileId);
      const plan = planFor(plans, profile?.planId ?? "");
      return {
        ...cycle,
        customerName: customerName(cycle.customerId),
        customerEmail: customerEmail(cycle.customerId),
        planName: plan?.name ?? "Zama+",
        deliveryTierLabel: plan?.deliveryTiers.find((tier) => tier.id === profile?.deliveryTier)?.label ?? "Scheduled delivery",
      };
    }).sort((left, right) => right.deliveryDate.localeCompare(left.deliveryDate)),
    freebieCampaigns: state.freebieCampaigns.map((campaign) => ({ ...campaign, productName: shopProducts.find((product) => product.id === campaign.productId)?.name ?? campaign.productName })),
  };
}

export async function reviewMembershipDeliveryCycle(cycleId: string, input: MembershipDeliveryCycleReviewInput, adminEmail: string): Promise<MembershipDeliveryCycle> {
  const client = getSupabaseClient();
  if (client) {
    try {
      const { data, error } = await client.rpc("admin_review_membership_delivery_cycle", {
        p_cycle_id: cycleId,
        p_status: input.status,
        p_admin_note: input.adminNote?.trim() || null,
      });
      if (error) throw new Error(error.message);
      const result = (data ?? {}) as RawRow;
      if (result.status && result.status !== "ok") throw new Error(String(result.error ?? "The scheduled-delivery cycle could not be updated."));
      return mapCycle((result.cycle ?? result) as RawRow);
    } catch (error) {
      if (!missingSchema(error)) throw error;
    }
  }
  const state = readDevState();
  const cycle = state.cycles.find((item) => item.id === cycleId);
  if (!cycle) throw new Error("Scheduled delivery cycle not found.");
  if (input.status === "paid" && !cycle.paymentReference) throw new Error("Verify a submitted bank-transfer reference before marking this cycle paid.");
  if (input.status === "paid" && cycle.freebieProductId && !shopProducts.some((product) => product.id === cycle.freebieProductId && product.active !== false)) {
    throw new Error("The selected freebie is unavailable. Choose or resolve a freebie campaign before creating this recurring order.");
  }
  const timestamp = now();
  let updated: MembershipDeliveryCycle = { ...cycle, status: input.status, reviewedAt: timestamp, reviewedBy: adminEmail, adminNote: input.adminNote?.trim() || cycle.adminNote, updatedAt: timestamp };
  if (input.status === "paid") {
    const profile = state.profiles.find((item) => item.id === cycle.profileId);
    const orderCustomer = devCustomerById(cycle.customerId);
    if (!profile || !orderCustomer) throw new Error("The customer profile is unavailable. Ask the customer to update their delivery details before payment is approved.");
    const order = createDevMembershipCycleOrder({
      customer: orderCustomer,
      cycleId: cycle.id,
      deliveryDate: cycle.deliveryDate,
      deliveryArea: profile.deliveryArea,
      deliveryAddress: profile.deliveryAddress,
      items: cycle.items,
      deliveryFee: cycle.deliveryFee,
      total: cycle.total,
      paymentReference: cycle.paymentReference ?? "",
      freebie: cycle.freebieProductId && cycle.freebieProductName ? { productId: cycle.freebieProductId, name: cycle.freebieProductName } : null,
    });
    updated = { ...updated, paidAt: timestamp, orderId: order.id, deliveryId: `DEL-${order.id}`, status: "paid" };
    if (profile.nextDeliveryDate === cycle.deliveryDate) {
      profile.nextDeliveryDate = nextDeliveryDate(cycle.deliveryDate, profile.cadence);
      profile.updatedAt = timestamp;
    }
    createDevCustomerNotification({
      customerId: cycle.customerId,
      returnId: null,
      orderId: order.id,
      type: "membership_delivery_paid",
      title: "Scheduled delivery payment verified",
      message: `Your payment was verified and order ${order.id} is now being prepared for ${cycle.deliveryDate}.`,
      status: "paid",
      link: "/account/orders",
    });
    if (updated.freebieProductName) {
      createDevCustomerNotification({
        customerId: cycle.customerId,
        returnId: null,
        orderId: order.id,
        type: "membership_freebie",
        title: "A Zama+ freebie was added",
        message: `${updated.freebieProductName} was added to your paid scheduled delivery at no extra cost.`,
        status: "paid",
        link: "/account/orders",
      });
    }
  } else if (input.status === "skipped" || input.status === "cancelled") {
    createDevCustomerNotification({
      customerId: cycle.customerId,
      returnId: null,
      orderId: null,
      type: "membership_delivery_skipped",
      title: input.status === "cancelled" ? "Scheduled delivery cancelled" : "Scheduled delivery skipped",
      message: input.adminNote?.trim() || `Your ${cycle.deliveryDate} scheduled delivery was ${input.status}.`,
      status: input.status,
      link: "/account/membership",
    });
  }
  state.cycles = state.cycles.map((item) => item.id === cycleId ? updated : item);
  writeDevState(state);
  return updated;
}

export async function saveMembershipFreebieCampaign(draft: MembershipFreebieCampaignDraft): Promise<MembershipFreebieCampaign> {
  if (!draft.planId || !draft.productId || !draft.startsAt) throw new Error("Choose a plan, in-stock product, and start time for the freebie campaign.");
  const product = shopProducts.find((item) => item.id === draft.productId && item.active !== false);
  if (!product) throw new Error("Freebies must use an active in-stock catalog product.");
  const client = getSupabaseClient();
  if (client) {
    try {
      const { data, error } = await client.rpc("admin_save_membership_freebie_campaign", {
        p_plan_id: draft.planId,
        p_product_id: draft.productId,
        p_starts_at: draft.startsAt,
        p_ends_at: draft.endsAt,
        p_status: draft.status,
      });
      if (error) throw new Error(error.message);
      const result = (data ?? {}) as RawRow;
      if (result.status && result.status !== "ok") throw new Error(String(result.error ?? "The freebie campaign could not be saved."));
      return mapFreebieCampaign((result.campaign ?? result) as RawRow);
    } catch (error) {
      if (!missingSchema(error)) throw error;
    }
  }
  const state = readDevState();
  const timestamp = now();
  const existing = state.freebieCampaigns.find((item) => item.planId === draft.planId && item.status !== "archived");
  const campaign: MembershipFreebieCampaign = existing
    ? { ...existing, ...draft, productName: product.name, updatedAt: timestamp }
    : { ...draft, id: `membership-freebie-${Date.now()}`, productName: product.name, createdAt: timestamp, updatedAt: timestamp };
  state.freebieCampaigns = existing ? state.freebieCampaigns.map((item) => item.id === existing.id ? campaign : item) : [campaign, ...state.freebieCampaigns];
  writeDevState(state);
  return campaign;
}

export async function archiveMembershipFreebieCampaign(id: string): Promise<void> {
  const client = getSupabaseClient();
  if (client) {
    try {
      const { data, error } = await client.rpc("admin_archive_membership_freebie_campaign", { p_campaign_id: id });
      if (error) throw new Error(error.message);
      const result = (data ?? {}) as RawRow;
      if (result.status && result.status !== "ok") throw new Error(String(result.error ?? "The freebie campaign could not be archived."));
      return;
    } catch (error) {
      if (!missingSchema(error)) throw error;
    }
  }
  const state = readDevState();
  const existing = state.freebieCampaigns.find((campaign) => campaign.id === id);
  if (!existing) throw new Error("Freebie campaign not found.");
  state.freebieCampaigns = state.freebieCampaigns.map((campaign) => campaign.id === id
    ? { ...campaign, status: "archived", updatedAt: now() }
    : campaign);
  writeDevState(state);
}

export function defaultDeliveryDate(): string {
  return nextDeliveryDate(thimphuDate(), "weekly");
}

export function eligibleMembershipDeliveryProducts() {
  return shopProducts.filter((product) => product.active !== false && product.category !== "Custom boxes" && product.priceAmount !== null);
}

export function deliveryProfileFromCustomer(customer: CustomerProfile | null): Pick<MembershipDeliveryProfileInput, "deliveryArea" | "deliveryAddress"> {
  return { deliveryArea: customer?.area ?? "", deliveryAddress: customer?.address ?? "" };
}
