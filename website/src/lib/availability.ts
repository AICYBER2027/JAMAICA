import "server-only";
import { addDays, todayIn, type ISODate } from "./dates.ts";
import type { Hotel } from "./hotels.ts";
import { fetchIcsNights } from "./ical.ts";
import { getManualBlocks } from "./store.ts";

export interface RoomAvailability {
  /** Nights booked on a booking site (from iCal). */
  synced: ISODate[];
  /** Nights the hotel marked booked by hand. */
  manual: ISODate[];
}

export interface Availability {
  from: ISODate;
  to: ISODate;
  today: ISODate;
  rooms: Record<string, RoomAvailability>;
  /** True if any calendar link failed to load. */
  partial: boolean;
}

export const WINDOW_DAYS = 180;

/** Made-up but stable bookings for sample hotels, so their calendars look lived-in. */
function demoNights(seed: string, from: ISODate, days: number): Set<ISODate> {
  let h = 2166136261;
  for (const c of seed) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  const rand = () => {
    h = Math.imul(h ^ (h >>> 15), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    return ((h ^= h >>> 16) >>> 0) / 4294967296;
  };
  const nights = new Set<ISODate>();
  let day = Math.floor(rand() * 3);
  while (day < days) {
    const stay = 1 + Math.floor(rand() * 4);
    for (let i = 0; i < stay && day + i < days; i++) nights.add(addDays(from, day + i));
    day += stay + 2 + Math.floor(rand() * 7);
  }
  return nights;
}

export async function getAvailability(hotel: Hotel, days = WINDOW_DAYS): Promise<Availability> {
  const today = todayIn(hotel.timeZone);
  const from = today;
  const to = addDays(today, days);
  const [manual, synced] = await Promise.all([
    getManualBlocks(hotel.slug, from, to),
    Promise.all(
      hotel.rooms.map(async (room) => {
        const results = await Promise.all((room.ical ?? []).map(fetchIcsNights));
        const nights = hotel.demo ? demoNights(`${hotel.slug}:${room.id}`, from, days) : new Set<ISODate>();
        for (const r of results) for (const n of r.nights) if (n >= from && n < to) nights.add(n);
        return { id: room.id, nights, ok: results.every((r) => r.ok) };
      }),
    ),
  ]);

  const rooms: Record<string, RoomAvailability> = {};
  for (const s of synced) {
    rooms[s.id] = { synced: [...s.nights].sort(), manual: [...(manual.get(s.id) ?? [])].sort() };
  }
  return { from, to, today, rooms, partial: synced.some((s) => !s.ok) };
}
