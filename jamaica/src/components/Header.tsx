"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Wordmark } from "./Wordmark";
import { cart, cartCount, useCart } from "@/lib/cart-store";

const LINKS = [
  { href: "/shop/fashion", label: "Fashion" },
  { href: "/shop/accessories", label: "Accessories" },
  { href: "/shop/footwear", label: "Footwear" },
  { href: "/outfits", label: "Outfit builder" },
  { href: "/try-on", label: "Try on" },
];

export function Header({ signedIn, staff }: { signedIn: boolean; staff: boolean }) {
  const { lines } = useCart();
  const count = cartCount(lines);
  const pathname = usePathname();
  const [menu, setMenu] = useState(false);
  const [bump, setBump] = useState(0);

  useEffect(() => setMenu(false), [pathname]);
  useEffect(() => {
    if (count > 0) setBump((b) => b + 1);
  }, [count]);
  useEffect(() => {
    document.documentElement.style.overflow = menu ? "hidden" : "";
  }, [menu]);

  return (
    <header className="sticky top-0 z-40 bg-black text-white" style={{ height: "var(--header-h)" }}>
      <div className="frame flex h-full items-center gap-6">
        <Link href="/" className="text-[1.15rem] md:text-[1.35rem]" aria-label="JAMAICA home">
          <Wordmark animate />
        </Link>
        <nav aria-label="Main" className="mx-auto hidden items-center gap-7 lg:flex">
          {LINKS.map((l) => {
            const active = pathname.startsWith(l.href);
            return (
              <Link
                key={l.href}
                href={l.href}
                aria-current={active ? "page" : undefined}
                className={`text-[0.95rem] transition-colors ${active ? "text-white" : "text-mist hover:text-white"}`}
              >
                {l.label}
              </Link>
            );
          })}
        </nav>
        <div className="ml-auto flex items-center gap-1 lg:ml-0">
          <Link href="/search" className="hidden px-3 py-2 text-[0.95rem] text-mist hover:text-white sm:block">
            Search
          </Link>
          <Link href={staff ? "/admin" : signedIn ? "/account" : "/account/login"} className="hidden px-3 py-2 text-[0.95rem] text-mist hover:text-white sm:block">
            {staff ? "Dashboard" : signedIn ? "Account" : "Sign in"}
          </Link>
          <button
            type="button"
            onClick={() => cart.setOpen(true)}
            className="ml-2 flex h-10 items-center gap-2 bg-white px-4 font-semibold text-black transition-transform active:scale-95"
            aria-label={`Bag, ${count} ${count === 1 ? "item" : "items"}`}
          >
            Bag
            <motion.span
              key={bump}
              initial={bump > 0 ? { scale: 1.6 } : false}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 500, damping: 18 }}
              className="tabular inline-block min-w-[1ch]"
            >
              {count}
            </motion.span>
          </button>
          <button
            type="button"
            className="ml-1 h-10 px-3 font-semibold lg:hidden"
            aria-expanded={menu}
            aria-controls="mobile-menu"
            onClick={() => setMenu((m) => !m)}
          >
            {menu ? "Close" : "Menu"}
          </button>
        </div>
      </div>
      <AnimatePresence>
        {menu && (
          <motion.nav
            id="mobile-menu"
            aria-label="Mobile"
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            className="frame fixed inset-x-0 bottom-0 z-40 flex flex-col overflow-y-auto bg-black pb-10 pt-6 lg:hidden"
            style={{ top: "var(--header-h)" }}
          >
            {[...LINKS, { href: "/search", label: "Search" }, { href: staff ? "/admin" : signedIn ? "/account" : "/account/login", label: staff ? "Dashboard" : signedIn ? "Account" : "Sign in" }].map((l, i) => (
              <motion.div key={l.href} initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.03 * i, duration: 0.3 }}>
                <Link href={l.href} className="wide block py-3 text-[2rem] font-semibold tracking-tight">
                  {l.label}
                </Link>
              </motion.div>
            ))}
          </motion.nav>
        )}
      </AnimatePresence>
    </header>
  );
}
