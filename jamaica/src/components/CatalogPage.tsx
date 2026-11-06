import Link from "next/link";
import Image from "next/image";
import { Suspense } from "react";
import { DEPARTMENTS, getFacets, listCategories, listProducts, type Category, type Department, type Filters as F, type Sort } from "@/lib/catalog";
import { Filters } from "./Filters";
import { ProductCard } from "./ProductCard";
import { Footer } from "./Footer";

export type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export function parseFilters(sp: Record<string, string | string[] | undefined>): F {
  const one = (k: string) => (typeof sp[k] === "string" ? (sp[k] as string).slice(0, 80) : undefined);
  const num = (k: string) => {
    const v = Number(one(k));
    return Number.isFinite(v) && v > 0 ? Math.round(v) : undefined;
  };
  const sort = one("sort");
  const gender = one("gender");
  return {
    gender: gender === "women" || gender === "men" ? gender : undefined,
    size: one("size"),
    color: one("color"),
    max: num("max"),
    min: num("min"),
    sale: one("sale") === "1",
    has3d: one("has3d") === "1",
    q: one("q")?.trim() || undefined,
    sort: (["new", "price-asc", "price-desc", "featured"].includes(sort ?? "") ? sort : "featured") as Sort,
  };
}

export async function CatalogPage({ department, category, filters, title, intro }: { department?: Department; category?: Category; filters: F; title: string; intro: string }) {
  const [products, facets, siblings] = await Promise.all([
    listProducts({ ...filters, department, category: category?.slug }),
    getFacets({ department, category: category?.slug }),
    department ? listCategories(department) : Promise.resolve([] as Category[]),
  ]);
  const dept = DEPARTMENTS.find((d) => d.slug === department);

  return (
    <>
      <div className="frame pb-24 pt-10 md:pt-14">
        <nav aria-label="Breadcrumb" className="text-small text-muted">
          <Link href="/" className="hover:text-ink">Home</Link>
          {dept && (
            <>
              <span aria-hidden="true"> / </span>
              <Link href={`/shop/${dept.slug}`} className="hover:text-ink" aria-current={category ? undefined : "page"}>{dept.name}</Link>
            </>
          )}
          {category && (
            <>
              <span aria-hidden="true"> / </span>
              <span aria-current="page">{category.name}</span>
            </>
          )}
        </nav>
        <div className="mt-6 grid gap-6 md:grid-cols-12 md:items-end">
          <h1 className="text-[clamp(2.75rem,7vw,7rem)] md:col-span-8">{title}</h1>
          <p className="max-w-[44ch] text-lead leading-snug md:col-span-4">{intro}</p>
        </div>

        {siblings.length > 0 && (
          <nav aria-label={`${dept?.name} categories`} className="-mx-[var(--gutter)] mt-10 overflow-x-auto px-[var(--gutter)] [scrollbar-width:none]">
            <ul className="flex gap-3 pb-1">
              <li>
                <Link href={`/shop/${department}`} aria-current={!category ? "page" : undefined} className={`flex h-full items-end whitespace-nowrap px-4 py-3 font-semibold ${!category ? "bg-ink text-white" : "bg-stone hover:bg-stone-2"}`}>
                  All {dept?.name.toLowerCase()}
                </Link>
              </li>
              {siblings.map((c) => {
                const on = c.slug === category?.slug;
                return (
                  <li key={c.slug}>
                    <Link href={`/shop/${department}/${c.slug}`} aria-current={on ? "page" : undefined} className={`group flex items-center gap-3 whitespace-nowrap py-2 pl-2 pr-4 font-semibold ${on ? "bg-ink text-white" : "bg-stone hover:bg-stone-2"}`}>
                      <span className="relative block h-11 w-9 overflow-hidden bg-stone-2">
                        {c.image && <Image src={c.image} alt="" fill sizes="36px" className="object-cover" />}
                      </span>
                      {c.name}
                      <span className={`tabular text-small font-normal ${on ? "text-mist" : "text-muted"}`}>{c.product_count}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>
        )}

        <div className="mt-10">
          <Suspense>
            <Filters facets={facets} total={products.length} showQuery={!department} />
          </Suspense>
        </div>

        {products.length === 0 ? (
          <div className="mt-16 max-w-[44ch]">
            <h2 className="text-[1.75rem]">Nothing matches those filters</h2>
            <p className="mt-3 text-muted">Try another size or colour, or clear the filters to see everything in {category?.name.toLowerCase() ?? dept?.name.toLowerCase() ?? "the store"}.</p>
            <Link href={category ? `/shop/${department}/${category.slug}` : department ? `/shop/${department}` : "/search"} className="btn btn-dark mt-6">Clear filters</Link>
          </div>
        ) : (
          <ul className="mt-8 grid grid-cols-2 gap-x-3 gap-y-10 md:grid-cols-3 md:gap-x-5 xl:grid-cols-4">
            {products.map((p, i) => (
              <li key={p.id}>
                <ProductCard p={p} priority={i < 4} />
              </li>
            ))}
          </ul>
        )}
      </div>
      <Footer />
    </>
  );
}
