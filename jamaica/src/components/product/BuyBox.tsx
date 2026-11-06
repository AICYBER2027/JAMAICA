"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import type { Variant } from "@/lib/catalog";
import { sortSizes } from "@/lib/sizes";
import { cart } from "@/lib/cart-store";

type Props = {
  product: { id: string; slug: string; name: string; image: string | null; unitCents: number; tryon: boolean; outfit: boolean };
  variants: Variant[];
  colors: { name: string; hex: string }[];
  color: string;
  onColor: (c: string) => void;
  colorImages: Record<string, string>;
};

export function BuyBox({ product, variants, colors, color, onColor, colorImages }: Props) {
  const router = useRouter();
  const sizes = sortSizes([...new Set(variants.filter((v) => v.color === color).map((v) => v.size))]);
  const single = sizes.length === 1;
  const [size, setSize] = useState<string | null>(single ? sizes[0] : null);
  const [needSize, setNeedSize] = useState(false);
  const [added, setAdded] = useState(0);
  const variant = variants.find((v) => v.color === color && v.size === (single ? sizes[0] : size));
  const colourStock = variants.filter((v) => v.color === color).reduce((n, v) => n + v.stock, 0);

  const add = (go: boolean) => {
    if (!variant) {
      setNeedSize(true);
      return;
    }
    if (variant.stock <= 0) return;
    cart.add(
      { variantId: variant.id, productId: product.id, slug: product.slug, name: product.name, size: variant.size, color: variant.color, image: colorImages[color] ?? product.image, unitCents: product.unitCents },
      1,
      { open: !go },
    );
    setAdded((a) => a + 1);
    if (go) router.push("/checkout");
  };

  return (
    <div className="flex flex-col gap-7">
      <fieldset>
        <legend className="mb-3 flex w-full justify-between font-semibold">
          <span>Colour</span>
          <span className="font-normal text-muted">{color}</span>
        </legend>
        <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Colour">
          {colors.map((c) => (
            <button
              key={c.name}
              type="button"
              role="radio"
              aria-checked={c.name === color}
              aria-label={c.name}
              title={c.name}
              onClick={() => {
                onColor(c.name);
                setSize(null);
                setNeedSize(false);
              }}
              className="relative grid h-12 w-12 place-items-center bg-stone"
            >
              <span className="block h-7 w-7 ring-1 ring-black/10" style={{ background: c.hex }} />
              {c.name === color && <motion.span layoutId="colour-ring" className="absolute inset-0 ring-2 ring-ink" transition={{ type: "spring", stiffness: 520, damping: 36 }} />}
            </button>
          ))}
        </div>
      </fieldset>

      {!single && (
        <fieldset aria-describedby={needSize ? "size-error" : undefined}>
          <legend className="mb-3 flex w-full justify-between font-semibold">
            <span>Size{/^\d/.test(sizes[0] ?? "") && Number(sizes[0]) < 50 ? " (Brazilian)" : ""}</span>
            <Link href="/help/shipping#sizes" className="link font-normal text-muted">Size guide</Link>
          </legend>
          <motion.div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Size" animate={needSize && !size ? { x: [0, -6, 6, -4, 4, 0] } : { x: 0 }} transition={{ duration: 0.4 }}>
            {sizes.map((s) => {
              const v = variants.find((x) => x.color === color && x.size === s);
              const out = !v || v.stock <= 0;
              const on = size === s;
              return (
                <button
                  key={s}
                  type="button"
                  role="radio"
                  aria-checked={on}
                  aria-disabled={out}
                  aria-label={out ? `${s}, sold out` : s}
                  onClick={() => {
                    if (out) return;
                    setSize(s);
                    setNeedSize(false);
                  }}
                  className={`relative h-12 min-w-14 px-3 font-semibold transition-colors ${out ? "cursor-not-allowed bg-stone text-muted line-through" : on ? "text-white" : "bg-stone hover:bg-stone-2"}`}
                >
                  {on && <motion.span layoutId="size-chip" className="absolute inset-0 bg-ink" transition={{ type: "spring", stiffness: 520, damping: 36 }} />}
                  <span className="relative">{s}</span>
                </button>
              );
            })}
          </motion.div>
          {needSize && <p id="size-error" className="error-text" role="alert">Choose a size to add it to your bag.</p>}
        </fieldset>
      )}

      <p className="text-small" aria-live="polite">
        {variant ? (
          variant.stock <= 0 ? <span className="font-semibold text-danger">Sold out in this size</span>
          : variant.stock <= 3 ? <span className="font-semibold">Only {variant.stock} left in {variant.size}</span>
          : <span className="text-emerald font-semibold">In stock, ships in 2 working days</span>
        ) : colourStock === 0 ? (
          <span className="font-semibold text-danger">Sold out in {color}</span>
        ) : (
          <span className="text-muted">{colourStock} in stock across sizes</span>
        )}
      </p>

      <div className="flex flex-col gap-2 sm:flex-row">
        <button type="button" className="btn btn-dark relative flex-1 overflow-hidden" onClick={() => add(false)} disabled={colourStock === 0 || (variant != null && variant.stock <= 0)}>
          <AnimatePresence mode="popLayout" initial={false}>
            <motion.span key={added} initial={{ y: added ? 28 : 0, opacity: added ? 0 : 1 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -28, opacity: 0 }} transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}>
              {added ? "Added. Add another" : "Add to bag"}
            </motion.span>
          </AnimatePresence>
        </button>
        <button type="button" className="btn flex-1" onClick={() => add(true)} disabled={colourStock === 0 || (variant != null && variant.stock <= 0)}>
          Buy now
        </button>
      </div>

      {(product.tryon || product.outfit) && (
        <div className="flex flex-wrap gap-x-6 gap-y-2">
          {product.tryon && <Link href={`/try-on?product=${product.slug}`} className="link font-semibold">Try it on a model</Link>}
          {product.outfit && <Link href={`/outfits?with=${product.slug}`} className="link font-semibold">Build an outfit with this</Link>}
        </div>
      )}
    </div>
  );
}
