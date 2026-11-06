import type { Metadata } from "next";
import { Prose } from "@/components/Prose";

export const metadata: Metadata = { title: "Privacy and your photos" };

export default function Privacy() {
  return (
    <Prose title="Privacy and your photos" intro="What we keep about you, why, and how to have it deleted, in line with Brazil’s data protection law (LGPD).">
      <h2>What we keep</h2>
      <ul>
        <li>Your name, email, phone, CPF and address, to deliver your order and issue its invoice.</li>
        <li>Your order history, which tax law requires us to keep for five years.</li>
        <li>Your account password, stored only as a one-way scrypt hash.</li>
      </ul>
      <p>We don’t sell your data or use advertising trackers. Card details are handled by Mercado Pago and never reach us.</p>
      <h2 id="photos">Try-on photos</h2>
      <p>Virtual try-on works with our studio models. If you choose to use a photo of yourself, we only accept it after you tick the consent box, and:</p>
      <ul>
        <li>it is stored privately, never shown to other customers or used for anything else;</li>
        <li>it is sent to our try-on provider (FASHN) only to create the images you ask for;</li>
        <li>you can delete it at any moment from the try-on page, and it is deleted automatically after 24 hours anyway;</li>
        <li>generated try-on images are kept by the provider for up to 72 hours and then removed.</li>
      </ul>
      <h2>Your rights</h2>
      <p>You can see, correct or delete your data. Signed-in customers can change details and delete their account from the account page; otherwise write to us and we’ll do it within 15 days.</p>
    </Prose>
  );
}
