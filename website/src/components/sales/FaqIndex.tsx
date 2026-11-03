"use client";

import { useState } from "react";

// Questions on the left; the chosen answer, large, on the right. On a phone each answer opens under its question.
export function FaqIndex({ title, items }: { title: string; items: { q: string; a: string }[] }) {
  const [open, setOpen] = useState(0);
  return (
    <section className="s-faq" aria-labelledby="faq-title">
      <div className="s-faq-questions">
        <h2 id="faq-title">{title}</h2>
        <ul>
          {items.map((item, i) => (
            <li key={item.q} className={i === open ? "is-open" : undefined}>
              <button
                type="button"
                aria-expanded={i === open}
                aria-controls={`faq-a-${i}`}
                onClick={() => setOpen(i)}
                onMouseEnter={() => setOpen(i)}
                onFocus={() => setOpen(i)}
              >
                {item.q}
              </button>
              <p id={`faq-a-${i}`} className="s-faq-inline" hidden={i !== open}>
                {item.a}
              </p>
            </li>
          ))}
        </ul>
      </div>
      <div className="s-faq-pane" aria-hidden="true">
        <p key={open} className="s-faq-answer">
          {items[open].a}
        </p>
      </div>
    </section>
  );
}
