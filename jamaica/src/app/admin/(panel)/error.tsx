"use client";

export default function AdminError({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="admin-page">
      <h1 className="admin-title">This page didn’t load</h1>
      <p className="mt-3 max-w-[60ch] text-muted">The dashboard couldn’t reach the database or a service. Nothing you saved before is lost. Try again; if it keeps happening, check the server logs.</p>
      <button type="button" className="btn btn-dark mt-6" onClick={reset}>Try again</button>
    </div>
  );
}
