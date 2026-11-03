// Pure helpers shared by the server and the browser.
import { diffDays, nightsBetween, parseISO, type ISODate } from "./dates.ts";
import { fill, LOCALES, type HotelDict, type Lang } from "./i18n.ts";

export interface Stay {
  from: ISODate;
  to: ISODate;
  guests: number;
}

export function bookedNights(room: { synced: ISODate[]; manual: ISODate[] } | undefined): Set<ISODate> {
  return new Set([...(room?.synced ?? []), ...(room?.manual ?? [])]);
}

/** The nights of the stay that are already taken in this room (empty = free). */
export function clashes(booked: Set<ISODate>, stay: Stay): ISODate[] {
  return nightsBetween(stay.from, stay.to).filter((n) => booked.has(n));
}

export function formatDate(d: ISODate, lang: Lang, withWeekday = false): string {
  return new Intl.DateTimeFormat(LOCALES[lang], {
    timeZone: "UTC",
    day: "numeric",
    month: "short",
    ...(withWeekday ? { weekday: "short" } : {}),
  }).format(parseISO(d));
}

export function nightsLabel(stay: Stay, d: HotelDict): string {
  const n = diffDays(stay.from, stay.to);
  return n === 1 ? d.night : fill(d.nights, { n });
}

export function formatPrice(amount: number, currency: string, lang: Lang): string {
  try {
    return new Intl.NumberFormat(LOCALES[lang], { style: "currency", currency, maximumFractionDigits: 0 }).format(amount);
  } catch {
    return `${amount} ${currency}`;
  }
}

/** A wa.me link that opens WhatsApp with the guest's request already written. */
export function whatsappLink(opts: {
  number: string;
  hotel: string;
  room?: string;
  stay?: Stay;
  lang: Lang;
  d: HotelDict;
}): string {
  const { number, hotel, room, stay, lang, d } = opts;
  const lines = [fill(d.waHello, { hotel })];
  if (room) lines.push(fill(d.waRoom, { room }));
  if (stay) {
    lines.push(
      fill(d.waDates, { from: formatDate(stay.from, lang, true), to: formatDate(stay.to, lang, true), nights: nightsLabel(stay, d) }),
      fill(d.waGuests, { n: stay.guests }),
    );
  }
  if (room || stay) lines.push(d.waAsk);
  const digits = number.replace(/\D/g, "");
  return `https://wa.me/${digits}?text=${encodeURIComponent(lines.join("\n"))}`;
}

/** Adds the stay to a booking-site link where the site understands it (Booking.com, Airbnb). */
export function bookingLink(url: string, stay?: Stay): string {
  if (!stay) return url;
  try {
    const u = new URL(url);
    if (u.hostname.endsWith("booking.com")) {
      u.searchParams.set("checkin", stay.from);
      u.searchParams.set("checkout", stay.to);
      u.searchParams.set("group_adults", String(stay.guests));
    } else if (u.hostname.includes("airbnb.")) {
      u.searchParams.set("check_in", stay.from);
      u.searchParams.set("check_out", stay.to);
      u.searchParams.set("adults", String(stay.guests));
    }
    return u.toString();
  } catch {
    return url;
  }
}
