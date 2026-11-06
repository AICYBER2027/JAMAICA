import type { Metadata } from "next";
import { CatalogPage, parseFilters, type SearchParams } from "@/components/CatalogPage";

export const metadata: Metadata = { title: "Search", robots: { index: false } };

export default async function SearchPage({ searchParams }: { searchParams: SearchParams }) {
  const filters = parseFilters(await searchParams);
  const title = filters.q ? `“${filters.q}”` : filters.sale ? "On sale" : filters.has3d ? "Turns in 3D" : "Everything";
  const intro = filters.q ? "Products whose name, description or category matches your search." : "Every product in the store. Narrow it down with the filters.";
  return <CatalogPage filters={filters} title={title} intro={intro} />;
}
