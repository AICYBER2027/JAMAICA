"use client";
import { useActionState } from "react";
import type { FormState } from "@/app/actions/auth";

export function LoginForm({ action, scope, next }: { action: (s: FormState, f: FormData) => Promise<FormState>; scope: "staff" | "customer"; next: string }) {
  const [state, run, pending] = useActionState(action, {});
  return (
    <form action={run} className="mt-8 flex flex-col gap-5" noValidate>
      <input type="hidden" name="scope" value={scope} />
      <input type="hidden" name="next" value={next} />
      <label>
        <span className="label">Email</span>
        <input name="email" type="email" autoComplete="email" required defaultValue={state.fields?.email} className="field" aria-invalid={!!state.error} />
      </label>
      <label>
        <span className="label">Password</span>
        <input name="password" type="password" autoComplete="current-password" required className="field" aria-invalid={!!state.error} />
      </label>
      {state.error && <p className="error-text" role="alert">{state.error}</p>}
      <button type="submit" className="btn btn-dark" disabled={pending}>{pending ? "Signing in…" : "Sign in"}</button>
    </form>
  );
}
