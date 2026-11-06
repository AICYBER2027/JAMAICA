import type { Metadata, Viewport } from "next";
import "./globals.css";

const site = process.env.SITE_URL || "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(site),
  title: { default: "JAMAICA: fashion you can turn, combine and try on", template: "%s · JAMAICA" },
  description:
    "Clothing, watches, sunglasses and shoes. Turn products in 3D, build complete outfits and pay with PIX or card. Shipping across Brazil.",
  openGraph: { siteName: "JAMAICA", type: "website", locale: "en_BR" },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  themeColor: "#000000",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
