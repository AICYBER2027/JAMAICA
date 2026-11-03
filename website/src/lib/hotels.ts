import "server-only";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { cache } from "react";
import type { Lang } from "./i18n.ts";

/** Text that can be given once, or once per language. */
export type Text = string | Partial<Record<Lang, string>>;

export type SceneName = "sea" | "city" | "hills";
export type RoomSceneName = "double" | "twin" | "family" | "suite" | "single";
export type FontName = "bricolage" | "newsreader" | "figtree";

export interface Room {
  id: string;
  /** What's on the door: "4", "12B". */
  number: string;
  name: Text;
  description: Text;
  beds: Text;
  guests: number;
  /** Price per night, in the hotel's currency. */
  price?: number;
  /** A photo in /public (e.g. "/hotels/pousada-mare/room-1.jpg"), or a drawn picture. */
  photo?: string;
  scene?: RoomSceneName;
  /** iCal links for this room from Booking.com, Airbnb, Expedia… */
  ical?: string[];
  /** Direct link to this room on the booking site, if it has one. */
  bookingUrl?: string;
}

export interface Hotel {
  slug: string;
  name: string;
  /** Sample hotel: shows made-up bookings so the calendar isn't empty. */
  demo?: boolean;
  /** Hidden: not listed on the sales page and not shown to search engines (e.g. a pitch to a hotel). */
  unlisted?: boolean;
  /** Position in lists of hotels (lower first). */
  order?: number;
  /** Languages the site is offered in; the first one is the default. */
  languages: Lang[];
  timeZone: string;
  currency: string;
  town: Text;
  tagline: Text;
  about: Text;
  theme: { ground: string; surface: string; ink: string; accent: string; accentInk: string; font: FontName };
  photo?: string;
  scene?: SceneName;
  /** International format, digits only: country code + number. */
  whatsapp?: string;
  bookingUrl?: string;
  bookingSite?: string;
  email?: string;
  phone?: string;
  address?: string;
  mapUrl?: string;
  checkIn?: string;
  checkOut?: string;
  amenities?: Text[];
  rooms: Room[];
  /** scrypt hash made with `npm run hash-password`. Without one the admin page stays locked. */
  adminPasswordHash?: string;
}

const DIR = path.join(process.cwd(), "data", "hotels");
const SLUG = /^[a-z0-9-]+$/;

async function readHotel(file: string): Promise<Hotel> {
  const hotel = JSON.parse(await readFile(path.join(DIR, file), "utf8")) as Hotel;
  if (!SLUG.test(hotel.slug) || `${hotel.slug}.json` !== file) {
    throw new Error(`data/hotels/${file}: "slug" must match the file name and use a-z, 0-9 and "-".`);
  }
  return hotel;
}

export const getHotels = cache(async (): Promise<Hotel[]> => {
  const files = (await readdir(DIR)).filter((f) => f.endsWith(".json")).sort();
  const hotels = await Promise.all(files.map(readHotel));
  return hotels.sort((a, b) => (a.order ?? 999) - (b.order ?? 999));
});

export const getHotel = cache(async (slug: string): Promise<Hotel | null> => {
  if (!SLUG.test(slug)) return null;
  return (await getHotels()).find((h) => h.slug === slug) ?? null;
});

/** The hotel data that is safe to send to the browser. */
export function publicHotel(hotel: Hotel): Omit<Hotel, "adminPasswordHash"> {
  const { adminPasswordHash: _secret, ...rest } = hotel;
  return { ...rest, rooms: rest.rooms.map(({ ical: _links, ...room }) => room) };
}
