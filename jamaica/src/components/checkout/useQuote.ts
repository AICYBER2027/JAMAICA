"use client";
import { useEffect, useRef, useState } from "react";
import { cart, type CartLine } from "@/lib/cart-store";

export type ShippingOption = { id: string; label: string; cents: number; days: number; carrier: string };
export type QuoteResponse = {
  lines: { variantId: string; unitCents: number; qty: number; available: number; name: string; size: string; color: string; image: string | null; slug: string }[];
  problems: string[];
  subtotalCents: number;
  discount: { code: string; label: string; amountCents: number; kind: string } | null;
  discountError: string | null;
  shipping: { options: ShippingOption[]; selected: ShippingOption | null } | null;
  totalCents: number | null;
  address: { street: string; district: string; city: string; state: string } | null;
  cepValid: boolean | null;
};

/** Asks the server to price the bag. Prices, stock and shipping always come from the server. */
export function useQuote(lines: CartLine[], opts: { code?: string; cep?: string; shippingId?: string }) {
  const [quote, setQuote] = useState<QuoteResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const seq = useRef(0);
  const key = JSON.stringify([lines.map((l) => [l.variantId, l.qty]), opts.code, opts.cep, opts.shippingId]);

  useEffect(() => {
    if (!lines.length) {
      setQuote(null);
      return;
    }
    const id = ++seq.current;
    setLoading(true);
    const t = setTimeout(async () => {
      try {
        const res = await fetch("/api/cart/quote", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ lines: lines.map((l) => ({ variantId: l.variantId, qty: l.qty })), code: opts.code || undefined, cep: opts.cep || undefined, shippingId: opts.shippingId }),
        });
        if (!res.ok) throw new Error();
        const q = (await res.json()) as QuoteResponse;
        if (id !== seq.current) return;
        setQuote(q);
        setError(null);
        // Bring the bag in line with what's really available.
        const changed = q.lines.length !== lines.length || q.lines.some((ql) => {
          const l = lines.find((x) => x.variantId === ql.variantId);
          return !l || l.qty !== ql.qty || l.unitCents !== ql.unitCents;
        });
        if (changed) cart.refresh(q.lines.map((l) => ({ variantId: l.variantId, unitCents: l.unitCents, available: l.qty })));
      } catch {
        if (id === seq.current) setError("Couldn’t reach the store to update prices. Check your connection.");
      } finally {
        if (id === seq.current) setLoading(false);
      }
    }, 250);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  return { quote, loading, error };
}
