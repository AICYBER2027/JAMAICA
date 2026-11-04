import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getAvailability } from "@/lib/availability.ts";
import { getHotels } from "@/lib/hotels.ts";
import { fill, hotelDict, isLang, LANG_NAMES, LANGS, t } from "@/lib/i18n.ts";
import { SALES } from "@/lib/sales-copy.ts";
import { SITE } from "@/lib/site.ts";
import { FaqIndex } from "@/components/sales/FaqIndex.tsx";
import { HowPicture, KeyPicture } from "@/components/sales/Drawings.tsx";
import { Motion } from "@/components/sales/Motion.tsx";
import { Portrait } from "@/components/sales/Portrait.tsx";
import { Showcase } from "@/components/sales/Showcase.tsx";
import { SignupForm } from "@/components/sales/SignupForm.tsx";
import { PlaceScene } from "@/components/Scenes.tsx";
import "@fontsource-variable/bricolage-grotesque";
import "./sales.css";

// Rebuilt at most every 15 minutes so the sample calendars stay current.
export const revalidate = 900;

export async function generateMetadata({ params }: PageProps<"/[lang]">): Promise<Metadata> {
  const { lang } = await params;
  if (!isLang(lang)) return {};
  const c = SALES[lang];
  return {
    title: `${SITE.brand}: ${c.metaTitle}`,
    description: c.metaDescription,
    alternates: { languages: Object.fromEntries(LANGS.map((l) => [l, `/${l}`])) },
  };
}

export default async function SalesPage({ params }: PageProps<"/[lang]">) {
  const { lang } = await params;
  if (!isLang(lang)) notFound();
  const c = SALES[lang];
  const hotels = await getHotels();
  const demos = hotels.filter((h) => h.demo && !h.unlisted);
  const featured = demos[0] ?? hotels[0];
  const availability = featured ? await getAvailability(featured, 28) : null;
  const ownerWhatsapp = `https://wa.me/${SITE.whatsapp}`;

  return (
    <div className="sales">
      <Motion />

      <section className="s-pin" aria-labelledby="title" style={{ ["--panels" as string]: demos.length || 1 }}>
        <div className="s-pin-layer">
          <header className="s-bar">
            <a className="s-wordmark" href={`/${lang}`}>
              {SITE.brand}
            </a>
            <nav aria-label={c.menu} className="s-bar-nav">
              {LANGS.filter((l) => l !== lang).map((l) => (
                <a key={l} href={`/${l}`} hrefLang={l} lang={l}>
                  {LANG_NAMES[l]}
                </a>
              ))}
              <a href="#menu">{c.menu}</a>
            </nav>
          </header>
          <h1 id="title" className="s-title">
            {c.title}
          </h1>
          <p className="s-lede">{c.lede}</p>
          <a className="s-button s-pin-action" href="#start">
            {c.start}
          </a>
        </div>
        <div className="s-panels">
          {demos.map((h, i) => (
            <div key={h.slug} className="s-panel" style={{ background: h.theme.ground, color: h.theme.ink }}>
              <Portrait
                href={`/${lang}/h/${h.slug}`}
                src={`/${lang}/h/${h.slug}`}
                label={fill(c.seeSite, { hotel: h.name })}
                eager={i === 0}
              />
              <p className="s-caption">
                {fill(c.caption, { hotel: h.name, town: t(h.town, lang), rooms: h.rooms.length, site: h.bookingSite ?? "" })}
              </p>
            </div>
          ))}
        </div>
      </section>

      {featured && availability && (
        <Showcase
          lang={lang}
          copy={c}
          hotel={{
            name: featured.name,
            slug: featured.slug,
            whatsapp: featured.whatsapp ?? "",
            rooms: featured.rooms.map((r) => ({ id: r.id, number: r.number, name: t(r.name, lang), guests: r.guests })),
          }}
          availability={availability}
          dict={hotelDict(lang)}
        />
      )}

      <section className="s-how" aria-labelledby="how-title">
        <h2 id="how-title" className="visually-hidden">
          {c.howTitle}
        </h2>
        <ol>
          {c.steps.map((step, i) => (
            <li key={step.verb} className={`s-how-panel s-how-${i + 1}`}>
              <HowPicture step={i} />
              <div className="s-how-verb-track">
                <p className="s-how-verb" aria-hidden="true">
                  {step.verb}
                </p>
              </div>
              <p className="s-how-text">
                <span className="visually-hidden">{step.verb}. </span>
                {step.text}
              </p>
            </li>
          ))}
        </ol>
      </section>

      <section className="s-list" aria-labelledby="list-title">
        <h2 id="list-title" className="s-list-title" data-reveal>
          {c.listTitle}
        </h2>
        <table>
          <thead className="visually-hidden">
            <tr>
              {c.listHead.map((h) => (
                <th key={h} scope="col">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {c.list.map(([what, detail, who]) => (
              <tr key={what} data-reveal>
                <th scope="row">{what}</th>
                <td>{detail}</td>
                <td>{who}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <FaqIndex title={c.faqTitle} items={c.faq} />

      <section id="start" className="s-cta" aria-labelledby="cta-title">
        <div className="s-cta-picture">
          {featured && (
            <div
              className="s-cta-scene"
              style={{
                ["--scene-sky" as string]: featured.theme.surface,
                ["--scene-a" as string]: featured.theme.accent,
                ["--scene-ink" as string]: featured.theme.ink,
                ["--scene-ground" as string]: featured.theme.ground,
              }}
            >
              <PlaceScene name={featured.scene ?? "sea"} title={`${featured.name}, ${t(featured.town, lang)}`} />
            </div>
          )}
        </div>
        <div className="s-cta-text">
          <h2 id="cta-title" data-reveal>
            {c.ctaTitle}
          </h2>
          <p data-reveal>{c.ctaText}</p>
          <SignupForm copy={c.form} whatsapp={SITE.whatsapp} />
        </div>
      </section>

      <footer id="menu" className="s-footer">
        <div className="s-footer-picture">
          <KeyPicture label={SITE.brand} />
        </div>
        <div className="s-footer-menu">
          <p className="s-footer-wordmark">{SITE.brand}</p>
          <nav aria-label={c.menu}>
            <ul className="s-footer-links">
              <li>
                <a href="#how-title">{c.howTitle}</a>
              </li>
              <li>
                <a href="#list-title">{c.listTitle}</a>
              </li>
              <li>
                <a href="#faq-title">{c.faqTitle}</a>
              </li>
              <li>
                <a href="#start">{c.start}</a>
              </li>
            </ul>
          </nav>
          <div className="s-footer-blocks">
            <div>
              <h2>{c.footerContact}</h2>
              <ul>
                <li>
                  <a href={ownerWhatsapp} target="_blank" rel="noopener">
                    WhatsApp
                  </a>
                </li>
                <li>
                  <a href={`mailto:${SITE.email}`}>{SITE.email}</a>
                </li>
              </ul>
            </div>
            <div>
              <h2>{c.footerDemos}</h2>
              <ul>
                {demos.map((h) => (
                  <li key={h.slug}>
                    <a href={`/${lang}/h/${h.slug}`}>{h.name}</a>
                  </li>
                ))}
              </ul>
            </div>
          </div>
          <p className="s-legal">{fill(c.footerLegal, { brand: SITE.brand })}</p>
        </div>
      </footer>
    </div>
  );
}
