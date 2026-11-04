// Dates are handled as plain "YYYY-MM-DD" strings (a night starts on that date).
// All maths is done in UTC so time zones and daylight saving never shift a day.

export type ISODate = string;

const DAY = 86_400_000;

export function isISODate(value: unknown): value is ISODate {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(value));
}

export function toISO(d: Date): ISODate {
  return d.toISOString().slice(0, 10);
}

export function parseISO(d: ISODate): Date {
  return new Date(`${d}T00:00:00Z`);
}

export function addDays(d: ISODate, n: number): ISODate {
  return toISO(new Date(parseISO(d).getTime() + n * DAY));
}

export function diffDays(from: ISODate, to: ISODate): number {
  return Math.round((parseISO(to).getTime() - parseISO(from).getTime()) / DAY);
}

/** Today's date in a given IANA time zone (the hotel's), as YYYY-MM-DD. */
export function todayIn(timeZone: string): ISODate {
  try {
    return new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
  } catch {
    return toISO(new Date());
  }
}

/** Every night from `from` (inclusive) to `to` (exclusive). */
export function nightsBetween(from: ISODate, to: ISODate): ISODate[] {
  const out: ISODate[] = [];
  const n = diffDays(from, to);
  for (let i = 0; i < n && i < 366; i++) out.push(addDays(from, i));
  return out;
}
