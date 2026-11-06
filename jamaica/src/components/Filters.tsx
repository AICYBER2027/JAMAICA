"use client";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { AnimatePresence, motion } from "motion/react";
import { formatBRL } from "@/lib/money";

type Facets = { sizes: string[]; colors: { name: string; hex: string }[]; min: number; max: number };

/**
 * Filters are a plain GET form, so they work without JavaScript. With it, every change applies at once
 * without a reload, and the URL stays shareable.
 */
export function Filters({ facets, total, showGender = true, showQuery = false }: { facets: Facets; total: number; showGender?: boolean; showQuery?: boolean }) {
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const form = useRef<HTMLFormElement>(null);
  const [pending, start] = useTransition();
  const [sheet, setSheet] = useState(false);
  // Fields live in exactly one place (inline on desktop, in the sheet on phones) so the form never holds stale duplicates.
  const [desktop, setDesktop] = useState<boolean | null>(null);
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px)");
    const on = () => setDesktop(mq.matches);
    on();
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);

  const apply = () => {
    if (!form.current) return;
    const data = new FormData(form.current);
    const next = new URLSearchParams();
    for (const [k, v] of data.entries()) if (typeof v === "string" && v !== "") next.set(k, v);
    start(() => router.replace(`${pathname}${next.size ? `?${next}` : ""}`, { scroll: false }));
  };
  const active = ["gender", "size", "color", "max", "sale", "has3d"].filter((k) => params.get(k)).length;
  const priceSteps = [10000, 20000, 30000, 50000, 80000, 120000, 200000].filter((s) => s > facets.min && s < facets.max);

  const fields = (
    <>
      {showQuery && (
        <label className="block">
          <span className="label">Search</span>
          <input name="q" defaultValue={params.get("q") ?? ""} className="field" placeholder="Jacket, watch, linen…" type="search" />
        </label>
      )}
      {showGender && (
        <fieldset>
          <legend className="label">For</legend>
          <div className="flex flex-wrap gap-2">
            {[["", "Everyone"], ["women", "Women"], ["men", "Men"]].map(([v, l]) => (
              <label key={v} className="cursor-pointer">
                <input type="radio" name="gender" value={v} defaultChecked={(params.get("gender") ?? "") === v} onChange={apply} className="peer sr-only" />
                <span className="block bg-stone px-3.5 py-2 text-small font-semibold peer-checked:bg-ink peer-checked:text-white peer-focus-visible:outline-2">{l}</span>
              </label>
            ))}
          </div>
        </fieldset>
      )}
      {facets.sizes.length > 1 && (
        <fieldset>
          <legend className="label">Size in stock</legend>
          <div className="flex flex-wrap gap-1.5">
            {["", ...facets.sizes].map((s) => (
              <label key={s} className="cursor-pointer">
                <input type="radio" name="size" value={s} defaultChecked={(params.get("size") ?? "") === s} onChange={apply} className="peer sr-only" />
                <span className="block min-w-11 bg-stone px-2.5 py-2 text-center text-small font-semibold peer-checked:bg-ink peer-checked:text-white">{s || "Any"}</span>
              </label>
            ))}
          </div>
        </fieldset>
      )}
      {facets.colors.length > 1 && (
        <fieldset>
          <legend className="label">Colour</legend>
          <div className="flex flex-wrap gap-1.5">
            <label className="cursor-pointer">
              <input type="radio" name="color" value="" defaultChecked={!params.get("color")} onChange={apply} className="peer sr-only" />
              <span className="block bg-stone px-2.5 py-2 text-small font-semibold peer-checked:bg-ink peer-checked:text-white">Any</span>
            </label>
            {facets.colors.map((c) => (
              <label key={c.name} className="cursor-pointer" title={c.name}>
                <input type="radio" name="color" value={c.name} defaultChecked={params.get("color") === c.name} onChange={apply} className="peer sr-only" />
                <span className="flex h-9 w-9 items-center justify-center bg-stone peer-checked:bg-ink">
                  <span className="block h-5 w-5 ring-1 ring-black/15" style={{ background: c.hex }} />
                </span>
                <span className="sr-only">{c.name}</span>
              </label>
            ))}
          </div>
        </fieldset>
      )}
      {priceSteps.length > 0 && (
        <label className="block">
          <span className="label">Price up to</span>
          <select name="max" defaultValue={params.get("max") ?? ""} onChange={apply} className="field">
            <option value="">Any price</option>
            {priceSteps.map((s) => (
              <option key={s} value={s}>{formatBRL(s)}</option>
            ))}
          </select>
        </label>
      )}
      <div className="flex flex-col gap-2">
        <label className="flex cursor-pointer items-center gap-3">
          <input type="checkbox" name="sale" value="1" defaultChecked={params.get("sale") === "1"} onChange={apply} className="h-5 w-5 accent-emerald" />
          <span>On sale</span>
        </label>
        <label className="flex cursor-pointer items-center gap-3">
          <input type="checkbox" name="has3d" value="1" defaultChecked={params.get("has3d") === "1"} onChange={apply} className="h-5 w-5 accent-emerald" />
          <span>Turns in 3D or 360°</span>
        </label>
      </div>
    </>
  );

  return (
    <form ref={form} method="get" onSubmit={(e) => { e.preventDefault(); apply(); }} aria-busy={pending}>
      <div className="flex items-center justify-between gap-4">
        <p className="tabular text-muted" aria-live="polite">{pending ? "Updating…" : `${total} ${total === 1 ? "product" : "products"}`}</p>
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2">
            <span className="sr-only md:not-sr-only md:text-small md:text-muted">Sort</span>
            <select name="sort" defaultValue={params.get("sort") ?? "featured"} onChange={apply} className="field min-h-11 w-auto py-2">
              <option value="featured">Featured</option>
              <option value="new">Newest</option>
              <option value="price-asc">Price, low to high</option>
              <option value="price-desc">Price, high to low</option>
            </select>
          </label>
          <button type="button" className="btn btn-dark min-h-11 px-4 lg:hidden" onClick={() => setSheet(true)} aria-expanded={sheet}>
            Filter{active ? ` (${active})` : ""}
          </button>
        </div>
      </div>

      {desktop !== false && <div className="mt-6 hidden grid-cols-[repeat(auto-fit,minmax(200px,1fr))] items-start gap-x-10 gap-y-6 lg:grid">{fields}</div>}

      <AnimatePresence>
        {sheet && desktop === false && (
          <div className="fixed inset-0 z-50 lg:hidden">
            <motion.div className="absolute inset-0 bg-black/50" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setSheet(false)} />
            <motion.div
              role="dialog"
              aria-modal="true"
              aria-label="Filters"
              className="absolute inset-x-0 bottom-0 flex max-h-[85svh] flex-col bg-white"
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", stiffness: 420, damping: 42 }}
            >
              <div className="flex items-center justify-between px-5 pt-5">
                <h2 className="text-[1.5rem]">Filter</h2>
                <button type="button" className="px-2 py-1 font-semibold" onClick={() => setSheet(false)}>Close</button>
              </div>
              <div className="flex flex-col gap-6 overflow-y-auto px-5 py-5">{fields}</div>
              <div className="flex gap-3 bg-stone px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-4">
                <a href={pathname} className="btn btn-ghost flex-1">Clear</a>
                <button type="button" className="btn flex-1" onClick={() => setSheet(false)}>Show {total}</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      <noscript>
        <button type="submit" className="btn mt-4">Apply filters</button>
      </noscript>
    </form>
  );
}
