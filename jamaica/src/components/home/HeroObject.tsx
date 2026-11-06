"use client";
import Link from "next/link";
import { useState } from "react";
import { motion } from "motion/react";
import { ModelViewer } from "@/components/three/ModelViewer";
import { formatBRL } from "@/lib/money";

type Colour = { name: string; hex: string; variant: string };

export function HeroObject({ slug, name, priceCents, modelUrl, poster, colours }: { slug: string; name: string; priceCents: number; modelUrl: string; poster: string; colours: Colour[] }) {
  const [colour, setColour] = useState(colours[0]);
  const rise = (delay: number) => ({
    initial: { opacity: 0, y: 24 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.9, delay, ease: [0.16, 1, 0.3, 1] as const },
  });

  return (
    <section aria-labelledby="hero-title" className="relative isolate flex flex-col overflow-hidden bg-jade text-white md:block md:h-[calc(100svh-var(--header-h))] md:min-h-[600px]">
      {/* Headline split around the object; it lies above in the stacking order but lets drags through. */}
      <h1 id="hero-title" className="pointer-events-none relative z-10 pt-6 text-center md:absolute md:inset-x-0 md:top-[6%] md:pt-0" style={{ fontSize: "clamp(2.6rem, 8.6vw, 9.5rem)", lineHeight: 0.9 }}>
        <motion.span className="block" {...rise(0.25)}>Turn it over.</motion.span>
        <motion.span className="mt-3 block md:mt-[2.3em]" {...rise(0.4)}>Then wear it.</motion.span>
      </h1>

      <motion.p {...rise(0.6)} className="frame relative z-10 mt-6 max-w-[34ch] text-[1.0625rem] leading-snug md:absolute md:left-0 md:top-[44%] md:mt-0 md:max-w-[24ch]">
        JAMAICA sells clothing, watches, sunglasses and shoes you can turn in 3D, combine into outfits and pay for with PIX.
      </motion.p>

      {/* The object: a real 3D model, large enough that the bottom edge crops it. */}
      <div className="relative z-0 -mt-4 h-[54svh] md:absolute md:inset-x-0 md:bottom-[-16%] md:top-[4%] md:mt-0 md:h-auto">
        <ModelViewer url={modelUrl} poster={null} variant={colour.variant} hero tilt={0.14} label={`${name} in ${colour.name}, a 3D model you can drag to turn`} />
      </div>

      <motion.div {...rise(0.7)} className="frame relative z-10 flex flex-col gap-3 pb-8 pt-2 md:absolute md:right-0 md:top-[40%] md:w-[340px] md:items-end md:pb-0 md:pt-0 md:text-right">
        <div>
          <p className="font-semibold">{name}</p>
          <p className="tabular text-mist">{formatBRL(priceCents)} · {colours.length} colourways</p>
        </div>
        <div className="flex gap-2 md:justify-end" role="radiogroup" aria-label="Colourway">
          {colours.map((c) => (
            <button
              key={c.name}
              type="button"
              role="radio"
              aria-checked={c.name === colour.name}
              aria-label={c.name}
              title={c.name}
              onClick={() => setColour(c)}
              className="relative grid h-11 w-11 place-items-center"
            >
              <span className="block h-7 w-7 transition-transform duration-200" style={{ background: c.hex, transform: c.name === colour.name ? "scale(1)" : "scale(0.78)" }} />
              {c.name === colour.name && <motion.span layoutId="hero-swatch" className="absolute inset-0 ring-2 ring-white" transition={{ type: "spring", stiffness: 500, damping: 35 }} />}
            </button>
          ))}
        </div>
        <p className="text-small text-mist" aria-live="polite">{colour.name}</p>
        <Link href={`/p/${slug}?color=${encodeURIComponent(colour.name)}`} className="btn btn-light w-full md:w-auto">
          Shop the sneaker
        </Link>
      </motion.div>
    </section>
  );
}
