import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getHotels } from "@/lib/hotels.ts";
import { fill, isLang, LANGS, t } from "@/lib/i18n.ts";
import { SALES } from "@/lib/sales-copy.ts";
import { SITE } from "@/lib/site.ts";
import { LangSwitch } from "@/components/LangSwitch.tsx";
import { SignupForm } from "@/components/sales/SignupForm.tsx";
import "@fontsource-variable/figtree";
import "@fontsource/instrument-serif";
import "./sales.css";

export async function generateMetadata({ params }: PageProps<"/[lang]">): Promise<Metadata> {
  const { lang } = await params;
  if (!isLang(lang)) return {};
  const c = SALES[lang];
  return {
    title: `${SITE.brand}: ${c.metaTitle}`,
    description: c.metaDescription,
    metadataBase: new URL(SITE.url),
    alternates: { languages: Object.fromEntries(LANGS.map((l) => [l, `/${l}`])) },
    openGraph: { type: "website", title: `${SITE.brand}: ${c.title}`, description: c.metaDescription, images: [`/sales/${lang}/postcard.jpg`] },
  };
}

function WhatsAppMark() {
  return (
    <svg className="sp-wa" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path
        fill="currentColor"
        d="M12 2.2a9.7 9.7 0 0 0-8.3 14.8L2.4 21.8l4.9-1.3A9.7 9.7 0 1 0 12 2.2Zm0 17.7a8 8 0 0 1-4.1-1.1l-.3-.2-2.9.8.8-2.8-.2-.3A8 8 0 1 1 12 19.9Zm4.4-6c-.2-.1-1.4-.7-1.7-.8-.2-.1-.4-.1-.5.1l-.8 1c-.1.2-.3.2-.5.1a6.6 6.6 0 0 1-3.3-2.9c-.2-.4.2-.4.7-1.3.1-.2 0-.3 0-.4l-.8-1.8c-.2-.5-.4-.4-.5-.4h-.5a.9.9 0 0 0-.7.3 2.8 2.8 0 0 0-.9 2.1 4.9 4.9 0 0 0 1 2.6 11.2 11.2 0 0 0 4.3 3.8c1.6.7 2.2.7 3 .6a2.6 2.6 0 0 0 1.7-1.2 2.1 2.1 0 0 0 .1-1.2c0-.1-.2-.2-.5-.3Z"
      />
    </svg>
  );
}

export default async function SalesPage({ params }: PageProps<"/[lang]">) {
  const { lang } = await params;
  if (!isLang(lang)) notFound();
  const c = SALES[lang];
  const examples = (await getHotels()).filter((h) => h.demo && !h.unlisted);
  const lead = examples[0];
  const ownerWhatsapp = `https://wa.me/${SITE.whatsapp}`;

  return (
    <div className="sales">
      <header className="sp-bar">
        <a className="sp-wordmark" href={`/${lang}`}>
          {SITE.brand}
        </a>
        <nav className="sp-nav" aria-label={c.nav.how}>
          <a href="#how">{c.nav.how}</a>
          <a href="#examples">{c.nav.examples}</a>
          <a href="#questions">{c.nav.questions}</a>
        </nav>
        <LangSwitch current={lang} label={c.language} items={LANGS.map((l) => ({ lang: l, href: `/${l}` }))} />
      </header>

      <section className="sp-hero" aria-labelledby="title">
        <div className="sp-hero-text">
          <h1 id="title">{c.title}</h1>
          <p className="sp-lede">{c.lede}</p>
          <div className="sp-actions">
            <a className="sp-button is-send" href="#start">
              {c.start}
            </a>
            {lead && (
              <a className="sp-button is-ink" href={`/${lang}/h/${lead.slug}`}>
                {c.seeExample}
              </a>
            )}
          </div>
        </div>
        {lead && (
          <figure className="sp-hero-phone">
            <a className="sp-phone" href={`/${lang}/h/${lead.slug}`}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={`/sales/${lang}/phone-${lead.slug}.jpg`} alt={c.heroCaption} width={780} height={1560} fetchPriority="high" />
            </a>
            <figcaption>{c.heroCaption}</figcaption>
          </figure>
        )}
      </section>

      <section className="sp-see" aria-labelledby="see-title">
        <h2 id="see-title">{c.seeTitle}</h2>
        <ol>
          {c.see.map((item) => (
            <li key={item.img}>
              <div className="sp-see-text">
                <h3>{item.title}</h3>
                <p>{item.text}</p>
              </div>
              <figure className="sp-shot">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={`/sales/${lang}/${item.img}.jpg`} alt={item.alt} width={1208} height={448} loading="lazy" />
              </figure>
            </li>
          ))}
        </ol>
      </section>

      <section id="how" className="sp-how" aria-labelledby="how-title">
        <div className="sp-card">
          <div className="sp-edge" aria-hidden="true" />
          <h2 id="how-title">{c.howTitle}</h2>
          <ol className="sp-steps">
            {c.steps.map((s, i) => (
              <li key={s.title}>
                <span className="sp-step-n" aria-hidden="true">
                  {i + 1}
                </span>
                <h3>{s.title}</h3>
                <p>{s.text}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section id="examples" className="sp-examples" aria-labelledby="examples-title">
        <div className="sp-head">
          <h2 id="examples-title">{c.examplesTitle}</h2>
          <p>{c.examplesText}</p>
        </div>
        <ul>
          {examples.map((h) => (
            <li key={h.slug}>
              <a href={`/${lang}/h/${h.slug}`}>
                <span className="sp-phone">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={`/sales/${lang}/phone-${h.slug}.jpg`} alt="" width={780} height={1560} loading="lazy" />
                </span>
                <span className="sp-example-name">{h.name}</span>
                <span className="sp-example-town">
                  {t(h.town, lang)} ({c.sample})
                </span>
              </a>
            </li>
          ))}
        </ul>
      </section>

      <section className="sp-included" aria-labelledby="included-title">
        <h2 id="included-title">{c.includedTitle}</h2>
        <ul>
          {c.included.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </section>

      <section id="questions" className="sp-faq" aria-labelledby="faq-title">
        <h2 id="faq-title">{c.faqTitle}</h2>
        <div className="sp-faq-list">
          {c.faq.map((f, i) => (
            <details key={f.q} open={i === 0}>
              <summary>{f.q}</summary>
              <p>{f.a}</p>
            </details>
          ))}
        </div>
      </section>

      <section id="start" className="sp-cta" aria-labelledby="cta-title">
        <div className="sp-card">
          <div className="sp-edge" aria-hidden="true" />
          <h2 id="cta-title">{c.ctaTitle}</h2>
          <p>{c.ctaText}</p>
          <SignupForm copy={c.form} whatsapp={SITE.whatsapp} />
        </div>
      </section>

      <footer className="sp-footer">
        <p className="sp-footer-name">{SITE.brand}</p>
        <ul>
          <li>
            <a href={ownerWhatsapp} target="_blank" rel="noopener">
              <WhatsAppMark /> {c.talk}
            </a>
          </li>
          <li>
            <a href={`mailto:${SITE.email}`}>{SITE.email}</a>
          </li>
        </ul>
        <p className="sp-legal">{fill(c.footerLegal, { brand: SITE.brand })}</p>
      </footer>
    </div>
  );
}
