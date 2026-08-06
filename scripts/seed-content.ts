import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";
import { defaultBlocks, type ContentBlocks } from "../src/data/content-blocks";
import { shopProducts } from "../src/data/landing";
import { farmers, type Farmer } from "../src/data/farmers";
import { reviewsByProduct, type Review } from "../src/components/shop/reviews";

dotenv.config({ path: ".env.local" });

const url = process.env.VITE_SUPABASE_URL?.trim();
const serviceKey = (process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.VITE_SUPABASE_SERVICE_ROLE_KEY)?.trim();

if (!url || !serviceKey) {
  console.error(
    "Missing credentials. Set VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local and try again.",
  );
  process.exit(1);
}

const client = createClient(url, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

function productRow(product: (typeof shopProducts)[number], sortOrder: number) {
  return {
    id: product.id,
    sku: product.sku,
    name: product.name,
    eyebrow: product.eyebrow,
    description: product.description,
    image: product.image,
    alt: product.alt,
    category: product.category,
    price_amount: product.priceAmount,
    price_unit: product.priceUnit,
    servings: product.servings,
    availability: product.availability,
    delivery_estimate: product.deliveryEstimate,
    cooking_time: product.cookingTime,
    ingredients: product.ingredients,
    allergen_notice: product.allergenNotice,
    storage: product.storage,
    source: product.source,
    nutrition: product.nutrition,
    tags: product.tags,
    collections: product.collections,
    sort_order: sortOrder,
    published: true,
  };
}

function farmerRow(farmer: Farmer, sortOrder: number) {
  return {
    id: farmer.id,
    name: farmer.name,
    location: farmer.location,
    dzongkhag: farmer.dzongkhag,
    products: farmer.products,
    tags: farmer.tags,
    years_farming: farmer.yearsFarming,
    bio: farmer.bio,
    verified: farmer.verified,
    partner_since: farmer.partnerSince,
    image: "",
    sort_order: sortOrder,
    published: true,
  };
}

function reviewRows(entries: [string, Review[]][]): Record<string, unknown>[] {
  const rows: Record<string, unknown>[] = [];
  for (const [productId, reviews] of entries) {
    reviews.forEach((review, index) => {
      rows.push({
        id: review.id,
        product_id: productId,
        author: review.author,
        location: review.location,
        rating: review.rating,
        date: review.date,
        title: review.title,
        body: review.body,
        verified: review.verified,
        sort_order: index,
        published: true,
      });
    });
  }
  return rows;
}

function blockRows(blocks: ContentBlocks) {
  return Object.entries(blocks).map(([key, value]) => ({ key, value }));
}

async function run() {
  const products = shopProducts.map((product, index) => productRow(product, index));
  const farmerRows = farmers.map((farmer, index) => farmerRow(farmer, index));

  const productResult = await client.from("products").upsert(products, { onConflict: "id" });
  if (productResult.error) throw new Error(`products: ${productResult.error.message}`);
  const farmerResult = await client.from("farmers").upsert(farmerRows, { onConflict: "id" });
  if (farmerResult.error) throw new Error(`farmers: ${farmerResult.error.message}`);

  const reviewRowsData = reviewRows(Object.entries(reviewsByProduct));
  const reviewResult = await client.from("reviews").upsert(reviewRowsData, { onConflict: "id" });
  if (reviewResult.error) throw new Error(`reviews: ${reviewResult.error.message}`);

  const blockRowsData = blockRows(defaultBlocks);
  const blockResult = await client.from("content_blocks").upsert(blockRowsData, { onConflict: "key" });
  if (blockResult.error) throw new Error(`content_blocks: ${blockResult.error.message}`);

  console.log(`Seeded ${products.length} products, ${farmerRows.length} farmers, ${reviewRowsData.length} reviews, ${blockRowsData.length} content blocks.`);
}

run().catch((error) => {
  console.error("Seed failed:", error);
  process.exit(1);
});
