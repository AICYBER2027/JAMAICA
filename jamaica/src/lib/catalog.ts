import "server-only";
import { sql } from "./db";
import { sortSizes } from "./sizes";
export { sortSizes };

export type Department = "fashion" | "accessories" | "footwear";
export const DEPARTMENTS: { slug: Department; name: string; blurb: string }[] = [
  { slug: "fashion", name: "Fashion", blurb: "Tees, tailoring, denim and dresses." },
  { slug: "accessories", name: "Accessories", blurb: "Watches, sunglasses, bags and jewelry." },
  { slug: "footwear", name: "Footwear", blurb: "Sneakers, boots, formal shoes and sandals." },
];

export type Category = {
  id: string;
  slug: string;
  name: string;
  department: Department;
  description: string;
  image: string | null;
  sort: number;
  product_count?: number;
};

export type ProductCard = {
  id: string;
  slug: string;
  name: string;
  price_cents: number;
  sale_price_cents: number | null;
  is_new: boolean;
  featured: boolean;
  gender: "women" | "men" | "unisex";
  category_slug: string;
  category_name: string;
  department: Department;
  image: string | null;
  image2: string | null;
  colors: { name: string; hex: string }[];
  in_stock: boolean;
  has_3d: boolean;
  outfit_slot: string | null;
  palette: string;
  tryon_category: string | null;
};

export type Variant = { id: string; size: string; color: string; color_hex: string; sku: string; stock: number };
export type ProductImage = { id: string; url: string; alt: string; color: string | null };
export type Media3D = {
  kind: "model" | "sequence";
  model_url: string | null;
  frames: string[];
  poster: string | null;
  credit: string;
  variant_map: Record<string, string>;
};

export type Product = ProductCard & {
  description: string;
  details: string;
  status: string;
  category_id: string;
  images: ProductImage[];
  variants: Variant[];
  media3d: Media3D[];
  weight_grams: number;
};

const cardColumns = sql`
  p.id, p.slug, p.name, p.price_cents, p.sale_price_cents, p.is_new, p.featured, p.gender, p.outfit_slot, p.palette, p.tryon_category,
  c.slug as category_slug, c.name as category_name, c.department,
  (select url from product_images i where i.product_id = p.id order by sort limit 1) as image,
  (select url from product_images i where i.product_id = p.id order by sort offset 1 limit 1) as image2,
  coalesce((
    select json_agg(jsonb_build_object('name', name, 'hex', hex) order by s)
    from (select v.color as name, min(v.color_hex) as hex, min(v.sort) as s from product_variants v where v.product_id = p.id group by v.color) vc
  ), '[]') as colors,
  exists (select 1 from product_variants v where v.product_id = p.id and v.stock > 0) as in_stock,
  exists (select 1 from product_media3d m where m.product_id = p.id) as has_3d
`;

export type Sort = "new" | "price-asc" | "price-desc" | "featured";
export type Filters = {
  department?: Department;
  category?: string;
  gender?: string;
  size?: string;
  color?: string;
  min?: number;
  max?: number;
  sale?: boolean;
  has3d?: boolean;
  q?: string;
  sort?: Sort;
  limit?: number;
  slots?: string[];
};

export async function listProducts(f: Filters = {}): Promise<ProductCard[]> {
  const price = sql`coalesce(p.sale_price_cents, p.price_cents)`;
  const order =
    f.sort === "price-asc" ? sql`${price} asc` :
    f.sort === "price-desc" ? sql`${price} desc` :
    f.sort === "featured" ? sql`p.featured desc, p.created_at desc` :
    sql`p.created_at desc`;
  const rows = await sql<ProductCard[]>`
    select ${cardColumns}
    from products p join categories c on c.id = p.category_id
    where p.status = 'active'
      ${f.department ? sql`and c.department = ${f.department}` : sql``}
      ${f.category ? sql`and c.slug = ${f.category}` : sql``}
      ${f.gender ? sql`and (p.gender = ${f.gender} or p.gender = 'unisex')` : sql``}
      ${f.size ? sql`and exists (select 1 from product_variants v where v.product_id = p.id and v.size = ${f.size} and v.stock > 0)` : sql``}
      ${f.color ? sql`and exists (select 1 from product_variants v where v.product_id = p.id and v.color = ${f.color})` : sql``}
      ${f.min != null ? sql`and ${price} >= ${f.min}` : sql``}
      ${f.max != null ? sql`and ${price} <= ${f.max}` : sql``}
      ${f.sale ? sql`and p.sale_price_cents is not null` : sql``}
      ${f.has3d ? sql`and exists (select 1 from product_media3d m where m.product_id = p.id)` : sql``}
      ${f.slots?.length ? sql`and p.outfit_slot = any(${f.slots})` : sql``}
      ${f.q ? sql`and (p.name ilike ${"%" + f.q + "%"} or p.description ilike ${"%" + f.q + "%"} or c.name ilike ${"%" + f.q + "%"})` : sql``}
    order by ${order}
    limit ${f.limit ?? 200}`;
  return rows;
}

export async function getFacets(where: { department?: Department; category?: string }) {
  const rows = await sql<{ sizes: string[]; colors: { name: string; hex: string }[]; min: number; max: number }[]>`
    select
      coalesce(array_agg(distinct v.size), '{}') as sizes,
      coalesce((
        select json_agg(jsonb_build_object('name', name, 'hex', hex) order by n desc, name)
        from (select v2.color as name, min(v2.color_hex) as hex, count(distinct v2.product_id) as n from product_variants v2
              where v2.product_id = any(array_agg(p.id)) group by v2.color order by n desc, v2.color limit 16) cc
      ), '[]') as colors,
      coalesce(min(coalesce(p.sale_price_cents, p.price_cents)), 0)::int as min,
      coalesce(max(coalesce(p.sale_price_cents, p.price_cents)), 0)::int as max
    from products p join categories c on c.id = p.category_id join product_variants v on v.product_id = p.id
    where p.status = 'active'
      ${where.department ? sql`and c.department = ${where.department}` : sql``}
      ${where.category ? sql`and c.slug = ${where.category}` : sql``}`;
  const r = rows[0];
  return { ...r, sizes: sortSizes(r.sizes) };
}

export async function listCategories(department?: Department): Promise<Category[]> {
  return sql<Category[]>`
    select c.*, (select count(*)::int from products p where p.category_id = c.id and p.status = 'active') as product_count
    from categories c
    ${department ? sql`where c.department = ${department}` : sql``}
    order by c.sort, c.name`;
}

export async function getCategory(slug: string): Promise<Category | null> {
  const [c] = await sql<Category[]>`select * from categories where slug = ${slug}`;
  return c ?? null;
}

async function hydrate(base: ProductCard & Record<string, unknown>): Promise<Product> {
  const [images, variants, media3d] = await Promise.all([
    sql<ProductImage[]>`select id, url, alt, color from product_images where product_id = ${base.id} order by sort`,
    sql<Variant[]>`select id, size, color, color_hex, sku, stock from product_variants where product_id = ${base.id} order by sort`,
    sql<Media3D[]>`select kind, model_url, frames, poster, credit, variant_map from product_media3d where product_id = ${base.id} order by kind`,
  ]);
  return { ...(base as Product), images, variants, media3d };
}

export async function getProduct(slug: string, opts: { includeDrafts?: boolean } = {}): Promise<Product | null> {
  const [p] = await sql<(ProductCard & Record<string, unknown>)[]>`
    select ${cardColumns}, p.description, p.details, p.status, p.category_id, p.weight_grams
    from products p join categories c on c.id = p.category_id
    where p.slug = ${slug} ${opts.includeDrafts ? sql`` : sql`and p.status = 'active'`}`;
  return p ? hydrate(p) : null;
}

export async function getProductById(id: string): Promise<Product | null> {
  const [p] = await sql<(ProductCard & Record<string, unknown>)[]>`
    select ${cardColumns}, p.description, p.details, p.status, p.category_id, p.weight_grams
    from products p join categories c on c.id = p.category_id where p.id = ${id}`;
  return p ? hydrate(p) : null;
}

/** Same category first, then same department, excluding the product itself. */
export async function relatedProducts(p: Product, limit = 4): Promise<ProductCard[]> {
  return sql<ProductCard[]>`
    select ${cardColumns}
    from products p join categories c on c.id = p.category_id
    where p.status = 'active' and p.id <> ${p.id} and c.department = ${p.department}
    order by (c.slug = ${p.category_slug}) desc, (p.gender = ${p.gender} or p.gender = 'unisex') desc, p.featured desc, p.created_at desc
    limit ${limit}`;
}

export async function bestSellers(limit = 8): Promise<ProductCard[]> {
  // Ranked by units sold in paid orders; falls back to featured products while there are no sales yet.
  return sql<ProductCard[]>`
    select ${cardColumns}
    from products p join categories c on c.id = p.category_id
    left join (
      select oi.product_id, sum(oi.quantity) as units
      from order_items oi join orders o on o.id = oi.order_id
      where o.status in ('paid', 'preparing', 'shipped', 'delivered')
      group by oi.product_id
    ) s on s.product_id = p.id
    where p.status = 'active'
    order by coalesce(s.units, 0) desc, p.featured desc, p.created_at desc
    limit ${limit}`;
}
