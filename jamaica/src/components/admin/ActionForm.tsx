"use client";
import { startTransition, useActionState, useEffect, useRef } from "react";
import type { FormState } from "@/app/actions/auth";

/** A form bound to a server action. Keeps what was typed on error; clears itself after success if asked. */
export function ActionForm({ action, children, className = "", submit, resetOnSuccess = false, keepMessage = false }: {
  action: (s: FormState, f: FormData) => Promise<FormState>;
  children: React.ReactNode;
  className?: string;
  submit: string;
  resetOnSuccess?: boolean;
  keepMessage?: boolean;
}) {
  const [state, run, pending] = useActionState(action, {});
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state.ok && resetOnSuccess) ref.current?.reset();
  }, [state, resetOnSuccess]);
  return (
    <form
      ref={ref}
      className={className}
      onSubmit={(e) => {
        e.preventDefault();
        const data = new FormData(e.currentTarget);
        startTransition(() => run(data));
      }}
    >
      {children}
      <div className="col-span-full flex flex-wrap items-center gap-4">
        <button type="submit" className="btn" disabled={pending}>{pending ? "Saving…" : submit}</button>
        <p aria-live="polite" className={`max-w-[70ch] ${state.error ? "text-small text-danger" : keepMessage ? "bg-[#dff3ea] px-3 py-2 font-semibold text-[#0b5a3e]" : "text-small font-semibold text-emerald"}`}>
          {state.error ?? state.message}
        </p>
      </div>
    </form>
  );
}
