import { recordDevAdminNotification } from "../admin/admin-notifications-api";
import { getSupabaseClient } from "../supabase";
import { createDefaultPartnershipPageSettings, farmProducerTypeId, normalisePartnershipPageSettings } from "./partnership-defaults";
import type { PartnershipPageSettings, PartnershipRequest, PartnershipRequestInput, PartnershipRequestUpdate, PartnershipStatus } from "./partnership-types";

const devStorageKey = "zama-partnerships-dev";

type DevState = {
  requests: PartnershipRequest[];
  settings: PartnershipPageSettings | null;
};

function emptyDevState(): DevState {
  return { requests: [], settings: null };
}

function readDevState(): DevState {
  if (typeof window === "undefined") return emptyDevState();
  try {
    const raw = JSON.parse(window.localStorage.getItem(devStorageKey) ?? "") as Partial<DevState>;
    return {
      requests: Array.isArray(raw.requests) ? raw.requests : [],
      settings: raw.settings ? normalisePartnershipPageSettings(raw.settings) : null,
    };
  } catch {
    return emptyDevState();
  }
}

function writeDevState(state: DevState): void {
  if (typeof window !== "undefined") window.localStorage.setItem(devStorageKey, JSON.stringify(state));
}

function isMissingSchema(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error ?? "");
  const normalized = message.toLowerCase();
  return normalized.includes("schema cache") || normalized.includes("does not exist") || normalized.includes("could not find the function");
}

function valueOf(row: Record<string, unknown>, camel: string, snake: string, fallback: unknown = ""): unknown {
  return row[camel] ?? row[snake] ?? fallback;
}

function asOptionalText(value: unknown): string | null {
  return value == null || value === "" ? null : String(value);
}

function mapRequest(row: Record<string, unknown>): PartnershipRequest {
  return {
    id: String(valueOf(row, "id", "id")),
    contactName: String(valueOf(row, "contactName", "contact_name")),
    organisationName: String(valueOf(row, "organisationName", "organisation_name")),
    email: String(valueOf(row, "email", "email")),
    phone: String(valueOf(row, "phone", "phone")),
    partnerType: String(valueOf(row, "partnerType", "partner_type")),
    message: String(valueOf(row, "message", "message")),
    location: String(valueOf(row, "location", "location")),
    dzongkhag: String(valueOf(row, "dzongkhag", "dzongkhag")),
    status: String(valueOf(row, "status", "status", "new")) as PartnershipStatus,
    adminNotes: String(valueOf(row, "adminNotes", "admin_notes")),
    archivedAt: asOptionalText(valueOf(row, "archivedAt", "archived_at", null)),
    archivedBy: asOptionalText(valueOf(row, "archivedBy", "archived_by", null)),
    farmerId: asOptionalText(valueOf(row, "farmerId", "farmer_id", null)),
    createdAt: String(valueOf(row, "createdAt", "created_at", new Date().toISOString())),
    updatedAt: String(valueOf(row, "updatedAt", "updated_at", new Date().toISOString())),
    statusUpdatedAt: String(valueOf(row, "statusUpdatedAt", "status_updated_at", new Date().toISOString())),
    statusUpdatedBy: asOptionalText(valueOf(row, "statusUpdatedBy", "status_updated_by", null)),
    sourceContactMessageId: asOptionalText(valueOf(row, "sourceContactMessageId", "source_contact_message_id", null)),
  };
}

function cleanInput(input: PartnershipRequestInput): PartnershipRequestInput {
  return {
    contactName: input.contactName.trim(),
    organisationName: input.organisationName.trim(),
    email: input.email.trim(),
    phone: input.phone.trim(),
    partnerType: input.partnerType.trim(),
    message: input.message.trim(),
    location: input.location.trim(),
    dzongkhag: input.dzongkhag.trim(),
  };
}

export function validatePartnershipRequest(input: PartnershipRequestInput, settings: PartnershipPageSettings): PartnershipRequestInput {
  const clean = cleanInput(input);
  if (!clean.contactName || !clean.organisationName || !clean.email || !clean.partnerType || !clean.message) {
    throw new Error("Add your name, organisation, email address, partnership type, and a short note before sending.");
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clean.email)) throw new Error("Enter a complete email address, such as name@example.com.");
  if (clean.contactName.length > 120 || clean.organisationName.length > 160 || clean.email.length > 254 || clean.phone.length > 60 || clean.message.length > 4000) {
    throw new Error("One or more fields are too long. Please shorten your request and try again.");
  }
  if (!settings.partnerTypes.some((type) => type.id === clean.partnerType)) throw new Error("Choose a partnership type from the available options.");
  if (clean.partnerType === farmProducerTypeId && (!clean.location || !clean.dzongkhag)) {
    throw new Error("Add the farm location and Dzongkhag so we can prepare the farmer draft.");
  }
  return clean;
}

export async function submitPartnershipRequest(input: PartnershipRequestInput, settings: PartnershipPageSettings): Promise<PartnershipRequest> {
  if (!settings.intakeOpen) throw new Error(settings.pausedCopy);
  const clean = validatePartnershipRequest(input, settings);
  const client = getSupabaseClient();
  if (client) {
    try {
      const { data, error } = await client.rpc("create_partnership_request", {
        p_contact_name: clean.contactName,
        p_organisation_name: clean.organisationName,
        p_email: clean.email,
        p_phone: clean.phone,
        p_partner_type: clean.partnerType,
        p_message: clean.message,
        p_location: clean.location,
        p_dzongkhag: clean.dzongkhag,
      });
      if (error) throw new Error(error.message);
      if (!data || typeof data !== "object") throw new Error("Your partnership request could not be saved.");
      return mapRequest(data as Record<string, unknown>);
    } catch (error) {
      if (!isMissingSchema(error)) throw error;
    }
  }

  const state = readDevState();
  const now = new Date().toISOString();
  const request: PartnershipRequest = {
    id: `partnership-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    ...clean,
    status: "new",
    adminNotes: "",
    archivedAt: null,
    archivedBy: null,
    farmerId: null,
    createdAt: now,
    updatedAt: now,
    statusUpdatedAt: now,
    statusUpdatedBy: null,
    sourceContactMessageId: null,
  };
  state.requests = [request, ...state.requests];
  writeDevState(state);
  recordDevAdminNotification({
    type: "partnership_request_received",
    title: "New partnership request",
    message: `${request.organisationName} submitted a ${settings.partnerTypes.find((type) => type.id === request.partnerType)?.label ?? "partnership"} request.`,
    link: "#/admin?tab=partnerships",
  });
  return request;
}

export async function fetchPartnershipPageSettings(): Promise<PartnershipPageSettings> {
  const client = getSupabaseClient();
  if (client) {
    const { data, error } = await client.from("content_blocks").select("value").eq("key", "partnership").maybeSingle();
    if (!error) return normalisePartnershipPageSettings(data?.value);
    if (!isMissingSchema(error)) throw new Error(error.message);
  }
  return readDevState().settings ?? createDefaultPartnershipPageSettings();
}

export async function savePartnershipPageSettings(settings: PartnershipPageSettings): Promise<PartnershipPageSettings> {
  const clean = normalisePartnershipPageSettings(settings);
  const client = getSupabaseClient();
  if (client) {
    const { error } = await client.from("content_blocks").upsert({ key: "partnership", value: clean }, { onConflict: "key" });
    if (!error) return clean;
    throw new Error(error.message);
  }
  const state = readDevState();
  state.settings = clean;
  writeDevState(state);
  return clean;
}

export async function fetchAdminPartnershipRequests(): Promise<PartnershipRequest[]> {
  const client = getSupabaseClient();
  if (client) {
    try {
      const { data, error } = await client.rpc("get_admin_partnership_requests");
      if (error) throw new Error(error.message);
      return Array.isArray(data) ? data.map((row) => mapRequest(row as Record<string, unknown>)) : [];
    } catch (error) {
      if (!isMissingSchema(error)) throw error;
    }
  }
  return readDevState().requests.sort((left, right) => right.createdAt.localeCompare(left.createdAt));
}

export async function updateAdminPartnershipRequest(requestId: string, update: PartnershipRequestUpdate, adminEmail: string): Promise<PartnershipRequest> {
  const statusValues: PartnershipStatus[] = ["new", "in_review", "contacted", "approved", "declined"];
  if (!statusValues.includes(update.status)) throw new Error("Choose a valid partnership status.");
  if (update.adminNotes.length > 5000) throw new Error("Admin notes must be 5,000 characters or fewer.");

  const client = getSupabaseClient();
  if (client) {
    try {
      const { data, error } = await client.rpc("update_admin_partnership_request", {
        p_request_id: requestId,
        p_status: update.status,
        p_admin_notes: update.adminNotes.trim(),
        p_archived: Boolean(update.archived),
      });
      if (error) throw new Error(error.message);
      if (!data || typeof data !== "object") throw new Error("The partnership request could not be updated.");
      const row = data as Record<string, unknown>;
      if (row.status === "forbidden" || !row.id) {
        throw new Error("Your admin session is not authorised to update partnership requests.");
      }
      return mapRequest(row);
    } catch (error) {
      if (!isMissingSchema(error)) throw error;
    }
  }

  const state = readDevState();
  const index = state.requests.findIndex((request) => request.id === requestId);
  if (index === -1) throw new Error("This partnership request no longer exists.");
  const current = state.requests[index];
  const now = new Date().toISOString();
  const next: PartnershipRequest = {
    ...current,
    status: update.status,
    adminNotes: update.adminNotes.trim(),
    archivedAt: update.archived ? now : null,
    archivedBy: update.archived ? adminEmail : null,
    statusUpdatedAt: current.status === update.status ? current.statusUpdatedAt : now,
    statusUpdatedBy: current.status === update.status ? current.statusUpdatedBy : adminEmail,
    farmerId: current.farmerId ?? (update.status === "approved" && current.partnerType === farmProducerTypeId ? `partner-farm-${current.id.slice(-8)}` : null),
    updatedAt: now,
  };
  state.requests[index] = next;
  writeDevState(state);
  return next;
}
