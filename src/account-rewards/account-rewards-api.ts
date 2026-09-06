import { getSupabaseClient } from "../supabase";
import { getDevCustomerByEmail, getDevCustomers, loadDevOrders } from "../checkout/checkout-api";
import { loadCustomerPreferences } from "../account-preferences";
import { checkInStreak, isValidRedemption, maskAccountNumber, walletBalance } from "./account-rewards-rules";
import type {
  AccountRewardsSnapshot,
  AdminAccountDetails,
  AdminAccountSummary,
  BankCode,
  CheckInRecord,
  CustomerAccountReview,
  CustomerBankAccount,
  CustomerBankInput,
  PointsAdjustmentInput,
  PointsLedgerEntry,
  PointsRedemption,
  RewardSettings,
  SavedCustomerItem,
  SavedItemKind,
  WalletLedgerEntry,
  WalletWithdrawal,
  WithdrawalRequestInput,
} from "./account-rewards-types";
import { bankDirectory, defaultRewardSettings } from "./account-rewards-types";

const devKey = "zama-account-rewards-dev";

type DevState = Record<string, AccountRewardsSnapshot>;

function emptySnapshot(customerId: string): AccountRewardsSnapshot {
  return {
    customerId,
    pointsBalance: 0,
    currentStreak: 0,
    pointsLedger: [],
    checkIns: [],
    savedItems: [],
    redemptions: [],
    walletBalance: 0,
    walletLedger: [],
    bankAccounts: [],
    withdrawals: [],
    reviews: [],
    settings: { ...defaultRewardSettings, dailyCheckInRewards: [...defaultRewardSettings.dailyCheckInRewards] },
  };
}

function readDevState(): DevState {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(devKey);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as DevState;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function writeDevState(state: DevState): void {
  if (typeof window !== "undefined") window.localStorage.setItem(devKey, JSON.stringify(state));
}

function devSnapshot(email: string): AccountRewardsSnapshot {
  const customer = getDevCustomerByEmail(email);
  const customerId = customer?.id ?? `cus-${email.trim().toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 16)}`;
  const state = readDevState();
  return state[customerId] ?? emptySnapshot(customerId);
}

function saveDevSnapshot(snapshot: AccountRewardsSnapshot): void {
  const state = readDevState();
  state[snapshot.customerId] = snapshot;
  writeDevState(state);
}

function valueOf<T>(row: Record<string, unknown>, camel: string, snake: string, fallback: T): T {
  const value = row[camel] ?? row[snake];
  return value === undefined || value === null ? fallback : value as T;
}

function numberValue(row: Record<string, unknown>, camel: string, snake: string, fallback = 0): number {
  const value = Number(valueOf(row, camel, snake, fallback));
  return Number.isFinite(value) ? value : fallback;
}

function mapPointsRow(row: Record<string, unknown>): PointsLedgerEntry {
  return {
    id: String(valueOf(row, "id", "id", "")),
    customerId: String(valueOf(row, "customerId", "customer_id", "")),
    pointsDelta: numberValue(row, "pointsDelta", "points_delta"),
    source: valueOf(row, "source", "source", "admin_adjustment") as PointsLedgerEntry["source"],
    sourceId: valueOf(row, "sourceId", "source_id", null) as string | null,
    reason: String(valueOf(row, "reason", "reason", "")),
    createdAt: String(valueOf(row, "createdAt", "created_at", "")),
    createdBy: valueOf(row, "createdBy", "created_by", null) as string | null,
  };
}

function mapCheckInRow(row: Record<string, unknown>): CheckInRecord {
  return {
    customerId: String(valueOf(row, "customerId", "customer_id", "")),
    checkInDate: String(valueOf(row, "checkInDate", "check_in_date", "")),
    streakDay: numberValue(row, "streakDay", "streak_day"),
    pointsAwarded: numberValue(row, "pointsAwarded", "points_awarded"),
    createdAt: String(valueOf(row, "createdAt", "created_at", "")),
  };
}

function mapSavedRow(row: Record<string, unknown>): SavedCustomerItem {
  return {
    customerId: String(valueOf(row, "customerId", "customer_id", "")),
    productId: String(valueOf(row, "productId", "product_id", "")),
    kind: valueOf(row, "kind", "kind", "wishlist") as SavedItemKind,
    createdAt: String(valueOf(row, "createdAt", "created_at", "")),
    updatedAt: String(valueOf(row, "updatedAt", "updated_at", "")),
  };
}

function mapRedemptionRow(row: Record<string, unknown>): PointsRedemption {
  return {
    id: String(valueOf(row, "id", "id", "")),
    customerId: String(valueOf(row, "customerId", "customer_id", "")),
    points: numberValue(row, "points", "points"),
    walletAmount: numberValue(row, "walletAmount", "wallet_amount"),
    status: valueOf(row, "status", "status", "pending") as PointsRedemption["status"],
    reason: String(valueOf(row, "reason", "reason", "")),
    requestedAt: String(valueOf(row, "requestedAt", "requested_at", "")),
    reviewedAt: valueOf(row, "reviewedAt", "reviewed_at", null) as string | null,
    reviewedBy: valueOf(row, "reviewedBy", "reviewed_by", null) as string | null,
  };
}

function mapWalletRow(row: Record<string, unknown>): WalletLedgerEntry {
  return {
    id: String(valueOf(row, "id", "id", "")),
    customerId: String(valueOf(row, "customerId", "customer_id", "")),
    type: valueOf(row, "type", "entry_type", "credit") as WalletLedgerEntry["type"],
    amount: numberValue(row, "amount", "amount"),
    source: String(valueOf(row, "source", "source", "")),
    sourceId: valueOf(row, "sourceId", "source_id", null) as string | null,
    description: String(valueOf(row, "description", "description", "")),
    status: valueOf(row, "status", "status", "completed") as WalletLedgerEntry["status"],
    createdAt: String(valueOf(row, "createdAt", "created_at", "")),
    createdBy: valueOf(row, "createdBy", "created_by", null) as string | null,
  };
}

function mapBankRow(row: Record<string, unknown>): CustomerBankAccount {
  return {
    id: String(valueOf(row, "id", "id", "")),
    customerId: String(valueOf(row, "customerId", "customer_id", "")),
    bankCode: valueOf(row, "bankCode", "bank_code", "bob") as BankCode,
    bankName: String(valueOf(row, "bankName", "bank_name", "")),
    accountName: String(valueOf(row, "accountName", "account_name", "")),
    maskedAccountNumber: String(valueOf(row, "maskedAccountNumber", "masked_account_number", "Not provided")),
    isDefault: Boolean(valueOf(row, "isDefault", "is_default", false)),
    createdAt: String(valueOf(row, "createdAt", "created_at", "")),
    updatedAt: String(valueOf(row, "updatedAt", "updated_at", "")),
  };
}

function mapWithdrawalRow(row: Record<string, unknown>): WalletWithdrawal {
  return {
    id: String(valueOf(row, "id", "id", "")),
    customerId: String(valueOf(row, "customerId", "customer_id", "")),
    bankAccountId: String(valueOf(row, "bankAccountId", "bank_account_id", "")),
    amount: numberValue(row, "amount", "amount"),
    status: valueOf(row, "status", "status", "pending") as WalletWithdrawal["status"],
    otpVerified: Boolean(valueOf(row, "otpVerified", "otp_verified", false)),
    requestedAt: String(valueOf(row, "requestedAt", "requested_at", "")),
    reviewedAt: valueOf(row, "reviewedAt", "reviewed_at", null) as string | null,
    reviewedBy: valueOf(row, "reviewedBy", "reviewed_by", null) as string | null,
    paidAt: valueOf(row, "paidAt", "paid_at", null) as string | null,
    note: String(valueOf(row, "note", "note", "")),
  };
}

function mapReviewRow(row: Record<string, unknown>): CustomerAccountReview {
  return {
    id: String(valueOf(row, "id", "id", "")),
    customerId: String(valueOf(row, "customerId", "customer_id", "")),
    orderId: String(valueOf(row, "orderId", "order_id", "")),
    productId: valueOf(row, "productId", "product_id", null) as string | null,
    rating: numberValue(row, "rating", "rating", 5),
    title: String(valueOf(row, "title", "title", "Order review")),
    body: String(valueOf(row, "body", "body", "")),
    status: valueOf(row, "moderationStatus", "moderation_status", "pending") as CustomerAccountReview["status"],
    pointsAwarded: numberValue(row, "pointsAwarded", "points_awarded"),
    submittedAt: String(valueOf(row, "submittedAt", "submitted_at", "")),
    published: Boolean(valueOf(row, "published", "published", false)),
  };
}

function mapSettings(row: Record<string, unknown> | null | undefined): RewardSettings {
  if (!row) return { ...defaultRewardSettings, dailyCheckInRewards: [...defaultRewardSettings.dailyCheckInRewards] };
  const rewards = valueOf(row, "dailyCheckInRewards", "daily_check_in_rewards", defaultRewardSettings.dailyCheckInRewards);
  return {
    id: String(valueOf(row, "id", "id", defaultRewardSettings.id)),
    dailyCheckInRewards: Array.isArray(rewards) ? rewards.map(Number).filter(Number.isFinite) : [...defaultRewardSettings.dailyCheckInRewards],
    reviewRewardPoints: numberValue(row, "reviewRewardPoints", "review_reward_points", defaultRewardSettings.reviewRewardPoints),
    pointsPerNgultrum: numberValue(row, "pointsPerNgultrum", "points_per_ngultrum", defaultRewardSettings.pointsPerNgultrum),
    minimumRedemptionPoints: numberValue(row, "minimumRedemptionPoints", "minimum_redemption_points", defaultRewardSettings.minimumRedemptionPoints),
    updatedAt: String(valueOf(row, "updatedAt", "updated_at", defaultRewardSettings.updatedAt)),
  };
}

function mapSnapshot(value: unknown, fallbackCustomerId: string): AccountRewardsSnapshot {
  const row = value && typeof value === "object" ? value as Record<string, unknown> : {};
  const list = (key: string, snake: string) => {
    const value = row[key] ?? row[snake];
    return Array.isArray(value) ? value.filter((item): item is Record<string, unknown> => Boolean(item && typeof item === "object")) : [];
  };
  const pointsLedger = list("pointsLedger", "points_ledger").map(mapPointsRow);
  const checkIns = list("checkIns", "check_ins").map(mapCheckInRow);
  const walletLedger = list("walletLedger", "wallet_ledger").map(mapWalletRow);
  return {
    customerId: String(valueOf(row, "customerId", "customer_id", fallbackCustomerId)),
    pointsBalance: numberValue(row, "pointsBalance", "points_balance", pointsLedger.reduce((sum, entry) => sum + entry.pointsDelta, 0)),
    currentStreak: numberValue(row, "currentStreak", "current_streak", 0),
    pointsLedger,
    checkIns,
    savedItems: list("savedItems", "saved_items").map(mapSavedRow),
    redemptions: list("redemptions", "redemptions").map(mapRedemptionRow),
    walletBalance: numberValue(row, "walletBalance", "wallet_balance", walletBalance(walletLedger)),
    walletLedger,
    bankAccounts: list("bankAccounts", "bank_accounts").map(mapBankRow),
    withdrawals: list("withdrawals", "withdrawals").map(mapWithdrawalRow),
    reviews: list("reviews", "reviews").map(mapReviewRow),
    settings: mapSettings(row.settings && typeof row.settings === "object" ? row.settings as Record<string, unknown> : row),
  };
}

function errorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}

function isMissingAccountSchema(message: string): boolean {
  const normalized = message.toLowerCase();
  return normalized.includes("schema cache") || normalized.includes("does not exist") || normalized.includes("could not find the function");
}

async function liveRpc<T>(name: string, args: Record<string, unknown> = {}): Promise<T> {
  const client = getSupabaseClient();
  if (!client) throw new Error("Supabase is not configured.");
  const { data, error } = await client.rpc(name, args);
  if (error) throw new Error(error.message);
  return data as T;
}

export async function fetchAccountRewards(email: string): Promise<AccountRewardsSnapshot> {
  const client = getSupabaseClient();
  if (!client) return devSnapshot(email);
  try {
    const result = await liveRpc<unknown>("get_my_account_snapshot");
    if (result && typeof result === "object" && "status" in result && (result as Record<string, unknown>).status !== undefined) {
      const status = String((result as Record<string, unknown>).status);
      if (status !== "ok") throw new Error(status === "customer_not_found" ? "Your customer profile could not be found." : "Your account rewards could not be loaded.");
    }
    return mapSnapshot(result, "");
  } catch (error) {
    if (!isMissingAccountSchema(errorMessage(error, ""))) throw error;
    return devSnapshot(email);
  }
}

export async function claimDailyCheckIn(email: string): Promise<{ pointsAwarded: number; snapshot: AccountRewardsSnapshot }> {
  const client = getSupabaseClient();
  if (client) {
    try {
      const result = await liveRpc<Record<string, unknown>>("claim_daily_check_in");
      if (result?.status === "customer_not_found") throw new Error("Your customer profile could not be found.");
      return { pointsAwarded: Number(result?.pointsAwarded ?? result?.points_awarded ?? 0), snapshot: mapSnapshot(result?.snapshot ?? result, "") };
    } catch (error) {
      if (!isMissingAccountSchema(errorMessage(error, ""))) throw error;
    }
  }
  const snapshot = devSnapshot(email);
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Thimphu", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
  if (snapshot.checkIns.some((record) => record.checkInDate === today)) return { pointsAwarded: 0, snapshot };
  const streakDay = Math.min(checkInStreak(snapshot.checkIns, today) + 1, snapshot.settings.dailyCheckInRewards.length);
  const pointsAwarded = snapshot.settings.dailyCheckInRewards[streakDay - 1] ?? 0;
  const now = new Date().toISOString();
  snapshot.checkIns = [...snapshot.checkIns, { customerId: snapshot.customerId, checkInDate: today, streakDay, pointsAwarded, createdAt: now }];
  snapshot.pointsLedger = [...snapshot.pointsLedger, { id: `pts-${Date.now()}`, customerId: snapshot.customerId, pointsDelta: pointsAwarded, source: "daily_check_in", sourceId: today, reason: "Daily check-in", createdAt: now, createdBy: null }];
  snapshot.pointsBalance += pointsAwarded;
  saveDevSnapshot(snapshot);
  return { pointsAwarded, snapshot };
}

export async function toggleSavedItem(email: string, productId: string, kind: SavedItemKind): Promise<AccountRewardsSnapshot> {
  const client = getSupabaseClient();
  if (client) {
    try {
      const result = await liveRpc<unknown>("toggle_saved_item", { p_product_id: productId, p_kind: kind });
      if (result && typeof result === "object" && "status" in result && (result as Record<string, unknown>).status !== undefined) throw new Error(String((result as Record<string, unknown>).error ?? "The saved item could not be updated."));
      return mapSnapshot(result, "");
    } catch (error) {
      if (!isMissingAccountSchema(errorMessage(error, ""))) throw error;
    }
  }
  const snapshot = devSnapshot(email);
  const found = snapshot.savedItems.some((item) => item.productId === productId && item.kind === kind);
  snapshot.savedItems = found
    ? snapshot.savedItems.filter((item) => !(item.productId === productId && item.kind === kind))
    : [...snapshot.savedItems, { customerId: snapshot.customerId, productId, kind, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }];
  saveDevSnapshot(snapshot);
  return snapshot;
}

export async function recordSavedItem(email: string, productId: string, kind: SavedItemKind): Promise<void> {
  const client = getSupabaseClient();
  if (client) {
    try {
      await liveRpc("record_saved_item", { p_product_id: productId, p_kind: kind });
      return;
    } catch (error) {
      if (!isMissingAccountSchema(errorMessage(error, ""))) throw error;
    }
  }
  const snapshot = devSnapshot(email);
  const order = loadDevOrders().find((candidate) => candidate.id === orderId && candidate.customer_id === snapshot.customerId);
  if (!order || order.status !== "delivered") throw new Error("Reviews are available after an order is delivered.");
  if (snapshot.reviews.some((item) => item.orderId === orderId)) throw new Error("This order has already been reviewed.");
  const now = new Date().toISOString();
  snapshot.savedItems = [{ customerId: snapshot.customerId, productId, kind, createdAt: now, updatedAt: now }, ...snapshot.savedItems.filter((item) => !(item.productId === productId && item.kind === kind))].slice(0, kind === "history" ? 12 : 100);
  saveDevSnapshot(snapshot);
}

export async function recordProductHistory(email: string, productId: string): Promise<void> {
  return recordSavedItem(email, productId, "history");
}

export async function migrateLegacySavedItems(email: string): Promise<void> {
  if (typeof window === "undefined") return;
  const marker = `zama-account-rewards-migrated:${email.trim().toLowerCase()}`;
  if (window.localStorage.getItem(marker)) return;
  const legacy = loadCustomerPreferences(email);
  try {
    await Promise.all([
      ...legacy.wishlist.map((productId) => recordSavedItem(email, productId, "wishlist")),
      ...legacy.history.map((productId) => recordSavedItem(email, productId, "history")),
    ]);
    window.localStorage.setItem(marker, new Date().toISOString());
  } catch {
    // Best effort only: account access must continue if the legacy data cannot be copied.
  }
}

export async function submitCustomerReview(email: string, orderId: string, rating: number, comment: string): Promise<{ snapshot: AccountRewardsSnapshot; review: CustomerAccountReview }> {
  const client = getSupabaseClient();
  if (client) {
    try {
      const result = await liveRpc<Record<string, unknown>>("submit_customer_review", { p_order_id: orderId, p_rating: rating, p_body: comment });
      if (result?.status !== "ok") throw new Error(String(result?.error ?? result?.message ?? "This order cannot be reviewed."));
      return { snapshot: mapSnapshot(result?.snapshot ?? result, ""), review: mapReviewRow((result?.review ?? {}) as Record<string, unknown>) };
    } catch (error) {
      if (!isMissingAccountSchema(errorMessage(error, ""))) throw error;
    }
  }
  const snapshot = devSnapshot(email);
  const now = new Date().toISOString();
  const review: CustomerAccountReview = { id: `review-${Date.now()}`, customerId: snapshot.customerId, orderId, productId: null, rating, title: "Order review", body: comment, status: "pending", pointsAwarded: snapshot.settings.reviewRewardPoints, submittedAt: now, published: false };
  snapshot.reviews = [...snapshot.reviews, review];
  snapshot.pointsLedger = [...snapshot.pointsLedger, { id: `pts-${Date.now()}`, customerId: snapshot.customerId, pointsDelta: review.pointsAwarded, source: "customer_review", sourceId: review.id, reason: `Review for order ${orderId}`, createdAt: now, createdBy: null }];
  snapshot.pointsBalance += review.pointsAwarded;
  saveDevSnapshot(snapshot);
  return { snapshot, review };
}

export async function requestPointsRedemption(email: string, points: number): Promise<AccountRewardsSnapshot> {
  const client = getSupabaseClient();
  if (client) {
    try {
      const result = await liveRpc<unknown>("request_points_redemption", { p_points: points });
      const row = result && typeof result === "object" ? result as Record<string, unknown> : {};
      if (row.status !== "ok") throw new Error(String(row.error ?? row.message ?? "Your points redemption could not be requested."));
      return mapSnapshot(row.snapshot ?? row, "");
    } catch (error) {
      if (!isMissingAccountSchema(errorMessage(error, ""))) throw error;
    }
  }
  const snapshot = devSnapshot(email);
  if (!isValidRedemption(points, snapshot.pointsBalance, snapshot.settings)) throw new Error("Choose a valid points amount for redemption.");
  const walletAmount = Math.floor(points / snapshot.settings.pointsPerNgultrum);
  const now = new Date().toISOString();
  const id = `redeem-${Date.now()}`;
  snapshot.pointsBalance -= points;
  snapshot.pointsLedger = [...snapshot.pointsLedger, { id: `pts-${Date.now()}`, customerId: snapshot.customerId, pointsDelta: -points, source: "redemption_hold", sourceId: id, reason: "Points redemption pending admin approval", createdAt: now, createdBy: null }];
  snapshot.redemptions = [...snapshot.redemptions, { id, customerId: snapshot.customerId, points, walletAmount, status: "pending", reason: "Customer requested wallet credit", requestedAt: now, reviewedAt: null, reviewedBy: null }];
  saveDevSnapshot(snapshot);
  return snapshot;
}

export async function saveBankAccount(email: string, input: CustomerBankInput): Promise<AccountRewardsSnapshot> {
  const client = getSupabaseClient();
  if (client) {
    try {
      const result = await liveRpc<unknown>("save_customer_bank_account", { p_bank_code: input.bankCode, p_account_name: input.accountName, p_account_number: input.accountNumber, p_is_default: input.isDefault ?? false });
      if (result && typeof result === "object" && "status" in result && (result as Record<string, unknown>).status !== undefined) throw new Error(String((result as Record<string, unknown>).error ?? "The bank account could not be saved."));
      return mapSnapshot(result, "");
    } catch (error) {
      if (!isMissingAccountSchema(errorMessage(error, ""))) throw error;
    }
  }
  const snapshot = devSnapshot(email);
  const id = `bank-${Date.now()}`;
  const bankAccount: CustomerBankAccount = { id, customerId: snapshot.customerId, bankCode: input.bankCode, bankName: bankDirectory[input.bankCode].name, accountName: input.accountName, maskedAccountNumber: maskAccountNumber(input.accountNumber), isDefault: input.isDefault ?? snapshot.bankAccounts.length === 0, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
  snapshot.bankAccounts = [...snapshot.bankAccounts.map((account) => ({ ...account, isDefault: bankAccount.isDefault ? false : account.isDefault })), bankAccount];
  saveDevSnapshot(snapshot);
  return snapshot;
}

export async function requestWithdrawalOtp(email: string, bankAccountId: string): Promise<{ snapshot: AccountRewardsSnapshot; sent: boolean; message?: string }> {
  const client = getSupabaseClient();
  if (client) {
    try {
      const result = await liveRpc<Record<string, unknown>>("request_withdrawal_otp", { p_bank_account_id: bankAccountId });
      const snapshot = await fetchAccountRewards(email);
      const status = String(result?.status ?? "");
      return { snapshot, sent: status === "sent", message: String(result?.message ?? "") || undefined };
    } catch (error) {
      if (!isMissingAccountSchema(errorMessage(error, ""))) throw error;
    }
  }
  return { snapshot: devSnapshot(email), sent: true, message: "Development OTP fallback is active. Enter any 6-digit code." };
}

export async function requestWalletWithdrawal(email: string, input: WithdrawalRequestInput): Promise<AccountRewardsSnapshot> {
  const client = getSupabaseClient();
  if (client) {
    try {
      const result = await liveRpc<Record<string, unknown>>("request_wallet_withdrawal", { p_bank_account_id: input.bankAccountId, p_amount: input.amount, p_otp: input.otp });
      if (result?.status !== "ok") throw new Error(String(result?.error ?? result?.message ?? "The withdrawal could not be requested."));
      return mapSnapshot(result.snapshot ?? result, "");
    } catch (error) {
      if (!isMissingAccountSchema(errorMessage(error, ""))) throw error;
    }
  }
  const snapshot = devSnapshot(email);
  if (input.amount <= 0 || input.amount > snapshot.walletBalance) throw new Error("The withdrawal amount is not available.");
  const now = new Date().toISOString();
  const withdrawalId = `withdraw-${Date.now()}`;
  snapshot.withdrawals = [...snapshot.withdrawals, { id: withdrawalId, customerId: snapshot.customerId, bankAccountId: input.bankAccountId, amount: input.amount, status: "pending", otpVerified: /^\d{6}$/.test(input.otp), requestedAt: now, reviewedAt: null, reviewedBy: null, paidAt: null, note: "Awaiting admin approval" }];
  snapshot.walletLedger = [...snapshot.walletLedger, { id: `wallet-${Date.now()}`, customerId: snapshot.customerId, type: "hold", amount: input.amount, source: "wallet_withdrawal", sourceId: withdrawalId, description: "Withdrawal reserved pending admin approval", status: "completed", createdAt: now, createdBy: null }];
  snapshot.walletBalance = walletBalance(snapshot.walletLedger);
  saveDevSnapshot(snapshot);
  return snapshot;
}

function mapCustomerRow(row: Record<string, unknown>): { id: string; name: string; email: string; phone: string; area: string; dzongkhag: string; address: string; status: "active" | "suspended"; createdAt: string } {
  return { id: String(row.id ?? ""), name: String(row.name ?? ""), email: String(row.email ?? ""), phone: String(row.phone ?? ""), area: String(row.area ?? ""), dzongkhag: String(row.dzongkhag ?? ""), address: String(row.address ?? ""), status: row.status === "suspended" ? "suspended" : "active", createdAt: String(row.created_at ?? row.createdAt ?? "") };
}

export async function listAdminAccountSummaries(): Promise<AdminAccountSummary[]> {
  const client = getSupabaseClient();
  if (!client) return getDevCustomers().map((customer) => ({ customerId: customer.id, name: customer.name, email: customer.email, phone: customer.phone, area: customer.area, pointsBalance: devSnapshot(customer.email).pointsBalance, walletBalance: devSnapshot(customer.email).walletBalance, checkInCount: devSnapshot(customer.email).checkIns.length, savedItemCount: devSnapshot(customer.email).savedItems.length, pendingRedemptions: devSnapshot(customer.email).redemptions.filter((item) => item.status === "pending").length, pendingWithdrawals: devSnapshot(customer.email).withdrawals.filter((item) => item.status === "pending").length, reviewCount: devSnapshot(customer.email).reviews.length }));
  const { data, error } = await client.from("customers").select("id, name, email, phone, area").order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  const rows = (data ?? []) as Record<string, unknown>[];
  const summaries = await Promise.all(rows.map(async (row) => {
    const snapshot = await fetchAdminAccountDetails(String(row.id));
    return { customerId: String(row.id), name: String(row.name ?? ""), email: String(row.email ?? ""), phone: String(row.phone ?? ""), area: String(row.area ?? ""), pointsBalance: snapshot.pointsBalance, walletBalance: snapshot.walletBalance, checkInCount: snapshot.checkIns.length, savedItemCount: snapshot.savedItems.length, pendingRedemptions: snapshot.redemptions.filter((item) => item.status === "pending").length, pendingWithdrawals: snapshot.withdrawals.filter((item) => item.status === "pending").length, reviewCount: snapshot.reviews.length };
  }));
  return summaries;
}

export async function fetchAdminAccountDetails(customerId: string): Promise<AdminAccountDetails> {
  const client = getSupabaseClient();
  if (client) {
    const result = await liveRpc<Record<string, unknown>>("get_admin_account_snapshot", { p_customer_id: customerId });
    const snapshot = mapSnapshot(result.snapshot ?? result, customerId);
    return { ...snapshot, customer: mapCustomerRow((result.customer ?? {}) as Record<string, unknown>) };
  }
  const customer = getDevCustomers().find((item) => item.id === customerId);
  const profile = customer ?? { id: customerId, name: customerId, email: "", phone: "", area: "", dzongkhag: "", address: "", status: "active" as const, created_at: "" };
  return { ...devSnapshot(profile.email), customer: mapCustomerRow(profile) };
}

export async function updateAdminCustomerProfile(customerId: string, values: { name: string; phone: string; area: string; dzongkhag: string; address: string }): Promise<void> {
  const client = getSupabaseClient();
  if (!client) return;
  const { error } = await client.from("customers").update(values).eq("id", customerId);
  if (error) throw new Error(error.message);
}

export async function adjustCustomerPoints(input: PointsAdjustmentInput): Promise<void> {
  const client = getSupabaseClient();
  if (client) {
    await liveRpc("admin_adjust_points", { p_customer_id: input.customerId, p_points_delta: input.pointsDelta, p_reason: input.reason, p_admin_email: input.adminEmail });
    return;
  }
  const state = readDevState();
  const snapshot = state[input.customerId] ?? emptySnapshot(input.customerId);
  const now = new Date().toISOString();
  snapshot.pointsBalance += input.pointsDelta;
  snapshot.pointsLedger = [...snapshot.pointsLedger, { id: `pts-${Date.now()}`, customerId: input.customerId, pointsDelta: input.pointsDelta, source: "admin_adjustment", sourceId: null, reason: input.reason, createdAt: now, createdBy: input.adminEmail }];
  saveDevSnapshot(snapshot);
}

export async function saveRewardSettings(settings: RewardSettings): Promise<void> {
  const client = getSupabaseClient();
  if (client) {
    await liveRpc("admin_save_reward_settings", { p_daily_check_in_rewards: settings.dailyCheckInRewards, p_review_reward_points: settings.reviewRewardPoints, p_points_per_ngultrum: settings.pointsPerNgultrum, p_minimum_redemption_points: settings.minimumRedemptionPoints });
    return;
  }
  const state = readDevState();
  for (const customerId of Object.keys(state)) state[customerId].settings = settings;
  writeDevState(state);
}

export async function reviewPointsRedemption(id: string, action: "approve" | "reject", adminEmail: string): Promise<void> {
  const client = getSupabaseClient();
  if (client) {
    await liveRpc(action === "approve" ? "admin_approve_points_redemption" : "admin_reject_points_redemption", { p_redemption_id: id, p_admin_email: adminEmail });
    return;
  }
  const state = readDevState();
  for (const snapshot of Object.values(state)) {
    const redemption = snapshot.redemptions.find((item) => item.id === id);
    if (!redemption || redemption.status !== "pending") continue;
    redemption.status = action === "approve" ? "approved" : "rejected";
    redemption.reviewedAt = new Date().toISOString();
    redemption.reviewedBy = adminEmail;
    if (action === "approve") snapshot.walletLedger = [...snapshot.walletLedger, { id: `wallet-${Date.now()}`, customerId: snapshot.customerId, type: "credit", amount: redemption.walletAmount, source: "points_redemption", sourceId: redemption.id, description: "Points redemption", status: "completed", createdAt: new Date().toISOString(), createdBy: adminEmail }];
    else {
      snapshot.pointsBalance += redemption.points;
      snapshot.pointsLedger = [...snapshot.pointsLedger, { id: `pts-${Date.now()}`, customerId: snapshot.customerId, pointsDelta: redemption.points, source: "redemption_release", sourceId: redemption.id, reason: "Rejected points redemption restored", createdAt: new Date().toISOString(), createdBy: adminEmail }];
    }
    snapshot.walletBalance = walletBalance(snapshot.walletLedger);
    saveDevSnapshot(snapshot);
    return;
  }
}

export async function reviewWithdrawal(id: string, action: "approve" | "reject" | "paid", adminEmail: string): Promise<void> {
  const client = getSupabaseClient();
  if (client) {
    await liveRpc("admin_review_withdrawal", { p_withdrawal_id: id, p_action: action, p_admin_email: adminEmail });
    return;
  }
  const state = readDevState();
  for (const snapshot of Object.values(state)) {
    const withdrawal = snapshot.withdrawals.find((item) => item.id === id);
    if (!withdrawal) continue;
    withdrawal.status = action === "paid" ? "paid" : action === "approve" ? "approved" : "rejected";
    withdrawal.reviewedAt = new Date().toISOString();
    withdrawal.reviewedBy = adminEmail;
    if (action === "paid") snapshot.walletLedger = snapshot.walletLedger.map((entry) => entry.sourceId === withdrawal.id && entry.type === "hold" ? { ...entry, description: "Bank withdrawal paid", createdBy: adminEmail } : entry);
    if (action === "rejected") snapshot.walletLedger = [...snapshot.walletLedger, { id: `wallet-${Date.now()}`, customerId: snapshot.customerId, type: "release", amount: withdrawal.amount, source: "wallet_withdrawal", sourceId: withdrawal.id, description: "Rejected withdrawal released", status: "completed", createdAt: new Date().toISOString(), createdBy: adminEmail }];
    snapshot.walletBalance = walletBalance(snapshot.walletLedger);
    saveDevSnapshot(snapshot);
    return;
  }
}

export async function revealAdminBankAccount(bankAccountId: string): Promise<string> {
  const client = getSupabaseClient();
  if (client) {
    const result = await liveRpc<{ accountNumber?: string; account_number?: string }>("admin_reveal_bank_account", { p_bank_account_id: bankAccountId });
    return String(result.accountNumber ?? result.account_number ?? "");
  }
  for (const snapshot of Object.values(readDevState())) {
    if (snapshot.bankAccounts.some((account) => account.id === bankAccountId)) return "Development-only account number is hidden.";
  }
  return "";
}

export async function removeSavedItem(customerId: string, productId: string, kind: SavedItemKind): Promise<void> {
  const client = getSupabaseClient();
  if (client) {
    await liveRpc("admin_remove_saved_item", { p_customer_id: customerId, p_product_id: productId, p_kind: kind });
    return;
  }
  const state = readDevState();
  const snapshot = state[customerId];
  if (snapshot) {
    snapshot.savedItems = snapshot.savedItems.filter((item) => !(item.productId === productId && item.kind === kind));
    saveDevSnapshot(snapshot);
  }
}

export async function updateCustomerReviewStatus(reviewId: string, status: "pending" | "approved" | "rejected", adminEmail: string): Promise<void> {
  const client = getSupabaseClient();
  if (client) {
    const { error } = await client.from("reviews").update({ moderation_status: status, published: status === "approved" }).eq("id", reviewId);
    if (error) throw new Error(error.message);
    return;
  }
  const state = readDevState();
  for (const snapshot of Object.values(state)) {
    const review = snapshot.reviews.find((item) => item.id === reviewId);
    if (!review) continue;
    review.status = status;
    review.published = status === "approved";
    saveDevSnapshot(snapshot);
    return;
  }
  void adminEmail;
}
