import Link from "next/link";
import { notFound } from "next/navigation";
import { requireStaff } from "@/lib/auth";
import { sql } from "@/lib/db";
import { formatBRL } from "@/lib/money";
import { statusLabel } from "@/lib/order-status";

export const metadata = { title: "Customer" };

export default async function Customer({ params }: { params: Promise<{ id: string }> }) {
  await requireStaff("customers");
  const id = decodeURIComponent((await params).id);
  const isUser = /^[0-9a-f-]{36}$/.test(id);
  const [user] = isUser ? await sql<{ name: string; email: string; phone: string; created_at: Date }[]>`select name, email, phone, created_at from users where id = ${id}` : [];
  const orders = await sql<{ id: string; number: number; status: string; total_cents: number; created_at: Date; name: string; email: string; phone: string; address: { city: string; state: string } }[]>`
    select id, number, status, total_cents, created_at, name, email, phone, address from orders
    where ${isUser ? sql`user_id = ${id}` : sql`email = ${id} and user_id is null`} order by created_at desc`;
  if (!user && !orders.length) notFound();
  const name = user?.name ?? orders[0].name;
  const email = user?.email ?? orders[0].email;
  const phone = user?.phone || orders[0]?.phone;
  const spent = orders.filter((o) => ["paid", "preparing", "shipped", "delivered"].includes(o.status)).reduce((n, o) => n + o.total_cents, 0);
  return (
    <div className="admin-page max-w-[1000px]">
      <Link href="/admin/customers" className="text-small text-muted hover:text-ink">Customers</Link>
      <h1 className="admin-title mt-2">{name}</h1>
      <dl className="mt-4 grid gap-x-10 gap-y-3 sm:grid-cols-4">
        <div><dt className="text-small text-muted">Email</dt><dd><a href={`mailto:${email}`} className="link">{email}</a></dd></div>
        <div><dt className="text-small text-muted">Phone</dt><dd>{phone || "Not given"}</dd></div>
        <div><dt className="text-small text-muted">Account</dt><dd>{user ? `Since ${user.created_at.toLocaleDateString("en-GB")}` : "Guest checkout"}</dd></div>
        <div><dt className="text-small text-muted">Spent</dt><dd className="tabular font-semibold">{formatBRL(spent)}</dd></div>
      </dl>
      <h2 className="mt-10 text-[1.25rem]">Orders</h2>
      {orders.length === 0 ? <p className="mt-3 text-muted">No orders yet.</p> : (
        <table className="data-table mt-3">
          <thead><tr><th>Order</th><th>Date</th><th>Ship to</th><th>Status</th><th className="num">Total</th></tr></thead>
          <tbody>
            {orders.map((o) => (
              <tr key={o.id}>
                <td><Link href={`/admin/orders/${o.id}`} className="font-semibold hover:text-emerald">#{o.number}</Link></td>
                <td>{o.created_at.toLocaleDateString("en-GB")}</td>
                <td>{o.address.city}, {o.address.state}</td>
                <td><span className={`status status-${o.status}`}>{statusLabel(o.status)}</span></td>
                <td className="num">{formatBRL(o.total_cents)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
