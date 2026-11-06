import Image from "next/image";
import { requireStaff } from "@/lib/auth";
import { sql } from "@/lib/db";
import { getStoreSettings, integrations } from "@/lib/settings";
import { ActionForm } from "@/components/admin/ActionForm";
import { TryonModelForm, TryonModelToggle } from "@/components/admin/TryonModels";
import { saveSettings, saveShippingRates } from "@/app/actions/admin";

export const metadata = { title: "Settings" };
const reais = (c: number | null) => (c == null ? "" : (c / 100).toFixed(2).replace(".", ","));

function Status({ on, label, detail, cost }: { on: boolean; label: string; detail: string; cost: string }) {
  return (
    <li className="grid gap-1 py-4 sm:grid-cols-[220px_1fr]">
      <p className="font-semibold">{label}<br /><span className={`status mt-1 ${on ? "status-active" : "status-draft"}`}>{on ? "Connected" : "Not connected"}</span></p>
      <div>
        <p>{detail}</p>
        <p className="mt-1 text-small text-muted">{cost}</p>
      </div>
    </li>
  );
}

export default async function Settings() {
  await requireStaff("settings");
  const [s, i, rates, models] = await Promise.all([
    getStoreSettings(),
    integrations(),
    sql<{ region: string; label: string; standard_cents: number; standard_days: number; express_cents: number; express_days: number; free_over_cents: number | null }[]>`select * from shipping_rates order by array_position(array['SE','S','CO','NE','N'], region)`,
    sql<{ id: string; name: string; gender: string; body_type: string; view: string; image_url: string; active: boolean }[]>`select * from tryon_models order by sort, name`,
  ]);

  return (
    <div className="admin-page max-w-[1100px]">
      <h1 className="admin-title">Settings</h1>

      <section id="payments" aria-labelledby="pay-title" className="mt-10 scroll-mt-6">
        <h2 id="pay-title" className="text-[1.5rem]">Store and PIX</h2>
        <p className="mt-1 max-w-[70ch] text-muted">With a PIX key, checkout offers PIX straight to your account: the customer gets a copy-and-paste code for the exact amount, and you confirm the payment on the order once it reaches your bank.</p>
        <ActionForm action={saveSettings} submit="Save settings" className="panel mt-5 grid gap-4 sm:grid-cols-2">
          <label><span className="label">Store name</span><input name="name" defaultValue={s.name} className="field bg-white" /></label>
          <label><span className="label">Support email (shown to customers)</span><input name="supportEmail" type="email" defaultValue={s.supportEmail} className="field bg-white" /></label>
          <label className="sm:col-span-2"><span className="label">PIX key</span><input name="pixKey" defaultValue={s.pixKey} placeholder="CNPJ, email, +55 phone or random key" className="field bg-white" aria-describedby="pix-hint" /><span id="pix-hint" className="hint block">Exactly as registered at your bank. Leave empty to turn PIX-to-your-account off.</span></label>
          <label><span className="label">Account holder name (max 25 letters)</span><input name="pixMerchantName" defaultValue={s.pixMerchantName} maxLength={25} className="field bg-white" /></label>
          <label><span className="label">City (max 15 letters)</span><input name="pixMerchantCity" defaultValue={s.pixMerchantCity} maxLength={15} className="field bg-white" /></label>
        </ActionForm>
      </section>

      <section id="shipping" aria-labelledby="ship-title" className="mt-14 scroll-mt-6">
        <h2 id="ship-title" className="text-[1.5rem]">Shipping rates</h2>
        <p className="mt-1 max-w-[70ch] text-muted">Used at checkout for each Brazilian region (worked out from the customer’s CEP){i.melhorEnvio ? ". Melhor Envio is connected, so live carrier quotes are shown first and these are the fallback" : ""}.</p>
        <ActionForm action={saveShippingRates} submit="Save rates" className="mt-5 grid gap-4">
          <div className="overflow-x-auto">
            <table className="data-table min-w-[760px]">
              <thead><tr><th>Region</th><th>Standard (R$)</th><th>Days</th><th>Express (R$)</th><th>Days</th><th>Free standard from (R$)</th></tr></thead>
              <tbody>
                {rates.map((r) => (
                  <tr key={r.region}>
                    <td className="font-semibold">{r.label}</td>
                    <td><input name={`${r.region}_standard`} defaultValue={reais(r.standard_cents)} className="field tabular min-h-10 w-28 py-1.5" aria-label={`${r.label} standard price`} /></td>
                    <td><input name={`${r.region}_standard_days`} type="number" min={1} defaultValue={r.standard_days} className="field tabular min-h-10 w-20 py-1.5" aria-label={`${r.label} standard days`} /></td>
                    <td><input name={`${r.region}_express`} defaultValue={reais(r.express_cents)} className="field tabular min-h-10 w-28 py-1.5" aria-label={`${r.label} express price`} /></td>
                    <td><input name={`${r.region}_express_days`} type="number" min={1} defaultValue={r.express_days} className="field tabular min-h-10 w-20 py-1.5" aria-label={`${r.label} express days`} /></td>
                    <td><input name={`${r.region}_free`} defaultValue={reais(r.free_over_cents)} placeholder="Never" className="field tabular min-h-10 w-28 py-1.5" aria-label={`${r.label} free shipping threshold`} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </ActionForm>
      </section>

      <section id="tryon" aria-labelledby="tryon-title" className="mt-14 scroll-mt-6">
        <h2 id="tryon-title" className="text-[1.5rem]">Try-on models</h2>
        <p className="mt-1 max-w-[70ch] text-muted">Studio photos customers can pick for virtual try-on. Use full-body photos, facing the camera, with a plain background, and only of models whose release covers this use.</p>
        <ul className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-4">
          {models.map((m) => (
            <li key={m.id} className={m.active ? "" : "opacity-50"}>
              <div className="media relative aspect-[3/4]"><Image src={m.image_url} alt={m.name} fill sizes="200px" className="object-cover" /></div>
              <p className="mt-2 font-semibold">{m.name}</p>
              <p className="text-small capitalize text-muted">{m.gender}, {m.body_type}, {m.view} view</p>
              <TryonModelToggle id={m.id} active={m.active} />
            </li>
          ))}
        </ul>
        <TryonModelForm />
      </section>

      <section id="integrations" aria-labelledby="int-title" className="mt-14 scroll-mt-6">
        <h2 id="int-title" className="text-[1.5rem]">Connected services</h2>
        <p className="mt-1 max-w-[70ch] text-muted">These are set as environment variables on the server (see the project README). Keys are never shown here.</p>
        <ul className="mt-3 divide-y divide-stone-2">
          <Status on={i.pixDirect} label="PIX to your account" detail="Copy-and-paste PIX code for each order. You confirm payments in Orders." cost="Free. Set the PIX key above." />
          <Status on={i.mercadoPago && i.mercadoPagoWebhook} label="Mercado Pago" detail={i.mercadoPago && !i.mercadoPagoWebhook ? "Access token set, but the webhook secret is missing, so payments won’t be confirmed automatically." : "Credit card, debit card and PIX with automatic confirmation."} cost="Per-transaction fee charged by Mercado Pago (varies by method and payout speed). Needs MERCADOPAGO_ACCESS_TOKEN and MERCADOPAGO_WEBHOOK_SECRET." />
          <Status on={i.melhorEnvio} label="Melhor Envio" detail="Live Correios and Jadlog prices at checkout." cost="Free account; you pay for each label. Needs MELHOR_ENVIO_TOKEN and MELHOR_ENVIO_FROM_CEP." />
          <Status on={i.tryOn} label="FASHN virtual try-on" detail="AI that dresses a model photo in the chosen garment." cost="Pay per generated image (FASHN API credits). Needs FASHN_API_KEY." />
          <Status on={i.storage === "supabase"} label="Supabase Storage" detail={i.storage === "supabase" ? "Uploads go to Supabase." : "Uploads are saved on this server’s disk. Fine on your computer, but Vercel deletes them."} cost="Included in Supabase’s free tier up to 1 GB. Needs SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY." />
        </ul>
      </section>
    </div>
  );
}
