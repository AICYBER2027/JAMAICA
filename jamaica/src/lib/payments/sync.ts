import "server-only";
import { sql } from "../db";
import { getPayment } from "./mercadopago";
import { markPaid, changeStatus } from "../orders";

/**
 * Reads a payment from Mercado Pago and applies it to its order.
 * Only an "approved" payment for the right order and the full amount marks an order as paid.
 */
export async function syncMercadoPagoPayment(paymentId: string, expectOrderId?: string): Promise<string> {
  const p = await getPayment(paymentId);
  const orderId = p.external_reference;
  if (!orderId || (expectOrderId && orderId !== expectOrderId)) return "payment does not belong to this order";
  const [o] = await sql<{ id: string; total_cents: number; status: string; payment_status: string }[]>`select id, total_cents, status, payment_status from orders where id = ${orderId}`;
  if (!o) return "order not found";

  await sql`update orders set payment_ref = ${String(p.id)}, payment_status = ${p.status}, updated_at = now() where id = ${o.id}`;
  if (p.status === "approved") {
    if (Math.round(p.transaction_amount * 100) !== o.total_cents) {
      await sql`insert into order_events (order_id, kind, message, actor) values (${o.id}, 'warning', ${`Mercado Pago approved R$ ${p.transaction_amount.toFixed(2)}, which doesn't match the order total. Not marked as paid; check it in Mercado Pago.`}, 'mercadopago')`;
      return "amount mismatch";
    }
    await markPaid(o.id, "mercadopago", String(p.id), `Paid with ${p.payment_type_id.replace("_", " ")} (${p.payment_method_id}) via Mercado Pago`);
    return "paid";
  }
  if ((p.status === "refunded" || p.status === "charged_back") && !["refunded", "cancelled", "pending_payment"].includes(o.status)) {
    await changeStatus(o.id, "refunded", "mercadopago", { note: `Mercado Pago reports ${p.status}` }).catch(() => {});
    return p.status;
  }
  if (p.status !== o.payment_status) {
    await sql`insert into order_events (order_id, kind, message, actor) values (${o.id}, 'payment', ${`Mercado Pago payment ${p.status}${p.status_detail ? ` (${p.status_detail.replace(/_/g, " ")})` : ""}`}, 'mercadopago')`;
  }
  return p.status;
}
