"use client";

import { useEffect } from "react";

// Marks the page as scripted, then reveals each [data-reveal] element once as it scrolls into view.
// Without JavaScript nothing is hidden.
export function Motion() {
  useEffect(() => {
    const root = document.documentElement;
    root.classList.add("js");
    const els = [...document.querySelectorAll<HTMLElement>("[data-reveal]")];
    if (!("IntersectionObserver" in window)) {
      els.forEach((el) => el.classList.add("is-in"));
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (!e.isIntersecting) continue;
          e.target.classList.add("is-in");
          io.unobserve(e.target);
        }
      },
      { rootMargin: "0px 0px -10% 0px" },
    );
    // Stagger siblings that enter together.
    els.forEach((el, i) => {
      el.style.setProperty("--i", String(i % 6));
      io.observe(el);
    });
    return () => io.disconnect();
  }, []);
  return null;
}
