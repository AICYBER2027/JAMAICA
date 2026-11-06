import Link from "next/link";
import { requireStaff } from "@/lib/auth";
import { sql } from "@/lib/db";
import { InventoryTable } from "@/components/admin/InventoryTable";

export const metadata = { title: "Inventory" };

export default async function Inventory({ searchParams }: { searchParams: Promise<{ low?: string; q?: string }> }) {
  await requireStaff("products");
  const sp = await searchParams;
  const low = sp.low === "1";
  const q = sp.q?.trim().slice(0, 80);
  const rows = await sql<{ id: string; product_id: string; name: string; size: string; color: string; sku: string; stock: number; status: string }[]>`
    select v.id, v.product_id, p.name, v.size, v.color, v.sku, v.stock, p.status
    from product_variants v join products p on p.id = v.product_id
    where p.status <> 'archived'
      ${low ? sql`and v.stock <= 3` : sql``}
      ${q ? sql`and (p.name ilike ${"%" + q + "%"} or v.sku ilike ${"%" + q + "%"})` : sql``}
    order by p.name, v.color, v.sort`;
  const total = rows.reduce((n, r) => n + r.stock, 0);
  return (
    <div className="admin-page">
      <h1 className="admin-title">Inventory</h1>
      <p className="mt-2 text-muted">Change any number, then save once. Stock also changes on its own as orders are placed, cancelled or expire unpaid.</p>
      <form method="get" className="mt-6 flex flex-wrap items-center gap-3">
        <input name="q" type="search" defaultValue={q} placeholder="Product or SKU" className="field max-w-xs" aria-label="Search inventory" />
        <label className="flex items-center gap-2"><input type="checkbox" name="low" value="1" defaultChecked={low} className="h-5 w-5 accent-emerald" /> Only 3 or fewer</label>
        <button className="btn btn-dark" type="submit">Show</button>
        {(low || q) && <Link href="/admin/inventory" className="link text-small">Clear</Link>}
      </form>
      <p className="tabular mt-6 text-small text-muted">{rows.length} sizes, {total} items in stock</p>
      <InventoryTable rows={rows} />
    </div>
  );
}
