import Link from "next/link";
import { requireStaff } from "@/lib/auth";
import { sql } from "@/lib/db";
import { formatBRL } from "@/lib/money";

export const metadata = { title: "Customers" };

export default async function Customers({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  await requireStaff("customers");
  const q = (await searchParams).q?.trim().slice(0, 80);
  // Registered customers plus guests (grouped by the email they ordered with).
  const rows = await sql<{ key: string; user_id: string | null; name: string; email: string; orders: number; spent: number; last: Date | null; registered: boolean }[]>`
    with people as (
      select coalesce(u.id::text, o.email::text) as key, u.id as user_id,
        coalesce(u.name, max(o.name)) as name, coalesce(u.email, o.email)::text as email,
        count(o.id) filter (where o.status in ('paid','preparing','shipped','delivered'))::int as orders,
        coalesce(sum(o.total_cents) filter (where o.status in ('paid','preparing','shipped','delivered')), 0)::int as spent,
        max(o.created_at) as last, u.id is not null as registered
      from users u full join orders o on o.user_id = u.id
      where (u.role = 'customer' or u.id is null)
      group by u.id, u.name, u.email, o.email
    )
    select key, user_id, max(name) as name, email, sum(orders)::int as orders, sum(spent)::int as spent, max(last) as last, bool_or(registered) as registered
    from people
    ${q ? sql`where name ilike ${"%" + q + "%"} or email ilike ${"%" + q + "%"}` : sql``}
    group by key, user_id, email
    order by max(last) desc nulls last, max(name)
    limit 300`;
  return (
    <div className="admin-page">
      <h1 className="admin-title">Customers</h1>
      <form method="get" className="mt-6 flex gap-3"><input name="q" type="search" defaultValue={q} placeholder="Name or email" className="field max-w-sm" aria-label="Search customers" /><button className="btn btn-dark">Search</button></form>
      <div className="mt-6 overflow-x-auto">
        <table className="data-table min-w-[720px]">
          <thead><tr><th>Name</th><th>Email</th><th>Account</th><th className="num">Paid orders</th><th className="num">Spent</th><th>Last order</th></tr></thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.key}>
                <td><Link href={`/admin/customers/${encodeURIComponent(r.user_id ?? r.email)}`} className="font-semibold hover:text-emerald">{r.name}</Link></td>
                <td>{r.email}</td>
                <td className="text-small">{r.registered ? "Registered" : "Guest"}</td>
                <td className="num">{r.orders}</td>
                <td className="num">{formatBRL(r.spent)}</td>
                <td className="text-small">{r.last ? r.last.toLocaleDateString("en-GB") : "No orders"}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {rows.length === 0 && <p className="mt-6 text-muted">No customers yet. People appear here when they create an account or place an order.</p>}
      </div>
    </div>
  );
}
