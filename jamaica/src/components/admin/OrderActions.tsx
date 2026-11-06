"use client";
import { useState, useTransition } from "react";
import { staffSetStatus } from "@/app/actions/orders";
import type { OrderStatus } from "@/lib/order-status";

const ACTION: Record<OrderStatus, string> = {
  pending_payment: "Mark awaiting payment",
  paid: "Confirm payment received",
  preparing: "Start preparing",
  shipped: "Mark shipped",
  delivered: "Mark delivered",
  cancelled: "Cancel order",
  refunded: "Mark refunded",
};

export function OrderActions({ orderId, status, next, paymentMethod, tracking }: { orderId: string; status: OrderStatus; next: OrderStatus[]; paymentMethod: string; tracking: string }) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [code, setCode] = useState(tracking);
  // Mercado Pago orders are confirmed by Mercado Pago, not by hand.
  const options = next.filter((s) => !(s === "paid" && paymentMethod === "mercadopago"));
  if (!options.length) return <p className="panel text-muted">Nothing more to do with this order.</p>;
  const go = (to: OrderStatus) => {
    const danger = to === "cancelled" || to === "refunded";
    if (danger && !confirm(to === "cancelled" ? "Cancel this order? Its items go back into stock." : "Mark as refunded? Items go back into stock. Make the refund itself in your bank or Mercado Pago.")) return;
    if (to === "paid" && !confirm("Only confirm after checking the PIX payment arrived in the store’s account. Confirm?")) return;
    setError(null);
    start(async () => {
      const r = await staffSetStatus(orderId, to, to === "shipped" ? code : undefined);
      if (r.error) setError(r.error);
    });
  };
  return (
    <section className="panel" aria-labelledby="next-step">
      <h2 id="next-step" className="text-[1.1rem] tracking-normal" style={{ fontStretch: "100%" }}>Next step</h2>
      {status === "pending_payment" && paymentMethod === "pix_direct" && <p className="mt-1 text-small text-muted">Check the store’s bank account for a PIX with reference JM and this order number before confirming.</p>}
      {options.includes("shipped") && (
        <label className="mt-3 block max-w-sm">
          <span className="label">Tracking code</span>
          <input value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder="AA123456789BR" className="field bg-white" />
        </label>
      )}
      <div className="mt-4 flex flex-wrap gap-2">
        {options.map((s) => (
          <button key={s} type="button" disabled={pending} onClick={() => go(s)} className={`btn ${s === "cancelled" || s === "refunded" ? "btn-ghost text-danger" : s === options[0] ? "" : "btn-dark"}`}>
            {ACTION[s]}
          </button>
        ))}
      </div>
      {error && <p className="error-text" role="alert">{error}</p>}
    </section>
  );
}
