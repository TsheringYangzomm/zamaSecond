import { getSupabaseClient } from "../supabase";
import type { FarmerRow, ProductRow, ReviewRow } from "../cms/types";

function requireClient() {
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

export async function nextSlugId(base: string, table: "products" | "farmers" | "reviews"): Promise<string> {
  const slug = slugify(base);
  const { data, error } = await requireClient()
    .from(table)
    .select("id")
    .like("id", `${slug}%`);
  if (error) throw new Error(error.message);
  const existing = new Set((data ?? []).map((row) => (row as { id: string }).id));
  if (!existing.has(slug)) return slug;
  let index = 2;
  while (existing.has(`${slug}-${index}`)) index += 1;
  return `${slug}-${index}`;
}

export type WaitlistEntry = {
  id: number;
  email: string;
  source: string;
  area: string | null;
  items: unknown[] | null;
  created_at: string;
};

export async function listWaitlist(): Promise<WaitlistEntry[]> {
  const { data, error } = await requireClient()
    .from("launch_interests")
    .select("id, email, source, area, items, created_at")
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as WaitlistEntry[];
}

export async function deleteWaitlistEntry(id: number): Promise<void> {
  const { error } = await requireClient().from("launch_interests").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

function csvCell(value: string): string {
  return `"${value.replace(/"/g, '""')}"`;
}

export function waitlistToCsv(entries: WaitlistEntry[]): string {
  const header = ["id", "email", "source", "area", "items", "created_at"];
  const rows = entries.map((entry) =>
    [
      String(entry.id),
      csvCell(entry.email),
      csvCell(entry.source),
      csvCell(entry.area ?? ""),
      csvCell(entry.items ? JSON.stringify(entry.items) : ""),
      csvCell(entry.created_at),
    ].join(","),
  );
  return [header.join(","), ...rows].join("\n");
}

export function downloadCsv(filename: string, csv: string) {
  const blob = new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

export async function listProducts(): Promise<ProductRow[]> {
  const { data, error } = await requireClient()
    .from("products")
    .select("*")
    .order("sort_order", { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []) as ProductRow[];
}

export async function listFarmers(): Promise<FarmerRow[]> {
  const { data, error } = await requireClient()
    .from("farmers")
    .select("*")
    .order("sort_order", { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []) as FarmerRow[];
}

export async function upsertProduct(row: ProductRow): Promise<void> {
  const { error } = await requireClient().from("products").upsert(row, { onConflict: "id" });
  if (error) throw new Error(error.message);
}

export async function upsertFarmer(row: FarmerRow): Promise<void> {
  const { error } = await requireClient().from("farmers").upsert(row, { onConflict: "id" });
  if (error) throw new Error(error.message);
}

export async function deleteProduct(id: string): Promise<void> {
  const { error } = await requireClient().from("products").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

export async function deleteFarmer(id: string): Promise<void> {
  const { error } = await requireClient().from("farmers").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

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
  const { error } = await requireClient().from("reviews").upsert(row, { onConflict: "id" });
  if (error) throw new Error(error.message);
}

export async function deleteReview(id: string): Promise<void> {
  const { error } = await requireClient().from("reviews").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

export type ContentBlockSummary = { key: string; updated_at: string | null };

export async function listContentBlocks(): Promise<ContentBlockSummary[]> {
  const { data, error } = await requireClient()
    .from("content_blocks")
    .select("key, updated_at")
    .order("key", { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []) as ContentBlockSummary[];
}

export async function getContentBlock(key: string): Promise<Record<string, unknown>> {
  const { data, error } = await requireClient()
    .from("content_blocks")
    .select("value")
    .eq("key", key)
    .single();
  if (error) throw new Error(error.message);
  return (data as { value: Record<string, unknown> }).value;
}

export async function upsertContentBlock(key: string, value: Record<string, unknown>): Promise<void> {
  const { error } = await requireClient().from("content_blocks").upsert({ key, value }, { onConflict: "key" });
  if (error) throw new Error(error.message);
}

export async function deleteContentBlock(key: string): Promise<void> {
  const { error } = await requireClient().from("content_blocks").delete().eq("key", key);
  if (error) throw new Error(error.message);
}

export async function swapSortOrder(
  table: "products" | "farmers",
  firstId: string,
  secondId: string,
): Promise<void> {
  const { data, error } = await requireClient()
    .from(table)
    .select("id, sort_order")
    .in("id", [firstId, secondId]);
  if (error) throw new Error(error.message);
  const rows = (data ?? []) as { id: string; sort_order: number }[];
  if (rows.length !== 2) throw new Error("Could not find both rows to reorder.");
  const first = rows.find((row) => row.id === firstId);
  const second = rows.find((row) => row.id === secondId);
  if (!first || !second) throw new Error("Could not find both rows to reorder.");
  const { error: updateError } = await requireClient()
    .from(table)
    .upsert([
      { id: first.id, sort_order: second.sort_order },
      { id: second.id, sort_order: first.sort_order },
    ], { onConflict: "id" });
  if (updateError) throw new Error(updateError.message);
}

export type ImageUploadResult = { url: string; error: string | null };

export async function uploadCatalogImage(
  file: File,
  folder: "products" | "farmers",
  id: string,
): Promise<ImageUploadResult> {
  if (!file.type.startsWith("image/")) {
    return { url: "", error: "Only image files are allowed." };
  }
  if (file.size > 2 * 1024 * 1024) {
    return { url: "", error: "Image must be 2 MB or smaller." };
  }
  const client = requireClient();
  const extension = (file.name.split(".").pop() ?? "png").toLowerCase().replace(/[^a-z0-9]/g, "");
  const path = `${folder}/${id}/${Date.now()}.${extension}`;
  const { error } = await client.storage.from("catalog").upload(path, file, { upsert: true });
  if (error) return { url: "", error: error.message };
  const { data } = client.storage.from("catalog").getPublicUrl(path);
  return { url: data.publicUrl, error: null };
}
