import { formatBRL } from "@/lib/money";

/** Price; on sale, the sale price comes first and the original is struck through. */
export function Price({ p, className = ""}: { p: { price_cents: number; sale_price_cents: number | null }; className?: string }) {
  const onSale = p.sale_price_cents != null && p.sale_price_cents < p.price_cents;
  return (
    <span className={`tabular inline-flex flex-wrap items-baseline gap-x-2 ${className}`}>
      {onSale ? (
        <>
          <span className="font-semibold">
            <span className="sr-only">Sale price </span>
            {formatBRL(p.sale_price_cents!)}
          </span>
          <s className="text-muted">
            <span className="sr-only">was </span>
            {formatBRL(p.price_cents)}
          </s>
        </>
      ) : (
        <span>{formatBRL(p.price_cents)}</span>
      )}
    </span>
  );
}
