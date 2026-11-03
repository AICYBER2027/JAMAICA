"use client";

import { useState } from "react";
import { fill } from "@/lib/i18n.ts";
import type { SalesCopy } from "@/lib/sales-copy.ts";

// No server needed: the form writes the hotel owner's WhatsApp message and opens it.
export function SignupForm({ copy, whatsapp }: { copy: SalesCopy["form"]; whatsapp: string }) {
  const [v, setV] = useState({ hotel: "", town: "", rooms: "", sites: "" });
  const message = fill(copy.message, { hotel: v.hotel, town: v.town, rooms: v.rooms, sites: v.sites || "-" });
  const href = `https://wa.me/${whatsapp}?text=${encodeURIComponent(message)}`;
  const set = (k: keyof typeof v) => (e: React.ChangeEvent<HTMLInputElement>) => setV({ ...v, [k]: e.target.value });

  return (
    <form
      className="s-form"
      action={`https://wa.me/${whatsapp}`}
      method="get"
      target="_blank"
      onSubmit={(e) => {
        e.preventDefault();
        window.open(href, "_blank", "noopener");
      }}
    >
      <label>
        <span>{copy.hotel}</span>
        <input name="hotel" required autoComplete="organization" value={v.hotel} onChange={set("hotel")} />
      </label>
      <label>
        <span>{copy.town}</span>
        <input name="town" required autoComplete="address-level2" value={v.town} onChange={set("town")} />
      </label>
      <label>
        <span>{copy.rooms}</span>
        <input name="rooms" required inputMode="numeric" pattern="[0-9]{1,4}" value={v.rooms} onChange={set("rooms")} />
      </label>
      <label>
        <span>{copy.sites}</span>
        <input name="sites" placeholder={copy.sitesHint} value={v.sites} onChange={set("sites")} />
      </label>
      <input type="hidden" name="text" value={message} />
      <button type="submit" className="s-button s-button-paper">
        {copy.send}
      </button>
    </form>
  );
}
