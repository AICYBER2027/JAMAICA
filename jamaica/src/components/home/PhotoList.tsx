import Image from "next/image";
import Link from "next/link";
import type { ProductCard } from "@/lib/catalog";
import { Price } from "@/components/Price";

export type ListGroup = { id: string; title: string; href: string; items: (ProductCard & { blurb: string })[] };

/** A catalogue list: each item opens with its own small photograph where a bullet would be. */
export function PhotoList({ heading, groups }: { heading: string; groups: ListGroup[] }) {
  return (
    <section aria-labelledby="lists-title" className="frame py-[clamp(80px,12vw,200px)]">
      <h2 id="lists-title" className="sr-only">{heading}</h2>
      <div className="mx-auto max-w-[1280px]">
        {groups.map((g) => (
          <div key={g.id} className="pt-16 first:pt-0 md:pt-24">
            <div className="mb-8 flex items-baseline justify-between gap-6 md:mb-10">
              <h3 id={g.id} className="text-[clamp(2rem,3.4vw,3.1rem)]">{g.title}</h3>
              <Link href={g.href} className="link shrink-0 font-semibold">See all</Link>
            </div>
            <ul className="grid gap-x-16 gap-y-8 md:grid-cols-2 md:gap-y-9">
              {g.items.map((p) => (
                <li key={p.id}>
                  <Link href={`/p/${p.slug}`} className="group flex gap-5">
                    <span className="media relative block h-[78px] w-[64px] shrink-0 md:h-[96px] md:w-[78px]">
                      {p.image && <Image src={p.image} alt="" fill sizes="78px" className="object-cover transition-transform duration-500 group-hover:scale-105" />}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-baseline justify-between gap-4">
                        <span className="text-[1.0625rem] font-semibold group-hover:text-emerald">{p.name}</span>
                        <Price p={p} className="shrink-0" />
                      </span>
                      <span className="mt-1 block max-w-[46ch] text-[1rem] leading-snug text-muted">{p.blurb}</span>
                      {!p.in_stock && <span className="mt-1 block text-small font-semibold text-danger">Sold out</span>}
                      {p.has_3d && p.in_stock && <span className="mt-1 block text-small font-semibold text-emerald">Turn it in 3D</span>}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </section>
  );
}
