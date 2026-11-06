"use server";
import { revalidatePath } from "next/cache";
import { randomBytes } from "node:crypto";
import { z } from "zod";
import { sql } from "@/lib/db";
import { hashPassword, PERMISSIONS, requireStaff, ROLE_DEFAULTS, type Permission } from "@/lib/auth";
import { parseReais } from "@/lib/money";
import { saveStoreSettings, type StoreSettings } from "@/lib/settings";
import { isValidPixKey } from "@/lib/pix";
import type { FormState } from "./auth";

const str = (f: FormData, k: string) => String(f.get(k) ?? "").trim();
const refreshStore = () => revalidatePath("/", "layout");

// ── Categories ──────────────────────────────────────────────────────────
export async function saveCategory(_p: FormState, f: FormData): Promise<FormState> {
  await requireStaff("products");
  const d = z
    .object({
      id: z.string(),
      name: z.string().min(2, "Name the category.").max(60),
      slug: z.string().regex(/^[a-z0-9-]*$/, "The web address can use a–z, 0–9 and hyphens.").max(60),
      department: z.enum(["fashion", "accessories", "footwear"]),
      description: z.string().max(300),
      image: z.string().max(500),
      sort: z.coerce.number().int().min(0).max(999),
    })
    .safeParse(Object.fromEntries(["id", "name", "slug", "department", "description", "image", "sort"].map((k) => [k, str(f, k)])));
  if (!d.success) return { error: d.error.issues[0].message };
  const v = d.data;
  const slug = v.slug || v.name.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  try {
    if (v.id) await sql`update categories set name = ${v.name}, slug = ${slug}, department = ${v.department}, description = ${v.description}, image = ${v.image || null}, sort = ${v.sort} where id = ${v.id}`;
    else await sql`insert into categories (name, slug, department, description, image, sort) values (${v.name}, ${slug}, ${v.department}, ${v.description}, ${v.image || null}, ${v.sort})`;
  } catch {
    return { error: `Another category already uses the address “${slug}”.` };
  }
  refreshStore();
  revalidatePath("/admin/categories");
  return { ok: true, message: v.id ? "Category saved." : "Category added." };
}

export async function deleteCategory(id: string): Promise<{ error?: string }> {
  await requireStaff("products");
  const [{ n }] = await sql<{ n: number }[]>`select count(*)::int as n from products where category_id = ${id}`;
  if (n > 0) return { error: `Move its ${n} products to another category first.` };
  await sql`delete from categories where id = ${id}`;
  refreshStore();
  revalidatePath("/admin/categories");
  return {};
}

// ── Discount codes ──────────────────────────────────────────────────────
export async function saveDiscount(_p: FormState, f: FormData): Promise<FormState> {
  await requireStaff("promotions");
  const code = str(f, "code").toUpperCase();
  const kind = str(f, "kind");
  const fields = Object.fromEntries(["code", "kind", "value", "min", "max_uses", "starts_at", "ends_at"].map((k) => [k, str(f, k)]));
  if (!/^[A-Z0-9_-]{3,32}$/.test(code)) return { error: "Codes use 3 to 32 letters, numbers, - or _.", fields };
  if (!["percent", "fixed", "free_shipping"].includes(kind)) return { error: "Choose what the code does.", fields };
  let value = 0;
  if (kind === "percent") {
    value = Number(str(f, "value"));
    if (!Number.isInteger(value) || value < 1 || value > 90) return { error: "A percentage discount is a whole number from 1 to 90.", fields };
  } else if (kind === "fixed") {
    const c = parseReais(str(f, "value"));
    if (!c) return { error: "Write the amount off in reais, like 50,00.", fields };
    value = c;
  }
  const min = str(f, "min") ? parseReais(str(f, "min")) : 0;
  if (min == null) return { error: "The minimum order isn’t a valid amount.", fields };
  const maxUses = str(f, "max_uses") ? Number(str(f, "max_uses")) : null;
  if (maxUses != null && (!Number.isInteger(maxUses) || maxUses < 1)) return { error: "Maximum uses is a whole number, or empty for unlimited.", fields };
  const starts = str(f, "starts_at") || null;
  const ends = str(f, "ends_at") || null;
  if (starts && ends && ends < starts) return { error: "The end date is before the start date.", fields };
  await sql`insert into discount_codes (code, kind, value, min_subtotal_cents, max_uses, starts_at, ends_at)
    values (${code}, ${kind}, ${value}, ${min}, ${maxUses}, ${starts}, ${ends ? ends + "T23:59:59" : null})
    on conflict (code) do update set kind = excluded.kind, value = excluded.value, min_subtotal_cents = excluded.min_subtotal_cents,
      max_uses = excluded.max_uses, starts_at = excluded.starts_at, ends_at = excluded.ends_at, active = true`;
  revalidatePath("/admin/promotions");
  return { ok: true, message: `${code} is live.` };
}

export async function toggleDiscount(code: string, active: boolean) {
  await requireStaff("promotions");
  await sql`update discount_codes set active = ${active} where code = ${code}`;
  revalidatePath("/admin/promotions");
}

// ── Inventory ───────────────────────────────────────────────────────────
export async function bulkStock(updates: { id: string; stock: number }[]) {
  await requireStaff("products");
  const list = z.array(z.object({ id: z.string().uuid(), stock: z.number().int().min(0).max(100000) })).max(500).parse(updates);
  await sql.begin(async (tx) => {
    for (const u of list) await tx`update product_variants set stock = ${u.stock} where id = ${u.id}`;
  });
  refreshStore();
  revalidatePath("/admin/inventory");
  return { saved: list.length };
}

// ── Settings ────────────────────────────────────────────────────────────
export async function saveSettings(_p: FormState, f: FormData): Promise<FormState> {
  await requireStaff("settings");
  const s: StoreSettings = {
    name: str(f, "name") || "JAMAICA",
    pixKey: str(f, "pixKey"),
    pixMerchantName: str(f, "pixMerchantName").slice(0, 25),
    pixMerchantCity: str(f, "pixMerchantCity").slice(0, 15),
    supportEmail: str(f, "supportEmail"),
  };
  const fields = s as unknown as Record<string, string>;
  if (s.pixKey && !isValidPixKey(s.pixKey)) return { error: "That PIX key isn’t valid. Use your CPF/CNPJ, email, phone (+55…) or random key exactly as registered at your bank.", fields };
  if (s.pixKey && (!s.pixMerchantName || !s.pixMerchantCity)) return { error: "PIX needs the account holder’s name and city as registered at the bank.", fields };
  if (s.supportEmail && !z.string().email().safeParse(s.supportEmail).success) return { error: "The support email isn’t valid.", fields };
  await saveStoreSettings(s);
  refreshStore();
  return { ok: true, message: "Settings saved." };
}

export async function saveShippingRates(_p: FormState, f: FormData): Promise<FormState> {
  await requireStaff("settings");
  const regions = ["SE", "S", "CO", "NE", "N"];
  const rows: { r: string; sc: number; ec: number; sd: number; ed: number; free: number | null }[] = [];
  for (const r of regions) {
    const sc = parseReais(str(f, `${r}_standard`));
    const ec = parseReais(str(f, `${r}_express`));
    const sd = Number(str(f, `${r}_standard_days`));
    const ed = Number(str(f, `${r}_express_days`));
    const free = str(f, `${r}_free`) ? parseReais(str(f, `${r}_free`)) : null;
    if (sc == null || ec == null || !Number.isInteger(sd) || !Number.isInteger(ed) || sd < 1 || ed < 1) return { error: `Check the ${r} row: prices like 19,90 and whole days.` };
    if (str(f, `${r}_free`) && free == null) return { error: `The free-shipping threshold for ${r} isn’t a valid amount.` };
    rows.push({ r, sc, ec, sd, ed, free });
  }
  await sql.begin(async (tx) => {
    for (const x of rows) await tx`update shipping_rates set standard_cents = ${x.sc}, express_cents = ${x.ec}, standard_days = ${x.sd}, express_days = ${x.ed}, free_over_cents = ${x.free} where region = ${x.r}`;
  });
  return { ok: true, message: "Shipping rates saved. New quotes use them now." };
}

export async function saveTryonModel(data: { name: string; gender: string; body_type: string; view: string; image_url: string }) {
  await requireStaff("settings");
  const d = z
    .object({ name: z.string().min(1).max(40), gender: z.enum(["women", "men"]), body_type: z.string().max(30), view: z.enum(["front", "side", "back"]), image_url: z.string().max(500) })
    .parse(data);
  await sql`insert into tryon_models (name, gender, body_type, view, image_url, sort) values (${d.name}, ${d.gender}, ${d.body_type}, ${d.view}, ${d.image_url}, 99)`;
  revalidatePath("/admin/settings");
}

export async function toggleTryonModel(id: string, active: boolean) {
  await requireStaff("settings");
  await sql`update tryon_models set active = ${active} where id = ${id}`;
  revalidatePath("/admin/settings");
}

// ── Team ────────────────────────────────────────────────────────────────
export async function inviteEmployee(_p: FormState, f: FormData): Promise<FormState> {
  const me = await requireStaff("team");
  const email = str(f, "email").toLowerCase();
  const name = str(f, "name");
  const role = str(f, "role") as "staff" | "manager" | "owner";
  const fields = { email, name, role };
  if (!z.string().email().safeParse(email).success) return { error: "Enter a valid email.", fields };
  if (name.length < 2) return { error: "Enter their name.", fields };
  if (!["staff", "manager", "owner"].includes(role)) return { error: "Choose a role.", fields };
  if (role === "owner" && me.role !== "owner") return { error: "Only an owner can add another owner.", fields };
  const temp = randomBytes(9).toString("base64url");
  const hash = await hashPassword(temp);
  const [existing] = await sql<{ id: string; role: string }[]>`select id, role from users where email = ${email}`;
  if (existing && existing.role !== "customer") return { error: "This person is already on the team.", fields };
  if (existing) {
    // Promote an existing customer account; they keep their password.
    await sql`update users set role = ${role}, permissions = ${ROLE_DEFAULTS[role]}, active = true where id = ${existing.id}`;
    revalidatePath("/admin/team");
    return { ok: true, message: `${name} already had a customer account; it now has ${role} access. They sign in with their existing password.` };
  }
  await sql`insert into users (email, name, password_hash, role, permissions) values (${email}, ${name}, ${hash}, ${role}, ${ROLE_DEFAULTS[role]})`;
  revalidatePath("/admin/team");
  return { ok: true, message: `Account created. Give ${name} this temporary password in person or by phone: ${temp}. It is shown only once; they can change it from their account page.` };
}

export async function setPermissions(userId: string, role: "staff" | "manager" | "owner", permissions: string[]) {
  const me = await requireStaff("team");
  if (userId === me.id) throw new Error("You can’t change your own access. Ask another owner.");
  if (role === "owner" && me.role !== "owner") throw new Error("Only an owner can make someone an owner.");
  const [target] = await sql<{ role: string }[]>`select role from users where id = ${userId}`;
  if (target?.role === "owner" && me.role !== "owner") throw new Error("Only an owner can change another owner.");
  const perms = permissions.filter((p): p is Permission => p in PERMISSIONS);
  await sql`update users set role = ${role}, permissions = ${perms} where id = ${userId} and role <> 'customer'`;
  revalidatePath("/admin/team");
}

export async function setActive(userId: string, active: boolean) {
  const me = await requireStaff("team");
  if (userId === me.id) throw new Error("You can’t deactivate yourself.");
  const [target] = await sql<{ role: string }[]>`select role from users where id = ${userId}`;
  if (target?.role === "owner" && me.role !== "owner") throw new Error("Only an owner can deactivate an owner.");
  await sql`update users set active = ${active} where id = ${userId}`;
  if (!active) await sql`delete from sessions where user_id = ${userId}`;
  revalidatePath("/admin/team");
}
