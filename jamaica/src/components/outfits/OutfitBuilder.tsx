"use client";
import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";
import { AnimatePresence, LayoutGroup, motion } from "motion/react";
import { completeLook, conflicts, rank, reason, SLOTS, type Slot } from "@/lib/recommend";
import { cart } from "@/lib/cart-store";
import { formatBRL } from "@/lib/money";
import { sortSizes } from "@/lib/sizes";

export type OutfitProduct = {
  id: string; slug: string; name: string; slot: Slot; palette: string; gender: "women" | "men" | "unisex";
  priceCents: number; image: string | null; featured: boolean; inStock: boolean; tryon: string | null;
  variants: { id: string; size: string; color: string; stock: number }[];
};

// Where each piece sits on the board (percent of the board), like a flat-lay.
const PLACE: Record<Slot, { left: string; top: string; width: string; rotate: number; z: number }> = {
  outerwear: { left: "3%", top: "5%", width: "34%", rotate: -4, z: 2 },
  top: { left: "33%", top: "3%", width: "34%", rotate: 1, z: 3 },
  "one-piece": { left: "31%", top: "3%", width: "38%", rotate: 0, z: 3 },
  bottom: { left: "35%", top: "45%", width: "30%", rotate: -1, z: 2 },
  shoes: { left: "6%", top: "60%", width: "27%", rotate: 3, z: 4 },
  watch: { left: "73%", top: "6%", width: "23%", rotate: 3, z: 4 },
  eyewear: { left: "72%", top: "34%", width: "24%", rotate: -3, z: 4 },
  accessory: { left: "70%", top: "62%", width: "26%", rotate: 2, z: 3 },
};

export function OutfitBuilder({ products, initial, tryonEnabled }: { products: OutfitProduct[]; initial?: string; tryonEnabled: boolean }) {
  const start = products.find((p) => p.slug === initial);
  const [gender, setGender] = useState<"women" | "men" | "all">(start && start.gender !== "unisex" ? start.gender : "all");
  const [chosen, setChosen] = useState<Partial<Record<Slot, OutfitProduct>>>(start ? { [start.slot]: start } : {});
  const [sizes, setSizes] = useState<Record<string, string>>({});
  const [active, setActive] = useState<Slot>(start ? (start.slot === "top" ? "bottom" : "top") : "top");
  const [message, setMessage] = useState<string | null>(null);

  const pieces = Object.values(chosen) as OutfitProduct[];
  const total = pieces.reduce((n, p) => n + p.priceCents, 0);
  const candidates = useMemo(
    () => rank(products.filter((p) => p.slot === active && (gender === "all" || p.gender === gender || p.gender === "unisex")), pieces, gender),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [products, active, gender, chosen],
  );

  const pick = (p: OutfitProduct) => {
    setMessage(null);
    setChosen((c) => {
      const next = { ...c };
      if (next[p.slot]?.id === p.id) {
        delete next[p.slot];
        return next;
      }
      for (const s of conflicts(p.slot)) delete next[s];
      next[p.slot] = p;
      return next;
    });
    const single = p.variants.filter((v) => v.stock > 0);
    if (new Set(single.map((v) => v.size)).size === 1) setSizes((s) => ({ ...s, [p.id]: single[0].size }));
  };

  const complete = () => {
    const pool = products.filter((p) => gender === "all" || p.gender === gender || p.gender === "unisex");
    const wanted: Slot[] = chosen["one-piece"] ? ["shoes", "watch", "eyewear", "accessory"] : ["top", "bottom", "shoes", "watch", "eyewear"];
    const next = completeLook(pool, chosen, gender, wanted);
    setChosen(next);
    for (const p of Object.values(next) as OutfitProduct[]) {
      const inStock = p.variants.filter((v) => v.stock > 0);
      if (new Set(inStock.map((v) => v.size)).size === 1) setSizes((s) => ({ ...s, [p.id]: inStock[0].size }));
    }
  };

  const addAll = () => {
    const missing = pieces.filter((p) => !sizes[p.id]);
    if (missing.length) {
      setMessage(`Choose a size for ${missing.map((m) => m.name).join(", ")}.`);
      return;
    }
    const lines = pieces.map((p) => {
      const v = p.variants.find((x) => x.size === sizes[p.id] && x.stock > 0)!;
      return { variantId: v.id, productId: p.id, slug: p.slug, name: p.name, size: v.size, color: v.color, image: p.image, unitCents: p.priceCents };
    });
    cart.addMany(lines);
  };

  const tryonGarments = [chosen["one-piece"] ?? chosen.top ?? chosen.outerwear, chosen["one-piece"] ? undefined : chosen.bottom].filter((p): p is OutfitProduct => !!p?.tryon);

  return (
    <div className="grid gap-10 lg:grid-cols-12">
      <div className="lg:col-span-6">
        <div className="lg:sticky lg:top-[calc(var(--header-h)+16px)]">
          <div className="relative aspect-[4/5] overflow-hidden bg-stone" aria-label="Your look, laid out" role="img">
            <LayoutGroup>
              <AnimatePresence>
                {pieces.map((p) => {
                  const pos = PLACE[p.slot];
                  return (
                    <motion.div
                      key={p.slot}
                      layout
                      className="absolute aspect-[4/5] bg-white p-1.5"
                      style={{ left: pos.left, top: pos.top, width: pos.width, zIndex: pos.z, boxShadow: "0 10px 24px -12px rgba(0,0,0,0.35)" }}
                      initial={{ opacity: 0, scale: 0.85, rotate: pos.rotate - 6 }}
                      animate={{ opacity: 1, scale: 1, rotate: pos.rotate }}
                      exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.18 } }}
                      transition={{ type: "spring", stiffness: 260, damping: 24 }}
                    >
                      <AnimatePresence mode="popLayout">
                        <motion.div key={p.id} className="relative h-full w-full overflow-hidden bg-stone" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                          {p.image && <Image src={p.image} alt={p.name} fill sizes="240px" className="object-cover" />}
                        </motion.div>
                      </AnimatePresence>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </LayoutGroup>
            {pieces.length === 0 && (
              <div className="absolute inset-0 grid place-items-center p-10 text-center">
                <p className="max-w-[28ch] text-lead text-muted">Pick a piece from the list, or let us start a look for you.</p>
              </div>
            )}
          </div>
          <p className="mt-2 text-small text-muted">Product photos laid out together. To see clothes on a person, use virtual try-on.</p>
        </div>
      </div>

      <div className="lg:col-span-6">
        <div className="flex flex-wrap items-center gap-2">
          <div role="radiogroup" aria-label="Show pieces for" className="flex gap-1">
            {(["all", "women", "men"] as const).map((g) => (
              <button key={g} type="button" role="radio" aria-checked={gender === g} onClick={() => setGender(g)} className={`h-10 px-3.5 text-small font-semibold ${gender === g ? "bg-ink text-white" : "bg-stone hover:bg-stone-2"}`}>
                {g === "all" ? "Everyone" : g === "women" ? "Women" : "Men"}
              </button>
            ))}
          </div>
          <button type="button" className="btn btn-dark ml-auto min-h-10" onClick={complete}>{pieces.length ? "Complete the look" : "Start a look for me"}</button>
        </div>

        <div role="tablist" aria-label="Part of the outfit" className="-mx-[var(--gutter)] mt-6 flex gap-1 overflow-x-auto px-[var(--gutter)] [scrollbar-width:none]">
          {SLOTS.map(({ slot, label }) => {
            const has = chosen[slot];
            return (
              <button key={slot} role="tab" type="button" aria-selected={active === slot} onClick={() => setActive(slot)}
                className={`relative h-11 shrink-0 px-4 text-small font-semibold ${active === slot ? "text-white" : "bg-stone hover:bg-stone-2"}`}>
                {active === slot && <motion.span layoutId="slot-tab" className="absolute inset-0 bg-ink" transition={{ type: "spring", stiffness: 500, damping: 38 }} />}
                <span className="relative">{label}{has ? " ✓" : ""}</span>
              </button>
            );
          })}
        </div>

        <ul className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3" role="tabpanel">
          {candidates.length === 0 && <li className="col-span-full text-muted">Nothing in stock for this part right now.</li>}
          {candidates.slice(0, 9).map((p, i) => {
            const on = chosen[p.slot]?.id === p.id;
            const why = i < 3 ? reason(p, pieces) : null;
            return (
              <li key={p.id}>
                <button type="button" onClick={() => pick(p)} aria-pressed={on} className={`group block w-full text-left ${on ? "ring-2 ring-ink ring-offset-2" : ""}`}>
                  <span className="media relative block aspect-[4/5]">{p.image && <Image src={p.image} alt="" fill sizes="200px" className="object-cover transition-transform duration-500 group-hover:scale-105" />}</span>
                  <span className="mt-2 block text-small font-semibold leading-snug">{p.name}</span>
                  <span className="tabular block text-small">{formatBRL(p.priceCents)}</span>
                  {why && <span className="block text-small text-emerald">{why}</span>}
                </button>
              </li>
            );
          })}
        </ul>

        <section aria-labelledby="look-title" className="mt-10 bg-stone p-5">
          <h2 id="look-title" className="text-[1.5rem]">Your look</h2>
          {pieces.length === 0 ? <p className="mt-2 text-muted">No pieces yet.</p> : (
            <ul className="mt-4 flex flex-col gap-3">
              {SLOTS.filter(({ slot }) => chosen[slot]).map(({ slot, label }) => {
                const p = chosen[slot]!;
                const opts = sortSizes([...new Set(p.variants.filter((v) => v.stock > 0).map((v) => v.size))]);
                return (
                  <li key={slot} className="flex items-center gap-3">
                    <span className="relative block h-14 w-11 shrink-0 overflow-hidden bg-stone-2">{p.image && <Image src={p.image} alt="" fill sizes="44px" className="object-cover" />}</span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-small text-muted">{label}</span>
                      <Link href={`/p/${p.slug}`} className="block truncate font-semibold hover:text-emerald">{p.name}</Link>
                    </span>
                    <label>
                      <span className="sr-only">Size for {p.name}</span>
                      <select value={sizes[p.id] ?? ""} onChange={(e) => { setSizes({ ...sizes, [p.id]: e.target.value }); setMessage(null); }} className="field min-h-10 w-[104px] bg-white py-1.5" aria-invalid={!!message && !sizes[p.id]}>
                        <option value="">Size</option>
                        {opts.map((s) => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </label>
                    <span className="tabular w-24 text-right">{formatBRL(p.priceCents)}</span>
                    <button type="button" onClick={() => pick(p)} className="px-1 text-small text-muted hover:text-danger" aria-label={`Remove ${p.name}`}>Remove</button>
                  </li>
                );
              })}
            </ul>
          )}
          <div className="mt-5 flex items-baseline justify-between text-lead font-semibold"><span>Whole look</span><span className="tabular">{formatBRL(total)}</span></div>
          {message && <p className="error-text" role="alert">{message}</p>}
          <div className="mt-4 flex flex-col gap-2 sm:flex-row">
            <button type="button" className="btn flex-1" disabled={!pieces.length} onClick={addAll}>Add the whole look to bag</button>
            {tryonEnabled && tryonGarments.length > 0 && (
              <Link href={`/try-on?product=${tryonGarments.map((g) => g.slug).join(",")}`} className="btn btn-dark flex-1">See it on a model</Link>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
