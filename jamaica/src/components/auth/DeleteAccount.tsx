"use client";
import { useState, useTransition } from "react";

export function DeleteAccount({ action }: { action: (password: string) => Promise<{ error?: string }> }) {
  const [open, setOpen] = useState(false);
  const [pw, setPw] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  if (!open) return <button type="button" className="mt-4 font-semibold text-danger hover:underline" onClick={() => setOpen(true)}>Delete my account</button>;
  return (
    <form className="mt-4 flex max-w-md flex-col gap-3" onSubmit={(e) => { e.preventDefault(); start(async () => { const r = await action(pw); if (r?.error) setError(r.error); }); }}>
      <label><span className="label">Type your password to confirm</span><input type="password" value={pw} onChange={(e) => setPw(e.target.value)} className="field bg-white" autoComplete="current-password" /></label>
      {error && <p className="error-text" role="alert">{error}</p>}
      <div className="flex gap-3"><button type="submit" className="btn bg-danger hover:bg-danger" disabled={pending || !pw}>{pending ? "Deleting…" : "Delete account for good"}</button><button type="button" className="btn btn-ghost" onClick={() => setOpen(false)}>Keep it</button></div>
    </form>
  );
}
