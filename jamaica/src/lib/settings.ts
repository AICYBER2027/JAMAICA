import "server-only";
import { sql } from "./db";
import { storageMode } from "./storage";

export type StoreSettings = {
  name: string;
  pixKey: string;
  pixMerchantName: string;
  pixMerchantCity: string;
  supportEmail: string;
};

const DEFAULTS: StoreSettings = { name: "JAMAICA", pixKey: "", pixMerchantName: "JAMAICA", pixMerchantCity: "SAO PAULO", supportEmail: "" };

export async function getStoreSettings(): Promise<StoreSettings> {
  const [r] = await sql<{ value: Partial<StoreSettings> }[]>`select value from settings where key = 'store'`;
  return { ...DEFAULTS, ...(r?.value ?? {}) };
}

export async function saveStoreSettings(s: StoreSettings) {
  await sql`insert into settings (key, value, updated_at) values ('store', ${sql.json(s)}, now())
    on conflict (key) do update set value = excluded.value, updated_at = now()`;
}

/** What is actually connected right now. Used to show or hide features honestly. */
export async function integrations() {
  const s = await getStoreSettings();
  return {
    pixDirect: !!s.pixKey,
    mercadoPago: !!process.env.MERCADOPAGO_ACCESS_TOKEN,
    mercadoPagoWebhook: !!process.env.MERCADOPAGO_WEBHOOK_SECRET,
    melhorEnvio: !!process.env.MELHOR_ENVIO_TOKEN && !!process.env.MELHOR_ENVIO_FROM_CEP,
    tryOn: !!process.env.FASHN_API_KEY,
    storage: storageMode(),
    siteUrl: process.env.SITE_URL || "",
  };
}
