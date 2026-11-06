import Image from "next/image";
import { requireStaff } from "@/lib/auth";
import { listCategories } from "@/lib/catalog";
import { ActionForm } from "@/components/admin/ActionForm";
import { CategoryImageField, DeleteCategory } from "@/components/admin/CategoryBits";
import { saveCategory } from "@/app/actions/admin";

export const metadata = { title: "Categories" };

function Fields({ c }: { c?: { id: string; name: string; slug: string; department: string; description: string; image: string | null; sort: number } }) {
  return (
    <>
      <input type="hidden" name="id" value={c?.id ?? ""} />
      <label><span className="label">Name</span><input name="name" defaultValue={c?.name} required className="field bg-white" /></label>
      <label><span className="label">Web address</span><input name="slug" defaultValue={c?.slug} placeholder="from the name" className="field bg-white" /></label>
      <label>
        <span className="label">Department</span>
        <select name="department" defaultValue={c?.department ?? "fashion"} className="field bg-white">
          <option value="fashion">Fashion</option><option value="accessories">Accessories</option><option value="footwear">Footwear</option>
        </select>
      </label>
      <label><span className="label">Order in menus</span><input name="sort" type="number" min={0} defaultValue={c?.sort ?? 50} className="field tabular bg-white" /></label>
      <label className="sm:col-span-2"><span className="label">One-line description</span><input name="description" defaultValue={c?.description} className="field bg-white" /></label>
      <CategoryImageField initial={c?.image ?? ""} />
    </>
  );
}

export default async function Categories() {
  await requireStaff("products");
  const cats = await listCategories();
  return (
    <div className="admin-page max-w-[1100px]">
      <h1 className="admin-title">Categories</h1>
      <p className="mt-2 text-muted">Each category gets its own page in the store, under its department.</p>
      <section aria-labelledby="new-cat" className="panel mt-8">
        <h2 id="new-cat" className="text-[1.25rem]">Add a category</h2>
        <ActionForm action={saveCategory} submit="Add category" resetOnSuccess className="mt-4 grid gap-4 sm:grid-cols-4"><Fields /></ActionForm>
      </section>
      {["fashion", "accessories", "footwear"].map((d) => (
        <section key={d} aria-labelledby={`d-${d}`} className="mt-12">
          <h2 id={`d-${d}`} className="text-[1.5rem] capitalize">{d}</h2>
          <ul className="mt-4 flex flex-col gap-2">
            {cats.filter((c) => c.department === d).map((c) => (
              <li key={c.id}>
                <details className="group bg-stone">
                  <summary className="flex cursor-pointer list-none items-center gap-4 px-4 py-3">
                    <span className="relative block h-12 w-10 shrink-0 overflow-hidden bg-stone-2">{c.image && <Image src={c.image} alt="" fill sizes="40px" className="object-cover" />}</span>
                    <span className="font-semibold">{c.name}</span>
                    <span className="tabular text-small text-muted">{c.product_count} products</span>
                    <span className="ml-auto text-small font-semibold group-open:hidden">Edit</span>
                  </summary>
                  <div className="px-4 pb-4">
                    <ActionForm action={saveCategory} submit="Save" className="grid gap-4 sm:grid-cols-4"><Fields c={c} /></ActionForm>
                    <DeleteCategory id={c.id} count={c.product_count ?? 0} />
                  </div>
                </details>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
