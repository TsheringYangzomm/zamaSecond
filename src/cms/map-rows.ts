import type { BoxContents, ShopProduct } from "../components/shop/shop-utils";
import type { Farmer } from "../data/farmers";
import type { Dietician } from "../data/dieticians";
import type { Review } from "../components/shop/reviews";
import { numberFormatter } from "../components/shop/shop-utils";
import type { DieticianRow, FarmerRow, ProductRow, ReviewRow } from "./types";

export function mapProductRow(row: ProductRow, contents: readonly BoxContents[] = []): ShopProduct {
  return {
    id: row.id,
    sku: row.sku,
    name: row.name,
    eyebrow: row.eyebrow,
    description: row.description,
    image: row.image,
    alt: row.alt,
    category: row.category as ShopProduct["category"],
    priceAmount: row.price_amount,
    priceLabel: row.price_amount == null ? "" : `Nu. ${numberFormatter.format(row.price_amount)}`,
    priceUnit: row.price_unit,
    servings: row.servings,
    availability: row.availability,
    deliveryEstimate: row.delivery_estimate,
    cookingTime: row.cooking_time,
    ingredients: row.ingredients,
    allergenNotice: row.allergen_notice,
    storage: row.storage,
    source: row.source,
    nutrition: row.nutrition,
    tags: row.tags,
    collections: row.collections,
    contents,
    active: row.published,
    consultantNote: row.consultant_note,
    dieticianNote: row.dietician_note,
    healthBenefits: row.health_benefits,
    trustAllergens: row.trust_allergens,
    sourcing: row.sourcing,
  };
}

export function mapFarmerRow(row: FarmerRow): Farmer {
  return {
    id: row.id,
    name: row.name,
    location: row.location,
    dzongkhag: row.dzongkhag,
    products: row.products,
    tags: row.tags as Farmer["tags"],
    yearsFarming: row.years_farming,
    bio: row.bio,
    verified: row.verified,
    partnerSince: row.partner_since ?? null,
    image: row.image || undefined,
  };
}

export function mapDieticianRow(row: DieticianRow): Dietician {
  const qualifications = typeof row.qualifications === "string" && row.qualifications.trim()
    ? row.qualifications
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter(Boolean)
    : [];
  return {
    id: row.id,
    name: row.name,
    title: row.title,
    image: row.image || undefined,
    bio: row.bio,
    qualifications,
    mealKitNotes: parseMealKitNotes(row.meal_kit_notes),
    sortOrder: row.sort_order,
    published: row.published,
  };
}

function parseMealKitNotes(raw: string): Dietician["mealKitNotes"] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((item) => item && typeof item.productId === "string")
      .map((item) => ({
        productId: String(item.productId),
        consultantNote: typeof item.consultantNote === "string" ? item.consultantNote : "",
        dieticianNote: typeof item.dieticianNote === "string" ? item.dieticianNote : "",
      }));
  } catch {
    return [];
  }
}

export function mapReviewRow(row: ReviewRow): Review {
  return {
    id: row.id,
    author: row.author,
    location: row.location,
    rating: row.rating,
    date: row.date,
    title: row.title,
    body: row.body,
    verified: row.verified,
  };
}
