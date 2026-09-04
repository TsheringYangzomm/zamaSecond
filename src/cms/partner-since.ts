const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

function parseDatePart(part: string): number | null {
  const n = Number(part);
  return Number.isInteger(n) ? n : null;
}

/** Formats an ISO date string ("YYYY-MM-DD") or a year-only string ("YYYY") for display. */
export function formatPartnerSince(value: string | number | null | undefined): string {
  if (value == null) return "";
  const trimmed = String(value).trim();
  if (!trimmed) return "";

  const [year, month, day] = trimmed.split("-");
  const y = parseDatePart(year);
  if (y == null) return trimmed;

  const m = month ? parseDatePart(month) : null;
  const d = day ? parseDatePart(day) : null;

  if (m == null || m < 1 || m > 12) return String(y);
  if (d == null || d < 1 || d > 31) return `${MONTHS[m - 1]} ${y}`;
  return `${MONTHS[m - 1]} ${d}, ${y}`;
}

/** Numeric sort key for "recent partner" ordering; higher = more recent. */
export function partnerSinceValue(value: string | number | null | undefined): number {
  if (value == null) return 0;
  const trimmed = String(value).trim();
  if (!trimmed) return 0;
  const [year, month] = trimmed.split("-");
  const y = parseDatePart(year) ?? 0;
  const m = month ? (parseDatePart(month) ?? 1) : 1;
  return y * 12 + (m - 1);
}
