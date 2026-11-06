"use client";
import { useTransition } from "react";
import { toggleDiscount } from "@/app/actions/admin";

export function DiscountToggle({ code, active }: { code: string; active: boolean }) {
  const [pending, start] = useTransition();
  return (
    <button type="button" disabled={pending} onClick={() => start(() => toggleDiscount(code, !active))} className={`status ${active ? "status-active" : "status-archived"} hover:opacity-80`} aria-label={`${code} is ${active ? "on" : "off"}. Turn ${active ? "off" : "on"}.`}>
      {pending ? "…" : active ? "On, turn off" : "Off, turn on"}
    </button>
  );
}
