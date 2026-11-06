import Link from "next/link";
import { can, requireStaff, PERMISSIONS, type Permission } from "@/lib/auth";
import { dailyRevenue, lowStock, orderCounts, summary } from "@/lib/reports";
import { integrations } from "@/lib/settings";
import { formatBRL } from "@/lib/money";
import { RevenueChart } from "@/components/admin/RevenueChart";
import { sql } from "@/lib/db";
import { statusLabel } from "@/lib/order-status";

function change(now: number, before: number) {
  if (!before) return now ? "new this week" : "no change";
  const pct = Math.round(((now - before) / before) * 100);
  return pct === 0 ? "same as the week before" : `${pct > 0 ? "+" : ""}${pct}% on the week before`;
}

export default async function Overview({ searchParams }: { searchParams: Promise<{ denied?: string }> }) {
  const user = await requireStaff();
  const { denied } = await searchParams;
  const showSales = can(user, "reports");
  const [week, prev, days, counts, low, setup, toPrepare] = await Promise.all([
    showSales ? summary(7) : null,
    showSales ? summary(7, 7) : null,
    showSales ? dailyRevenue(30) : [],
    orderCounts(),
    can(user, "products") ? lowStock(3, 8) : [],
    integrations(),
    can(user, "orders")
      ? sql<{ id: string; number: number; name: string; total_cents: number; status: string; created_at: Date }[]>`
          select id, number, name, total_cents, status, created_at from orders where status in ('paid', 'preparing', 'pending_payment')
          order by case status when 'paid' then 0 when 'preparing' then 1 else 2 end, created_at limit 8`
      : [],
  ]);
  const count = (s: string) => counts.find((c) => c.status === s)?.n ?? 0;
  const todo = [
    !setup.pixDirect && !setup.mercadoPago && { text: "Connect a way to get paid: add your PIX key, or Mercado Pago for cards.", href: "/admin/settings#payments" },
    setup.storage === "local" && process.env.NODE_ENV === "production" && { text: "Uploads are going to this server's disk, which Vercel wipes. Connect Supabase Storage.", href: "/admin/settings#integrations" },
    !setup.siteUrl && { text: "Set SITE_URL so payment return links and product links point to your domain.", href: "/admin/settings#integrations" },
  ].filter(Boolean) as { text: string; href: string }[];

  return (
    <div className="admin-page">
      <h1 className="admin-title">Good to see you, {user.name.split(" ")[0]}</h1>
      {denied && denied in PERMISSIONS && (
        <p className="mt-4 bg-[#fff3d6] px-4 py-3" role="alert">Your account can’t open “{PERMISSIONS[denied as Permission]}”. Ask the owner to add it under Team.</p>
      )}
      {todo.length > 0 && (
        <ul className="mt-6 flex flex-col gap-1">
          {todo.map((t) => (
            <li key={t.text}><Link href={t.href} className="block bg-jade px-4 py-3 text-white hover:bg-jade-2">{t.text}</Link></li>
          ))}
        </ul>
      )}

      {week && prev && (
        <section aria-labelledby="week-title" className="mt-8">
          <h2 id="week-title" className="sr-only">Last 7 days</h2>
          <dl className="grid grid-cols-2 gap-x-8 gap-y-6 md:grid-cols-4">
            {[
              ["Revenue, last 7 days", formatBRL(week.revenue), change(week.revenue, prev.revenue)],
              ["Paid orders", String(week.orders), change(week.orders, prev.orders)],
              ["Average order", formatBRL(week.average), week.orders ? `${week.units} items sold` : "no orders yet"],
              ["Waiting for you", String(count("paid") + count("preparing")), `${count("paid")} paid, ${count("preparing")} being prepared`],
            ].map(([k, v, note]) => (
              <div key={k}>
                <dt className="text-small text-muted">{k}</dt>
                <dd className="tabular mt-1 text-[1.75rem] font-semibold leading-tight" style={{ fontStretch: "112%" }}>{v}</dd>
                <dd className="text-small text-muted">{note}</dd>
              </div>
            ))}
          </dl>
        </section>
      )}

      <div className="mt-10 grid gap-10 xl:grid-cols-[1.4fr_1fr]">
        {showSales && (
          <section className="panel bg-paper p-0">
            <RevenueChart data={days} title="Revenue per day, last 30 days" />
            <Link href="/admin/reports" className="link mt-2 inline-block text-small font-semibold">Open the sales report</Link>
          </section>
        )}
        {can(user, "orders") && (
          <section aria-labelledby="todo-title">
            <div className="flex items-baseline justify-between">
              <h2 id="todo-title" className="text-[1.25rem]" style={{ fontStretch: "100%", letterSpacing: 0 }}>Orders to handle</h2>
              <Link href="/admin/orders" className="link text-small font-semibold">All orders</Link>
            </div>
            {toPrepare.length === 0 ? (
              <p className="mt-4 text-muted">Nothing waiting. New paid orders show up here first.</p>
            ) : (
              <table className="data-table mt-3">
                <thead><tr><th>Order</th><th>Customer</th><th>Status</th><th className="num">Total</th></tr></thead>
                <tbody>
                  {toPrepare.map((o) => (
                    <tr key={o.id}>
                      <td><Link href={`/admin/orders/${o.id}`} className="font-semibold hover:text-emerald">#{o.number}</Link></td>
                      <td className="max-w-[160px] truncate">{o.name}</td>
                      <td><span className={`status status-${o.status}`}>{statusLabel(o.status)}</span></td>
                      <td className="num">{formatBRL(o.total_cents)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>
        )}
      </div>

      {low.length > 0 && (
        <section aria-labelledby="low-title" className="mt-12">
          <div className="flex items-baseline justify-between">
            <h2 id="low-title" className="text-[1.25rem]" style={{ fontStretch: "100%", letterSpacing: 0 }}>Running low</h2>
            <Link href="/admin/inventory?low=1" className="link text-small font-semibold">Update stock</Link>
          </div>
          <table className="data-table mt-3">
            <thead><tr><th>Product</th><th>Colour</th><th>Size</th><th className="num">In stock</th></tr></thead>
            <tbody>
              {low.map((v) => (
                <tr key={v.sku}>
                  <td><Link href={`/admin/products/${v.product_id}`} className="hover:text-emerald">{v.name}</Link></td>
                  <td>{v.color}</td>
                  <td>{v.size}</td>
                  <td className={`num font-semibold ${v.stock === 0 ? "text-danger" : ""}`}>{v.stock === 0 ? "Sold out" : v.stock}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}
    </div>
  );
}
