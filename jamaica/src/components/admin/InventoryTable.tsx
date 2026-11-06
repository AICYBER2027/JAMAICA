"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { bulkStock } from "@/app/actions/admin";

type Row = { id: string; product_id: string; name: string; size: string; color: string; sku: string; stock: number; status: string };

export function InventoryTable({ rows }: { rows: Row[] }) {
  const [edits, setEdits] = useState<Record<string, number>>({});
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const router = useRouter();
  const changed = Object.entries(edits).filter(([id, v]) => rows.find((r) => r.id === id)?.stock !== v);

  const save = () =>
    start(async () => {
      try {
        const r = await bulkStock(changed.map(([id, stock]) => ({ id, stock })));
        setMsg(`Saved ${r.saved} ${r.saved === 1 ? "change" : "changes"}.`);
        setEdits({});
        router.refresh();
      } catch {
        setMsg("Couldn’t save. Stock must be whole numbers of 0 or more.");
      }
    });

  return (
    <>
      <div className="sticky top-14 z-10 flex items-center gap-4 bg-paper py-3 lg:top-0">
        <button type="button" className="btn" disabled={!changed.length || pending} onClick={save}>
          {pending ? "Saving…" : changed.length ? `Save ${changed.length} ${changed.length === 1 ? "change" : "changes"}` : "No changes"}
        </button>
        <p aria-live="polite" className="text-small font-semibold text-emerald">{msg}</p>
      </div>
      <div className="overflow-x-auto">
        <table className="data-table min-w-[640px]">
          <thead><tr><th>Product</th><th>Colour</th><th>Size</th><th>SKU</th><th className="num">Stock</th></tr></thead>
          <tbody>
            {rows.map((r) => {
              const v = edits[r.id] ?? r.stock;
              return (
                <tr key={r.id} className={edits[r.id] != null && edits[r.id] !== r.stock ? "bg-[#f1f8f4]" : ""}>
                  <td><Link href={`/admin/products/${r.product_id}#stock`} className="hover:text-emerald">{r.name}</Link>{r.status === "draft" && <span className="ml-2 text-small text-muted">draft</span>}</td>
                  <td>{r.color}</td>
                  <td>{r.size}</td>
                  <td className="text-small text-muted">{r.sku}</td>
                  <td className="num">
                    <input type="number" min={0} value={v} aria-label={`Stock for ${r.name}, ${r.color}, ${r.size}`}
                      onChange={(e) => setEdits({ ...edits, [r.id]: Math.max(0, Math.floor(Number(e.target.value) || 0)) })}
                      className={`field tabular min-h-10 w-24 py-1.5 text-right ${v === 0 ? "text-danger" : ""}`} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}
