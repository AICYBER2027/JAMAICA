import type { Metadata } from "next";
import { Prose } from "@/components/Prose";
import { sql } from "@/lib/db";
import { formatBRL } from "@/lib/money";

export const metadata: Metadata = { title: "Shipping and returns", description: "Delivery times and prices across Brazil, sizes and how to return an item." };

export default async function Shipping() {
  const rates = await sql<{ label: string; standard_cents: number; standard_days: number; express_cents: number; express_days: number; free_over_cents: number | null }[]>`
    select * from shipping_rates order by array_position(array['SE','S','CO','NE','N'], region)`;
  return (
    <Prose title="Shipping and returns" intro="We ship from São Paulo to every Brazilian state. Orders leave within two working days of payment.">
      <h2>Delivery prices</h2>
      <p>Checkout shows the exact price for your CEP. These are our standard rates:</p>
      <div className="overflow-x-auto"><table className="data-table min-w-[560px]">
        <thead><tr><th>Region</th><th className="num">Standard</th><th className="num">Express</th><th>Free standard from</th></tr></thead>
        <tbody>
          {rates.map((r) => (
            <tr key={r.label}><td>{r.label}</td><td className="num">{formatBRL(r.standard_cents)}, {r.standard_days} days</td><td className="num">{formatBRL(r.express_cents)}, {r.express_days} days</td><td>{r.free_over_cents ? formatBRL(r.free_over_cents) : "–"}</td></tr>
          ))}
        </tbody>
      </table></div>
      <p>Days are working days after dispatch. When your order ships, its page shows a Correios tracking code.</p>
      <h2 id="sizes">Sizes</h2>
      <p>Clothing uses international sizes (XS to XL); trousers and jeans use Brazilian waist sizes (36 to 46); shoes use Brazilian shoe sizes (34 to 44). Each product page lists what’s in stock in each size.</p>
      <h2>Returns</h2>
      <p>Under the Consumer Defence Code (CDC, article 49) you can return anything bought online within 7 days of delivery, for any reason, for a full refund including delivery. Items must be unworn, with tags. Write to us with your order number and we’ll send a prepaid return label.</p>
    </Prose>
  );
}
