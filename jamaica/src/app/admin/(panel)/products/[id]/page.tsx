import Link from "next/link";
import { notFound } from "next/navigation";
import { requireStaff } from "@/lib/auth";
import { sql } from "@/lib/db";
import { getProductById } from "@/lib/catalog";
import { ProductForm } from "@/components/admin/ProductForm";
import { ModelEditor, PhotosEditor, SequenceEditor, VariantsEditor } from "@/components/admin/ProductMedia";
import { deleteProduct } from "@/app/actions/products";

export const metadata = { title: "Edit product" };

function Section({ id, title, intro, children }: { id: string; title: string; intro?: string; children: React.ReactNode }) {
  return (
    <section aria-labelledby={id} className="mt-14 scroll-mt-6">
      <h2 id={id} className="text-[1.5rem]">{title}</h2>
      {intro && <p className="mt-1 max-w-[70ch] text-muted">{intro}</p>}
      <div className="mt-5">{children}</div>
    </section>
  );
}

export default async function EditProduct({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ created?: string }> }) {
  await requireStaff("products");
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();
  const [p, categories, [raw]] = await Promise.all([
    getProductById(id),
    sql<{ id: string; name: string; department: string }[]>`select id, name, department from categories order by sort`,
    sql<{ weight_grams: number }[]>`select weight_grams from products where id = ${id}`,
  ]);
  if (!p) notFound();
  const { created } = await searchParams;
  const colours = [...new Set(p.variants.map((v) => v.color))];
  const remove = deleteProduct.bind(null, p.id);

  return (
    <div className="admin-page max-w-[1100px]">
      <Link href="/admin/products" className="text-small text-muted hover:text-ink">Products</Link>
      <div className="mt-2 flex flex-wrap items-end justify-between gap-4">
        <h1 className="admin-title">{p.name}</h1>
        <div className="flex gap-4 text-small font-semibold">
          {p.status === "active" ? <Link href={`/p/${p.slug}`} className="link" target="_blank">View in store</Link> : <span className="text-muted">Not visible in the store ({p.status})</span>}
        </div>
      </div>
      {created && <p className="mt-4 bg-[#dff3ea] px-4 py-3 text-[#0b5a3e]" role="status">Product created as a {p.status}. Add photos and sizes below, then set it to Active.</p>}
      <nav aria-label="Sections" className="mt-6 flex flex-wrap gap-2 text-small font-semibold">
        {[["basics", "Basics"], ["photos", "Photos"], ["stock", "Colours, sizes and stock"], ["model", "3D model"], ["sequence", "360° photos"]].map(([h, l]) => (
          <a key={h} href={`#${h}`} className="bg-stone px-3 py-2 hover:bg-stone-2">{l}</a>
        ))}
      </nav>

      <Section id="basics" title="Basics">
        <ProductForm product={{ ...p, weight_grams: raw.weight_grams }} categories={categories} />
      </Section>
      <Section id="photos" title="Photos" intro="The first photo is the one shown in lists. Tag a photo with a colour to show it when a customer picks that colour.">
        <PhotosEditor productId={p.id} images={p.images} colours={colours} />
      </Section>
      <Section id="stock" title="Colours, sizes and stock" intro="Stock goes down when an order is placed and comes back if the order is cancelled or never paid.">
        <VariantsEditor productId={p.id} variants={p.variants} />
      </Section>
      <Section id="model" title="3D model" intro="A real 3D model (GLB) that customers can turn and zoom. Models with colourways switch when the customer picks a colour.">
        <ModelEditor productId={p.id} media={p.media3d.find((m) => m.kind === "model")} colours={colours} />
      </Section>
      <Section id="sequence" title="360° photos" intro="A series of photos taken while turning the product on a turntable. Customers drag to turn it.">
        <SequenceEditor productId={p.id} media={p.media3d.find((m) => m.kind === "sequence")} />
      </Section>

      <section aria-labelledby="danger" className="mt-20 bg-stone p-5">
        <h2 id="danger" className="text-[1.1rem] tracking-normal" style={{ fontStretch: "100%" }}>Remove this product</h2>
        <p className="mt-1 max-w-[70ch] text-small text-muted">Products that were never ordered are deleted. Products with orders are archived instead, so order history stays complete.</p>
        <form action={remove} className="mt-3"><button className="btn btn-ghost text-danger" type="submit">Remove product</button></form>
      </section>
    </div>
  );
}
