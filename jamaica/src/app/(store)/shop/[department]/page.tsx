import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CatalogPage, parseFilters, type SearchParams } from "@/components/CatalogPage";
import { DEPARTMENTS } from "@/lib/catalog";

type Params = Promise<{ department: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { department } = await params;
  const d = DEPARTMENTS.find((x) => x.slug === department);
  return d ? { title: d.name, description: d.blurb, alternates: { canonical: `/shop/${d.slug}` } } : {};
}

export default async function DepartmentPage({ params, searchParams }: { params: Params; searchParams: SearchParams }) {
  const { department } = await params;
  const d = DEPARTMENTS.find((x) => x.slug === department);
  if (!d) notFound();
  return <CatalogPage department={d.slug} filters={parseFilters(await searchParams)} title={d.name} intro={d.blurb} />;
}
