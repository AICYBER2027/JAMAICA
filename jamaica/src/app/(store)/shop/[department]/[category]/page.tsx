import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CatalogPage, parseFilters, type SearchParams } from "@/components/CatalogPage";
import { getCategory } from "@/lib/catalog";

type Params = Promise<{ department: string; category: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { department, category } = await params;
  const c = await getCategory(category);
  return c && c.department === department ? { title: c.name, description: c.description, alternates: { canonical: `/shop/${department}/${c.slug}` } } : {};
}

export default async function CategoryPage({ params, searchParams }: { params: Params; searchParams: SearchParams }) {
  const { department, category } = await params;
  const c = await getCategory(category);
  if (!c || c.department !== department) notFound();
  return <CatalogPage department={c.department} category={c} filters={parseFilters(await searchParams)} title={c.name} intro={c.description} />;
}
