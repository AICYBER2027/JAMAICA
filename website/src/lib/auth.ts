import "server-only";
import { createHmac, scryptSync, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import type { Hotel } from "./hotels.ts";

// One admin password per hotel, stored as an scrypt hash in the hotel's JSON file.
// After signing in, a signed cookie (HMAC with SESSION_SECRET) keeps the hotel signed in for 30 days.

const MAX_AGE = 60 * 60 * 24 * 30;

function secret(): string {
  const s = process.env.SESSION_SECRET;
  if (s && s.length >= 16) return s;
  if (process.env.NODE_ENV === "production") {
    throw new Error("SESSION_SECRET is not set (or shorter than 16 characters). Add it in Vercel → Settings → Environment Variables.");
  }
  return "local-development-only-secret";
}

export function verifyPassword(password: string, stored: string | undefined): boolean {
  if (!stored) return false;
  const [scheme, salt, hash] = stored.split("$");
  if (scheme !== "scrypt" || !salt || !hash) return false;
  const expected = Buffer.from(hash, "hex");
  const actual = scryptSync(password, salt, expected.length);
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

const cookieName = (slug: string) => `hotel_admin_${slug}`;

function sign(value: string): string {
  return createHmac("sha256", secret()).update(value).digest("hex");
}

export async function signIn(hotel: Hotel): Promise<void> {
  const exp = Math.floor(Date.now() / 1000) + MAX_AGE;
  const value = `${hotel.slug}.${exp}`;
  (await cookies()).set(cookieName(hotel.slug), `${value}.${sign(value)}`, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: MAX_AGE,
  });
}

export async function signOut(slug: string): Promise<void> {
  (await cookies()).delete(cookieName(slug));
}

export async function isSignedIn(hotel: Hotel): Promise<boolean> {
  if (!hotel.adminPasswordHash) return false;
  const raw = (await cookies()).get(cookieName(hotel.slug))?.value;
  if (!raw) return false;
  const parts = raw.split(".");
  if (parts.length !== 3) return false;
  const [slug, exp, mac] = parts;
  if (slug !== hotel.slug || Number(exp) * 1000 < Date.now()) return false;
  const good = Buffer.from(sign(`${slug}.${exp}`), "hex");
  const given = Buffer.from(mac, "hex");
  return good.length === given.length && timingSafeEqual(good, given);
}
