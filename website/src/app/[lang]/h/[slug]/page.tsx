import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getAvailability } from "@/lib/availability.ts";
import { getHotel, publicHotel } from "@/lib/hotels.ts";
import { isLang, t } from "@/lib/i18n.ts";
import { SITE } from "@/lib/site.ts";
import { HotelView } from "@/components/HotelView.tsx";

// Availability changes all the time, so this page is built for every visit.
export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: PageProps<"/[lang]/h/[slug]">): Promise<Metadata> {
  const { lang, slug } = await params;
  const hotel = await getHotel(slug);
  if (!hotel || !isLang(lang)) return {};
  return {
    title: `${hotel.name}, ${t(hotel.town, lang)}`,
    description: t(hotel.tagline, lang),
    ...(hotel.unlisted ? { robots: { index: false, follow: false } } : {}),
    alternates: { languages: Object.fromEntries(hotel.languages.map((l) => [l, `/${l}/h/${hotel.slug}`])) },
  };
}

export default async function HotelPage({ params, searchParams }: PageProps<"/[lang]/h/[slug]">) {
  const { lang, slug } = await params;
  const hotel = await getHotel(slug);
  if (!hotel || !isLang(lang)) notFound();
  const availability = await getAvailability(hotel);
  const sp = await searchParams;
  const pick = (k: string) => (typeof sp[k] === "string" ? (sp[k] as string) : undefined);

  return (
    <HotelView
      hotel={publicHotel(hotel)}
      availability={availability}
      lang={lang}
      brand={SITE.brand}
      initial={{ from: pick("from"), to: pick("to"), guests: pick("guests") }}
    />
  );
}
