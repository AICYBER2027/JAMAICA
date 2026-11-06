import { NextResponse } from "next/server";
import { CheckoutError, CheckoutSchema, createOrder } from "@/lib/checkout";
import { getUser } from "@/lib/auth";
import { sql } from "@/lib/db";
import { sameOrigin } from "@/lib/http";
import { getStoreSettings } from "@/lib/settings";
import { pixCode } from "@/lib/pix";
import { createPreference, mercadoPagoEnabled } from "@/lib/payments/mercadopago";
import { cancelByCustomer } from "@/lib/orders";

export async function POST(req: Request) {
  if (!sameOrigin(req)) return NextResponse.json({ error: "Bad origin" }, { status: 403 });
  const parsed = CheckoutSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return NextResponse.json({ error: issue.message, field: String(issue.path[0] ?? "") }, { status: 400 });
  }
  const input = parsed.data;
  const settings = await getStoreSettings();
  if (input.payment === "pix_direct" && !settings.pixKey) return NextResponse.json({ error: "PIX isn’t available right now. Choose another payment method." }, { status: 400 });
  if (input.payment === "mercadopago" && !mercadoPagoEnabled()) return NextResponse.json({ error: "Card payment isn’t available right now. Choose another payment method." }, { status: 400 });

  const user = await getUser();
  // Direct PIX is confirmed by staff, so stock is held for longer; Mercado Pago confirms within minutes.
  const holdMinutes = input.payment === "pix_direct" ? 24 * 60 : 120;
  let order;
  try {
    order = await createOrder(input, user?.id ?? null, holdMinutes);
  } catch (e) {
    if (e instanceof CheckoutError) return NextResponse.json({ error: e.message }, { status: 409 });
    console.error("checkout failed", e);
    return NextResponse.json({ error: "We couldn’t place the order. Nothing was charged. Try again in a moment." }, { status: 500 });
  }

  const site = (process.env.SITE_URL || new URL(req.url).origin).replace(/\/$/, "");
  const orderUrl = `/order/${order.id}?t=${order.token}`;

  if (input.payment === "pix_direct") {
    const code = pixCode({ key: settings.pixKey, amountCents: order.total, merchantName: settings.pixMerchantName, merchantCity: settings.pixMerchantCity, txid: `JM${order.number}` });
    await sql`update orders set pix_code = ${code} where id = ${order.id}`;
    return NextResponse.json({ redirect: orderUrl });
  }

  try {
    const expiresAt = new Date(Date.now() + holdMinutes * 60_000);
    const pref = await createPreference({ id: order.id, number: order.number, totalCents: order.total, email: input.email, name: input.name, cpf: input.cpf, returnUrl: `${site}${orderUrl}`, expiresAt });
    await sql`update orders set payment_url = ${pref.url}, payment_ref = ${pref.preferenceId} where id = ${order.id}`;
    return NextResponse.json({ redirect: pref.url });
  } catch (e) {
    console.error("mercado pago preference failed", e);
    await cancelByCustomer(order.id);
    return NextResponse.json({ error: "Mercado Pago didn’t respond, so the order was not placed and nothing was charged. Try again, or pay with PIX." }, { status: 502 });
  }
}
