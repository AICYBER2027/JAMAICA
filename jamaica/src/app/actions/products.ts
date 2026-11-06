"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { sql } from "@/lib/db";
import { requireStaff } from "@/lib/auth";
import type { FormState } from "./auth";
import { parseReais } from "@/lib/money";

const money = z.string().transform((v, ctx) => {
  const c = parseReais(v);
  if (c == null) {
    ctx.addIssue({ code: "custom", message: `“${v}” isn’t a price. Write it like 349,90.` });
    return z.NEVER;
  }
  return c;
});

const ProductInput = z
  .object({
    name: z.string().trim().min(2, "Give the product a name.").max(120),
    slug: z.string().trim().toLowerCase().regex(/^[a-z0-9-]*$/, "The web address can use a–z, 0–9 and hyphens.").max(80),
    category_id: z.string().uuid("Choose a category."),
    description: z.string().trim().max(2000),
    details: z.string().trim().max(2000),
    price: money,
    sale_price: z.string().trim().max(20),
    status: z.enum(["draft", "active", "archived"]),
    gender: z.enum(["women", "men", "unisex"]),
    featured: z.boolean(),
    is_new: z.boolean(),
    outfit_slot: z.enum(["", "top", "outerwear", "bottom", "one-piece", "shoes", "watch", "eyewear", "accessory"]),
    tryon_category: z.enum(["", "tops", "bottoms", "one-pieces"]),
    weight_grams: z.coerce.number().int().min(1).max(50000),
  })
  .transform((v) => ({
    ...v,
    slug: v.slug || slugify(v.name),
    sale_price_cents: v.sale_price ? parseReais(v.sale_price) : null,
  }))
  .refine((v) => !v.sale_price || v.sale_price_cents != null, { message: "The promotional price isn’t a valid amount. Write it like 299,90.", path: ["sale_price"] })
  .refine((v) => v.sale_price_cents == null || v.sale_price_cents < v.price, { message: "The promotional price must be lower than the price.", path: ["sale_price"] });

function slugify(s: string) {
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 80);
}

function refresh(slug?: string) {
  revalidatePath("/", "layout");
  if (slug) revalidatePath(`/p/${slug}`);
}

export async function saveProduct(_prev: FormState, form: FormData): Promise<FormState> {
  await requireStaff("products");
  const id = String(form.get("id") ?? "");
  const raw = Object.fromEntries(["name", "slug", "category_id", "description", "details", "price", "sale_price", "status", "gender", "outfit_slot", "tryon_category", "weight_grams"].map((k) => [k, String(form.get(k) ?? "")]));
  const parsed = ProductInput.safeParse({ ...raw, featured: form.get("featured") === "on", is_new: form.get("is_new") === "on" });
  if (!parsed.success) return { error: parsed.error.issues[0].message, fields: raw };
  const v = parsed.data;
  const clash = await sql`select 1 from products where slug = ${v.slug} and id::text <> ${id || "00000000-0000-0000-0000-000000000000"}`;
  if (clash.length) return { error: `Another product already uses the address /p/${v.slug}. Change the web address.`, fields: raw };

  const values = {
    name: v.name, slug: v.slug, category_id: v.category_id, description: v.description, details: v.details,
    price_cents: v.price, sale_price_cents: v.sale_price_cents, status: v.status, gender: v.gender, featured: v.featured, is_new: v.is_new,
    outfit_slot: v.outfit_slot || null, tryon_category: v.tryon_category || null, weight_grams: v.weight_grams,
  };
  if (id) {
    await sql`update products set ${sql(values)}, updated_at = now() where id = ${id}`;
    refresh(v.slug);
    return { ok: true, message: "Saved. The store shows the change now." };
  }
  const [row] = await sql<{ id: string }[]>`insert into products ${sql(values)} returning id`;
  refresh(v.slug);
  redirect(`/admin/products/${row.id}?created=1`);
}

export async function deleteProduct(id: string) {
  await requireStaff("products");
  const [{ n }] = await sql<{ n: number }[]>`select count(*)::int as n from order_items where product_id = ${id}`;
  if (n > 0) {
    // Keep sold products for order history; hide them from the store instead.
    await sql`update products set status = 'archived', updated_at = now() where id = ${id}`;
  } else {
    await sql`delete from products where id = ${id}`;
  }
  refresh();
  redirect("/admin/products");
}

// ── Photos ──────────────────────────────────────────────────────────────
const url = z.string().max(500).refine((u) => u.startsWith("/") || u.startsWith("https://"), "Invalid file address");

export async function addImages(productId: string, urls: string[]) {
  await requireStaff("products");
  const list = z.array(url).max(30).parse(urls);
  const [{ max }] = await sql<{ max: number }[]>`select coalesce(max(sort), -1)::int as max from product_images where product_id = ${productId}`;
  const [p] = await sql<{ name: string; slug: string }[]>`select name, slug from products where id = ${productId}`;
  for (const [i, u] of list.entries()) {
    await sql`insert into product_images (product_id, url, alt, sort) values (${productId}, ${u}, ${p.name}, ${max + 1 + i})`;
  }
  refresh(p.slug);
}

export async function updateImage(imageId: string, data: { alt: string; color: string | null }) {
  await requireStaff("products");
  const d = z.object({ alt: z.string().max(200), color: z.string().max(60).nullable() }).parse(data);
  const [r] = await sql<{ slug: string }[]>`update product_images i set alt = ${d.alt}, color = ${d.color || null} from products p where i.id = ${imageId} and p.id = i.product_id returning p.slug`;
  refresh(r?.slug);
}

export async function moveImage(imageId: string, direction: -1 | 1) {
  await requireStaff("products");
  const [img] = await sql<{ product_id: string }[]>`select product_id from product_images where id = ${imageId}`;
  if (!img) return;
  const list = await sql<{ id: string }[]>`select id from product_images where product_id = ${img.product_id} order by sort, id`;
  const i = list.findIndex((x) => x.id === imageId);
  const j = i + direction;
  if (j < 0 || j >= list.length) return;
  [list[i], list[j]] = [list[j], list[i]];
  await sql.begin(async (tx) => {
    for (const [k, x] of list.entries()) await tx`update product_images set sort = ${k} where id = ${x.id}`;
  });
  refresh();
}

export async function deleteImage(imageId: string) {
  await requireStaff("products");
  await sql`delete from product_images where id = ${imageId}`;
  refresh();
}

// ── Variants and stock ──────────────────────────────────────────────────
export async function addColour(productId: string, input: { color: string; hex: string; sizes: string; stock: number }) {
  await requireStaff("products");
  const d = z
    .object({ color: z.string().trim().min(1, "Name the colour.").max(60), hex: z.string().regex(/^#[0-9a-fA-F]{6}$/), sizes: z.string().trim().min(1, "List at least one size."), stock: z.number().int().min(0).max(100000) })
    .parse(input);
  const sizes = [...new Set(d.sizes.split(/[,;\s]+/).map((s) => s.trim()).filter(Boolean))].slice(0, 30);
  const [p] = await sql<{ slug: string }[]>`select slug from products where id = ${productId}`;
  const [{ max }] = await sql<{ max: number }[]>`select coalesce(max(sort), -1)::int as max from product_variants where product_id = ${productId}`;
  let added = 0;
  for (const [i, size] of sizes.entries()) {
    const sku = `JM-${p.slug}-${d.color}-${size}`.toUpperCase().replace(/[^A-Z0-9]+/g, "-").slice(0, 80);
    const r = await sql`insert into product_variants (product_id, size, color, color_hex, sku, stock, sort)
      values (${productId}, ${size}, ${d.color}, ${d.hex}, ${sku}, ${d.stock}, ${max + 1 + i})
      on conflict do nothing returning id`;
    added += r.length;
  }
  refresh(p.slug);
  return { added, skipped: sizes.length - added };
}

export async function setStock(variantId: string, stock: number) {
  await requireStaff("products");
  const n = z.number().int().min(0).max(100000).parse(stock);
  await sql`update product_variants set stock = ${n} where id = ${variantId}`;
  refresh();
}

export async function setColourHex(productId: string, color: string, hex: string) {
  await requireStaff("products");
  z.string().regex(/^#[0-9a-fA-F]{6}$/).parse(hex);
  await sql`update product_variants set color_hex = ${hex} where product_id = ${productId} and color = ${color}`;
  refresh();
}

export async function deleteVariant(variantId: string) {
  await requireStaff("products");
  await sql`delete from product_variants where id = ${variantId}`;
  refresh();
}

// ── 3D model and 360° sequence ──────────────────────────────────────────
export async function setModel(productId: string, data: { url: string; credit: string; variantMap: Record<string, string> }) {
  await requireStaff("products");
  const d = z.object({ url, credit: z.string().max(400), variantMap: z.record(z.string().max(60), z.string().max(60)) }).parse(data);
  const [first] = await sql<{ url: string }[]>`select url from product_images where product_id = ${productId} order by sort limit 1`;
  await sql`insert into product_media3d (product_id, kind, model_url, poster, credit, variant_map)
    values (${productId}, 'model', ${d.url}, ${first?.url ?? null}, ${d.credit}, ${sql.json(d.variantMap)})
    on conflict (product_id, kind) do update set model_url = excluded.model_url, credit = excluded.credit, variant_map = excluded.variant_map, poster = excluded.poster`;
  refresh();
}

export async function setSequence(productId: string, data: { frames: string[]; credit: string }) {
  await requireStaff("products");
  const d = z.object({ frames: z.array(url).min(8, "A 360° sequence needs at least 8 photos taken around the product.").max(120), credit: z.string().max(400) }).parse(data);
  await sql`insert into product_media3d (product_id, kind, frames, credit)
    values (${productId}, 'sequence', ${d.frames}, ${d.credit})
    on conflict (product_id, kind) do update set frames = excluded.frames, credit = excluded.credit`;
  refresh();
}

export async function removeMedia3d(productId: string, kind: "model" | "sequence") {
  await requireStaff("products");
  await sql`delete from product_media3d where product_id = ${productId} and kind = ${kind}`;
  refresh();
}
