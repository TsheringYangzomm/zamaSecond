import { getSupabaseClient } from "../supabase";
import { devCoupons } from "../data/coupons-dev";
import { calculateCouponPreview } from "./coupon-rules";
import type {
  Coupon,
  CouponAdminDraft,
  CouponLine,
  CouponPreview,
  CustomerCoupon,
} from "./coupon-types";

type CouponDbRow = {
  id: string;
  code: string;
  title: string;
  description: string;
  discount_type: "percentage" | "fixed";
  discount_value: number | string;
  maximum_discount_amount: number | string | null;
  minimum_order_amount: number | string;
  starts_at: string;
  expires_at: string | null;
  usage_limit: number | null;
  per_customer_limit: number;
  active: boolean;
  created_at: string;
  updated_at: string;
};

type CouponTargetDbRow = { coupon_id: string; product_id?: string; category?: string };

function numberValue(value: unknown, fallback = 0): number {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function stringValue(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

function normalizeTargets(value: unknown): Coupon["targets"] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((target) => {
    if (!target || typeof target !== "object") return [];
    const row = target as { type?: unknown; value?: unknown; label?: unknown };
    if ((row.type !== "product" && row.type !== "category") || typeof row.value !== "string") return [];
    return [{ type: row.type, value: row.value, label: typeof row.label === "string" ? row.label : undefined }];
  });
}

function mapCoupon(row: Partial<CouponDbRow> & Record<string, unknown>, targets: Coupon["targets"] = []): Coupon {
  const fromCamel = row as Partial<Coupon>;
  return {
    id: stringValue(row.id),
    code: stringValue(row.code).toUpperCase(),
    title: stringValue(row.title),
    description: stringValue(row.description),
    discountType: row.discount_type === "fixed" || fromCamel.discountType === "fixed" ? "fixed" : "percentage",
    discountValue: numberValue(row.discount_value ?? fromCamel.discountValue),
    maximumDiscountAmount: row.maximum_discount_amount == null && fromCamel.maximumDiscountAmount == null
      ? null
      : numberValue(row.maximum_discount_amount ?? fromCamel.maximumDiscountAmount),
    minimumOrderAmount: numberValue(row.minimum_order_amount ?? fromCamel.minimumOrderAmount),
    startsAt: stringValue(row.starts_at ?? fromCamel.startsAt),
    expiresAt: (row.expires_at ?? fromCamel.expiresAt ?? null) as string | null,
    usageLimit: row.usage_limit == null && fromCamel.usageLimit == null ? null : numberValue(row.usage_limit ?? fromCamel.usageLimit),
    perCustomerLimit: numberValue(row.per_customer_limit ?? fromCamel.perCustomerLimit, 1),
    active: Boolean(row.active ?? fromCamel.active),
    targets: targets.length > 0 ? targets : normalizeTargets(row.targets),
    createdAt: stringValue(row.created_at ?? fromCamel.createdAt),
    updatedAt: stringValue(row.updated_at ?? fromCamel.updatedAt),
    collectedCount: row.collected_count == null ? numberValue(fromCamel.collectedCount, 0) : numberValue(row.collected_count),
    redeemedCount: row.redeemed_count == null ? numberValue(fromCamel.redeemedCount, 0) : numberValue(row.redeemed_count),
  };
}

function mapTargetRows(
  productRows: CouponTargetDbRow[],
  categoryRows: CouponTargetDbRow[],
): Map<string, Coupon["targets"]> {
  const targets = new Map<string, Coupon["targets"]>();
  for (const row of productRows) {
    if (!row.product_id) continue;
    const list = targets.get(row.coupon_id) ?? [];
    list.push({ type: "product", value: row.product_id });
    targets.set(row.coupon_id, list);
  }
  for (const row of categoryRows) {
    if (!row.category) continue;
    const list = targets.get(row.coupon_id) ?? [];
    list.push({ type: "category", value: row.category, label: row.category });
    targets.set(row.coupon_id, list);
  }
  return targets;
}

function uniqueCoupons(coupons: Coupon[]): Coupon[] {
  return coupons.filter((coupon, index, all) => all.findIndex((item) => item.id === coupon.id) === index);
}

const devClaimsKey = "zama-dev-coupon-claims";
const devRedemptionsKey = "zama-dev-coupon-redemptions";

type DevRedemption = { couponId: string; email: string; orderId: string; status: "redeemed" | "restored"; at: string };

function readDevClaims(): Record<string, string[]> {
  if (typeof window === "undefined") return {};
  try {
    const value = JSON.parse(window.localStorage.getItem(devClaimsKey) ?? "{}") as Record<string, unknown>;
    return Object.fromEntries(Object.entries(value).map(([email, ids]) => [email, Array.isArray(ids) ? ids.filter((id): id is string => typeof id === "string") : []]));
  } catch {
    return {};
  }
}

function readDevRedemptions(): DevRedemption[] {
  if (typeof window === "undefined") return [];
  try {
    const value = JSON.parse(window.localStorage.getItem(devRedemptionsKey) ?? "[]") as unknown;
    return Array.isArray(value) ? value as DevRedemption[] : [];
  } catch {
    return [];
  }
}

function writeDevClaims(value: Record<string, string[]>): void {
  if (typeof window !== "undefined") window.localStorage.setItem(devClaimsKey, JSON.stringify(value));
}

function writeDevRedemptions(value: DevRedemption[]): void {
  if (typeof window !== "undefined") window.localStorage.setItem(devRedemptionsKey, JSON.stringify(value));
}

function devCouponsForCustomer(email: string): CustomerCoupon[] {
  const normalizedEmail = email.trim().toLowerCase();
  const claims = new Set(readDevClaims()[normalizedEmail] ?? []);
  const redemptions = readDevRedemptions();
  return devCoupons
    .filter((coupon) => claims.has(coupon.id))
    .map((coupon) => {
      const customerRedemptions = redemptions.filter((row) => row.couponId === coupon.id && row.email === normalizedEmail && row.status === "redeemed");
      return {
        ...coupon,
        collected: true,
        redeemedCountForCustomer: customerRedemptions.length,
        lastRedeemedAt: customerRedemptions.at(-1)?.at ?? null,
        canUse: customerRedemptions.length < coupon.perCustomerLimit,
      };
    });
}

export function couponId(): string {
  const random = typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  return `coupon-${random}`;
}

export async function listPublicCoupons(): Promise<Coupon[]> {
  const client = getSupabaseClient();
  if (!client) return devCoupons.map((coupon) => ({ ...coupon, targets: [...coupon.targets] }));
  const { data, error } = await client.rpc("list_public_coupons");
  if (error || !Array.isArray(data)) return devCoupons.map((coupon) => ({ ...coupon, targets: [...coupon.targets] }));
  return uniqueCoupons(data.map((row) => mapCoupon(row as Record<string, unknown>)));
}

export async function listMyCoupons(email: string): Promise<CustomerCoupon[]> {
  const client = getSupabaseClient();
  if (!client) return devCouponsForCustomer(email);
  const { data, error } = await client.rpc("get_my_coupons");
  if (error || !Array.isArray(data)) return [];
  return data.flatMap((row) => {
    if (!row || typeof row !== "object") return [];
    const value = row as Record<string, unknown>;
    const coupon = mapCoupon(value, normalizeTargets(value.targets));
    return [{
      ...coupon,
      collected: true,
      redeemedCountForCustomer: numberValue(value.redeemed_count_for_customer),
      lastRedeemedAt: (value.last_redeemed_at as string | null | undefined) ?? null,
      canUse: Boolean(value.can_use),
    }];
  });
}

export async function collectCoupon(coupon: Coupon, email: string): Promise<{ ok: boolean; error?: string }> {
  const client = getSupabaseClient();
  if (!client) {
    const claims = readDevClaims();
    const key = email.trim().toLowerCase();
    claims[key] = [...new Set([...(claims[key] ?? []), coupon.id])];
    writeDevClaims(claims);
    return { ok: true };
  }
  const { data, error } = await client.rpc("claim_coupon", { p_coupon_id: coupon.id });
  if (error) return { ok: false, error: error.message };
  const result = data as { status?: string; error?: string } | null;
  if (result?.status === "ok" || result?.status === "already_claimed") return { ok: true };
  return { ok: false, error: result?.error ?? "This coupon could not be collected." };
}

export async function previewCoupon(code: string, lines: CouponLine[], email: string): Promise<CouponPreview> {
  const normalizedCode = code.trim().toUpperCase();
  const client = getSupabaseClient();
  if (!client) {
    const coupon = devCoupons.find((item) => item.code === normalizedCode) ?? null;
    const redemptions = readDevRedemptions();
    const usage = {
      totalRedemptions: coupon ? redemptions.filter((row) => row.couponId === coupon.id && row.status === "redeemed").length : 0,
      customerRedemptions: coupon ? redemptions.filter((row) => row.couponId === coupon.id && row.email === email.trim().toLowerCase() && row.status === "redeemed").length : 0,
    };
    return calculateCouponPreview(coupon, lines, usage, new Date(), normalizedCode);
  }
  const { data, error } = await client.rpc("preview_coupon", {
    p_code: normalizedCode,
    p_items: lines.map((line) => ({ product_id: line.productId, quantity: line.quantity, price: line.unitPrice })),
  });
  if (error || !data || typeof data !== "object") {
    return { ok: false, code: normalizedCode, eligibleSubtotal: 0, discountAmount: 0, finalTotal: lines.reduce((sum, line) => sum + line.unitPrice * line.quantity, 0), coupon: null, errorCode: "invalid", error: error?.message ?? "This coupon could not be checked." };
  }
  const value = data as Record<string, unknown>;
  const coupon = value.coupon && typeof value.coupon === "object" ? mapCoupon(value.coupon as Record<string, unknown>) : null;
  return {
    ok: value.status === "ok" || value.ok === true,
    code: normalizedCode,
    eligibleSubtotal: numberValue(value.eligibleSubtotal ?? value.eligible_subtotal),
    discountAmount: numberValue(value.discountAmount ?? value.discount_amount),
    finalTotal: numberValue(value.finalTotal ?? value.final_total, lines.reduce((sum, line) => sum + line.unitPrice * line.quantity, 0)),
    coupon,
    errorCode: (value.errorCode ?? value.error_code) as CouponPreview["errorCode"],
    error: typeof value.error === "string" ? value.error : undefined,
  };
}

export function recordDevRedemption(couponIdValue: string, email: string, orderId: string): void {
  if (getSupabaseClient()) return;
  const rows = readDevRedemptions();
  rows.push({ couponId: couponIdValue, email: email.trim().toLowerCase(), orderId, status: "redeemed", at: new Date().toISOString() });
  writeDevRedemptions(rows);
}

export function restoreDevRedemption(orderId: string): void {
  if (getSupabaseClient()) return;
  writeDevRedemptions(readDevRedemptions().map((row) => row.orderId === orderId ? { ...row, status: "restored" } : row));
}

export type AdminCouponsResult = { mode: "live" | "dev"; coupons: Coupon[] };

export async function listAdminCoupons(): Promise<AdminCouponsResult> {
  const client = getSupabaseClient();
  if (!client) return { mode: "dev", coupons: [...devCoupons] };
  const [couponResult, productTargetResult, categoryTargetResult, claimsResult, redemptionResult] = await Promise.all([
    client.from("coupons").select("*").order("created_at", { ascending: false }),
    client.from("coupon_product_targets").select("coupon_id, product_id"),
    client.from("coupon_category_targets").select("coupon_id, category"),
    client.from("coupon_claims").select("coupon_id"),
    client.from("coupon_redemptions").select("coupon_id, status"),
  ]);
  for (const result of [couponResult, productTargetResult, categoryTargetResult, claimsResult, redemptionResult]) {
    if (result.error) {
      if (result.error.message.toLowerCase().includes("does not exist") || result.error.message.toLowerCase().includes("schema cache")) return { mode: "dev", coupons: [...devCoupons] };
      throw new Error(result.error.message);
    }
  }
  const targets = mapTargetRows((productTargetResult.data ?? []) as CouponTargetDbRow[], (categoryTargetResult.data ?? []) as CouponTargetDbRow[]);
  const claims = (claimsResult.data ?? []) as { coupon_id: string }[];
  const redemptions = (redemptionResult.data ?? []) as { coupon_id: string; status: string }[];
  return {
    mode: "live",
    coupons: ((couponResult.data ?? []) as CouponDbRow[]).map((row) => mapCoupon(row as CouponDbRow & Record<string, unknown>, targets.get(row.id) ?? [])).map((coupon) => ({
      ...coupon,
      collectedCount: claims.filter((claim) => claim.coupon_id === coupon.id).length,
      redeemedCount: redemptions.filter((redemption) => redemption.coupon_id === coupon.id && redemption.status === "redeemed").length,
    })),
  };
}

export async function saveAdminCoupon(draft: CouponAdminDraft): Promise<void> {
  const client = getSupabaseClient();
  if (!client) throw new Error("Supabase is not configured.");
  const id = draft.id || couponId();
  const { error } = await client.from("coupons").upsert({
    id,
    code: draft.code.trim().toUpperCase(),
    title: draft.title.trim(),
    description: draft.description.trim(),
    discount_type: draft.discountType,
    discount_value: draft.discountValue,
    maximum_discount_amount: draft.maximumDiscountAmount,
    minimum_order_amount: draft.minimumOrderAmount,
    starts_at: draft.startsAt,
    expires_at: draft.expiresAt,
    usage_limit: draft.usageLimit,
    per_customer_limit: draft.perCustomerLimit,
    active: draft.active,
  }, { onConflict: "id" });
  if (error) throw new Error(error.message);
  const productTargets = draft.targets.filter((target) => target.type === "product").map((target) => ({ coupon_id: id, product_id: target.value }));
  const categoryTargets = draft.targets.filter((target) => target.type === "category").map((target) => ({ coupon_id: id, category: target.value }));
  const deleteProducts = await client.from("coupon_product_targets").delete().eq("coupon_id", id);
  if (deleteProducts.error) throw new Error(deleteProducts.error.message);
  const deleteCategories = await client.from("coupon_category_targets").delete().eq("coupon_id", id);
  if (deleteCategories.error) throw new Error(deleteCategories.error.message);
  if (productTargets.length > 0) {
    const result = await client.from("coupon_product_targets").insert(productTargets);
    if (result.error) throw new Error(result.error.message);
  }
  if (categoryTargets.length > 0) {
    const result = await client.from("coupon_category_targets").insert(categoryTargets);
    if (result.error) throw new Error(result.error.message);
  }
}

export async function deactivateAdminCoupon(id: string): Promise<void> {
  const client = getSupabaseClient();
  if (!client) throw new Error("Supabase is not configured.");
  const { error } = await client.from("coupons").update({ active: false }).eq("id", id);
  if (error) throw new Error(error.message);
}
