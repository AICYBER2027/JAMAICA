import { requireStaff } from "@/lib/auth";
import { sql } from "@/lib/db";
import { formatBRL } from "@/lib/money";
import { ActionForm } from "@/components/admin/ActionForm";
import { DiscountToggle } from "@/components/admin/DiscountToggle";
import { saveDiscount } from "@/app/actions/admin";

export const metadata = { title: "Discount codes" };

type Code = { code: string; kind: string; value: number; min_subtotal_cents: number; max_uses: number | null; uses: number; starts_at: Date | null; ends_at: Date | null; active: boolean };

function describe(c: Code) {
  const what = c.kind === "percent" ? `${c.value}% off` : c.kind === "fixed" ? `${formatBRL(c.value)} off` : "Free standard shipping";
  return c.min_subtotal_cents ? `${what} on orders from ${formatBRL(c.min_subtotal_cents)}` : what;
}
const d = (x: Date | null) => (x ? x.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : null);

export default async function Promotions() {
  await requireStaff("promotions");
  const codes = await sql<Code[]>`select * from discount_codes order by active desc, created_at desc`;
  return (
    <div className="admin-page max-w-[1100px]">
      <h1 className="admin-title">Discount codes</h1>
      <p className="mt-2 text-muted">Customers type the code at checkout. Product promotions (sale prices) are set on each product.</p>
      <section aria-labelledby="new-code" className="panel mt-8">
        <h2 id="new-code" className="text-[1.25rem]">Create or update a code</h2>
        <ActionForm action={saveDiscount} submit="Save code" resetOnSuccess className="mt-4 grid gap-4 sm:grid-cols-4">
          <label><span className="label">Code</span><input name="code" required placeholder="VERAO15" className="field bg-white uppercase" /></label>
          <label>
            <span className="label">What it does</span>
            <select name="kind" className="field bg-white">
              <option value="percent">Percentage off</option>
              <option value="fixed">Amount off (R$)</option>
              <option value="free_shipping">Free standard shipping</option>
            </select>
          </label>
          <label><span className="label">Value</span><input name="value" placeholder="15 or 50,00" className="field tabular bg-white" aria-describedby="v-hint" /><span id="v-hint" className="hint block">Percent or reais. Empty for free shipping.</span></label>
          <label><span className="label">Minimum order (R$)</span><input name="min" placeholder="Optional" className="field tabular bg-white" /></label>
          <label><span className="label">Starts</span><input name="starts_at" type="date" className="field bg-white" /></label>
          <label><span className="label">Ends (inclusive)</span><input name="ends_at" type="date" className="field bg-white" /></label>
          <label><span className="label">Maximum uses</span><input name="max_uses" type="number" min={1} placeholder="Unlimited" className="field tabular bg-white" /></label>
        </ActionForm>
      </section>
      <div className="mt-10 overflow-x-auto">
        <table className="data-table min-w-[720px]">
          <thead><tr><th>Code</th><th>Discount</th><th>Valid</th><th className="num">Used</th><th>Status</th></tr></thead>
          <tbody>
            {codes.map((c) => (
              <tr key={c.code} className={c.active ? "" : "text-muted"}>
                <td className="font-semibold">{c.code}</td>
                <td>{describe(c)}</td>
                <td className="text-small">{d(c.starts_at) || d(c.ends_at) ? `${d(c.starts_at) ?? "Now"} to ${d(c.ends_at) ?? "no end"}` : "Always"}</td>
                <td className="num">{c.uses}{c.max_uses ? ` of ${c.max_uses}` : ""}</td>
                <td><DiscountToggle code={c.code} active={c.active} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
