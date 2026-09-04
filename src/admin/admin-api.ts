import { getSupabaseClient } from "../supabase";
import type { ContactMessageRow, DieticianRow, FarmerDocumentRow, FarmerPrivateInfoRow, FarmerRow, FarmerSeasonalUpdateRow, FarmerStoryRow, InventoryItemRow, InventoryRow, InventoryStockHistoryRow, InventoryStockLotRow, ProductRow, ReviewRow } from "../cms/types";

export function requireClient() {
  const client = getSupabaseClient();

  if (!client) {
    throw new Error("Supabase is not configured.");
  }

  return client;
}

export function slugify(value: string): string {
  const base = value
    .toLowerCase()
    .trim()
    .replace(/['"]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);

  return base || "item";
}

export async function nextSlugId(
  base: string,
  table: "products" | "farmers" | "dieticians" | "reviews",
): Promise<string> {
  const slug = slugify(base);

  const { data, error } = await requireClient()
    .from(table)
    .select("id")
    .like("id", `${slug}%`);

  if (error) throw new Error(error.message);

  const existing = new Set(
    (data ?? []).map((row) => (row as { id: string }).id),
  );

  if (!existing.has(slug)) return slug;

  let index = 2;

  while (existing.has(`${slug}-${index}`)) {
    index += 1;
  }

  return `${slug}-${index}`;
}

/* =========================================================
   WAITLIST
========================================================= */

export type WaitlistEntry = {
  id: number;
  email: string;
  source: string;
  area: string | null;
  full_name: string | null;
  items: unknown[] | null;
  created_at: string;
};

export async function listWaitlist(): Promise<WaitlistEntry[]> {
  const { data, error } = await requireClient()
    .from("launch_interests")
    .select("id, email, source, area, full_name, items, created_at")
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);

  return (data ?? []) as WaitlistEntry[];
}

export async function deleteWaitlistEntry(id: number): Promise<void> {
  const { error } = await requireClient()
    .from("launch_interests")
    .delete()
    .eq("id", id);

  if (error) throw new Error(error.message);
}

function csvCell(value: string): string {
  return `"${value.replace(/"/g, '""')}"`;
}

export function waitlistToCsv(entries: WaitlistEntry[]): string {
  const header = ["id", "email", "source", "area", "full_name", "items", "created_at"];

  const rows = entries.map((entry) =>
    [
      String(entry.id),
      csvCell(entry.email),
      csvCell(entry.source),
      csvCell(entry.area ?? ""),
      csvCell(entry.full_name ?? ""),
      csvCell(entry.items ? JSON.stringify(entry.items) : ""),
      csvCell(entry.created_at),
    ].join(","),
  );

  return [header.join(","), ...rows].join("\n");
}

export function downloadCsv(filename: string, csv: string): void {
  const blob = new Blob([`\uFEFF${csv}`], {
    type: "text/csv;charset=utf-8",
  });

  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");

  anchor.href = url;
  anchor.download = filename;

  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();

  URL.revokeObjectURL(url);
}

/* =========================================================
   PRODUCTS
========================================================= */

export async function listProducts(): Promise<ProductRow[]> {
  const { data, error } = await requireClient()
    .from("products")
    .select("*")
    .order("sort_order", { ascending: true });

  if (error) throw new Error(error.message);

  return (data ?? []) as ProductRow[];
}

export async function inventoryTableExists(): Promise<boolean> {
  const { error } = await requireClient()
    .from("inventory")
    .select("product_id")
    .limit(1);

  return !error;
}

export async function listInventory(): Promise<InventoryRow[]> {
  const { data, error } = await requireClient()
    .from("inventory")
    .select("*");

  if (error) throw new Error(error.message);

  return (data ?? []) as InventoryRow[];
}

export async function upsertProduct(row: ProductRow): Promise<void> {
  const { error } = await requireClient()
    .from("products")
    .upsert(row, { onConflict: "id" });

  if (error) throw new Error(error.message);
}

export async function updateProductStock(
  productId: string,
  stockQuantity: number | null,
  stockAlertAt: number | null,
): Promise<void> {
  const { error } = await requireClient()
    .from("inventory")
    .upsert(
      { product_id: productId, stock_quantity: stockQuantity, stock_alert_at: stockAlertAt },
      { onConflict: "product_id" },
    );

  if (error) throw new Error(error.message);
}

export async function inventoryItemsTableExists(): Promise<boolean> {
  const { error } = await requireClient()
    .from("inventory_items")
    .select("id")
    .limit(1);

  return !error;
}

export async function listInventoryItems(): Promise<InventoryItemRow[]> {
  const { data, error } = await requireClient()
    .from("inventory_items")
    .select("*")
    .order("name", { ascending: true });

  if (error) throw new Error(error.message);

  return (data ?? []) as InventoryItemRow[];
}

export type ProductIngredientInput = { item_id: string; quantity: number };

export async function productIngredientsTableExists(): Promise<boolean> {
  const { error } = await requireClient()
    .from("product_ingredients")
    .select("product_id")
    .limit(1);

  return !error;
}

export async function listProductIngredients(productId: string): Promise<ProductIngredientInput[]> {
  const { data, error } = await requireClient()
    .from("product_ingredients")
    .select("item_id, quantity")
    .eq("product_id", productId);

  if (error) throw new Error(error.message);

  return (data ?? []) as ProductIngredientInput[];
}

export async function saveProductIngredients(
  productId: string,
  ingredients: ProductIngredientInput[],
): Promise<void> {
  const client = requireClient();

  const { error: deleteError } = await client
    .from("product_ingredients")
    .delete()
    .eq("product_id", productId);
  if (deleteError) throw new Error(deleteError.message);

  if (ingredients.length === 0) return;

  const { error: insertError } = await client.from("product_ingredients").insert(
    ingredients
      .filter((ingredient) => ingredient.quantity > 0)
      .map((ingredient) => ({ product_id: productId, ...ingredient })),
  );
  if (insertError) throw new Error(insertError.message);
}

export async function updateInventoryItemStock(
  itemId: string,
  stockQuantity: number | null,
  stockAlertAt: number | null,
): Promise<void> {
  const { error } = await requireClient()
    .from("inventory_items")
    .upsert(
      { id: itemId, stock_quantity: stockQuantity, stock_alert_at: stockAlertAt },
      { onConflict: "id" },
    );

  if (error) throw new Error(error.message);
}

export async function upsertInventoryItem(row: InventoryItemRow): Promise<InventoryItemRow> {
  const { data, error } = await requireClient()
    .from("inventory_items")
    .upsert(row, { onConflict: "id" })
    .select()
    .single();

  if (error) throw new Error(error.message);

  return data as InventoryItemRow;
}

export async function inventoryStockHistoryTableExists(): Promise<boolean> {
  const { error } = await requireClient()
    .from("inventory_stock_history")
    .select("id")
    .limit(1);

  return !error;
}

export async function listInventoryStockHistory(itemId: string): Promise<InventoryStockHistoryRow[]> {
  const { data, error } = await requireClient()
    .from("inventory_stock_history")
    .select("*")
    .eq("item_id", itemId)
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);

  return (data ?? []) as InventoryStockHistoryRow[];
}

export async function appendInventoryStockHistory(entry: {
  item_id: string;
  quantity_change: number;
  reason: string;
  reference: string;
  admin_email: string;
}): Promise<void> {
  const { error } = await requireClient()
    .from("inventory_stock_history")
    .insert(entry);

  if (error) throw new Error(error.message);
}

export async function inventoryStockLotsTableExists(): Promise<boolean> {
  const { error } = await requireClient()
    .from("inventory_stock_lots")
    .select("id")
    .limit(1);

  return !error;
}

export async function listInventoryStockLots(): Promise<InventoryStockLotRow[]> {
  const { data, error } = await requireClient()
    .from("inventory_stock_lots")
    .select("*")
    .order("received_date", { ascending: true })
    .order("created_at", { ascending: true });

  if (error) throw new Error(error.message);

  return (data ?? []) as InventoryStockLotRow[];
}

export type AddInventoryStockInput = {
  item_id: string;
  supplier: string;
  quantity: number;
  received_date: string;
  unit_cost: number | null;
  batch_reference: string;
  notes: string;
  admin_email: string;
};

export async function addInventoryStock(input: AddInventoryStockInput): Promise<InventoryStockLotRow> {
  const { data, error } = await requireClient().rpc("add_inventory_stock", {
    p_item_id: input.item_id,
    p_supplier: input.supplier,
    p_quantity: input.quantity,
    p_received_date: input.received_date,
    p_unit_cost: input.unit_cost,
    p_batch_reference: input.batch_reference,
    p_notes: input.notes,
    p_admin_email: input.admin_email,
  });

  if (error) throw new Error(error.message);

  const result = data as (InventoryStockLotRow & { error?: string }) | null;
  if (result?.error) throw new Error(result.error);
  if (!result) throw new Error("Could not add stock.");

  return result;
}

/* =========================================================
   FARMERS
========================================================= */

export async function listFarmers(): Promise<FarmerRow[]> {
  const { data, error } = await requireClient()
    .from("farmers")
    .select("*")
    .order("sort_order", { ascending: true });

  if (error) throw new Error(error.message);

  return (data ?? []) as FarmerRow[];
}

export async function upsertFarmer(row: FarmerRow): Promise<void> {
  const { error } = await requireClient()
    .from("farmers")
    .upsert(row, { onConflict: "id" });

  if (error) throw new Error(error.message);
}

export async function farmerPrivateInfoTableExists(): Promise<boolean> {
  const { error } = await requireClient()
    .from("farmer_private_info")
    .select("farmer_id")
    .limit(1);

  return !error;
}

export async function listFarmerPrivateInfo(): Promise<FarmerPrivateInfoRow[]> {
  const { data, error } = await requireClient()
    .from("farmer_private_info")
    .select("*")
    .order("farmer_id", { ascending: true });

  if (error) throw new Error(error.message);

  return (data ?? []) as FarmerPrivateInfoRow[];
}

export async function upsertFarmerPrivateInfo(row: FarmerPrivateInfoRow): Promise<void> {
  const { error } = await requireClient()
    .from("farmer_private_info")
    .upsert(row, { onConflict: "farmer_id" });

  if (error) throw new Error(error.message);
}

export async function farmerStoriesTableExists(): Promise<boolean> {
  const { error } = await requireClient()
    .from("farmer_stories")
    .select("farmer_id")
    .limit(1);

  return !error;
}

export async function listFarmerStories(): Promise<FarmerStoryRow[]> {
  const { data, error } = await requireClient()
    .from("farmer_stories")
    .select("*")
    .order("farmer_id", { ascending: true });

  if (error) throw new Error(error.message);

  return (data ?? []) as FarmerStoryRow[];
}

export async function upsertFarmerStory(row: FarmerStoryRow): Promise<void> {
  const { error } = await requireClient()
    .from("farmer_stories")
    .upsert(row, { onConflict: "farmer_id" });

  if (error) throw new Error(error.message);
}

export async function farmerSeasonalUpdatesTableExists(): Promise<boolean> {
  const { error } = await requireClient()
    .from("farmer_seasonal_updates")
    .select("farmer_id")
    .limit(1);

  return !error;
}

export async function listFarmerSeasonalUpdates(): Promise<FarmerSeasonalUpdateRow[]> {
  const { data, error } = await requireClient()
    .from("farmer_seasonal_updates")
    .select("*")
    .order("season", { ascending: false });

  if (error) throw new Error(error.message);

  return (data ?? []) as FarmerSeasonalUpdateRow[];
}

export async function upsertFarmerSeasonalUpdate(row: FarmerSeasonalUpdateRow): Promise<void> {
  const { error } = await requireClient()
    .from("farmer_seasonal_updates")
    .upsert(row, { onConflict: "farmer_id,season" });

  if (error) throw new Error(error.message);
}

export async function farmerDocumentsTableExists(): Promise<boolean> {
  const { error } = await requireClient()
    .from("farmer_documents")
    .select("id")
    .limit(1);

  return !error;
}

export async function listFarmerDocuments(): Promise<FarmerDocumentRow[]> {
  const { data, error } = await requireClient()
    .from("farmer_documents")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);

  return (data ?? []) as FarmerDocumentRow[];
}

export async function upsertFarmerDocument(row: FarmerDocumentRow): Promise<FarmerDocumentRow> {
  const payload = row.id
    ? row
    : {
        farmer_id: row.farmer_id,
        title: row.title,
        file_type: row.file_type,
        url: row.url,
        size_bytes: row.size_bytes,
      };

  const { data, error } = await requireClient()
    .from("farmer_documents")
    .upsert(payload as FarmerDocumentRow, { onConflict: "id" })
    .select()
    .single();

  if (error) throw new Error(error.message);

  return data as FarmerDocumentRow;
}

export async function deleteFarmerDocument(id: string): Promise<void> {
  const { error } = await requireClient()
    .from("farmer_documents")
    .delete()
    .eq("id", id);

  if (error) throw new Error(error.message);
}

/* =========================================================
   DELETE PRODUCTS / FARMERS
========================================================= */

export async function deleteProduct(id: string): Promise<void> {
  const { error } = await requireClient()
    .from("products")
    .delete()
    .eq("id", id);

  if (error) throw new Error(error.message);
}

export async function deleteFarmer(id: string): Promise<void> {
  const { error } = await requireClient()
    .from("farmers")
    .delete()
    .eq("id", id);

  if (error) throw new Error(error.message);
}

/* =========================================================
   DIETICIANS
========================================================= */

export async function listDieticians(): Promise<DieticianRow[]> {
  const { data, error } = await requireClient()
    .from("dieticians")
    .select("*")
    .order("sort_order", { ascending: true });

  if (error) throw new Error(error.message);

  return (data ?? []) as DieticianRow[];
}

export async function upsertDietician(row: DieticianRow): Promise<void> {
  const { error } = await requireClient()
    .from("dieticians")
    .upsert(row, { onConflict: "id" });

  if (error) throw new Error(error.message);
}

export async function deleteDietician(id: string): Promise<void> {
  const { error } = await requireClient()
    .from("dieticians")
    .delete()
    .eq("id", id);

  if (error) throw new Error(error.message);
}

/* =========================================================
   REVIEWS
========================================================= */

export async function listReviews(): Promise<ReviewRow[]> {
  const { data, error } = await requireClient()
    .from("reviews")
    .select("*")
    .order("product_id", { ascending: true })
    .order("sort_order", { ascending: true });

  if (error) throw new Error(error.message);

  return (data ?? []) as ReviewRow[];
}

export async function upsertReview(row: ReviewRow): Promise<void> {
  const { error } = await requireClient()
    .from("reviews")
    .upsert(row, { onConflict: "id" });

  if (error) throw new Error(error.message);
}

export async function deleteReview(id: string): Promise<void> {
  const { error } = await requireClient()
    .from("reviews")
    .delete()
    .eq("id", id);

  if (error) throw new Error(error.message);
}

/* =========================================================
   CONTENT BLOCKS
========================================================= */

export type ContentBlockSummary = {
  key: string;
  updated_at: string | null;
};

export async function listContentBlocks(): Promise<
  ContentBlockSummary[]
> {
  const { data, error } = await requireClient()
    .from("content_blocks")
    .select("key, updated_at")
    .order("key", { ascending: true });

  if (error) throw new Error(error.message);

  return (data ?? []) as ContentBlockSummary[];
}

export async function getContentBlock(
  key: string,
): Promise<Record<string, unknown>> {
  const { data, error } = await requireClient()
    .from("content_blocks")
    .select("value")
    .eq("key", key)
    .single();

  if (error) throw new Error(error.message);

  return (data as { value: Record<string, unknown> }).value;
}

export async function upsertContentBlock(
  key: string,
  value: Record<string, unknown>,
): Promise<void> {
  const { error } = await requireClient()
    .from("content_blocks")
    .upsert({ key, value }, { onConflict: "key" });

  if (error) throw new Error(error.message);
}

export async function deleteContentBlock(key: string): Promise<void> {
  const { error } = await requireClient()
    .from("content_blocks")
    .delete()
    .eq("key", key);

  if (error) throw new Error(error.message);
}

/* =========================================================
   SORT ORDER
========================================================= */

/**
 * Persists a new display order by assigning sort_order = position.
 * The landing page orders products/farmers by sort_order ascending,
 * so reordering here changes the position shown on the site.
 */
export async function reorderRows(
  table: "products" | "farmers" | "dieticians",
  orderedIds: string[],
): Promise<void> {
  for (let index = 0; index < orderedIds.length; index++) {
    const { error } = await requireClient()
      .from(table)
      .update({ sort_order: index })
      .eq("id", orderedIds[index]);

    if (error) throw new Error(error.message);
  }
}

/* =========================================================
   IMAGE UPLOAD
========================================================= */

export type ImageUploadResult = {
  url: string;
  error: string | null;
};

export async function uploadCatalogImage(
  file: File,
  folder: "products" | "farmers" | "dieticians",
  id: string,
): Promise<ImageUploadResult> {
  if (!file.type.startsWith("image/")) {
    return {
      url: "",
      error: "Only image files are allowed.",
    };
  }

  if (file.size > 2 * 1024 * 1024) {
    return {
      url: "",
      error: "Image must be 2 MB or smaller.",
    };
  }

  const client = requireClient();

  const extension = (file.name.split(".").pop() ?? "png")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");

  const path = `${folder}/${id}/${Date.now()}.${extension}`;

  const { error } = await client.storage
    .from("catalog")
    .upload(path, file, {
      upsert: true,
    });

  if (error) {
    return {
      url: "",
      error: error.message,
    };
  }

  const { data } = client.storage
    .from("catalog")
    .getPublicUrl(path);

  return {
    url: data.publicUrl,
    error: null,
  };
}

const documentAllowedExtensions = new Set([
  "pdf",
  "doc",
  "docx",
  "xls",
  "xlsx",
  "png",
  "jpg",
  "jpeg",
  "webp",
]);

const documentMimeTypes = new Set([
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "image/png",
  "image/jpeg",
  "image/webp",
]);

export async function uploadFarmerDocument(
  file: File,
  farmerId: string,
): Promise<ImageUploadResult> {
  const extension = (file.name.split(".").pop() ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");

  if (!documentAllowedExtensions.has(extension) || !documentMimeTypes.has(file.type)) {
    return {
      url: "",
      error: "Only PDF, Word, Excel, or image files are allowed.",
    };
  }

  if (file.size > 10 * 1024 * 1024) {
    return {
      url: "",
      error: "Document must be 10 MB or smaller.",
    };
  }

  const client = requireClient();

  const path = `farmer-docs/${farmerId}/${Date.now()}.${extension}`;

  let uploadError: unknown = null;
  try {
    const result = await client.storage
      .from("farmer-docs")
      .upload(path, file, {
        upsert: true,
      });
    uploadError = result.error;
  } catch (storageError) {
    return {
      url: "",
      error: storageError instanceof Error ? storageError.message : "Could not upload the document.",
    };
  }

  if (uploadError) {
    const message = "message" in (uploadError as object) ? (uploadError as { message: string }).message : "unknown";
    if (/not found|does not exist|bucket/i.test(message)) {
      return {
        url: "",
        error: "The document storage bucket isn't ready. Run supabase/farmer-document-schema.sql in the Supabase SQL editor to create the farmer-docs bucket.",
      };
    }
    return {
      url: "",
      error: message,
    };
  }

  const { data } = client.storage
    .from("farmer-docs")
    .getPublicUrl(path);

  return {
    url: data.publicUrl,
    error: null,
  };
}

export async function getFarmerDocumentSignedUrl(docUrl: string): Promise<string> {
  const client = requireClient();

  const target = "object/public/farmer-docs/";
  const index = docUrl.indexOf(target);
  if (index === -1) return docUrl;

  const path = docUrl.slice(index + target.length).split("?")[0];
  if (!path) return docUrl;

  const { data, error } = await client.storage
    .from("farmer-docs")
    .createSignedUrl(path, 3600);

  if (error || !data.signedUrl) return docUrl;

  return data.signedUrl;
}

/* =========================================================
   CONTACT MESSAGES
========================================================= */

export async function listContactMessages(): Promise<ContactMessageRow[]> {
  const { data, error } = await requireClient()
    .from("contact_messages")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return (data ?? []) as ContactMessageRow[];
}

export async function deleteContactMessage(id: string): Promise<void> {
  const { error } = await requireClient()
    .from("contact_messages")
    .delete()
    .eq("id", id);

  if (error) throw new Error(error.message);
} 
