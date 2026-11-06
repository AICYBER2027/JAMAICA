import Link from "next/link";
import { requireStaff } from "@/lib/auth";
import { sql } from "@/lib/db";
import { formatBRL } from "@/lib/money";
import { releaseExpiredOrders } from "@/lib/orders";
import { STATUS_LABEL, statusLabel } from "@/lib/order-status";

export const metadata = { title: "Orders" };

export default async function Orders({ searchParams }: { searchParams: Promise<{ status?: string; q?: string }> }) {
  await requireStaff("orders");
  await releaseExpiredOrders();
  const sp = await searchParams;
  const status = sp.status && sp.status in STATUS_LABEL ? sp.status : undefined;
  const q = sp.q?.trim().replace(/^#/, "").slice(0, 80);
  const [rows, counts] = await Promise.all([
    sql<{ id: string; number: number; name: string; email: string; status: string; total_cents: number; payment_method: string; created_at: Date; items: number; city: string; state: string }[]>`
      select o.id, o.number, o.name, o.email, o.status, o.total_cents, o.payment_method, o.created_at,
        (select sum(quantity) from order_items i where i.order_id = o.id)::int as items, o.address->>'city' as city, o.address->>'state' as state
      from orders o
      where true
        ${status ? sql`and o.status = ${status}` : sql``}
        ${q ? (/^\d+$/.test(q) ? sql`and o.number = ${Number(q)}` : sql`and (o.name ilike ${"%" + q + "%"} or o.email ilike ${"%" + q + "%"})`) : sql``}
      order by o.created_at desc limit 300`,
    sql<{ status: string; n: number }[]>`select status, count(*)::int as n from orders group by status`,
  ]);
  const n = (s: string) => counts.find((c) => c.status === s)?.n ?? 0;
  const tabs = [["", "All", counts.reduce((a, c) => a + c.n, 0)], ...Object.entries(STATUS_LABEL).map(([k, l]) => [k, l, n(k)])] as [string, string, number][];
  return (
    <div className="admin-page">
      <h1 className="admin-title">Orders</h1>
      <nav aria-label="Filter by status" className="mt-6 flex flex-wrap gap-1">
        {tabs.map(([k, l, c]) => (
          <Link key={k} href={k ? `/admin/orders?status=${k}` : "/admin/orders"} aria-current={(status ?? "") === k ? "page" : undefined}
            className={`px-3 py-2 text-small font-semibold ${(status ?? "") === k ? "bg-ink text-white" : "bg-stone hover:bg-stone-2"}`}>
            {l} <span className="tabular font-normal opacity-70">{c}</span>
          </Link>
        ))}
      </nav>
      <form method="get" className="mt-4 flex gap-3">
        {status && <input type="hidden" name="status" value={status} />}
        <input name="q" type="search" defaultValue={sp.q} placeholder="Order number, name or email" className="field max-w-sm" aria-label="Search orders" />
        <button className="btn btn-dark">Search</button>
      </form>
      <div className="mt-6 overflow-x-auto">
        <table className="data-table min-w-[860px]">
          <thead><tr><th>Order</th><th>Placed</th><th>Customer</th><th>Ship to</th><th>Payment</th><th>Status</th><th className="num">Items</th><th className="num">Total</th></tr></thead>
          <tbody>
            {rows.map((o) => (
              <tr key={o.id}>
                <td><Link href={`/admin/orders/${o.id}`} className="font-semibold hover:text-emerald">#{o.number}</Link></td>
                <td className="text-small">{o.created_at.toLocaleString("en-GB", { dateStyle: "short", timeStyle: "short" })}</td>
                <td>{o.name}<br /><span className="text-small text-muted">{o.email}</span></td>
                <td className="text-small">{o.city}, {o.state}</td>
                <td className="text-small">{o.payment_method === "pix_direct" ? "PIX" : "Mercado Pago"}</td>
                <td><span className={`status status-${o.status}`}>{statusLabel(o.status)}</span></td>
                <td className="num">{o.items}</td>
                <td className="num">{formatBRL(o.total_cents)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {rows.length === 0 && <p className="mt-6 text-muted">No orders {status ? `with status “${statusLabel(status)}”` : "yet"}.</p>}
      </div>
    </div>
  );
}
