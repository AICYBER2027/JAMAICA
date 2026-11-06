// Fills an empty database with the opening catalogue. Safe to re-run: existing slugs are skipped.
import "./env.mjs";
import postgres from "postgres";
import { readdirSync, existsSync } from "node:fs";
import { categories, products, shippingRates, tryonModels } from "./seed-data.mjs";

const sql = postgres(process.env.DATABASE_URL, { prepare: false, onnotice: () => {} });
const img = (name) => `/catalog/${name}.jpg`;
// Deterministic stock so every run looks the same: mostly in stock, a few sizes sold out.
const stockFor = (sku) => {
  let h = 0;
  for (const c of sku) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return h % 9 === 0 ? 0 : 2 + (h % 14);
};

await sql.begin(async (tx) => {
  for (const [i, [slug, name, department, description, image]] of categories.entries()) {
    await tx`insert into categories (slug, name, department, description, image, sort)
      values (${slug}, ${name}, ${department}, ${description}, ${img(image)}, ${i}) on conflict (slug) do nothing`;
  }
  const cats = Object.fromEntries((await tx`select id, slug from categories`).map((r) => [r.slug, r.id]));
  let added = 0;
  for (const [n, [slug, name, cat, price, sale, gender, images, sizes, colours, o]] of products.entries()) {
    const [row] = await tx`insert into products (slug, name, description, details, category_id, price_cents, sale_price_cents, gender,
        featured, is_new, tryon_category, outfit_slot, palette, created_at)
      values (${slug}, ${name}, ${o.desc}, ${o.details ?? ""}, ${cats[cat]}, ${price * 100}, ${sale ? sale * 100 : null}, ${gender},
        ${!!o.featured}, ${!!o.isNew}, ${o.tryon ?? null}, ${o.slot ?? null}, ${o.palette ?? "neutral"}, now() - ${`${n} hours`}::interval)
      on conflict (slug) do nothing returning id`;
    if (!row) continue;
    added++;
    for (const [i, file] of images.entries()) {
      await tx`insert into product_images (product_id, url, alt, color, sort)
        values (${row.id}, ${img(file)}, ${`${name}${o.imageColors ? `, ${o.imageColors[i]}` : ""}`}, ${o.imageColors?.[i] ?? null}, ${i})`;
    }
    let s = 0;
    for (const [colour, hex] of colours) {
      for (const size of sizes) {
        const sku = `JM-${slug}-${colour}-${size}`.toUpperCase().replace(/[^A-Z0-9]+/g, "-");
        await tx`insert into product_variants (product_id, size, color, color_hex, sku, stock, sort)
          values (${row.id}, ${size}, ${colour}, ${hex}, ${sku}, ${stockFor(sku)}, ${s++})`;
      }
    }
    if (o.model) {
      await tx`insert into product_media3d (product_id, kind, model_url, poster, credit, variant_map)
        values (${row.id}, 'model', ${o.model}, ${img(images[0])}, ${o.credit}, ${tx.json(o.variants3d ?? {})})`;
    }
    if (o.sequence) {
      const dir = `public/catalog/360/${o.sequence}`;
      const frames = existsSync(dir) ? readdirSync(dir).filter((f) => f.endsWith(".webp")).sort().map((f) => `/catalog/360/${o.sequence}/${f}`) : [];
      if (frames.length >= 8) {
        await tx`insert into product_media3d (product_id, kind, frames, poster, credit)
          values (${row.id}, 'sequence', ${frames}, ${img(images[0])}, ${`${o.credit} 360° sequence rendered from the 3D model.`})`;
      }
    }
  }
  for (const [region, label, sc, sd, ec, ed, free] of shippingRates) {
    await tx`insert into shipping_rates values (${region}, ${label}, ${sc}, ${sd}, ${ec}, ${ed}, ${free}) on conflict do nothing`;
  }
  if ((await tx`select count(*)::int as n from tryon_models`)[0].n === 0) {
    for (const [i, [name, gender, body, view, pose, url]] of tryonModels.entries()) {
      await tx`insert into tryon_models (name, gender, body_type, view, pose, image_url, sort) values (${name}, ${gender}, ${body}, ${view}, ${pose}, ${url}, ${i})`;
    }
  }
  await tx`insert into discount_codes (code, kind, value, min_subtotal_cents) values
    ('BEMVINDO10', 'percent', 10, 0), ('FRETEGRATIS', 'free_shipping', 0, 29900) on conflict do nothing`;
  await tx`insert into settings (key, value) values ('store', ${tx.json({ name: "JAMAICA", pixKey: "", pixMerchantName: "JAMAICA", pixMerchantCity: "SAO PAULO", supportEmail: "" })}) on conflict do nothing`;
  console.log(`seeded ${added} products`);
});
await sql.end();
