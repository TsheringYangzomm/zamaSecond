export type PartnershipStatus = "new" | "in_review" | "contacted" | "approved" | "declined";

export type PartnershipTypeOption = {
  id: string;
  label: string;
};

export type PartnershipHighlight = {
  title: string;
  copy: string;
};

export type PartnershipPageSettings = {
  tag: string;
  heading: string;
  intro: string;
  highlights: PartnershipHighlight[];
  formEyebrow: string;
  formHeading: string;
  formCopy: string;
  submitLabel: string;
  privacyCopy: string;
  intakeOpen: boolean;
  pausedTitle: string;
  pausedCopy: string;
  partnerTypes: PartnershipTypeOption[];
};

export type PartnershipRequestInput = {
  contactName: string;
  organisationName: string;
  email: string;
  phone: string;
  partnerType: string;
  message: string;
  location: string;
  dzongkhag: string;
};

export type PartnershipRequest = PartnershipRequestInput & {
  id: string;
  status: PartnershipStatus;
  adminNotes: string;
  archivedAt: string | null;
  archivedBy: string | null;
  farmerId: string | null;
  createdAt: string;
  updatedAt: string;
  statusUpdatedAt: string;
  statusUpdatedBy: string | null;
  sourceContactMessageId: string | null;
};

export type PartnershipRequestUpdate = {
  status: PartnershipStatus;
  adminNotes: string;
  archived?: boolean;
};

export type PartnershipDocument = {
  id: string;
  requestId: string;
  title: string;
  fileType: string;
  storagePath: string;
  sizeBytes: number | null;
  createdAt: string;
};
