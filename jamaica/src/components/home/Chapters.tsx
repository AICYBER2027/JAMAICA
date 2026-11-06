"use client";
import Image from "next/image";
import Link from "next/link";
import { motion } from "motion/react";

export type Chapter = { href: string; title: string; sentence: string; linkText: string; image: string; alt: string; field: string };

/** One department per screen. The field colour is the darkest large tone of its own photograph. */
export function Chapters({ chapters }: { chapters: Chapter[] }) {
  return (
    <section aria-labelledby="chapter-0">
      {chapters.map((c, i) => (
        <motion.div
          key={c.href}
          className="relative grid min-h-[100svh] place-items-center text-white"
          style={{ background: c.field }}
          initial={{ clipPath: "inset(20px 20px 20px 20px)" }}
          whileInView={{ clipPath: "inset(0px 0px 0px 0px)" }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        >
          <h2 id={`chapter-${i}`} className="absolute left-[var(--gutter)] top-8 text-[clamp(1.75rem,2.6vw,2.5rem)]">
            {c.title}
          </h2>
          <motion.div
            className="relative aspect-[3/4] w-[80vw] max-w-[506px] md:w-auto md:h-[75svh]"
            initial={{ scale: 0.92, opacity: 0.4 }}
            whileInView={{ scale: 1, opacity: 1 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
          >
            <Image src={c.image} alt={c.alt} fill sizes="(min-width: 768px) 506px, 80vw" className="object-cover" />
          </motion.div>
          <p className="absolute bottom-8 left-[var(--gutter)] max-w-[32ch] pr-6 text-[1.0625rem] md:max-w-[34ch]">{c.sentence}</p>
          <Link href={c.href} className="link absolute bottom-8 right-[var(--gutter)] hidden font-semibold md:block">
            {c.linkText}
          </Link>
          <Link href={c.href} className="btn btn-light absolute right-[var(--gutter)] top-7 h-11 min-h-0 px-4 text-small md:hidden">
            Shop
          </Link>
        </motion.div>
      ))}
    </section>
  );
}
