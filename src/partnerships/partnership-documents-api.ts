import { getSupabaseClient } from "../supabase";
import type { PartnershipDocument } from "./partnership-types";

const bucket = "partnership-docs";
const maxFileSize = 10 * 1024 * 1024;

const allowedExtensions = new Set([
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

const allowedMimeTypes = new Set([
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "image/png",
  "image/jpeg",
  "image/webp",
]);

function fileExtension(file: File): string {
  return (file.name.split(".").pop() ?? "").toLowerCase().replace(/[^a-z0-9]/g, "");
}

function storageSetupError(): Error {
  return new Error("Partnership document storage is not ready. Run supabase/partnership-documents-schema.sql in the Supabase SQL editor.");
}

function mapDocument(row: Record<string, unknown>): PartnershipDocument {
  const value = (camel: string, snake: string, fallback: unknown = "") => row[camel] ?? row[snake] ?? fallback;
  const rawSize = value("sizeBytes", "size_bytes", null);
  const size = typeof rawSize === "number" ? rawSize : rawSize == null ? null : Number(rawSize);
  return {
    id: String(value("id", "id")),
    requestId: String(value("requestId", "request_id")),
    title: String(value("title", "title")),
    fileType: String(value("fileType", "file_type")),
    storagePath: String(value("storagePath", "storage_path")),
    sizeBytes: size != null && Number.isFinite(size) ? size : null,
    createdAt: String(value("createdAt", "created_at")),
  };
}

export function validatePartnershipDocument(file: File): void {
  const extension = fileExtension(file);
  if (!allowedExtensions.has(extension) || !allowedMimeTypes.has(file.type)) {
    throw new Error("Choose a PDF, Word, Excel, or PNG, JPG, or WebP image file.");
  }
  if (file.size > maxFileSize) throw new Error("Documents must be 10 MB or smaller.");
}

export async function fetchAdminPartnershipDocuments(requestId: string): Promise<PartnershipDocument[]> {
  const client = getSupabaseClient();
  if (!client) return [];
  const { data, error } = await client
    .from("partnership_documents")
    .select("*")
    .eq("request_id", requestId)
    .order("created_at", { ascending: false });
  if (error) {
    if (/schema cache|does not exist|relation|not found/i.test(error.message)) return [];
    throw new Error(error.message);
  }
  return (data ?? []).map((row) => mapDocument(row as Record<string, unknown>));
}

export async function uploadPartnershipDocument(requestId: string, file: File): Promise<PartnershipDocument> {
  validatePartnershipDocument(file);
  const client = getSupabaseClient();
  if (!client) throw storageSetupError();

  const extension = fileExtension(file);
  const safeRequestId = requestId.replace(/[^a-z0-9-]/gi, "").slice(0, 64);
  if (!safeRequestId) throw new Error("Choose a valid partnership request before uploading a document.");
  const path = `${safeRequestId}/${Date.now()}-${Math.random().toString(36).slice(2, 9)}.${extension}`;
  const { error: uploadError } = await client.storage.from(bucket).upload(path, file, { upsert: false });
  if (uploadError) {
    if (/bucket|not found|does not exist/i.test(uploadError.message)) throw storageSetupError();
    throw new Error(uploadError.message);
  }

  const { data, error: insertError } = await client
    .from("partnership_documents")
    .insert({
      request_id: requestId,
      title: file.name.slice(0, 255),
      file_type: extension,
      storage_path: path,
      size_bytes: file.size,
    })
    .select()
    .single();

  if (insertError || !data) {
    await client.storage.from(bucket).remove([path]);
    if (insertError && /schema cache|does not exist|relation|not found/i.test(insertError.message)) throw storageSetupError();
    throw new Error(insertError?.message ?? "The document could not be attached to this partnership request.");
  }
  return mapDocument(data as Record<string, unknown>);
}

export async function getPartnershipDocumentSignedUrl(document: PartnershipDocument): Promise<string> {
  const client = getSupabaseClient();
  if (!client) throw storageSetupError();
  const { data, error } = await client.storage.from(bucket).createSignedUrl(document.storagePath, 3600);
  if (error || !data?.signedUrl) throw new Error(error?.message ?? "Could not open this document.");
  return data.signedUrl;
}

export async function deletePartnershipDocument(document: PartnershipDocument): Promise<void> {
  const client = getSupabaseClient();
  if (!client) throw storageSetupError();
  const { error: removeError } = await client.storage.from(bucket).remove([document.storagePath]);
  if (removeError) throw new Error(removeError.message);
  const { error } = await client.from("partnership_documents").delete().eq("id", document.id);
  if (error) throw new Error(error.message);
}
