import type { Metadata } from "next";
import { Prose } from "@/components/Prose";
import { integrations } from "@/lib/settings";

export const metadata: Metadata = { title: "Payments", description: "Paying with PIX, credit and debit cards at JAMAICA." };

export default async function Payments() {
  const i = await integrations();
  return (
    <Prose title="Paying for your order" intro="Your order is confirmed only when we receive payment. Until then your items are held for you.">
      {i.pixDirect && (
        <>
          <h2>PIX</h2>
          <p>After you place the order you get a PIX QR code and a copy-and-paste code with the exact amount and your order number. Pay it from any bank app. We confirm the payment when it reaches our account, usually within the hour during working hours, and your order page updates. Items are held for 24 hours.</p>
        </>
      )}
      {i.mercadoPago && (
        <>
          <h2>Credit card, debit card and PIX through Mercado Pago</h2>
          <p>You pay on Mercado Pago’s secure page; your card details go to Mercado Pago and never to us. Mercado Pago confirms the payment to us automatically and you come back to your order page. Instalments depend on your card and Mercado Pago’s conditions, shown before you pay.</p>
        </>
      )}
      {!i.pixDirect && !i.mercadoPago && <p>Online payment isn’t switched on yet. Please come back soon.</p>}
      <h2>Invoices</h2>
      <p>We ask for your CPF at checkout because Brazilian law requires it on the invoice (nota fiscal).</p>
    </Prose>
  );
}
