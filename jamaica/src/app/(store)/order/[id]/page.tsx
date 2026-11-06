import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import QRCode from "qrcode";
import { getUser, isStaff } from "@/lib/auth";
import { getOrder, orderEvents } from "@/lib/orders";
import { orderTokenMatches } from "@/lib/checkout";
import { formatBRL } from "@/lib/money";
import { statusLabel } from "@/lib/order-status";
import { formatCep } from "@/lib/cep";
import { syncMercadoPagoPayment } from "@/lib/payments/sync";
import { mercadoPagoEnabled } from "@/lib/payments/mercadopago";
import { CopyButton, AutoRefresh, CancelOrder } from "@/components/checkout/OrderBits";

export const metadata: Metadata = { title: "Your order", robots: { index: false } };

type SP = Promise<{ t?: string; payment_id?: string; collection_id?: string }>;

export default async function OrderPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: SP }) {
  const { id } = await params;
  const sp = await searchParams;
  let order = await getOrder(id);
  if (!order) notFound();
  const user = await getUser();
  const allowed = orderTokenMatches(order.access_token_hash, sp.t) || (user && (user.id === order.user_id || isStaff(user)));
  if (!allowed) notFound();

  // Coming back from Mercado Pago: check the payment with Mercado Pago itself before showing anything as paid.
  const paymentId = sp.payment_id ?? sp.collection_id;
  if (paymentId && order.status === "pending_payment" && order.payment_method === "mercadopago" && mercadoPagoEnabled()) {
    await syncMercadoPagoPayment(paymentId, order.id).catch(() => null);
    order = (await getOrder(id))!;
  }
  const events = await orderEvents(id);
  const qr = order.pix_code && order.status === "pending_payment" ? await QRCode.toDataURL(order.pix_code, { margin: 1, width: 560, color: { dark: "#000000", light: "#ffffff" } }) : null;
  const pending = order.status === "pending_payment";
  const a = order.address;
  const tokenQuery = sp.t ? `?t=${encodeURIComponent(sp.t)}` : "";

  return (
    <div className="frame pb-24 pt-10">
      {pending && <AutoRefresh seconds={15} />}
      <p className="text-muted">Order #{order.number} · {order.created_at.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}</p>
      <h1 className="mt-2 text-[clamp(2.2rem,5vw,4.2rem)]">
        {pending ? "Almost there: pay to confirm" : order.status === "cancelled" ? "This order was cancelled" : `Thank you, ${order.name.split(" ")[0]}`}
      </h1>
      <p className="mt-3"><span className={`status status-${order.status}`}>{statusLabel(order.status)}</span></p>

      <div className="mt-10 grid gap-12 lg:grid-cols-12">
        <div className="lg:col-span-7">
          {pending && order.payment_method === "pix_direct" && order.pix_code && (
            <section aria-labelledby="pix-title" className="bg-jade p-6 text-white md:p-8">
              <h2 id="pix-title" className="text-[1.75rem]">Pay {formatBRL(order.total_cents)} with PIX</h2>
              <div className="mt-6 grid gap-6 md:grid-cols-[220px_1fr] md:items-start">
                {qr && <Image src={qr} alt="PIX QR code for this order" width={220} height={220} unoptimized className="bg-white p-2" />}
                <div>
                  <p>Open your bank app, choose PIX, then scan the code or paste the copy-and-paste code. The amount and order number are already filled in.</p>
                  <p className="mt-4 break-all bg-black/30 p-3 text-small">{order.pix_code}</p>
                  <CopyButton text={order.pix_code} />
                  <p className="mt-4 text-small text-mist">We confirm your payment when it reaches our account and update this page. Your items are held until {order.expires_at?.toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" })}.</p>
                </div>
              </div>
            </section>
          )}
          {pending && order.payment_method === "mercadopago" && (
            <section className="bg-stone p-6">
              <h2 className="text-[1.5rem]">Payment not confirmed yet</h2>
              <p className="mt-2">{order.payment_status === "rejected" ? "Mercado Pago declined the last attempt. You can try again with another card or PIX." : "If you’ve just paid, this page updates by itself as soon as Mercado Pago confirms."}</p>
              {order.payment_url && <a href={order.payment_url} className="btn mt-5">Pay on Mercado Pago</a>}
            </section>
          )}
          {order.status === "shipped" && order.tracking_code && (
            <section className="bg-stone p-6">
              <h2 className="text-[1.5rem]">On its way</h2>
              <p className="mt-2">Tracking code <strong>{order.tracking_code}</strong>. <a className="link" href={`https://rastreamento.correios.com.br/app/index.php?objetos=${encodeURIComponent(order.tracking_code)}`} target="_blank" rel="noreferrer">Track with Correios</a></p>
            </section>
          )}

          <section aria-labelledby="items-title" className="mt-10">
            <h2 id="items-title" className="text-[1.5rem]">Items</h2>
            <ul className="mt-4 flex flex-col gap-4">
              {order.items.map((i) => (
                <li key={i.id} className="flex gap-4">
                  <span className="media relative block h-[100px] w-[80px] shrink-0">{i.image && <Image src={i.image} alt="" fill sizes="80px" className="object-cover" />}</span>
                  <span className="flex-1">
                    {i.slug ? <Link href={`/p/${i.slug}`} className="font-semibold hover:text-emerald">{i.name}</Link> : <span className="font-semibold">{i.name}</span>}
                    <span className="block text-muted">{i.color} · Size {i.size} · Qty {i.quantity}</span>
                  </span>
                  <span className="tabular">{formatBRL(i.unit_price_cents * i.quantity)}</span>
                </li>
              ))}
            </ul>
          </section>

          <section aria-labelledby="history-title" className="mt-10">
            <h2 id="history-title" className="text-[1.5rem]">History</h2>
            <ol className="mt-4 flex flex-col gap-2">
              {events.map((e, i) => (
                <li key={i} className="grid grid-cols-[150px_1fr] gap-4 text-small">
                  <span className="text-muted">{e.created_at.toLocaleString("en-GB", { dateStyle: "short", timeStyle: "short" })}</span>
                  <span>{e.message}</span>
                </li>
              ))}
            </ol>
          </section>
        </div>

        <aside className="lg:col-span-5">
          <div className="bg-stone p-6">
            <dl className="tabular flex flex-col gap-2">
              <div className="flex justify-between"><dt>Subtotal</dt><dd>{formatBRL(order.subtotal_cents)}</dd></div>
              {order.discount_cents > 0 && <div className="flex justify-between"><dt>Discount {order.discount_code}</dt><dd>−{formatBRL(order.discount_cents)}</dd></div>}
              <div className="flex justify-between"><dt>Delivery</dt><dd>{order.shipping_cents ? formatBRL(order.shipping_cents) : "Free"}</dd></div>
              <div className="mt-2 flex justify-between text-lead font-semibold"><dt>Total</dt><dd>{formatBRL(order.total_cents)}</dd></div>
            </dl>
            <h3 className="mt-8 text-[1.1rem] tracking-normal" style={{ fontStretch: "100%" }}>Delivering to</h3>
            <p className="mt-1">{order.name}<br />{a.street}, {a.number}{a.complement ? `, ${a.complement}` : ""}<br />{a.district}, {a.city} – {a.state}<br />CEP {formatCep(a.cep)}</p>
            <p className="mt-3 text-small text-muted">{order.shipping_method}</p>
            <h3 className="mt-6 text-[1.1rem] tracking-normal" style={{ fontStretch: "100%" }}>Payment</h3>
            <p className="mt-1">{order.payment_method === "pix_direct" ? "PIX" : "Mercado Pago"}{order.paid_at ? `, received ${order.paid_at.toLocaleDateString("en-GB")}` : ""}</p>
          </div>
          {pending && <CancelOrder orderId={order.id} token={sp.t ?? ""} />}
          {!user && <p className="mt-6 text-small">Keep this page’s link to come back to your order, or <Link href={`/account/register?next=${encodeURIComponent(`/order/${order.id}${tokenQuery}`)}`} className="link">create an account</Link> with {order.email} to see all your orders.</p>}
        </aside>
      </div>
    </div>
  );
}
