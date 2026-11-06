"use client";
import { motion, useReducedMotion } from "motion/react";

/**
 * Entrance for the parts of a section: each child rises a little and fades in, one after another,
 * the first time the section scrolls into view. Content is visible without JavaScript and under reduced motion.
 */
export function Reveal({ children, className = "", as = "div", stagger = 0.07, y = 22 }: { children: React.ReactNode; className?: string; as?: "div" | "ul" | "ol"; stagger?: number; y?: number }) {
  const reduce = useReducedMotion();
  const Tag = motion[as];
  return (
    <Tag
      className={className}
      initial={reduce ? false : "hidden"}
      whileInView="shown"
      viewport={{ once: true, amount: 0.15 }}
      variants={{ hidden: {}, shown: { transition: { staggerChildren: stagger } } }}
    >
      {children}
    </Tag>
  );
}

export function RevealItem({ children, className = "", as = "div", y = 22 }: { children: React.ReactNode; className?: string; as?: "div" | "li" | "p" | "h2" | "h3"; y?: number }) {
  const Tag = motion[as];
  return (
    <Tag className={className} variants={{ hidden: { opacity: 0, y }, shown: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] } } }}>
      {children}
    </Tag>
  );
}
