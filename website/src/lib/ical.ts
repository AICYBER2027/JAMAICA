import { addDays, diffDays, type ISODate } from "./dates.ts";

// Booking.com, Airbnb, Expedia, Vrbo and most channel managers export each room's
// bookings as an iCal (.ics) link. Every VEVENT is a stay: DTSTART is the arrival
// day and DTEND the departure day, so the nights booked are [DTSTART, DTEND).

function unfold(text: string): string[] {
  // Lines starting with a space or tab continue the previous line (RFC 5545 §3.1).
  return text.replace(/\r\n/g, "\n").replace(/\n[ \t]/g, "").split("\n");
}

function readDate(value: string): ISODate | null {
  const m = value.trim().match(/^(\d{4})(\d{2})(\d{2})/);
  return m ? `${m[1]}-${m[2]}-${m[3]}` : null;
}

/** Returns every booked night found in an .ics file. */
export function parseIcsNights(text: string): Set<ISODate> {
  const nights = new Set<ISODate>();
  let inEvent = false;
  let start: ISODate | null = null;
  let end: ISODate | null = null;
  let cancelled = false;

  for (const line of unfold(text)) {
    const upper = line.toUpperCase();
    if (upper.startsWith("BEGIN:VEVENT")) {
      inEvent = true;
      start = end = null;
      cancelled = false;
      continue;
    }
    if (upper.startsWith("END:VEVENT")) {
      if (inEvent && start && !cancelled) {
        // A one-day event with no end, or an end on the same day, blocks that night.
        const last = end && diffDays(start, end) > 0 ? end : addDays(start, 1);
        const n = Math.min(diffDays(start, last), 366);
        for (let i = 0; i < n; i++) nights.add(addDays(start, i));
      }
      inEvent = false;
      continue;
    }
    if (!inEvent) continue;
    const colon = line.indexOf(":");
    if (colon < 0) continue;
    const name = line.slice(0, colon).split(";")[0].toUpperCase();
    const value = line.slice(colon + 1);
    if (name === "DTSTART") start = readDate(value);
    else if (name === "DTEND") end = readDate(value);
    else if (name === "STATUS" && value.trim().toUpperCase() === "CANCELLED") cancelled = true;
  }
  return nights;
}

/** Fetches one calendar link. Cached for 15 minutes; a failing link never breaks the page. */
export async function fetchIcsNights(url: string): Promise<{ nights: Set<ISODate>; ok: boolean }> {
  try {
    const res = await fetch(url, {
      next: { revalidate: 900 },
      headers: { "User-Agent": "hotel-sites-calendar-sync/1.0" },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return { nights: new Set(), ok: false };
    return { nights: parseIcsNights(await res.text()), ok: true };
  } catch {
    return { nights: new Set(), ok: false };
  }
}
