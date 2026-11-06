"use client";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { cart, cartSubtotal, useCart } from "@/lib/cart-store";
import { formatBRL } from "@/lib/money";
import { useQuote } from "./useQuote";
import { UFS } from "@/lib/cep";

type Prefill = { name: string; email: string; phone: string };
type Methods = { pix: boolean; card: boolean };

const maskCpf = (v: string) => v.replace(/\D/g, "").slice(0, 11).replace(/(\d{3})(\d)/, "$1.$2").replace(/(\d{3})(\d)/, "$1.$2").replace(/(\d{3})(\d{1,2})$/, "$1-$2");
const maskCep = (v: string) => v.replace(/\D/g, "").slice(0, 8).replace(/(\d{5})(\d)/, "$1-$2");
const maskPhone = (v: string) => {
  const d = v.replace(/\D/g, "").slice(0, 11);
  return d.length <= 10 ? d.replace(/(\d{2})(\d)/, "($1) $2").replace(/(\d{4})(\d)/, "$1-$2") : d.replace(/(\d{2})(\d)/, "($1) $2").replace(/(\d{5})(\d)/, "$1-$2");
};

export function CheckoutForm({ prefill, methods, signedIn }: { prefill: Prefill; methods: Methods; signedIn: boolean }) {
  const { lines } = useCart();
  const [f, setF] = useState({ name: prefill.name, email: prefill.email, phone: maskPhone(prefill.phone), cpf: "", cep: "", street: "", number: "", complement: "", district: "", city: "", state: "" });
  const [code, setCode] = useState("");
  const [appliedCode, setAppliedCode] = useState("");
  const [shippingId, setShippingId] = useState<string | undefined>();
  const [payment, setPayment] = useState<"pix_direct" | "mercadopago" | null>(methods.pix ? "pix_direct" : methods.card ? "mercadopago" : null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<{ text: string; field?: string } | null>(null);
  const cepDigits = f.cep.replace(/\D/g, "");
  const { quote, loading, error: quoteError } = useQuote(lines, { code: appliedCode, cep: cepDigits.length === 8 ? cepDigits : undefined, shippingId });
  const filledFor = useRef("");

  // Fill the address from the CEP, without overwriting what the customer already typed.
  useEffect(() => {
    if (!quote?.address || filledFor.current === cepDigits) return;
    filledFor.current = cepDigits;
    const a = quote.address;
    setF((x) => ({ ...x, street: x.street || a.street, district: x.district || a.district, city: a.city || x.city, state: a.state || x.state }));
  }, [quote?.address, cepDigits]);
  useEffect(() => {
    if (quote?.shipping?.selected && quote.shipping.selected.id !== shippingId) setShippingId(quote.shipping.selected.id);
  }, [quote?.shipping?.selected, shippingId]);

  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    let v = e.target.value;
    if (k === "cpf") v = maskCpf(v);
    if (k === "cep") v = maskCep(v);
    if (k === "phone") v = maskPhone(v);
    setF((x) => ({ ...x, [k]: v }));
    if (error?.field === k) setError(null);
  };
  const invalid = (k: string) => error?.field === k;

  if (!lines.length && !submitting) {
    return (
      <div className="max-w-[44ch] py-10">
        <h2 className="text-[1.75rem]">Your bag is empty</h2>
        <p className="mt-3 text-muted">Add something you like, then come back to check out.</p>
        <Link href="/shop/fashion" className="btn btn-dark mt-6">Shop fashion</Link>
      </div>
    );
  }

  const total = quote?.totalCents;
  const canSubmit = !!payment && !!quote && !!quote.shipping?.selected && !loading && !submitting && quote.lines.length > 0;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!payment) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...f, lines: lines.map((l) => ({ variantId: l.variantId, qty: l.qty })), shippingId, code: appliedCode || undefined, payment }),
      });
      const j = await res.json();
      if (!res.ok) {
        setError({ text: j.error ?? "Something went wrong. Nothing was charged.", field: j.field });
        setSubmitting(false);
        if (j.field) document.querySelector<HTMLElement>(`[name="${j.field}"]`)?.focus();
        return;
      }
      cart.clear();
      window.location.assign(j.redirect);
    } catch {
      setError({ text: "Network error. Check your connection; nothing was charged." });
      setSubmitting(false);
    }
  };

  const input = (k: keyof typeof f, label: string, props: React.InputHTMLAttributes<HTMLInputElement> = {}, hint?: string) => (
    <label className={props.className}>
      <span className="label">{label}</span>
      <input name={k} value={f[k]} onChange={set(k)} className="field" aria-invalid={invalid(k)} aria-describedby={hint ? `${k}-hint` : undefined} {...props} />
      {hint && <span id={`${k}-hint`} className="hint block">{hint}</span>}
    </label>
  );

  return (
    <form onSubmit={submit} noValidate className="grid gap-12 lg:grid-cols-12">
      <div className="flex flex-col gap-12 lg:col-span-7">
        <fieldset className="grid gap-4 sm:grid-cols-2">
          <legend className="mb-4 text-[1.5rem] font-semibold" style={{ fontStretch: "125%", letterSpacing: "-0.02em" }}>Contact</legend>
          {input("email", "Email", { type: "email", autoComplete: "email", required: true, className: "sm:col-span-2" }, signedIn ? undefined : "We send nothing else. You can create an account after ordering.")}
          {input("name", "Full name", { autoComplete: "name", required: true, className: "sm:col-span-2" })}
          {input("phone", "Mobile", { type: "tel", autoComplete: "tel-national", inputMode: "tel", required: true, placeholder: "(11) 91234-5678" })}
          {input("cpf", "CPF", { inputMode: "numeric", required: true, placeholder: "000.000.000-00" }, "Needed for the invoice (nota fiscal).")}
        </fieldset>

        <fieldset className="grid gap-4 sm:grid-cols-6">
          <legend className="mb-4 text-[1.5rem] font-semibold" style={{ fontStretch: "125%", letterSpacing: "-0.02em" }}>Delivery address</legend>
          <label className="sm:col-span-2">
            <span className="label">CEP</span>
            <input name="cep" value={f.cep} onChange={set("cep")} inputMode="numeric" autoComplete="postal-code" placeholder="00000-000" className="field" aria-invalid={invalid("cep") || quote?.cepValid === false} aria-describedby="cep-hint" />
            <span id="cep-hint" className="hint block">
              {cepDigits.length === 8 && quote?.address === null && !loading ? "We couldn’t find this CEP automatically. Fill in the address below." : <a href="https://buscacepinter.correios.com.br/" target="_blank" rel="noreferrer" className="underline">Don’t know your CEP?</a>}
            </span>
          </label>
          {input("street", "Street", { autoComplete: "address-line1", className: "sm:col-span-4" })}
          {input("number", "Number", { inputMode: "numeric", className: "sm:col-span-2" })}
          {input("complement", "Apartment, block (optional)", { autoComplete: "address-line2", className: "sm:col-span-4" })}
          {input("district", "Neighbourhood", { className: "sm:col-span-2" })}
          {input("city", "City", { autoComplete: "address-level2", className: "sm:col-span-3" })}
          <label className="sm:col-span-1">
            <span className="label">State</span>
            <select name="state" value={f.state} onChange={set("state")} className="field" aria-invalid={invalid("state")}>
              <option value="">–</option>
              {UFS.map((u) => <option key={u} value={u}>{u}</option>)}
            </select>
          </label>
        </fieldset>

        <fieldset>
          <legend className="mb-4 text-[1.5rem] font-semibold" style={{ fontStretch: "125%", letterSpacing: "-0.02em" }}>Delivery</legend>
          {!quote?.shipping ? (
            <p className="text-muted">Enter your CEP to see delivery options and prices.</p>
          ) : quote.shipping.options.length === 0 ? (
            <p className="text-danger">We can’t deliver to this CEP. Check it, or contact us.</p>
          ) : (
            <div className="flex flex-col gap-2" role="radiogroup">
              {quote.shipping.options.map((o) => (
                <label key={o.id} className={`flex cursor-pointer items-center gap-4 px-4 py-3.5 transition-colors ${shippingId === o.id ? "bg-ink text-white" : "bg-stone hover:bg-stone-2"}`}>
                  <input type="radio" name="shipping" value={o.id} checked={shippingId === o.id} onChange={() => setShippingId(o.id)} className="sr-only" />
                  <span className="flex-1">
                    <span className="block font-semibold">{o.label}</span>
                    <span className={`text-small ${shippingId === o.id ? "text-mist" : "text-muted"}`}>Arrives in about {o.days} working {o.days === 1 ? "day" : "days"} after dispatch</span>
                  </span>
                  <span className="tabular font-semibold">{o.cents === 0 ? "Free" : formatBRL(o.cents)}</span>
                </label>
              ))}
            </div>
          )}
        </fieldset>

        <fieldset>
          <legend className="mb-4 text-[1.5rem] font-semibold" style={{ fontStretch: "125%", letterSpacing: "-0.02em" }}>Payment</legend>
          {!methods.pix && !methods.card ? (
            <p className="bg-[#fff3d6] px-4 py-3">Online payment isn’t switched on in this store yet, so orders can’t be placed. Please come back soon.</p>
          ) : (
            <div className="flex flex-col gap-2" role="radiogroup">
              {methods.pix && (
                <label className={`flex cursor-pointer gap-4 px-4 py-3.5 ${payment === "pix_direct" ? "bg-ink text-white" : "bg-stone hover:bg-stone-2"}`}>
                  <input type="radio" name="payment" checked={payment === "pix_direct"} onChange={() => setPayment("pix_direct")} className="sr-only" />
                  <span>
                    <span className="block font-semibold">PIX</span>
                    <span className={`text-small ${payment === "pix_direct" ? "text-mist" : "text-muted"}`}>You get a PIX code for the exact amount after placing the order. We confirm it when it reaches our account, usually within the hour during working hours.</span>
                  </span>
                </label>
              )}
              {methods.card && (
                <label className={`flex cursor-pointer gap-4 px-4 py-3.5 ${payment === "mercadopago" ? "bg-ink text-white" : "bg-stone hover:bg-stone-2"}`}>
                  <input type="radio" name="payment" checked={payment === "mercadopago"} onChange={() => setPayment("mercadopago")} className="sr-only" />
                  <span>
                    <span className="block font-semibold">Credit card, debit card or PIX via Mercado Pago</span>
                    <span className={`text-small ${payment === "mercadopago" ? "text-mist" : "text-muted"}`}>You’ll pay on Mercado Pago’s secure page and come back here. Confirmation is automatic.</span>
                  </span>
                </label>
              )}
            </div>
          )}
        </fieldset>
      </div>

      <aside className="lg:col-span-5">
        <div className="bg-stone p-6 lg:sticky lg:top-[calc(var(--header-h)+16px)]">
          <h2 className="text-[1.5rem]">Your order</h2>
          <ul className="mt-5 flex flex-col gap-4">
            {lines.map((l) => (
              <li key={l.variantId} className="flex gap-3">
                <span className="relative block h-[84px] w-[68px] shrink-0 overflow-hidden bg-stone-2">
                  {l.image && <Image src={l.image} alt="" fill sizes="68px" className="object-cover" />}
                  <span className="tabular absolute right-0 top-0 bg-black px-1.5 text-small font-semibold text-white">{l.qty}</span>
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block font-semibold leading-snug">{l.name}</span>
                  <span className="text-small text-muted">{l.color} · {l.size}</span>
                </span>
                <span className="tabular">{formatBRL(l.unitCents * l.qty)}</span>
              </li>
            ))}
          </ul>
          <AnimatePresence>
            {quote?.problems.map((p) => (
              <motion.p key={p} initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className="mt-3 bg-[#fff3d6] px-3 py-2 text-small">{p}</motion.p>
            ))}
          </AnimatePresence>

          <div className="mt-6 flex gap-2">
            <label className="flex-1">
              <span className="sr-only">Discount code</span>
              <input value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder="Discount code" className="field bg-white uppercase" aria-describedby="code-msg" />
            </label>
            <button type="button" className="btn btn-dark px-5" onClick={() => setAppliedCode(code.trim())} disabled={!code.trim()}>Apply</button>
          </div>
          <p id="code-msg" className="mt-1 min-h-5 text-small" aria-live="polite">
            {quote?.discountError ? <span className="text-danger">{quote.discountError}</span> : quote?.discount ? <span className="font-semibold text-emerald">{quote.discount.code}: {quote.discount.label}</span> : null}
          </p>

          <dl className="tabular mt-4 flex flex-col gap-2">
            <div className="flex justify-between"><dt>Subtotal</dt><dd>{formatBRL(quote?.subtotalCents ?? cartSubtotal(lines))}</dd></div>
            {quote?.discount && quote.discount.amountCents > 0 && <div className="flex justify-between text-emerald"><dt>Discount</dt><dd>−{formatBRL(quote.discount.amountCents)}</dd></div>}
            <div className="flex justify-between"><dt>Delivery</dt><dd>{quote?.shipping?.selected ? (quote.shipping.selected.cents === 0 ? "Free" : formatBRL(quote.shipping.selected.cents)) : "Enter your CEP"}</dd></div>
            <div className="mt-2 flex items-baseline justify-between text-lead font-semibold"><dt>Total</dt><dd>{total != null ? formatBRL(total) : "–"}</dd></div>
          </dl>

          {(error || quoteError) && <p className="mt-4 bg-white px-3 py-2 text-small text-danger" role="alert">{error?.text ?? quoteError}</p>}
          <button type="submit" className="btn mt-5 w-full" disabled={!canSubmit}>
            {submitting ? "Placing your order…" : payment === "mercadopago" ? "Continue to Mercado Pago" : payment === "pix_direct" ? "Place order and get the PIX code" : "Payment unavailable"}
          </button>
          <p className="mt-3 text-small text-muted">Your items are held for you while you pay. By ordering you agree to our <Link href="/help/shipping" className="underline">delivery and returns terms</Link> and <Link href="/privacy" className="underline">privacy notice</Link>.</p>
        </div>
      </aside>
    </form>
  );
}
