import { LANG_NAMES, type Lang } from "@/lib/i18n.ts";

const SHORT: Record<Lang, string> = { pt: "PT", es: "ES", en: "EN" };

/** A visible language picker: every language the page offers, the current one marked. */
export function LangSwitch({ current, items, label }: { current: Lang; items: { lang: Lang; href: string }[]; label: string }) {
  if (items.length < 2) return null;
  return (
    <nav className="lang-switch" aria-label={label}>
      {items.map(({ lang, href }) => (
        <a key={lang} href={href} hrefLang={lang} lang={lang} aria-current={lang === current ? "true" : undefined} title={LANG_NAMES[lang]}>
          <span className="lang-full">{LANG_NAMES[lang]}</span>
          <span className="lang-short" aria-hidden="true">
            {SHORT[lang]}
          </span>
        </a>
      ))}
    </nav>
  );
}
