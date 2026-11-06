"use client";
import Image from "next/image";
import Link from "next/link";
import { AnimatePresence, motion } from "motion/react";
import { cart, useCart } from "@/lib/cart-store";
import { formatBRL } from "@/lib/money";
import { QtyStepper } from "@/components/CartDrawer";
import { useQuote } from "./useQuote";

export function BagView() {
  const { lines } = useCart();
  const { quote, loading } = useQuote(lines, {});
  if (!lines.length) {
    return (
      <div className="mt-8 max-w-[44ch]">
        <p className="text-muted">Nothing here yet. Start with the new arrivals, or build a whole look in the outfit builder.</p>
        <div className="mt-6 flex gap-3"><Link href="/shop/fashion" className="btn btn-dark">Shop fashion</Link><Link href="/outfits" className="btn btn-ghost">Build an outfit</Link></div>
      </div>
    );
  }
  return (
    <div className="mt-10 grid gap-12 lg:grid-cols-12">
      <ul className="lg:col-span-8">
        <AnimatePresence initial={false}>
          {lines.map((l) => (
            <motion.li key={l.variantId} layout exit={{ opacity: 0, x: -30 }} className="flex gap-5 py-5">
              <Link href={`/p/${l.slug}`} className="media relative block h-[150px] w-[120px] shrink-0">{l.image && <Image src={l.image} alt={l.name} fill sizes="120px" className="object-cover" />}</Link>
              <div className="flex min-w-0 flex-1 flex-col">
                <div className="flex justify-between gap-4">
                  <Link href={`/p/${l.slug}`} className="text-[1.1rem] font-semibold hover:text-emerald">{l.name}</Link>
                  <span className="tabular font-semibold">{formatBRL(l.unitCents * l.qty)}</span>
                </div>
                <p className="text-muted">{l.color} · Size {l.size}</p>
                <p className="tabular text-small text-muted">{formatBRL(l.unitCents)} each</p>
                <div className="mt-auto flex items-center gap-6 pt-3">
                  <QtyStepper qty={l.qty} label={l.name} onChange={(q) => cart.setQty(l.variantId, q)} />
                  <button type="button" className="text-small text-muted hover:text-ink hover:underline" onClick={() => cart.remove(l.variantId)}>Remove</button>
                </div>
              </div>
            </motion.li>
          ))}
        </AnimatePresence>
      </ul>
      <aside className="lg:col-span-4">
        <div className="bg-stone p-6 lg:sticky lg:top-[calc(var(--header-h)+16px)]">
          {quote?.problems.map((p) => <p key={p} className="mb-3 bg-[#fff3d6] px-3 py-2 text-small">{p}</p>)}
          <div className="flex justify-between text-lead"><span>Subtotal</span><span className="tabular font-semibold">{quote ? formatBRL(quote.subtotalCents) : loading ? "…" : "–"}</span></div>
          <p className="mt-1 text-small text-muted">Delivery and discount codes at checkout. Prices checked just now.</p>
          <Link href="/checkout" className="btn mt-5 w-full">Go to checkout</Link>
        </div>
      </aside>
    </div>
  );
}
