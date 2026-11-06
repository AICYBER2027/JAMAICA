"use client";
import { useState } from "react";
import type { Product } from "@/lib/catalog";
import { MediaStage } from "./MediaStage";
import { BuyBox } from "./BuyBox";
import { Price } from "@/components/Price";
import { effectivePrice, discountPercent } from "@/lib/money";

export function ProductView({ p, initialColor }: { p: Product; initialColor?: string }) {
  const colors = p.colors.length ? p.colors : [{ name: "Default", hex: "#000000" }];
  const [color, setColor] = useState(colors.find((c) => c.name === initialColor)?.name ?? colors[0].name);
  const colorImages = Object.fromEntries(p.images.filter((i) => i.color).map((i) => [i.color!, i.url]).reverse());
  const off = discountPercent(p);
  const details = p.details.split("\n").map((l) => l.trim()).filter(Boolean);

  return (
    <div className="grid gap-8 lg:grid-cols-12 lg:gap-12">
      <div className="lg:col-span-7">
        <MediaStage name={p.name} images={p.images} media3d={p.media3d} color={color} />
      </div>
      <div className="lg:col-span-5 lg:pt-2">
        <p className="text-small text-muted">{p.category_name}</p>
        <h1 className="mt-2 text-[clamp(2.1rem,3.6vw,3.4rem)]">{p.name}</h1>
        <div className="mt-4 flex items-baseline gap-3 text-lead">
          <Price p={p} />
          {off && <span className="bg-gilt px-2 py-0.5 text-small font-semibold text-black">{off}% off</span>}
        </div>
        <p className="mt-6 max-w-[52ch] text-[1.0625rem]">{p.description}</p>
        <div className="mt-8">
          <BuyBox
            product={{ id: p.id, slug: p.slug, name: p.name, image: p.image, unitCents: effectivePrice(p), tryon: !!p.tryon_category, outfit: !!p.outfit_slot }}
            variants={p.variants}
            colors={colors}
            color={color}
            onColor={setColor}
            colorImages={colorImages}
          />
        </div>
        <div className="mt-10 flex flex-col gap-1">
          <details className="group bg-stone px-5 py-4" open>
            <summary className="flex cursor-pointer list-none items-center justify-between font-semibold">
              Materials and care
              <span aria-hidden="true" className="transition-transform group-open:rotate-45">+</span>
            </summary>
            <ul className="mt-3 flex flex-col gap-1">
              {details.length ? details.map((d) => <li key={d}>{d}</li>) : <li className="text-muted">Details coming soon.</li>}
            </ul>
          </details>
          <details className="group bg-stone px-5 py-4">
            <summary className="flex cursor-pointer list-none items-center justify-between font-semibold">
              Delivery and returns
              <span aria-hidden="true" className="transition-transform group-open:rotate-45">+</span>
            </summary>
            <p className="mt-3">Ships from São Paulo within 2 working days. Standard and express delivery to every state, priced by your CEP at checkout. Return unworn items within 7 days of delivery, as the Consumer Defence Code allows.</p>
          </details>
        </div>
      </div>
    </div>
  );
}
