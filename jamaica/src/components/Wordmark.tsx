import styles from "./wordmark.module.css";

/** The JAMAICA wordmark. On first paint it opens from condensed to fully expanded width (Archivo's width axis). */
export function Wordmark({ animate = false, className = "" }: { animate?: boolean; className?: string }) {
  return (
    <span className={`${styles.mark} ${animate ? styles.animate : ""} ${className}`} aria-label="JAMAICA">
      <span aria-hidden="true">JAMAICA</span>
    </span>
  );
}
