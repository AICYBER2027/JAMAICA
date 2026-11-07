"use client";
import { startTransition, useActionState } from "react";
import { createFirstOwner } from "@/app/actions/setup";

export function OwnerSetupForm() {
  const [state, run, pending] = useActionState(createFirstOwner, {});
  return (
    <form className="mt-8 flex flex-col gap-5" noValidate onSubmit={(e) => { e.preventDefault(); const d = new FormData(e.currentTarget); startTransition(() => run(d)); }}>
      <label><span className="label">Setup code (OWNER_SETUP_CODE)</span><input name="code" type="password" autoComplete="off" className="field" /></label>
      <label><span className="label">Your name</span><input name="name" autoComplete="name" defaultValue={state.fields?.name} className="field" /></label>
      <label><span className="label">Email</span><input name="email" type="email" autoComplete="email" defaultValue={state.fields?.email} className="field" /></label>
      <label><span className="label">Password</span><input name="password" type="password" autoComplete="new-password" className="field" aria-describedby="pw-rule" /><span id="pw-rule" className="hint block">At least 12 characters.</span></label>
      <label><span className="label">Password again</span><input name="confirm" type="password" autoComplete="new-password" className="field" /></label>
      {state.error && <p className="error-text" role="alert">{state.error}</p>}
      <button type="submit" className="btn btn-dark" disabled={pending}>{pending ? "Creating…" : "Create owner and sign in"}</button>
    </form>
  );
}
