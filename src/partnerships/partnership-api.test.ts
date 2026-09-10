import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../supabase", () => ({ getSupabaseClient: () => null }));

import { fetchAdminNotifications } from "../admin/admin-notifications-api";
import { submitPartnershipRequest, updateAdminPartnershipRequest, validatePartnershipRequest } from "./partnership-api";
import { createDefaultPartnershipPageSettings, farmProducerTypeId, normalisePartnershipPageSettings } from "./partnership-defaults";

beforeEach(() => {
  window.localStorage.clear();
});

describe("partnership request validation", () => {
  it("requires a farm location and Dzongkhag for farm and producer requests", () => {
    const settings = createDefaultPartnershipPageSettings();
    expect(() => validatePartnershipRequest({
      contactName: "Pema Dorji",
      organisationName: "Pema Farm",
      email: "pema@example.com",
      phone: "",
      partnerType: farmProducerTypeId,
      message: "We grow seasonal vegetables.",
      location: "",
      dzongkhag: "",
    }, settings)).toThrow("farm location and Dzongkhag");
  });

  it("accepts another configured partner type without farm details", () => {
    const settings = createDefaultPartnershipPageSettings();
    const request = validatePartnershipRequest({
      contactName: "Sonam",
      organisationName: "Zama Office",
      email: "sonam@example.com",
      phone: "17123456",
      partnerType: "office_workplace",
      message: "We would like a workplace grocery service.",
      location: "",
      dzongkhag: "",
    }, settings);
    expect(request.organisationName).toBe("Zama Office");
  });
});

describe("partnership page settings", () => {
  it("keeps the stable farm type when a saved configuration omits it", () => {
    const settings = normalisePartnershipPageSettings({
      partnerTypes: [{ id: "office_workplace", label: "Office" }],
    });
    expect(settings.partnerTypes).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: farmProducerTypeId }),
    ]));
  });
});

describe("partnership development fallback", () => {
  const farmRequest = {
    contactName: "Pema Dorji",
    organisationName: "Pema Farm",
    email: "pema@example.com",
    phone: "17123456",
    partnerType: farmProducerTypeId,
    message: "We grow seasonal vegetables.",
    location: "Kabesa",
    dzongkhag: "Thimphu",
  };

  it("stores a public request and creates an admin-bell update", async () => {
    const request = await submitPartnershipRequest(farmRequest, createDefaultPartnershipPageSettings());

    expect(request).toMatchObject({ organisationName: "Pema Farm", status: "new" });
    const [notification] = await fetchAdminNotifications("admin@zama.bt");
    expect(notification).toMatchObject({
      type: "partnership_request_received",
      link: "/admin?tab=partnerships",
    });
  });

  it("keeps the farmer-draft handoff idempotent in development", async () => {
    const request = await submitPartnershipRequest(farmRequest, createDefaultPartnershipPageSettings());
    const first = await updateAdminPartnershipRequest(request.id, { status: "approved", adminNotes: "Verified farm details." }, "admin@zama.bt");
    const second = await updateAdminPartnershipRequest(request.id, { status: "approved", adminNotes: "Verified farm details." }, "admin@zama.bt");

    expect(first.farmerId).toBeTruthy();
    expect(second.farmerId).toBe(first.farmerId);
  });
});
