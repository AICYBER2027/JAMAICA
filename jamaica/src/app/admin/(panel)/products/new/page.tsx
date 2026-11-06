import Link from "next/link";
import { requireStaff } from "@/lib/auth";
import { sql } from "@/lib/db";
import { ProductForm } from "@/components/admin/ProductForm";

export const metadata = { title: "Add a product" };

export default async function NewProduct() {
  await requireStaff("products");
  const categories = await sql<{ id: string; name: string; department: string }[]>`select id, name, department from categories order by sort`;
  return (
    <div className="admin-page max-w-[960px]">
      <Link href="/admin/products" className="text-small text-muted hover:text-ink">Products</Link>
      <h1 className="admin-title mt-2">Add a product</h1>
      <p className="mt-2 max-w-[60ch] text-muted">Start with the basics. Once it’s created you can add photos, colours and sizes, a 3D model and a 360° sequence. It stays hidden until you set it to Active.</p>
      <div className="mt-8"><ProductForm categories={categories} /></div>
    </div>
  );
}
