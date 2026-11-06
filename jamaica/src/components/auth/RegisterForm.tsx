"use client";
import { startTransition, useActionState } from "react";
import { register } from "@/app/actions/auth";

export function RegisterForm({ next }: { next: string }) {
  const [state, run, pending] = useActionState(register, {});
  return (
    <form className="mt-8 flex flex-col gap-5" noValidate onSubmit={(e) => { e.preventDefault(); const d = new FormData(e.currentTarget); startTransition(() => run(d)); }}>
      <input type="hidden" name="next" value={next} />
      <label><span className="label">Name</span><input name="name" autoComplete="name" defaultValue={state.fields?.name} className="field" /></label>
      <label><span className="label">Email</span><input name="email" type="email" autoComplete="email" defaultValue={state.fields?.email} className="field" /></label>
      <label><span className="label">Password</span><input name="password" type="password" autoComplete="new-password" className="field" aria-describedby="pw-rule" /><span id="pw-rule" className="hint block">At least 10 characters.</span></label>
      {state.error && <p className="error-text" role="alert">{state.error}</p>}
      <button type="submit" className="btn btn-dark" disabled={pending}>{pending ? "Creating…" : "Create account"}</button>
    </form>
  );
}
