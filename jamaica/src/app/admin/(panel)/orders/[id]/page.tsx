import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireStaff } from "@/lib/auth";
import { getOrder, orderEvents } from "@/lib/orders";
import { formatBRL } from "@/lib/money";
import { NEXT_STATUS, statusLabel } from "@/lib/order-status";
import { formatCep } from "@/lib/cep";
import { OrderActions } from "@/components/admin/OrderActions";

export const metadata = { title: "Order" };
const cpf = (c: string) => c.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
const phone = (p: string) => p.replace(/(\d{2})(\d{4,5})(\d{4})/, "($1) $2-$3");

export default async function AdminOrder({ params }: { params: Promise<{ id: string }> }) {
  await requireStaff("orders");
  const { id } = await params;
  const order = await getOrder(id);
  if (!order) notFound();
  const events = await orderEvents(id);
  const a = order.address;
  return (
    <div className="admin-page max-w-[1200px]">
      <Link href="/admin/orders" className="text-small text-muted hover:text-ink">Orders</Link>
      <div className="mt-2 flex flex-wrap items-center gap-4">
        <h1 className="admin-title">Order #{order.number}</h1>
        <span className={`status status-${order.status}`}>{statusLabel(order.status)}</span>
      </div>
      <p className="mt-1 text-muted">Placed {order.created_at.toLocaleString("en-GB", { dateStyle: "long", timeStyle: "short" })}{order.paid_at ? `, paid ${order.paid_at.toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" })}` : ""}</p>

      <div className="mt-8 grid gap-10 xl:grid-cols-[1.3fr_1fr]">
        <div>
          <OrderActions orderId={order.id} status={order.status} next={NEXT_STATUS[order.status]} paymentMethod={order.payment_method} tracking={order.tracking_code ?? ""} />
          <h2 className="mt-10 text-[1.25rem]">Items to pack</h2>
          <table className="table mt-3">
            <thead><tr><th><span className="sr-only">Photo</span></th><th>Product</th><th>Colour</th><th>Size</th><th className="num">Qty</th><th className="num">Price</th></tr></thead>
            <tbody>
              {order.items.map((i) => (
                <tr key={i.id}>
                  <td><span className="media relative block h-14 w-11">{i.image && <Image src={i.image} alt="" fill sizes="44px" className="object-cover" />}</span></td>
                  <td className="font-semibold">{i.name}</td><td>{i.color}</td><td>{i.size}</td><td className="num">{i.quantity}</td><td className="num">{formatBRL(i.unit_price_cents * i.quantity)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <dl className="tabular ml-auto mt-4 flex max-w-xs flex-col gap-1">
            <div className="flex justify-between"><dt>Subtotal</dt><dd>{formatBRL(order.subtotal_cents)}</dd></div>
            {order.discount_cents > 0 && <div className="flex justify-between"><dt>Discount ({order.discount_code})</dt><dd>−{formatBRL(order.discount_cents)}</dd></div>}
            <div className="flex justify-between"><dt>Delivery</dt><dd>{formatBRL(order.shipping_cents)}</dd></div>
            <div className="flex justify-between font-semibold"><dt>Total</dt><dd>{formatBRL(order.total_cents)}</dd></div>
          </dl>
        </div>
        <div className="flex flex-col gap-8">
          <section className="panel">
            <h2 className="text-[1.1rem] tracking-normal" style={{ fontStretch: "100%" }}>Customer</h2>
            <p className="mt-2">{order.name}<br /><a className="link" href={`mailto:${order.email}`}>{order.email}</a><br />{phone(order.phone)}<br />CPF {cpf(order.cpf)}</p>
            {order.user_id && <Link href={`/admin/customers/${order.user_id}`} className="link mt-2 inline-block text-small">Customer’s other orders</Link>}
          </section>
          <section className="panel">
            <h2 className="text-[1.1rem] tracking-normal" style={{ fontStretch: "100%" }}>Ship to</h2>
            <p className="mt-2">{a.street}, {a.number}{a.complement ? `, ${a.complement}` : ""}<br />{a.district}<br />{a.city} – {a.state}<br />CEP {formatCep(a.cep)}</p>
            <p className="mt-2 text-small text-muted">{order.shipping_method}{order.shipping_days ? `, about ${order.shipping_days} working days` : ""}</p>
          </section>
          <section className="panel">
            <h2 className="text-[1.1rem] tracking-normal" style={{ fontStretch: "100%" }}>Payment</h2>
            <p className="mt-2">{order.payment_method === "pix_direct" ? "PIX to the store’s key (confirmed by staff)" : "Mercado Pago (confirmed automatically)"}</p>
            <p className="text-small text-muted">Status: {order.payment_status}{order.payment_ref ? `, reference ${order.payment_ref}` : ""}</p>
            {order.status === "pending_payment" && order.expires_at && <p className="mt-1 text-small">Stock held until {order.expires_at.toLocaleString("en-GB", { dateStyle: "short", timeStyle: "short" })}</p>}
          </section>
          <section>
            <h2 className="text-[1.1rem] tracking-normal" style={{ fontStretch: "100%" }}>History</h2>
            <ol className="mt-3 flex flex-col gap-2 text-small">
              {events.map((e, i) => (
                <li key={i} className={e.kind === "warning" ? "bg-[#fff3d6] px-2 py-1" : ""}>
                  <span className="text-muted">{e.created_at.toLocaleString("en-GB", { dateStyle: "short", timeStyle: "short" })}</span> · {e.message} <span className="text-muted">({e.actor})</span>
                </li>
              ))}
            </ol>
          </section>
        </div>
      </div>
    </div>
  );
}
