import Link from "next/link";
import { requireStaff } from "@/lib/auth";
import { dailyRevenue, salesByCategory, summary, topProducts } from "@/lib/reports";
import { formatBRL } from "@/lib/money";
import { RevenueChart } from "@/components/admin/RevenueChart";

export const metadata = { title: "Sales report" };
const RANGES = [7, 30, 90, 365];

export default async function Reports({ searchParams }: { searchParams: Promise<{ days?: string }> }) {
  await requireStaff("reports");
  const d = Number((await searchParams).days);
  const days = RANGES.includes(d) ? d : 30;
  const [now, before, daily, top, cats] = await Promise.all([summary(days), summary(days, days), dailyRevenue(Math.min(days, 90)), topProducts(days, 10), salesByCategory(days)]);
  const pct = (a: number, b: number) => (b ? `${a >= b ? "+" : ""}${Math.round(((a - b) / b) * 100)}%` : "–");
  return (
    <div className="admin-page">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <h1 className="admin-title">Sales report</h1>
        <nav aria-label="Period" className="flex gap-1">
          {RANGES.map((r) => (
            <Link key={r} href={`/admin/reports?days=${r}`} aria-current={r === days ? "page" : undefined} className={`px-3 py-2 text-small font-semibold ${r === days ? "bg-ink text-white" : "bg-stone hover:bg-stone-2"}`}>{r === 365 ? "12 months" : `${r} days`}</Link>
          ))}
        </nav>
      </div>
      <p className="mt-2 text-muted">Counts orders whose payment was received. Compared with the {days} days before.</p>
      <table className="table mt-6 max-w-[760px]">
        <thead><tr><th>Measure</th><th className="num">Last {days} days</th><th className="num">The {days} days before</th><th className="num">Change</th></tr></thead>
        <tbody>
          <tr><td>Revenue</td><td className="num font-semibold">{formatBRL(now.revenue)}</td><td className="num">{formatBRL(before.revenue)}</td><td className="num">{pct(now.revenue, before.revenue)}</td></tr>
          <tr><td>Paid orders</td><td className="num font-semibold">{now.orders}</td><td className="num">{before.orders}</td><td className="num">{pct(now.orders, before.orders)}</td></tr>
          <tr><td>Items sold</td><td className="num font-semibold">{now.units}</td><td className="num">{before.units}</td><td className="num">{pct(now.units, before.units)}</td></tr>
          <tr><td>Average order</td><td className="num font-semibold">{formatBRL(now.average)}</td><td className="num">{formatBRL(before.average)}</td><td className="num">{pct(now.average, before.average)}</td></tr>
        </tbody>
      </table>
      <div className="mt-10 max-w-[1000px]"><RevenueChart data={daily} title={`Revenue per day, last ${Math.min(days, 90)} days`} /></div>
      <div className="mt-12 grid gap-10 xl:grid-cols-2">
        <section aria-labelledby="top-title">
          <h2 id="top-title" className="text-[1.25rem]">Best-selling products</h2>
          {top.length === 0 ? <p className="mt-3 text-muted">No sales in this period.</p> : (
            <table className="table mt-3"><thead><tr><th>Product</th><th className="num">Units</th><th className="num">Revenue</th></tr></thead>
              <tbody>{top.map((t) => <tr key={t.name}><td>{t.name}</td><td className="num">{t.units}</td><td className="num">{formatBRL(t.revenue)}</td></tr>)}</tbody></table>
          )}
        </section>
        <section aria-labelledby="cat-title">
          <h2 id="cat-title" className="text-[1.25rem]">By category</h2>
          {cats.length === 0 ? <p className="mt-3 text-muted">No sales in this period.</p> : (
            <table className="table mt-3"><thead><tr><th>Category</th><th className="num">Units</th><th className="num">Revenue</th></tr></thead>
              <tbody>{cats.map((c) => <tr key={c.category}><td>{c.category}</td><td className="num">{c.units}</td><td className="num">{formatBRL(c.revenue)}</td></tr>)}</tbody></table>
          )}
        </section>
      </div>
    </div>
  );
}
