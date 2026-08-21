import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";
import { commerceDevData, productStockDevData } from "../src/data/commerce-dev";

// Seeds the commerce tables (customers, subscriptions, orders, deliveries,
// payments) and the inventory table (one stock row per product) with example
// data.
//
// Requires supabase/commerce-schema.sql to have been run first so the commerce
// tables exist, and supabase/inventory-schema.sql so the inventory table
// exists.
//
// Run: npm run db:seed:commerce
// Example rows are upserted by id, so the script is safe to re-run.

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

async function upsertAll(table: string, rows: Record<string, unknown>[]) {
  if (rows.length === 0) return;
  const { error } = await client.from(table).upsert(rows, { onConflict: "id" });
  if (error) throw new Error(`${table}: ${error.message}`);
  console.log(`Seeded ${rows.length} ${table}.`);
}

async function run() {
  // Insert in foreign-key safe order: customers first, then everything that
  // references them.
  await upsertAll("customers", commerceDevData.customers);
  await upsertAll("subscriptions", commerceDevData.subscriptions);
  await upsertAll("orders", commerceDevData.orders);
  await upsertAll("deliveries", commerceDevData.deliveries);
  await upsertAll("payments", commerceDevData.payments);

  const stockEntries = Object.entries(productStockDevData);
  if (stockEntries.length > 0) {
    const { error } = await client
      .from("inventory")
      .upsert(
        stockEntries.map(([id, stock]) => ({
          product_id: id,
          stock_quantity: stock.stock_quantity,
          stock_alert_at: stock.stock_alert_at,
        })),
        { onConflict: "product_id" },
      );
    if (error) throw new Error(`inventory: ${error.message}`);
    console.log(`Seeded stock levels for ${stockEntries.length} products.`);
  }

  console.log("Commerce seed complete.");
}

run().catch((error) => {
  console.error("Seed failed:", error);
  process.exit(1);
});
