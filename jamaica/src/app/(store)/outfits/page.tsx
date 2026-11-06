import type { Metadata } from "next";
import { OutfitBuilder, type OutfitProduct } from "@/components/outfits/OutfitBuilder";
import { Footer } from "@/components/Footer";
import { listProducts } from "@/lib/catalog";
import { sql } from "@/lib/db";
import { effectivePrice } from "@/lib/money";
import { integrations } from "@/lib/settings";
import type { Slot } from "@/lib/recommend";

export const metadata: Metadata = { title: "Outfit builder", description: "Combine tops, bottoms, shoes, watches and sunglasses into one look and add it to your bag in one go." };

export default async function Outfits({ searchParams }: { searchParams: Promise<{ with?: string }> }) {
  const sp = await searchParams;
  const [cards, i] = await Promise.all([listProducts({ slots: ["top", "outerwear", "bottom", "one-piece", "shoes", "watch", "eyewear", "accessory"] }), integrations()]);
  const variants = await sql<{ product_id: string; id: string; size: string; color: string; stock: number }[]>`
    select product_id, id, size, color, stock from product_variants where product_id = any(${cards.map((c) => c.id)}) order by sort`;
  const products: OutfitProduct[] = cards.map((c) => ({
    id: c.id, slug: c.slug, name: c.name, slot: c.outfit_slot as Slot, palette: c.palette, gender: c.gender,
    priceCents: effectivePrice(c), image: c.image, featured: c.featured, inStock: c.in_stock, tryon: c.tryon_category,
    variants: variants.filter((v) => v.product_id === c.id),
  }));
  return (
    <>
      <div className="frame pb-24 pt-10">
        <div className="grid gap-6 md:grid-cols-12 md:items-end">
          <h1 className="text-[clamp(2.6rem,6vw,6rem)] md:col-span-7">Outfit builder</h1>
          <p className="max-w-[44ch] text-lead leading-snug md:col-span-5">Put a whole look together, see what it costs, and add every piece to your bag at once.</p>
        </div>
        <div className="mt-12">
          <OutfitBuilder products={products} initial={sp.with} tryonEnabled={i.tryOn} />
        </div>
      </div>
      <Footer />
    </>
  );
}
