import { NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { verifyWebhook } from "@/lib/payments/mercadopago";
import { syncMercadoPagoPayment } from "@/lib/payments/sync";

// Mercado Pago calls this when a payment changes. We verify the signature, then read the payment
// from Mercado Pago's API ourselves, so the notification body is never trusted for the outcome.
export async function POST(req: Request) {
  const secret = process.env.MERCADOPAGO_WEBHOOK_SECRET;
  if (!secret || !process.env.MERCADOPAGO_ACCESS_TOKEN) return NextResponse.json({ error: "not configured" }, { status: 503 });
  const url = new URL(req.url);
  const body = (await req.json().catch(() => ({}))) as { type?: string; action?: string; data?: { id?: string } };
  const type = body.type ?? url.searchParams.get("type") ?? url.searchParams.get("topic");
  const dataId = url.searchParams.get("data.id") ?? body.data?.id ?? "";
  if (!dataId) return NextResponse.json({ ok: true });
  if (!verifyWebhook(req.headers.get("x-signature"), req.headers.get("x-request-id"), String(dataId), secret)) {
    return NextResponse.json({ error: "invalid signature" }, { status: 401 });
  }
  if (type !== "payment") return NextResponse.json({ ok: true, ignored: type });

  const eventId = `${dataId}:${req.headers.get("x-request-id") ?? ""}`;
  const fresh = await sql`insert into payment_events (provider, event_id) values ('mercadopago', ${eventId}) on conflict do nothing returning event_id`;
  if (!fresh.length) return NextResponse.json({ ok: true, duplicate: true });
  try {
    const result = await syncMercadoPagoPayment(String(dataId));
    return NextResponse.json({ ok: true, result });
  } catch (e) {
    // Let Mercado Pago retry later.
    await sql`delete from payment_events where provider = 'mercadopago' and event_id = ${eventId}`;
    console.error("mercadopago webhook failed", e);
    return NextResponse.json({ error: "temporary failure" }, { status: 500 });
  }
}
