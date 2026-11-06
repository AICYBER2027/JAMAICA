import Image from "next/image";
import Link from "next/link";
import type { ProductCard as Card } from "@/lib/catalog";
import { Price } from "./Price";
import { discountPercent } from "@/lib/money";

export function ProductCard({ p, priority = false, sizes = "(min-width: 1280px) 25vw, (min-width: 768px) 33vw, 50vw" }: { p: Card; priority?: boolean; sizes?: string }) {
  const off = discountPercent(p);
  return (
    <Link href={`/p/${p.slug}`} className="group block" prefetch={false}>
      <div className="media aspect-[4/5]">
        {p.image ? (
          <>
            <Image src={p.image} alt={p.name} fill sizes={sizes} priority={priority} className={`object-cover transition-[opacity,transform] duration-500 ease-out group-hover:scale-[1.03] ${p.image2 ? "group-hover:opacity-0" : ""}`} />
            {p.image2 && <Image src={p.image2} alt="" fill sizes={sizes} className="object-cover opacity-0 transition-opacity duration-500 group-hover:opacity-100" />}
          </>
        ) : (
          <div className="grid h-full place-items-center text-small text-muted">No photo yet</div>
        )}
        {!p.in_stock && <span className="absolute left-0 top-0 bg-black px-2.5 py-1 text-small font-semibold text-white">Sold out</span>}
        {p.in_stock && off && <span className="absolute left-0 top-0 bg-gilt px-2.5 py-1 text-small font-semibold text-black">{off}% off</span>}
      </div>
      <div className="mt-3 flex items-start justify-between gap-3">
        <h3 className="text-[1rem] font-semibold leading-snug tracking-normal group-hover:text-emerald" style={{ fontStretch: "100%" }}>{p.name}</h3>
      </div>
      <Price p={p} className="mt-0.5 text-[0.95rem]" />
      <div className="mt-2 flex items-center gap-2">
        <span className="flex gap-1" aria-label={`${p.colors.length} ${p.colors.length === 1 ? "colour" : "colours"}: ${p.colors.map((c) => c.name).join(", ")}`}>
          {p.colors.slice(0, 5).map((c) => (
            <span key={c.name} className="block h-3 w-3 ring-1 ring-black/15" style={{ background: c.hex }} />
          ))}
        </span>
        {p.has_3d && <span className="text-small font-semibold text-emerald">Turns in 3D</span>}
        {!p.has_3d && p.is_new && <span className="text-small text-muted">New in</span>}
      </div>
    </Link>
  );
}
