import type { ShopProduct } from "../components/shop/shop-utils";
import type { Farmer } from "../data/farmers";
import type { Review } from "../components/shop/reviews";
import { numberFormatter } from "../components/shop/shop-utils";
import type { FarmerRow, ProductRow, ReviewRow } from "./types";

export function mapProductRow(row: ProductRow): ShopProduct {
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
    partnerSince: row.partner_since ?? 0,
    image: row.image || undefined,
  };
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
