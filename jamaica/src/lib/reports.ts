import "server-only";
import { sql } from "./db";

// "Sold" means payment received; pending, cancelled and refunded orders are never counted as revenue.
const SOLD = ["paid", "preparing", "shipped", "delivered"];

export type Summary = { revenue: number; orders: number; units: number; average: number };

export async function summary(days: number, offsetDays = 0): Promise<Summary> {
  const [r] = await sql<{ revenue: number; orders: number; units: number }[]>`
    select coalesce(sum(o.total_cents), 0)::int as revenue, count(*)::int as orders,
      coalesce(sum((select sum(quantity) from order_items i where i.order_id = o.id)), 0)::int as units
    from orders o
    where o.status = any(${SOLD})
      and o.paid_at >= date_trunc('day', now()) - ${`${days + offsetDays - 1} days`}::interval
      and o.paid_at < date_trunc('day', now()) + interval '1 day' - ${`${offsetDays} days`}::interval`;
  return { ...r, average: r.orders ? Math.round(r.revenue / r.orders) : 0 };
}

export async function dailyRevenue(days: number): Promise<{ day: string; revenue: number; orders: number }[]> {
  return sql`
    select to_char(d, 'YYYY-MM-DD') as day,
      coalesce(sum(o.total_cents), 0)::int as revenue, count(o.id)::int as orders
    from generate_series(date_trunc('day', now()) - ${`${days - 1} days`}::interval, date_trunc('day', now()), interval '1 day') d
    left join orders o on o.status = any(${SOLD}) and date_trunc('day', o.paid_at) = d
    group by d order by d`;
}

export async function topProducts(days: number, limit = 8) {
  return sql<{ name: string; slug: string | null; units: number; revenue: number }[]>`
    select i.name, p.slug, sum(i.quantity)::int as units, sum(i.quantity * i.unit_price_cents)::int as revenue
    from order_items i join orders o on o.id = i.order_id left join products p on p.id = i.product_id
    where o.status = any(${SOLD}) and o.paid_at >= now() - ${`${days} days`}::interval
    group by i.name, p.slug order by units desc, revenue desc limit ${limit}`;
}

export async function salesByCategory(days: number) {
  return sql<{ category: string; units: number; revenue: number }[]>`
    select coalesce(c.name, 'Removed products') as category, sum(i.quantity)::int as units, sum(i.quantity * i.unit_price_cents)::int as revenue
    from order_items i join orders o on o.id = i.order_id
    left join products p on p.id = i.product_id left join categories c on c.id = p.category_id
    where o.status = any(${SOLD}) and o.paid_at >= now() - ${`${days} days`}::interval
    group by 1 order by revenue desc`;
}

export async function lowStock(threshold = 3, limit = 12) {
  return sql<{ product_id: string; name: string; size: string; color: string; stock: number; sku: string }[]>`
    select v.product_id, p.name, v.size, v.color, v.stock, v.sku
    from product_variants v join products p on p.id = v.product_id
    where p.status = 'active' and v.stock <= ${threshold}
    order by v.stock asc, p.name limit ${limit}`;
}

export async function orderCounts() {
  return sql<{ status: string; n: number }[]>`select status, count(*)::int as n from orders group by status`;
}
