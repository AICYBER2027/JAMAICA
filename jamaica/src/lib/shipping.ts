import "server-only";
import { sql } from "./db";
import { regionForUF, ufForCep } from "./cep";

export type ShippingOption = { id: string; label: string; cents: number; days: number; carrier: string };
export type Address = { street: string; district: string; city: string; state: string };

/** Address for a CEP from ViaCEP (free public service). Null when the CEP doesn't exist or the service is down. */
export async function lookupCep(cep: string): Promise<Address | null> {
  try {
    const res = await fetch(`https://viacep.com.br/ws/${cep}/json/`, { signal: AbortSignal.timeout(4000), next: { revalidate: 86400 } });
    if (!res.ok) return null;
    const j = (await res.json()) as { erro?: boolean | string; logradouro?: string; bairro?: string; localidade?: string; uf?: string };
    if (j.erro || !j.uf) return null;
    return { street: j.logradouro ?? "", district: j.bairro ?? "", city: j.localidade ?? "", state: j.uf };
  } catch {
    return null;
  }
}

type Parcel = { weightGrams: number; quantity: number; valueCents: number };

/** Live carrier prices from Melhor Envio (Correios, Jadlog…). Only used when a token is configured. */
async function melhorEnvio(cep: string, parcels: Parcel[]): Promise<ShippingOption[]> {
  const token = process.env.MELHOR_ENVIO_TOKEN;
  const from = process.env.MELHOR_ENVIO_FROM_CEP?.replace(/\D/g, "");
  if (!token || !from) return [];
  const base = process.env.MELHOR_ENVIO_ENV === "sandbox" ? "https://sandbox.melhorenvio.com.br" : "https://www.melhorenvio.com.br";
  try {
    const res = await fetch(`${base}/api/v2/me/shipment/calculate`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, Accept: "application/json", "Content-Type": "application/json", "User-Agent": "JAMAICA store" },
      body: JSON.stringify({
        from: { postal_code: from },
        to: { postal_code: cep },
        // Package size per item is a store-wide default; refine per product if needed.
        products: parcels.map((p, i) => ({ id: String(i), width: 25, height: 8, length: 32, weight: Math.max(0.1, p.weightGrams / 1000), insurance_value: p.valueCents / 100, quantity: p.quantity })),
      }),
      signal: AbortSignal.timeout(6000),
      cache: "no-store",
    });
    if (!res.ok) return [];
    const list = (await res.json()) as { id: number; name: string; price?: string; custom_price?: string; delivery_time?: number; custom_delivery_time?: number; error?: string; company?: { name: string } }[];
    return list
      .filter((o) => !o.error && (o.custom_price ?? o.price))
      .map((o) => ({
        id: `me:${o.id}`,
        label: `${o.company?.name ?? ""} ${o.name}`.trim(),
        cents: Math.round(Number(o.custom_price ?? o.price) * 100),
        days: o.custom_delivery_time ?? o.delivery_time ?? 0,
        carrier: o.company?.name ?? "Melhor Envio",
      }))
      .sort((a, b) => a.cents - b.cents);
  } catch {
    return [];
  }
}

/**
 * Shipping options for a CEP. Live carrier quotes first when Melhor Envio is connected,
 * then the store's own rates for the customer's region. `freeStandard` makes the store's standard option free.
 */
export async function quoteShipping(cep: string, uf: string | null, parcels: Parcel[], subtotalCents: number, freeStandard: boolean): Promise<{ options: ShippingOption[]; region: string | null }> {
  const state = uf ?? ufForCep(cep);
  const region = state ? regionForUF(state) : null;
  if (!region) return { options: [], region: null };
  const [rate] = await sql<{ label: string; standard_cents: number; standard_days: number; express_cents: number; express_days: number; free_over_cents: number | null }[]>`
    select * from shipping_rates where region = ${region}`;
  const options: ShippingOption[] = [];
  if (rate) {
    const free = freeStandard || (rate.free_over_cents != null && subtotalCents >= rate.free_over_cents);
    options.push(
      { id: "store:standard", label: "Standard delivery", cents: free ? 0 : rate.standard_cents, days: rate.standard_days, carrier: "JAMAICA" },
      { id: "store:express", label: "Express delivery", cents: rate.express_cents, days: rate.express_days, carrier: "JAMAICA" },
    );
  }
  const live = await melhorEnvio(cep, parcels);
  return { options: [...live, ...options], region };
}
