import type { Metadata } from "next";
import { CheckoutForm } from "@/components/checkout/CheckoutForm";
import { getUser } from "@/lib/auth";
import { integrations } from "@/lib/settings";

export const metadata: Metadata = { title: "Checkout", robots: { index: false } };

export default async function Checkout() {
  const [user, i] = await Promise.all([getUser(), integrations()]);
  return (
    <div className="frame pb-24 pt-10">
      <h1 className="text-[clamp(2.4rem,5vw,4.5rem)]">Checkout</h1>
      <div className="mt-10">
        <CheckoutForm prefill={{ name: user?.name ?? "", email: user?.email ?? "", phone: user?.phone ?? "" }} methods={{ pix: i.pixDirect, card: i.mercadoPago }} signedIn={!!user} />
      </div>
    </div>
  );
}
