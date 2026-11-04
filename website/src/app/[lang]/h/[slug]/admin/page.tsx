import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { isSignedIn } from "@/lib/auth.ts";
import { getAvailability } from "@/lib/availability.ts";
import { getHotel } from "@/lib/hotels.ts";
import { adminDict, fill, isLang, t } from "@/lib/i18n.ts";
import { AdminBoard } from "@/components/AdminBoard.tsx";
import "./admin.css";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { robots: { index: false, follow: false } };

export default async function AdminPage({ params, searchParams }: PageProps<"/[lang]/h/[slug]/admin">) {
  const { lang, slug } = await params;
  const hotel = await getHotel(slug);
  if (!hotel || !isLang(lang)) notFound();
  const d = adminDict(lang);
  const wrong = (await searchParams).error === "1";
  const signedIn = await isSignedIn(hotel);
  const sites = [...new Set(hotel.bookingSite ? [hotel.bookingSite] : [])].join(", ") || d.yourSites;

  return (
    <main className="admin" style={{ ["--accent" as string]: hotel.theme.accent, ["--accent-ink" as string]: hotel.theme.accentInk }}>
      <header className="a-bar">
        <p className="a-hotel">{hotel.name}</p>
        <a href={`/${lang}/h/${hotel.slug}`}>{d.viewSite}</a>
        {signedIn && (
          <form method="post" action={`/api/hotels/${hotel.slug}/session`}>
            <input type="hidden" name="lang" value={lang} />
            <input type="hidden" name="action" value="signout" />
            <button type="submit" className="a-text-button">
              {d.signOut}
            </button>
          </form>
        )}
      </header>

      <h1>{d.title}</h1>

      {!hotel.adminPasswordHash ? (
        <p className="a-message">{d.noPassword}</p>
      ) : !signedIn ? (
        <form className="a-login" method="post" action={`/api/hotels/${hotel.slug}/session`}>
          <input type="hidden" name="lang" value={lang} />
          <label htmlFor="password">{d.password}</label>
          <input id="password" name="password" type="password" autoComplete="current-password" required aria-describedby={wrong ? "login-error" : undefined} />
          {wrong && (
            <p id="login-error" className="a-error" role="alert">
              {d.wrongPassword}
            </p>
          )}
          <button type="submit" className="a-button">
            {d.login}
          </button>
        </form>
      ) : (
        <>
          <p className="a-help">{fill(d.help, { sites })}</p>
          <AdminBoard
            slug={hotel.slug}
            lang={lang}
            rooms={hotel.rooms.map((r) => ({ id: r.id, number: r.number, name: t(r.name, lang) }))}
            availability={await getAvailability(hotel)}
          />
        </>
      )}
    </main>
  );
}
