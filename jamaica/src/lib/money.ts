const brl = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

/** Formats integer cents as Brazilian reais, e.g. 14990 → "R$ 149,90". */
export function formatBRL(cents: number): string {
  return brl.format(cents / 100).replace(/ /g, " ");
}

/** Price a customer actually pays for a product. */
export function effectivePrice(p: { price_cents: number; sale_price_cents: number | null }): number {
  return p.sale_price_cents != null && p.sale_price_cents < p.price_cents ? p.sale_price_cents : p.price_cents;
}

export function discountPercent(p: { price_cents: number; sale_price_cents: number | null }): number | null {
  if (p.sale_price_cents == null || p.sale_price_cents >= p.price_cents) return null;
  return Math.round((1 - p.sale_price_cents / p.price_cents) * 100);
}
