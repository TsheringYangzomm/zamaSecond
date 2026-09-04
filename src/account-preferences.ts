export type CustomerReview = {
  rating: number;
  comment: string;
  submittedAt: string;
};

export type CustomerPreferences = {
  wishlist: string[];
  history: string[];
  points: number;
  reviewedOrderIds: string[];
  reviews: Record<string, CustomerReview>;
  checkInDates: string[];
};

const emptyPreferences: CustomerPreferences = { wishlist: [], history: [], points: 0, reviewedOrderIds: [], reviews: {}, checkInDates: [] };

function storageKey(email: string): string {
  return `zama-account-preferences:${email.trim().toLowerCase()}`;
}

export function loadCustomerPreferences(email: string): CustomerPreferences {
  if (typeof window === "undefined") return emptyPreferences;
  try {
    const raw = window.localStorage.getItem(storageKey(email));
    if (!raw) return emptyPreferences;
    const parsed = JSON.parse(raw) as Partial<CustomerPreferences>;
    const reviews = parsed.reviews && typeof parsed.reviews === "object" && !Array.isArray(parsed.reviews)
      ? Object.fromEntries(Object.entries(parsed.reviews).filter(([, review]) => {
        if (!review || typeof review !== "object") return false;
        const candidate = review as Partial<CustomerReview>;
        return typeof candidate.rating === "number" && typeof candidate.comment === "string" && typeof candidate.submittedAt === "string";
      })) as Record<string, CustomerReview>
      : {};
    return {
      wishlist: Array.isArray(parsed.wishlist) ? parsed.wishlist.filter((id): id is string => typeof id === "string") : [],
      history: Array.isArray(parsed.history) ? parsed.history.filter((id): id is string => typeof id === "string") : [],
      points: typeof parsed.points === "number" && Number.isFinite(parsed.points) ? Math.max(0, Math.round(parsed.points)) : 0,
      reviewedOrderIds: Array.isArray(parsed.reviewedOrderIds) ? parsed.reviewedOrderIds.filter((id): id is string => typeof id === "string") : [],
      reviews,
      checkInDates: Array.isArray(parsed.checkInDates) ? parsed.checkInDates.filter((date): date is string => typeof date === "string") : [],
    };
  } catch {
    return emptyPreferences;
  }
}

export function saveCustomerPreferences(email: string, preferences: CustomerPreferences): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(storageKey(email), JSON.stringify(preferences));
}

export function recordProductView(email: string, productId: string): void {
  const current = loadCustomerPreferences(email);
  const history = [productId, ...current.history.filter((id) => id !== productId)].slice(0, 12);
  saveCustomerPreferences(email, { ...current, history });
}
