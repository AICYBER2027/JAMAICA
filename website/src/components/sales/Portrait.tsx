"use client";

import { useEffect, useRef } from "react";

const PHONE_WIDTH = 390;

// A real hotel site, shown live at phone size inside a 2:3 frame.
export function Portrait({
  href,
  src,
  label,
  eager,
  ratio = 1.5,
  className = "s-portrait",
}: {
  href: string;
  src: string;
  label: string;
  eager?: boolean;
  /** height / width */
  ratio?: number;
  className?: string;
}) {
  const ref = useRef<HTMLAnchorElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => {
      el.style.setProperty("--scale", String(entry.contentRect.width / PHONE_WIDTH));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return (
    <a ref={ref} className={className} href={href} aria-label={label} data-ui>
      <iframe
        src={src}
        title={label}
        tabIndex={-1}
        aria-hidden="true"
        loading={eager ? "eager" : "lazy"}
        width={PHONE_WIDTH}
        height={Math.round(PHONE_WIDTH * ratio)}
      />
    </a>
  );
}
