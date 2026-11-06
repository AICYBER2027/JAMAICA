import "server-only";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { createHash, randomBytes, scrypt as scryptCb, timingSafeEqual } from "node:crypto";
import { sql } from "./db";

function scrypt(pw: string, salt: Buffer, len: number, opts: { N: number; r: number; p: number }): Promise<Buffer> {
  return new Promise((resolve, reject) =>
    scryptCb(pw, salt, len, { ...opts, maxmem: 64 * 1024 * 1024 }, (err, key) => (err ? reject(err) : resolve(key))),
  );
}

export const PERMISSIONS = {
  products: "Products, photos, 3D and inventory",
  orders: "Orders and fulfilment",
  customers: "Customers",
  promotions: "Discount codes",
  reports: "Sales reports",
  settings: "Store settings, shipping, payments and try-on models",
  team: "Employees and permissions",
} as const;
export type Permission = keyof typeof PERMISSIONS;
export type Role = "customer" | "staff" | "manager" | "owner";

export const ROLE_DEFAULTS: Record<Exclude<Role, "customer">, Permission[]> = {
  staff: ["products", "orders"],
  manager: ["products", "orders", "customers", "promotions", "reports"],
  owner: Object.keys(PERMISSIONS) as Permission[],
};

export type SessionUser = {
  id: string;
  email: string;
  name: string;
  phone: string;
  role: Role;
  permissions: Permission[];
};

const COOKIE = "jm_session";
const SESSION_DAYS = 30;

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const hash = await scrypt(password, salt, 64, { N: 16384, r: 8, p: 1 });
  return ["scrypt", 16384, 8, 1, salt.toString("base64"), hash.toString("base64")].join("$");
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [algo, n, r, p, salt, hash] = stored.split("$");
  if (algo !== "scrypt" || !salt || !hash) return false;
  const expected = Buffer.from(hash, "base64");
  const actual = await scrypt(password, Buffer.from(salt, "base64"), expected.length, { N: Number(n), r: Number(r), p: Number(p) });
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

const sha256 = (s: string) => createHash("sha256").update(s).digest("hex");

export async function createSession(userId: string) {
  const token = randomBytes(32).toString("base64url");
  const expires = new Date(Date.now() + SESSION_DAYS * 864e5);
  await sql`insert into sessions (token_hash, user_id, expires_at) values (${sha256(token)}, ${userId}, ${expires})`;
  await sql`delete from sessions where expires_at < now()`;
  (await cookies()).set(COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires,
  });
}

export async function destroySession() {
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  if (token) await sql`delete from sessions where token_hash = ${sha256(token)}`;
  jar.delete(COOKIE);
}

export const getUser = cache(async (): Promise<SessionUser | null> => {
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token) return null;
  const [u] = await sql<SessionUser[]>`
    select u.id, u.email, u.name, u.phone, u.role, u.permissions
    from sessions s join users u on u.id = s.user_id
    where s.token_hash = ${sha256(token)} and s.expires_at > now() and u.active`;
  if (!u) return null;
  if (u.role === "owner") u.permissions = ROLE_DEFAULTS.owner;
  return u;
});

export function isStaff(u: SessionUser | null): u is SessionUser {
  return !!u && u.role !== "customer";
}

export function can(u: SessionUser | null, permission: Permission): boolean {
  return isStaff(u) && (u.role === "owner" || u.permissions.includes(permission));
}

/** For admin pages and actions: signed-in staff with the given permission, or redirect. */
export async function requireStaff(permission?: Permission): Promise<SessionUser> {
  const u = await getUser();
  if (!isStaff(u)) redirect("/admin/login");
  if (permission && !can(u, permission)) redirect("/admin?denied=" + permission);
  return u;
}

export async function requireCustomer(next = "/account"): Promise<SessionUser> {
  const u = await getUser();
  if (!u) redirect(`/account/login?next=${encodeURIComponent(next)}`);
  return u;
}

async function clientIp() {
  return (await headers()).get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
}

/** True when there were too many failed sign-ins for this email or IP in the last 15 minutes. */
export async function tooManyAttempts(email: string): Promise<boolean> {
  const ip = await clientIp();
  const [r] = await sql<{ by_email: number; by_ip: number }[]>`
    select
      count(*) filter (where key = ${"e:" + email.toLowerCase()})::int as by_email,
      count(*) filter (where key = ${"i:" + ip})::int as by_ip
    from auth_attempts where created_at > now() - interval '15 minutes'`;
  return r.by_email >= 8 || r.by_ip >= 30;
}

export async function recordFailedAttempt(email: string) {
  const ip = await clientIp();
  await sql`insert into auth_attempts (key) values (${"e:" + email.toLowerCase()}), (${"i:" + ip})`;
  await sql`delete from auth_attempts where created_at < now() - interval '1 day'`;
}

/** Anonymous per-browser key, used for try-on photos when the visitor has no account. */
export async function visitorKey(create = false): Promise<string | null> {
  const jar = await cookies();
  const existing = jar.get("jm_visitor")?.value;
  if (existing && /^[A-Za-z0-9_-]{20,64}$/.test(existing)) return existing;
  if (!create) return null;
  const key = randomBytes(24).toString("base64url");
  jar.set("jm_visitor", key, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });
  return key;
}
