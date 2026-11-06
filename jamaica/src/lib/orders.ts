import "server-only";
import type postgres from "postgres";
import { sql } from "./db";
import { canMove, statusLabel, type OrderStatus } from "./order-status";

export type Order = {
  id: string; number: number; user_id: string | null; email: string; name: string; phone: string; cpf: string;
  address: { cep: string; street: string; number: string; complement: string; district: string; city: string; state: string };
  status: OrderStatus; subtotal_cents: number; discount_cents: number; shipping_cents: number; total_cents: number; discount_code: string | null;
  shipping_method: string; shipping_days: number | null; payment_method: "pix_direct" | "mercadopago"; payment_ref: string | null; payment_status: string;
  payment_url: string | null; pix_code: string | null; tracking_code: string | null; access_token_hash: string; expires_at: Date | null; paid_at: Date | null;
  stock_released: boolean; notes: string; created_at: Date; updated_at: Date;
};
export type OrderItem = { id: string; product_id: string | null; name: string; size: string; color: string; image: string | null; unit_price_cents: number; quantity: number; slug: string | null };

export async function getOrder(id: string): Promise<(Order & { items: OrderItem[] }) | null> {
  if (!/^[0-9a-f-]{36}$/.test(id)) return null;
  const [o] = await sql<Order[]>`select * from orders where id = ${id}`;
  if (!o) return null;
  const items = await sql<OrderItem[]>`select i.*, p.slug from order_items i left join products p on p.id = i.product_id where i.order_id = ${id} order by i.name`;
  return { ...o, items };
}

export async function orderEvents(id: string) {
  return sql<{ kind: string; message: string; actor: string; created_at: Date }[]>`select kind, message, actor, created_at from order_events where order_id = ${id} order by created_at`;
}

type Tx = postgres.TransactionSql;

/** Puts reserved stock back (once) and gives back a used discount code. */
async function releaseStock(tx: Tx, orderId: string) {
  const [o] = await tx<{ stock_released: boolean; discount_code: string | null }[]>`select stock_released, discount_code from orders where id = ${orderId} for update`;
  if (!o || o.stock_released) return;
  await tx`update product_variants v set stock = v.stock + i.quantity from order_items i where i.order_id = ${orderId} and i.variant_id = v.id`;
  if (o.discount_code) await tx`update discount_codes set uses = greatest(0, uses - 1) where code = ${o.discount_code}`;
  await tx`update orders set stock_released = true where id = ${orderId}`;
}

/** Records a confirmed payment. Idempotent: confirming an already-paid order changes nothing. */
export async function markPaid(orderId: string, actor: string, ref: string | null, note: string) {
  return sql.begin(async (tx) => {
    const [o] = await tx<{ status: OrderStatus; stock_released: boolean }[]>`select status, stock_released from orders where id = ${orderId} for update`;
    if (!o) return false;
    if (o.status !== "pending_payment" && o.status !== "cancelled") return false;
    if (o.status === "cancelled" && o.stock_released) {
      // Paid after the reservation expired: take the stock again; if it has gone, staff must resolve it.
      const items = await tx<{ variant_id: string; quantity: number }[]>`select variant_id, quantity from order_items where order_id = ${orderId}`;
      for (const i of items) await tx`update product_variants set stock = greatest(0, stock - ${i.quantity}) where id = ${i.variant_id}`;
      await tx`update orders set stock_released = false where id = ${orderId}`;
      await tx`insert into order_events (order_id, kind, message, actor) values (${orderId}, 'warning', 'Payment arrived after the order had expired. Check stock before shipping.', 'system')`;
    }
    await tx`update orders set status = 'paid', paid_at = now(), payment_status = 'approved', payment_ref = coalesce(${ref}, payment_ref), expires_at = null, updated_at = now() where id = ${orderId}`;
    await tx`insert into order_events (order_id, kind, message, actor) values (${orderId}, 'paid', ${note}, ${actor})`;
    return true;
  });
}

/** Staff status change, following the allowed transitions. Cancelling or refunding returns the stock. */
export async function changeStatus(orderId: string, to: OrderStatus, actor: string, extra: { tracking?: string; note?: string } = {}) {
  return sql.begin(async (tx) => {
    const [o] = await tx<{ status: OrderStatus }[]>`select status from orders where id = ${orderId} for update`;
    if (!o) throw new Error("Order not found.");
    if (!canMove(o.status, to)) throw new Error(`An order that is “${statusLabel(o.status)}” can’t be set to “${statusLabel(to)}”.`);
    if (to === "shipped" && !extra.tracking?.trim()) throw new Error("Add the tracking code before marking the order shipped.");
    if (to === "cancelled" || to === "refunded") await releaseStock(tx, orderId);
    await tx`update orders set status = ${to}, updated_at = now(),
      tracking_code = coalesce(${extra.tracking?.trim() || null}, tracking_code),
      paid_at = case when ${to} = 'paid' then now() else paid_at end,
      expires_at = case when ${to} = 'paid' then null else expires_at end
      where id = ${orderId}`;
    const msg = to === "shipped" ? `Shipped, tracking ${extra.tracking}` : to === "paid" ? "Payment confirmed by staff" : statusLabel(to);
    await tx`insert into order_events (order_id, kind, message, actor) values (${orderId}, ${to}, ${extra.note ? `${msg}. ${extra.note}` : msg}, ${actor})`;
  });
}

export async function cancelByCustomer(orderId: string) {
  return sql.begin(async (tx) => {
    const [o] = await tx<{ status: OrderStatus }[]>`select status from orders where id = ${orderId} for update`;
    if (o?.status !== "pending_payment") return false;
    await releaseStock(tx, orderId);
    await tx`update orders set status = 'cancelled', updated_at = now() where id = ${orderId}`;
    await tx`insert into order_events (order_id, kind, message, actor) values (${orderId}, 'cancelled', 'Cancelled by the customer before paying', 'customer')`;
    return true;
  });
}

/** Cancels unpaid orders whose reservation ran out and returns their stock. Safe to run often. */
export async function releaseExpiredOrders(): Promise<number> {
  const expired = await sql<{ id: string }[]>`select id from orders where status = 'pending_payment' and expires_at < now() limit 200`;
  for (const { id } of expired) {
    await sql.begin(async (tx) => {
      const [o] = await tx<{ status: string }[]>`select status from orders where id = ${id} for update`;
      if (o?.status !== "pending_payment") return;
      await releaseStock(tx, id);
      await tx`update orders set status = 'cancelled', updated_at = now() where id = ${id}`;
      await tx`insert into order_events (order_id, kind, message, actor) values (${id}, 'expired', 'No payment received in time; items returned to stock', 'system')`;
    });
  }
  return expired.length;
}
