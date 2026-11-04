// Your business details: change these before going live.
export const SITE = {
  /** The name of your service. */
  brand: "Chave",
  /** Your WhatsApp number for hotel owners, digits only with country code. */
  whatsapp: "5511999990000",
  email: "ola@example.com",
  /** The live address once it's online, e.g. "https://chave.vercel.app". */
  url:
    process.env.NEXT_PUBLIC_SITE_URL ||
    (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : "http://localhost:3000"),
};
