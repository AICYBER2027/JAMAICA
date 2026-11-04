import { notFound } from "next/navigation";
import type { Metadata, Viewport } from "next";
import { isLang, LANGS } from "@/lib/i18n.ts";
import { SiteAnalytics } from "@/components/SiteAnalytics.tsx";
import "./base.css";

export const viewport: Viewport = { width: "device-width", initialScale: 1 };
export const metadata: Metadata = { robots: { index: true, follow: true } };

export function generateStaticParams() {
  return LANGS.map((lang) => ({ lang }));
}

export default async function RootLayout({ children, params }: LayoutProps<"/[lang]">) {
  const { lang } = await params;
  if (!isLang(lang)) notFound();
  return (
    <html lang={lang}>
      <body>
        {children}
        <SiteAnalytics />
      </body>
    </html>
  );
}
