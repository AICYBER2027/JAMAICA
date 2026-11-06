import "server-only";

/**
 * Mercado Pago Checkout Pro: the customer pays on Mercado Pago's own page (credit card, debit card, PIX),
 * so card numbers never touch this server. We learn the result from the signed webhook and confirm it by
 * fetching the payment from Mercado Pago's API; the redirect back to the store is never trusted on its own.
 */
const API = "https://api.mercadopago.com";

export const mercadoPagoEnabled = () => !!process.env.MERCADOPAGO_ACCESS_TOKEN;

async function mp<T>(path: string, init: { method?: string; body?: unknown; idempotencyKey?: string } = {}): Promise<T> {
  const res = await fetch(API + path, {
    method: init.method ?? "GET",
    headers: {
      Authorization: `Bearer ${process.env.MERCADOPAGO_ACCESS_TOKEN}`,
      "Content-Type": "application/json",
      ...(init.idempotencyKey ? { "X-Idempotency-Key": init.idempotencyKey } : {}),
    },
    body: init.body ? JSON.stringify(init.body) : undefined,
    signal: AbortSignal.timeout(10000),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`Mercado Pago ${path} failed with ${res.status}: ${(await res.text()).slice(0, 300)}`);
  return res.json() as Promise<T>;
}

export async function createPreference(order: { id: string; number: number; totalCents: number; email: string; name: string; cpf: string; returnUrl: string; expiresAt: Date }) {
  const site = (process.env.SITE_URL || "").replace(/\/$/, "");
  const [first, ...rest] = order.name.split(" ");
  const pref = await mp<{ id: string; init_point: string }>("/checkout/preferences", {
    method: "POST",
    idempotencyKey: `pref-${order.id}`,
    body: {
      // One line for the whole order, so the charged amount always equals the order total (discount and shipping included).
      items: [{ id: order.id, title: `JAMAICA order #${order.number}`, quantity: 1, unit_price: Number((order.totalCents / 100).toFixed(2)), currency_id: "BRL" }],
      payer: { email: order.email, name: first, surname: rest.join(" "), identification: { type: "CPF", number: order.cpf } },
      external_reference: order.id,
      back_urls: { success: order.returnUrl, pending: order.returnUrl, failure: order.returnUrl },
      auto_return: "approved",
      notification_url: site.startsWith("https://") ? `${site}/api/webhooks/mercadopago` : undefined,
      statement_descriptor: "JAMAICA",
      expires: true,
      expiration_date_to: order.expiresAt.toISOString(),
      // Boleto can take days to clear, longer than we hold the stock; offer cards and PIX.
      payment_methods: { excluded_payment_types: [{ id: "ticket" }, { id: "atm" }], installments: 10 },
    },
  });
  return { preferenceId: pref.id, url: pref.init_point };
}

export type MpPayment = { id: number; status: string; status_detail: string; external_reference: string | null; transaction_amount: number; payment_method_id: string; payment_type_id: string };

export async function getPayment(id: string): Promise<MpPayment> {
  if (!/^\d{1,20}$/.test(id)) throw new Error("Invalid payment id");
  return mp<MpPayment>(`/v1/payments/${id}`);
}

export { verifyWebhook } from "./signature";
