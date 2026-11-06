import { NextResponse } from "next/server";
import { z } from "zod";
import { priceCart } from "@/lib/checkout";
import { lookupCep } from "@/lib/shipping";
import { normalizeCep } from "@/lib/cep";
import { sameOrigin } from "@/lib/http";

const Body = z.object({
  lines: z.array(z.object({ variantId: z.string().uuid(), qty: z.number().int().min(1).max(10) })).max(40),
  code: z.string().max(32).optional(),
  cep: z.string().max(12).optional(),
  shippingId: z.string().max(40).optional(),
});

export async function POST(req: Request) {
  if (!sameOrigin(req)) return NextResponse.json({ error: "Bad origin" }, { status: 403 });
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  const { lines, code, cep, shippingId } = parsed.data;
  if (!lines.length) return NextResponse.json({ lines: [], problems: [], subtotalCents: 0, discount: null, discountError: null, shipping: null, totalCents: null, address: null });
  const clean = cep ? normalizeCep(cep) : null;
  const address = clean ? await lookupCep(clean) : null;
  const quote = await priceCart(lines, { code, cep: clean ?? undefined, uf: address?.state ?? null, shippingId });
  return NextResponse.json({ ...quote, address, cepValid: cep ? !!clean : null });
}
