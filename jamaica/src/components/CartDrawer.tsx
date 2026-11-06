"use client";
import Link from "next/link";
import Image from "next/image";
import { useEffect, useRef } from "react";
import { AnimatePresence, motion } from "motion/react";
import { cart, cartSubtotal, useCart } from "@/lib/cart-store";
import { formatBRL } from "@/lib/money";

export function QtyStepper({ qty, onChange, label }: { qty: number; onChange: (q: number) => void; label: string }) {
  return (
    <div className="inline-flex items-center bg-stone" role="group" aria-label={`Quantity of ${label}`}>
      <button type="button" className="h-11 w-11 text-lg hover:bg-stone-2" onClick={() => onChange(qty - 1)} aria-label="One fewer">
        −
      </button>
      <span className="tabular w-7 text-center text-[0.95rem]" aria-live="polite">{qty}</span>
      <button type="button" className="h-11 w-11 text-lg hover:bg-stone-2 disabled:opacity-40" onClick={() => onChange(qty + 1)} disabled={qty >= 10} aria-label="One more">
        +
      </button>
    </div>
  );
}

export function CartDrawer() {
  const { lines, open, lastAdded } = useCart();
  const panel = useRef<HTMLDivElement>(null);
  const subtotal = cartSubtotal(lines);

  useEffect(() => {
    if (!open) return;
    const prev = document.activeElement as HTMLElement | null;
    panel.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && cart.setOpen(false);
    window.addEventListener("keydown", onKey);
    document.documentElement.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.documentElement.style.overflow = "";
      prev?.focus?.();
    };
  }, [open]);

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50">
          <motion.div
            className="absolute inset-0 bg-black/55"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={() => cart.setOpen(false)}
          />
          <motion.div
            ref={panel}
            tabIndex={-1}
            role="dialog"
            aria-modal="true"
            aria-label="Your bag"
            className="absolute inset-y-0 right-0 flex w-full max-w-[440px] flex-col bg-white outline-none"
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", stiffness: 380, damping: 40 }}
          >
            <div className="flex items-center justify-between px-6 pb-4 pt-6">
              <h2 className="text-[1.6rem]">Your bag</h2>
              <button type="button" className="px-2 py-1 font-semibold hover:text-emerald" onClick={() => cart.setOpen(false)}>
                Close
              </button>
            </div>
            {lines.length === 0 ? (
              <div className="flex flex-1 flex-col items-start gap-4 px-6 pt-4">
                <p className="text-muted">Your bag is empty. Start with the new arrivals or build a whole outfit.</p>
                <Link href="/shop/fashion" className="btn btn-dark" onClick={() => cart.setOpen(false)}>Shop fashion</Link>
              </div>
            ) : (
              <>
                <ul className="flex-1 overflow-y-auto px-6">
                  <AnimatePresence initial={false}>
                    {lines.map((l) => (
                      <motion.li
                        key={l.variantId}
                        layout
                        initial={{ opacity: 0, y: 12, backgroundColor: l.variantId === lastAdded ? "#e6f4ee" : "#ffffff" }}
                        animate={{ opacity: 1, y: 0, backgroundColor: "#ffffff" }}
                        exit={{ opacity: 0, x: 40, transition: { duration: 0.18 } }}
                        transition={{ duration: 0.35, backgroundColor: { duration: 1.4 } }}
                        className="flex gap-4 py-4"
                      >
                        <Link href={`/p/${l.slug}`} className="media block h-[112px] w-[90px] shrink-0" onClick={() => cart.setOpen(false)}>
                          {l.image && <Image src={l.image} alt="" fill sizes="90px" className="object-cover" />}
                        </Link>
                        <div className="flex min-w-0 flex-1 flex-col">
                          <div className="flex items-start justify-between gap-3">
                            <Link href={`/p/${l.slug}`} className="font-semibold leading-snug hover:text-emerald" onClick={() => cart.setOpen(false)}>
                              {l.name}
                            </Link>
                            <span className="tabular shrink-0">{formatBRL(l.unitCents * l.qty)}</span>
                          </div>
                          <p className="text-small text-muted">{l.color} · {l.size}</p>
                          <div className="mt-auto flex items-center justify-between pt-2">
                            <QtyStepper qty={l.qty} label={l.name} onChange={(q) => cart.setQty(l.variantId, q)} />
                            <button type="button" className="text-small text-muted underline-offset-4 hover:text-ink hover:underline" onClick={() => cart.remove(l.variantId)}>
                              Remove
                            </button>
                          </div>
                        </div>
                      </motion.li>
                    ))}
                  </AnimatePresence>
                </ul>
                <div className="bg-stone px-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-5">
                  <div className="flex justify-between text-lead">
                    <span>Subtotal</span>
                    <span className="tabular font-semibold">{formatBRL(subtotal)}</span>
                  </div>
                  <p className="mb-4 text-small text-muted">Shipping and discount codes are worked out at checkout.</p>
                  <Link href="/checkout" className="btn w-full" onClick={() => cart.setOpen(false)}>Go to checkout</Link>
                  <Link href="/bag" className="mt-3 block text-center text-small font-semibold underline underline-offset-4" onClick={() => cart.setOpen(false)}>
                    View bag
                  </Link>
                </div>
              </>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
