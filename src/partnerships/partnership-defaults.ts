import type { PartnershipHighlight, PartnershipPageSettings, PartnershipTypeOption } from "./partnership-types";

export const farmProducerTypeId = "farm_producer";

const defaultPartnerTypes: PartnershipTypeOption[] = [
  { id: "office_workplace", label: "Office or workplace" },
  { id: "hotel_hospitality", label: "Hotel or hospitality" },
  { id: "gym_wellness", label: "Gym or wellness space" },
  { id: "university_school", label: "University or school" },
  { id: farmProducerTypeId, label: "Farm or producer" },
  { id: "other", label: "Other" },
];

const defaultHighlights: PartnershipHighlight[] = [
  { title: "Workplaces", copy: "Fresh boxes, meal support, or team-friendly food programmes." },
  { title: "Hospitality & community", copy: "Useful food options for hotels, campuses, gyms, and local groups." },
  { title: "Local producers", copy: "A clear route for farms and makers to reach more Thimphu kitchens." },
];

export const defaultPartnershipPageSettings: PartnershipPageSettings = {
  tag: "Partner with Zama",
  heading: "Bring better food closer to your people.",
  intro: "Tell us about your organisation and the kind of partnership you have in mind. The Zama team will review it as a partnership request, not a general contact message.",
  highlights: defaultHighlights,
  formEyebrow: "Partnership enquiry",
  formHeading: "Start a partnership conversation.",
  formCopy: "A few details help us send your request to the right person.",
  submitLabel: "Send partnership request",
  privacyCopy: "No commitment is created by this form. We will use your details only to discuss the partnership you describe.",
  intakeOpen: true,
  pausedTitle: "Partnership applications are paused.",
  pausedCopy: "We are not accepting new partnership requests right now. Please check back soon.",
  partnerTypes: defaultPartnerTypes,
};

function asText(value: unknown, fallback: string, maxLength = 600): string {
  if (typeof value !== "string") return fallback;
  const trimmed = value.trim();
  return trimmed && trimmed.length <= maxLength ? trimmed : fallback;
}

function asTypeId(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const normalized = value.toLowerCase().trim().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "").slice(0, 50);
  return normalized || null;
}

function normalisePartnerTypes(value: unknown): PartnershipTypeOption[] {
  if (!Array.isArray(value)) return defaultPartnerTypes.map((item) => ({ ...item }));
  const types: PartnershipTypeOption[] = [];
  const usedIds = new Set<string>();
  for (const item of value) {
    if (!item || typeof item !== "object") continue;
    const id = asTypeId((item as Record<string, unknown>).id);
    const label = asText((item as Record<string, unknown>).label, "", 80);
    if (!id || !label || usedIds.has(id)) continue;
    types.push({ id, label });
    usedIds.add(id);
  }
  const farmType = types.find((item) => item.id === farmProducerTypeId);
  if (!farmType) types.push({ id: farmProducerTypeId, label: defaultPartnerTypes.find((item) => item.id === farmProducerTypeId)?.label ?? "Farm or producer" });
  return types;
}

function normaliseHighlights(value: unknown): PartnershipHighlight[] {
  if (!Array.isArray(value)) return defaultHighlights.map((item) => ({ ...item }));
  const highlights = value
    .filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === "object")
    .map((item) => ({ title: asText(item.title, "", 100), copy: asText(item.copy, "", 280) }))
    .filter((item) => item.title && item.copy)
    .slice(0, 3);
  return highlights.length > 0 ? highlights : defaultHighlights.map((item) => ({ ...item }));
}

export function normalisePartnershipPageSettings(value: unknown): PartnershipPageSettings {
  const raw = value && typeof value === "object" ? value as Record<string, unknown> : {};
  return {
    tag: asText(raw.tag, defaultPartnershipPageSettings.tag, 100),
    heading: asText(raw.heading, defaultPartnershipPageSettings.heading, 180),
    intro: asText(raw.intro, defaultPartnershipPageSettings.intro, 700),
    highlights: normaliseHighlights(raw.highlights),
    formEyebrow: asText(raw.formEyebrow, defaultPartnershipPageSettings.formEyebrow, 100),
    formHeading: asText(raw.formHeading, defaultPartnershipPageSettings.formHeading, 180),
    formCopy: asText(raw.formCopy, defaultPartnershipPageSettings.formCopy, 500),
    submitLabel: asText(raw.submitLabel, defaultPartnershipPageSettings.submitLabel, 80),
    privacyCopy: asText(raw.privacyCopy, defaultPartnershipPageSettings.privacyCopy, 500),
    intakeOpen: typeof raw.intakeOpen === "boolean" ? raw.intakeOpen : defaultPartnershipPageSettings.intakeOpen,
    pausedTitle: asText(raw.pausedTitle, defaultPartnershipPageSettings.pausedTitle, 180),
    pausedCopy: asText(raw.pausedCopy, defaultPartnershipPageSettings.pausedCopy, 500),
    partnerTypes: normalisePartnerTypes(raw.partnerTypes),
  };
}

export function createDefaultPartnershipPageSettings(): PartnershipPageSettings {
  return normalisePartnershipPageSettings(defaultPartnershipPageSettings);
}

export function makePartnerTypeId(label: string, existingIds: Iterable<string>): string {
  const base = asTypeId(label) ?? "partner";
  const used = new Set(existingIds);
  if (!used.has(base)) return base;
  let index = 2;
  while (used.has(`${base}_${index}`)) index += 1;
  return `${base}_${index}`;
}
