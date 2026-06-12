const SK = "sk-SK";

type DateInput = Date | string | number;

// Date-only ISO strings ("2026-05-20") are parsed as LOCAL dates — the
// `new Date("2026-05-20")` constructor treats them as UTC midnight, which
// shifts the rendered day for users east/west of the meridian.
const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;

function toDate(input: DateInput): Date {
  if (typeof input === "string" && DATE_ONLY.test(input)) {
    const [y, m, d] = input.split("-").map(Number) as [number, number, number];
    return new Date(y, m - 1, d);
  }
  return input instanceof Date ? input : new Date(input);
}

/** Numeric Slovak date: "10. 6. 2026". */
export function formatDateSk(input: DateInput): string {
  const d = toDate(input);
  if (Number.isNaN(d.getTime())) return String(input);
  return d.toLocaleDateString(SK);
}

/** Long Slovak date: "10. júna 2026". */
export function formatDateLongSk(input: DateInput): string {
  const d = toDate(input);
  if (Number.isNaN(d.getTime())) return String(input);
  return d.toLocaleDateString(SK, { day: "numeric", month: "long", year: "numeric" });
}

/** Numeric Slovak date + time, no seconds: "10. 6. 2026, 14:30". */
export function formatDateTimeSk(input: DateInput): string {
  const d = toDate(input);
  if (Number.isNaN(d.getTime())) return String(input);
  return d.toLocaleString(SK, {
    day: "numeric",
    month: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
