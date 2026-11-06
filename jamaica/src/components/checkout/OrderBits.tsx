"use client";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { cancelOrderAction } from "@/app/actions/orders";

export function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button type="button" className="btn btn-light mt-3" onClick={async () => {
      try { await navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2500); } catch { setCopied(false); }
    }}>
      {copied ? "Copied" : "Copy PIX code"}
    </button>
  );
}

/** Re-checks the order every few seconds while it waits for payment. */
export function AutoRefresh({ seconds }: { seconds: number }) {
  const router = useRouter();
  useEffect(() => {
    const t = setInterval(() => !document.hidden && router.refresh(), seconds * 1000);
    return () => clearInterval(t);
  }, [router, seconds]);
  return null;
}

export function CancelOrder({ orderId, token }: { orderId: string; token: string }) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  return (
    <div className="mt-4">
      <button type="button" disabled={pending} className="text-small font-semibold text-danger hover:underline" onClick={() => confirm("Cancel this order? Nothing has been charged.") && start(async () => {
        const r = await cancelOrderAction(orderId, token);
        if (r.error) setError(r.error);
      })}>
        {pending ? "Cancelling…" : "Cancel this order"}
      </button>
      {error && <p className="error-text">{error}</p>}
    </div>
  );
}
