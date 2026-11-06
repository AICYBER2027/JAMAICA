import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { TryOnStudio } from "@/components/tryon/TryOnStudio";
import { Footer } from "@/components/Footer";
import { listProducts } from "@/lib/catalog";
import { sql } from "@/lib/db";
import { effectivePrice } from "@/lib/money";
import { tryonEnabled } from "@/lib/tryon";

export const metadata: Metadata = { title: "Virtual try-on", description: "See a garment on a studio model, or on a photo of yourself." };

export default async function TryOn({ searchParams }: { searchParams: Promise<{ product?: string }> }) {
  const enabled = tryonEnabled();
  const preselect = ((await searchParams).product ?? "").split(",").filter(Boolean).slice(0, 2);
  const [cards, models] = await Promise.all([
    listProducts({ sort: "featured" }),
    sql<{ id: string; name: string; gender: "women" | "men"; body_type: string; view: string; image_url: string }[]>`
      select id, name, gender, body_type, view, image_url from tryon_models where active order by sort, name`,
  ]);
  const garments = cards.filter((c) => c.tryon_category && c.in_stock).map((c) => ({
    id: c.id, slug: c.slug, name: c.name, image: c.image, category: c.tryon_category as "tops" | "bottoms" | "one-pieces", priceCents: effectivePrice(c), gender: c.gender,
  }));

  return (
    <>
      <div className="frame pb-24 pt-10">
        <div className="grid gap-6 md:grid-cols-12 md:items-end">
          <h1 className="text-[clamp(2.6rem,6vw,6rem)] md:col-span-7">Virtual try-on</h1>
          <p className="max-w-[46ch] text-lead leading-snug md:col-span-5">Pick a garment and a studio model, or a photo of yourself, and an AI model draws the garment on them, following the pose and body.</p>
        </div>
        {enabled ? (
          <div className="mt-12"><TryOnStudio garments={garments} models={models} preselect={preselect} /></div>
        ) : (
          <section aria-labelledby="off-title" className="mt-12 grid gap-10 bg-jade p-6 text-white md:grid-cols-12 md:p-10">
            <div className="md:col-span-6">
              <h2 id="off-title" className="text-[clamp(1.75rem,3vw,2.5rem)]">Try-on isn’t switched on yet</h2>
              <p className="mt-4 max-w-[46ch]">This store hasn’t connected its try-on service, so we can’t generate images right now. We won’t show you a fake preview instead.</p>
              <p className="mt-4 max-w-[46ch]">Meanwhile, you can turn watches, sunglasses and sneakers in 3D, or put a whole look together.</p>
              <div className="mt-6 flex flex-wrap gap-3">
                <Link href="/search?has3d=1" className="btn btn-light">Products in 3D</Link>
                <Link href="/outfits" className="btn btn-ghost">Outfit builder</Link>
              </div>
            </div>
            <ul className="grid grid-cols-4 gap-2 md:col-span-6" aria-label="Studio models available once try-on is on">
              {models.slice(0, 4).map((m) => (
                <li key={m.id} className="relative aspect-[3/4] overflow-hidden bg-jade-2"><Image src={m.image_url} alt={m.name} fill sizes="160px" className="object-cover opacity-80" /></li>
              ))}
            </ul>
          </section>
        )}
      </div>
      <Footer />
    </>
  );
}
