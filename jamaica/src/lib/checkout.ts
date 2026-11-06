import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { z } from "zod";
import { sql } from "./db";
import { effectivePrice } from "./money";
import { quoteShipping, type ShippingOption } from "./shipping";
import { normalizeCep } from "./cep";
import { isValidCPF } from "./pix";

export type CartInput = { variantId: string; qty: number }[];

export type PricedLine = {
  variantId: string; productId: string; slug: string; name: string; size: string; color: string; image: string | null;
  unitCents: number; qty: number; available: number; weightGrams: number;
};

export type Discount = { code: string; kind: "percent" | "fixed" | "free_shipping"; value: number; amountCents: number; label: string };

export type Quote = {
  lines: PricedLine[];
  problems: string[];
  subtotalCents: number;
  discount: Discount | null;
  discountError: string | null;
  shipping: { options: ShippingOption[]; selected: ShippingOption | null } | null;
  totalCents: number | null;
};

const CartSchema = z.array(z.object({ variantId: z.string().uuid(), qty: z.number().int().min(1).max(10) })).min(1).max(40);

/** Re-reads every price and stock level from the database. Nothing the browser sends is trusted. */
export async function priceCart(input: CartInput, opts: { code?: string; cep?: string; uf?: string | null; shippingId?: string } = {}): Promise<Quote> {
  const cart = CartSchema.parse(input);
  const rows = await sql<{ variant_id: string; product_id: string; slug: string; name: string; size: string; color: string; stock: number; price_cents: number; sale_price_cents: number | null; status: string; weight_grams: number; image: string | null }[]>`
    select v.id as variant_id, p.id as product_id, p.slug, p.name, v.size, v.color, v.stock, p.price_cents, p.sale_price_cents, p.status, p.weight_grams,
      coalesce(
        (select url from product_images i where i.product_id = p.id and i.color = v.color order by sort limit 1),
        (select url from product_images i where i.product_id = p.id order by sort limit 1)) as image
    from product_variants v join products p on p.id = v.product_id
    where v.id = any(${cart.map((c) => c.variantId)})`;
  const byId = new Map(rows.map((r) => [r.variant_id, r]));
  const problems: string[] = [];
  const lines: PricedLine[] = [];
  for (const c of cart) {
    const r = byId.get(c.variantId);
    if (!r || r.status !== "active") {
      problems.push("An item in your bag is no longer sold and was removed.");
      continue;
    }
    if (r.stock <= 0) {
      problems.push(`${r.name} (${r.color}, ${r.size}) just sold out and was removed.`);
      continue;
    }
    const qty = Math.min(c.qty, r.stock);
    if (qty < c.qty) problems.push(`Only ${r.stock} of ${r.name} (${r.size}) left, so your bag now has ${qty}.`);
    lines.push({ variantId: r.variant_id, productId: r.product_id, slug: r.slug, name: r.name, size: r.size, color: r.color, image: r.image, unitCents: effectivePrice(r), qty, available: r.stock, weightGrams: r.weight_grams });
  }
  const subtotalCents = lines.reduce((n, l) => n + l.unitCents * l.qty, 0);

  let discount: Discount | null = null;
  let discountError: string | null = null;
  if (opts.code?.trim()) {
    const res = await checkCode(opts.code, subtotalCents);
    if ("error" in res) discountError = res.error;
    else discount = res;
  }

  let shipping: Quote["shipping"] = null;
  const cep = opts.cep ? normalizeCep(opts.cep) : null;
  if (cep && lines.length) {
    const afterDiscount = subtotalCents - (discount?.amountCents ?? 0);
    const q = await quoteShipping(cep, opts.uf ?? null, lines.map((l) => ({ weightGrams: l.weightGrams, quantity: l.qty, valueCents: l.unitCents })), afterDiscount, discount?.kind === "free_shipping");
    const selected = q.options.find((o) => o.id === opts.shippingId) ?? q.options.find((o) => o.id === "store:standard") ?? q.options[0] ?? null;
    shipping = { options: q.options, selected };
  }

  const totalCents = shipping?.selected ? subtotalCents - (discount?.amountCents ?? 0) + shipping.selected.cents : null;
  return { lines, problems, subtotalCents, discount, discountError, shipping, totalCents };
}

async function checkCode(raw: string, subtotalCents: number): Promise<Discount | { error: string }> {
  const code = raw.trim().toUpperCase().slice(0, 32);
  const [d] = await sql<{ code: string; kind: Discount["kind"]; value: number; min_subtotal_cents: number; starts_at: Date | null; ends_at: Date | null; max_uses: number | null; uses: number; active: boolean }[]>`
    select * from discount_codes where code = ${code}`;
  if (!d || !d.active) return { error: `“${code}” isn’t a valid code.` };
  const now = new Date();
  if (d.starts_at && d.starts_at > now) return { error: `${code} starts on ${d.starts_at.toLocaleDateString("en-GB")}.` };
  if (d.ends_at && d.ends_at < now) return { error: `${code} has ended.` };
  if (d.max_uses != null && d.uses >= d.max_uses) return { error: `${code} has been used up.` };
  if (subtotalCents < d.min_subtotal_cents) return { error: `${code} needs an order of at least R$ ${(d.min_subtotal_cents / 100).toFixed(2).replace(".", ",")}.` };
  const amountCents = d.kind === "percent" ? Math.round((subtotalCents * d.value) / 100) : d.kind === "fixed" ? Math.min(d.value, subtotalCents) : 0;
  const label = d.kind === "percent" ? `${d.value}% off` : d.kind === "fixed" ? "Amount off" : "Free standard shipping";
  return { code: d.code, kind: d.kind, value: d.value, amountCents, label };
}

// ── Placing an order ────────────────────────────────────────────────────
export const CheckoutSchema = z.object({
  lines: CartSchema,
  name: z.string().trim().min(3, "Enter your full name.").max(100),
  email: z.string().trim().toLowerCase().email("Enter a valid email address."),
  phone: z.string().trim().transform((s) => s.replace(/\D/g, "")).pipe(z.string().regex(/^\d{10,11}$/, "Enter a phone number with area code, like (11) 91234-5678.")),
  cpf: z.string().transform((s) => s.replace(/\D/g, "")).refine(isValidCPF, "Enter a valid CPF. It's needed for the invoice (nota fiscal)."),
  cep: z.string().transform((s) => normalizeCep(s) ?? "").pipe(z.string().length(8, "Enter a valid CEP.")),
  street: z.string().trim().min(2, "Enter the street.").max(120),
  number: z.string().trim().min(1, "Enter the number, or S/N.").max(20),
  complement: z.string().trim().max(80),
  district: z.string().trim().min(2, "Enter the neighbourhood (bairro).").max(80),
  city: z.string().trim().min(2, "Enter the city.").max(80),
  state: z.string().trim().toUpperCase().regex(/^[A-Z]{2}$/, "Choose the state."),
  shippingId: z.string().min(1, "Choose a delivery option.").max(40),
  code: z.string().trim().max(32).optional(),
  payment: z.enum(["pix_direct", "mercadopago"]),
});
export type CheckoutInput = z.infer<typeof CheckoutSchema>;

export class CheckoutError extends Error {}

const sha256 = (s: string) => createHash("sha256").update(s).digest("hex");

/**
 * Creates the order and reserves stock in one transaction. Payment happens afterwards;
 * the order stays "awaiting payment" until a payment is confirmed (never assumed).
 */
export async function createOrder(input: CheckoutInput, userId: string | null, expiresInMinutes: number) {
  const quote = await priceCart(input.lines, { code: input.code, cep: input.cep, uf: input.state, shippingId: input.shippingId });
  if (!quote.lines.length) throw new CheckoutError("Your bag is empty or its items have sold out.");
  if (quote.problems.length) throw new CheckoutError(quote.problems.join(" ") + " Check your bag and try again.");
  if (input.code && quote.discountError) throw new CheckoutError(quote.discountError);
  const ship = quote.shipping?.selected;
  if (!ship || ship.id !== input.shippingId) throw new CheckoutError("That delivery option isn’t available for this CEP any more. Choose again.");

  const token = randomBytes(24).toString("base64url");
  const discountCents = quote.discount?.amountCents ?? 0;
  const total = quote.subtotalCents - discountCents + ship.cents;

  const order = await sql.begin(async (tx) => {
    for (const l of quote.lines) {
      const r = await tx`update product_variants set stock = stock - ${l.qty} where id = ${l.variantId} and stock >= ${l.qty} returning id`;
      if (!r.length) throw new CheckoutError(`${l.name} (${l.size}) sold out while you were checking out.`);
    }
    if (quote.discount) {
      const r = await tx`update discount_codes set uses = uses + 1 where code = ${quote.discount.code} and (max_uses is null or uses < max_uses) returning code`;
      if (!r.length) throw new CheckoutError(`${quote.discount.code} has just been used up.`);
    }
    const [o] = await tx<{ id: string; number: number }[]>`
      insert into orders (user_id, email, name, phone, cpf, address, subtotal_cents, discount_cents, shipping_cents, total_cents, discount_code,
        shipping_method, shipping_days, payment_method, access_token_hash, expires_at)
      values (${userId}, ${input.email}, ${input.name}, ${input.phone}, ${input.cpf},
        ${tx.json({ cep: input.cep, street: input.street, number: input.number, complement: input.complement, district: input.district, city: input.city, state: input.state })},
        ${quote.subtotalCents}, ${discountCents}, ${ship.cents}, ${total}, ${quote.discount?.code ?? null},
        ${`${ship.label} (${ship.carrier})`}, ${ship.days}, ${input.payment}, ${sha256(token)}, now() + ${`${expiresInMinutes} minutes`}::interval)
      returning id, number`;
    for (const l of quote.lines) {
      await tx`insert into order_items (order_id, product_id, variant_id, name, size, color, image, unit_price_cents, quantity)
        values (${o.id}, ${l.productId}, ${l.variantId}, ${l.name}, ${l.size}, ${l.color}, ${l.image}, ${l.unitCents}, ${l.qty})`;
    }
    await tx`insert into order_events (order_id, kind, message, actor) values (${o.id}, 'created', ${`Order placed, ${input.payment === "pix_direct" ? "PIX" : "Mercado Pago"} payment pending`}, 'customer')`;
    return o;
  });
  return { ...order, token, total, quote };
}

export function orderTokenMatches(hash: string, token: string | null | undefined): boolean {
  return !!token && sha256(token) === hash;
}
