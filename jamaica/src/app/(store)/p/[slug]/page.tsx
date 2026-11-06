import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getProduct, relatedProducts } from "@/lib/catalog";
import { ProductView } from "@/components/product/ProductView";
import { ProductCard } from "@/components/ProductCard";
import { Footer } from "@/components/Footer";
import { effectivePrice } from "@/lib/money";

type Params = Promise<{ slug: string }>;
type SP = Promise<Record<string, string | string[] | undefined>>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const p = await getProduct((await params).slug);
  if (!p) return {};
  return {
    title: p.name,
    description: p.description.slice(0, 160),
    alternates: { canonical: `/p/${p.slug}` },
    openGraph: { title: p.name, description: p.description.slice(0, 160), images: p.image ? [{ url: p.image }] : [] },
  };
}

export default async function ProductPage({ params, searchParams }: { params: Params; searchParams: SP }) {
  const p = await getProduct((await params).slug);
  if (!p) notFound();
  const sp = await searchParams;
  const related = await relatedProducts(p, 4);
  const site = process.env.SITE_URL || "http://localhost:3000";
  const inStock = p.variants.some((v) => v.stock > 0);
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: p.name,
    description: p.description,
    image: p.images.map((i) => new URL(i.url, site).toString()),
    sku: p.variants[0]?.sku,
    brand: { "@type": "Brand", name: "JAMAICA" },
    offers: {
      "@type": "Offer",
      priceCurrency: "BRL",
      price: (effectivePrice(p) / 100).toFixed(2),
      availability: inStock ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
      url: `${site}/p/${p.slug}`,
    },
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
      <div className="frame pb-24 pt-6 md:pt-10">
        <nav aria-label="Breadcrumb" className="mb-6 text-small text-muted">
          <Link href="/" className="hover:text-ink">Home</Link>
          <span aria-hidden="true"> / </span>
          <Link href={`/shop/${p.department}`} className="capitalize hover:text-ink">{p.department}</Link>
          <span aria-hidden="true"> / </span>
          <Link href={`/shop/${p.department}/${p.category_slug}`} className="hover:text-ink">{p.category_name}</Link>
        </nav>
        <ProductView p={p} initialColor={typeof sp.color === "string" ? sp.color : undefined} />
        {related.length > 0 && (
          <section aria-labelledby="related-title" className="mt-28">
            <h2 id="related-title" className="text-[clamp(1.75rem,3vw,2.75rem)]">You might also like</h2>
            <ul className="mt-8 grid grid-cols-2 gap-x-3 gap-y-10 md:grid-cols-4 md:gap-x-5">
              {related.map((r) => (
                <li key={r.id}><ProductCard p={r} /></li>
              ))}
            </ul>
          </section>
        )}
      </div>
      <Footer />
    </>
  );
}
