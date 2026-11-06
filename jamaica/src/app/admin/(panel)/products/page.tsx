import Image from "next/image";
import Link from "next/link";
import { requireStaff } from "@/lib/auth";
import { sql } from "@/lib/db";
import { formatBRL } from "@/lib/money";

export const metadata = { title: "Products" };

type Row = { id: string; slug: string; name: string; status: string; price_cents: number; sale_price_cents: number | null; category: string; image: string | null; stock: number; variants: number; has_model: boolean; has_sequence: boolean };

export default async function Products({ searchParams }: { searchParams: Promise<{ q?: string; status?: string; category?: string }> }) {
  await requireStaff("products");
  const sp = await searchParams;
  const q = sp.q?.trim().slice(0, 80);
  const status = ["active", "draft", "archived"].includes(sp.status ?? "") ? sp.status : undefined;
  const [rows, cats] = await Promise.all([
    sql<Row[]>`
      select p.id, p.slug, p.name, p.status, p.price_cents, p.sale_price_cents, c.name as category,
        (select url from product_images i where i.product_id = p.id order by sort limit 1) as image,
        coalesce((select sum(stock) from product_variants v where v.product_id = p.id), 0)::int as stock,
        (select count(*) from product_variants v where v.product_id = p.id)::int as variants,
        exists (select 1 from product_media3d m where m.product_id = p.id and m.kind = 'model') as has_model,
        exists (select 1 from product_media3d m where m.product_id = p.id and m.kind = 'sequence') as has_sequence
      from products p join categories c on c.id = p.category_id
      where true
        ${q ? sql`and (p.name ilike ${"%" + q + "%"} or p.slug ilike ${"%" + q + "%"})` : sql``}
        ${status ? sql`and p.status = ${status}` : sql`and p.status <> 'archived'`}
        ${sp.category ? sql`and c.slug = ${sp.category}` : sql``}
      order by p.updated_at desc`,
    sql<{ slug: string; name: string }[]>`select slug, name from categories order by sort`,
  ]);

  return (
    <div className="admin-page">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <h1 className="admin-title">Products</h1>
        <Link href="/admin/products/new" className="btn">Add a product</Link>
      </div>
      <form className="mt-6 flex flex-wrap gap-3" method="get">
        <label className="min-w-[220px] flex-1">
          <span className="sr-only">Search products</span>
          <input name="q" defaultValue={q} placeholder="Search by name" className="field" type="search" />
        </label>
        <label>
          <span className="sr-only">Status</span>
          <select name="status" defaultValue={status ?? ""} className="field w-auto">
            <option value="">Active and drafts</option>
            <option value="active">Active</option>
            <option value="draft">Drafts</option>
            <option value="archived">Archived</option>
          </select>
        </label>
        <label>
          <span className="sr-only">Category</span>
          <select name="category" defaultValue={sp.category ?? ""} className="field w-auto">
            <option value="">All categories</option>
            {cats.map((c) => <option key={c.slug} value={c.slug}>{c.name}</option>)}
          </select>
        </label>
        <button className="btn btn-dark" type="submit">Filter</button>
      </form>

      <p className="tabular mt-6 text-small text-muted">{rows.length} products</p>
      <div className="mt-2 overflow-x-auto">
        <table className="data-table min-w-[760px]">
          <thead>
            <tr><th className="w-14"><span className="sr-only">Photo</span></th><th>Product</th><th>Category</th><th>Status</th><th>Views</th><th className="num">Price</th><th className="num">Stock</th></tr>
          </thead>
          <tbody>
            {rows.map((p) => (
              <tr key={p.id}>
                <td>
                  <span className="media relative block h-14 w-11">{p.image && <Image src={p.image} alt="" fill sizes="44px" className="object-cover" />}</span>
                </td>
                <td><Link href={`/admin/products/${p.id}`} className="font-semibold hover:text-emerald">{p.name}</Link></td>
                <td>{p.category}</td>
                <td><span className={`status status-${p.status}`}>{p.status[0].toUpperCase() + p.status.slice(1)}</span></td>
                <td className="text-small">{[p.has_model && "3D", p.has_sequence && "360°"].filter(Boolean).join(", ") || <span className="text-muted">Photos</span>}</td>
                <td className="num">
                  {p.sale_price_cents != null ? <><span className="font-semibold">{formatBRL(p.sale_price_cents)}</span><br /><s className="text-small text-muted">{formatBRL(p.price_cents)}</s></> : formatBRL(p.price_cents)}
                </td>
                <td className={`num ${p.stock === 0 ? "font-semibold text-danger" : ""}`}>{p.variants === 0 ? <span className="text-muted">No sizes</span> : p.stock}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {rows.length === 0 && <p className="mt-6 text-muted">No products match. Clear the search or add a product.</p>}
      </div>
    </div>
  );
}
