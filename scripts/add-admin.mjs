import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";

dotenv.config({ path: ".env.local" });

const email = process.argv[2];

if (!email || !email.includes("@")) {
  console.error("Usage: npm run db:add-admin -- you@example.com");
  process.exit(1);
}

const url = process.env.VITE_SUPABASE_URL?.trim();
const serviceKey = (process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.VITE_SUPABASE_SERVICE_ROLE_KEY)?.trim();

if (!url || !serviceKey) {
  console.error("Missing credentials. Set VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local and try again.");
  process.exit(1);
}

const client = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });

const { error } = await client.from("admin_users").upsert({ email: email.toLowerCase().trim() }, { onConflict: "email" });
if (error) {
  console.error(`Failed to add admin ${email}:`, error.message);
  process.exit(1);
}
console.log(`Added ${email.toLowerCase().trim()} as a Zama CMS admin.`);
