export type PointsLedgerSource = "daily_check_in" | "customer_review" | "admin_adjustment" | "redemption_hold" | "redemption_release";

export type PointsLedgerEntry = {
  id: string;
  customerId: string;
  pointsDelta: number;
  source: PointsLedgerSource;
  sourceId: string | null;
  reason: string;
  createdAt: string;
  createdBy: string | null;
};

export type CheckInRecord = {
  customerId: string;
  checkInDate: string;
  streakDay: number;
  pointsAwarded: number;
  createdAt: string;
};

export type SavedItemKind = "wishlist" | "history";

export type SavedCustomerItem = {
  customerId: string;
  productId: string;
  kind: SavedItemKind;
  createdAt: string;
  updatedAt: string;
};

export type RedemptionStatus = "pending" | "approved" | "rejected";

export type PointsRedemption = {
  id: string;
  customerId: string;
  points: number;
  walletAmount: number;
  status: RedemptionStatus;
  reason: string;
  requestedAt: string;
  reviewedAt: string | null;
  reviewedBy: string | null;
};

export type WalletEntryType = "credit" | "withdrawal" | "hold" | "release";

export type WalletLedgerEntry = {
  id: string;
  customerId: string;
  type: WalletEntryType;
  amount: number;
  source: string;
  sourceId: string | null;
  description: string;
  status: "completed" | "pending" | "failed";
  createdAt: string;
  createdBy: string | null;
};

export type BankCode = "bob" | "bnb" | "druk-pnb" | "t-bank" | "bdbl";

export type CustomerBankAccount = {
  id: string;
  customerId: string;
  bankCode: BankCode;
  bankName: string;
  accountName: string;
  maskedAccountNumber: string;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
};

export type WithdrawalStatus = "pending" | "approved" | "rejected" | "paid";

export type WalletWithdrawal = {
  id: string;
  customerId: string;
  bankAccountId: string;
  amount: number;
  status: WithdrawalStatus;
  otpVerified: boolean;
  requestedAt: string;
  reviewedAt: string | null;
  reviewedBy: string | null;
  paidAt: string | null;
  note: string;
};

export type CustomerAccountReview = {
  id: string;
  customerId: string;
  orderId: string;
  productId: string | null;
  rating: number;
  title: string;
  body: string;
  status: "pending" | "approved" | "rejected";
  pointsAwarded: number;
  submittedAt: string;
  published: boolean;
};

export type RewardSettings = {
  id: string;
  dailyCheckInRewards: number[];
  reviewRewardPoints: number;
  pointsPerNgultrum: number;
  minimumRedemptionPoints: number;
  updatedAt: string;
};

export type AccountRewardsSnapshot = {
  customerId: string;
  pointsBalance: number;
  currentStreak: number;
  pointsLedger: PointsLedgerEntry[];
  checkIns: CheckInRecord[];
  savedItems: SavedCustomerItem[];
  redemptions: PointsRedemption[];
  walletBalance: number;
  walletLedger: WalletLedgerEntry[];
  bankAccounts: CustomerBankAccount[];
  withdrawals: WalletWithdrawal[];
  reviews: CustomerAccountReview[];
  settings: RewardSettings;
};

export type AdminAccountSummary = {
  customerId: string;
  name: string;
  email: string;
  phone: string;
  area: string;
  pointsBalance: number;
  walletBalance: number;
  checkInCount: number;
  savedItemCount: number;
  pendingRedemptions: number;
  pendingWithdrawals: number;
  reviewCount: number;
};

export type AdminAccountDetails = AccountRewardsSnapshot & {
  customer: {
    id: string;
    name: string;
    email: string;
    phone: string;
    area: string;
    dzongkhag: string;
    address: string;
    status: "active" | "suspended";
    createdAt: string;
  };
};

export type PointsAdjustmentInput = {
  customerId: string;
  pointsDelta: number;
  reason: string;
  adminEmail: string;
};

export type CustomerBankInput = {
  bankCode: BankCode;
  accountName: string;
  accountNumber: string;
  isDefault?: boolean;
};

export type WithdrawalRequestInput = {
  bankAccountId: string;
  amount: number;
  otp: string;
};

export const defaultRewardSettings: RewardSettings = {
  id: "default",
  dailyCheckInRewards: [1, 5, 5, 10, 10, 15, 15],
  reviewRewardPoints: 20,
  pointsPerNgultrum: 10,
  minimumRedemptionPoints: 100,
  updatedAt: "2026-01-01T00:00:00.000Z",
};

export const bankDirectory: Record<BankCode, { shortName: string; name: string }> = {
  bob: { shortName: "BoB", name: "Bank of Bhutan" },
  bnb: { shortName: "BNB", name: "Bhutan National Bank" },
  "druk-pnb": { shortName: "DK", name: "Druk PNB Bank" },
  "t-bank": { shortName: "T", name: "T-Bank" },
  bdbl: { shortName: "BDBL", name: "Bhutan Development Bank" },
};
