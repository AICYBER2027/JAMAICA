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

/**
 * Parses an amount typed by staff in reais into integer cents.
 * Accepts "349,90", "349.90", "R$ 1.299,00", "1299". Returns null when it isn't an amount.
 */
export function parseReais(input: string): number | null {
  let s = input.replace(/R\$|\s/g, "");
  if (!s) return null;
  if (s.includes(",")) s = s.replace(/\./g, "").replace(",", ".");
  else if (/^\d{1,3}(\.\d{3})+$/.test(s)) s = s.replace(/\./g, "");
  if (!/^\d+(\.\d{1,2})?$/.test(s)) return null;
  const cents = Math.round(Number(s) * 100);
  return Number.isFinite(cents) && cents <= 100_000_000 ? cents : null;
}
