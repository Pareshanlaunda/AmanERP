const MONTHS = [
  "JAN",
  "FEB",
  "MAR",
  "APR",
  "MAY",
  "JUN",
  "JUL",
  "AUG",
  "SEP",
  "OCT",
  "NOV",
  "DEC",
] as const;

function ordinal(day: number): string {
  const j = day % 10;
  const k = day % 100;
  if (j === 1 && k !== 11) return `${day}st`;
  if (j === 2 && k !== 12) return `${day}nd`;
  if (j === 3 && k !== 13) return `${day}rd`;
  return `${day}th`;
}

function parseNoticeDay(isoDate: string): Date | null {
  const dayPart = isoDate.slice(0, 10);
  const d = new Date(`${dayPart}T12:00:00`);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** Format as `11th JUN 2026` (matches sample Demand Notice). */
export function formatNoticeDate(isoDate: string): string {
  const d = parseNoticeDay(isoDate);
  if (!d) return isoDate;
  return `${ordinal(d.getDate())} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

const MONTHS_LONG = [
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
] as const;

/** Format as `10 July 2026` (defamation / long-form notices). */
export function formatNoticeDateLong(isoDate: string): string {
  const d = parseNoticeDay(isoDate);
  if (!d) return isoDate;
  return `${d.getDate()} ${MONTHS_LONG[d.getMonth()]} ${d.getFullYear()}`;
}

/**
 * Calendar day in Asia/Kolkata as `YYYY-MM-DD` (generation / business date).
 */
export function todayIsoIst(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

/** Strip optional `/MON/YYYY` suffix → plain CLID. */
export function stripClidRefSuffix(clid: string): string {
  return clid.trim().replace(/\/[A-Za-z]{3}\/\d{4}$/, "");
}

/**
 * Document-only REF: `CLID…/MON/YYYY` (IST generation month/year).
 * Form/DB keep plain CLID; call this only when merging Word/PDF.
 */
export function formatClidRef(clid: string, generatedOnIso?: string): string {
  const base = stripClidRefSuffix(clid);
  if (!base) return base;
  const d = parseNoticeDay(generatedOnIso ?? todayIsoIst());
  if (!d) return base;
  return `${base}/${MONTHS[d.getMonth()]}/${d.getFullYear()}`;
}
