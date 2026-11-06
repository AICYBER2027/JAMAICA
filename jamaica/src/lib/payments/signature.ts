import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Verifies the x-signature header Mercado Pago sends with each webhook:
 * HMAC-SHA256 over "id:<data.id>;request-id:<x-request-id>;ts:<ts>;" with the webhook secret.
 */
export function verifyWebhook(signature: string | null, requestId: string | null, dataId: string, secret: string): boolean {
  if (!signature) return false;
  const parts = Object.fromEntries(signature.split(",").map((p) => p.trim().split("=", 2) as [string, string]));
  const ts = parts.ts;
  const v1 = parts.v1;
  if (!ts || !v1) return false;
  let manifest = `id:${dataId.toLowerCase()};`;
  if (requestId) manifest += `request-id:${requestId};`;
  manifest += `ts:${ts};`;
  const expected = createHmac("sha256", secret).update(manifest).digest("hex");
  const a = Buffer.from(expected), b = Buffer.from(v1);
  return a.length === b.length && timingSafeEqual(a, b);
}
