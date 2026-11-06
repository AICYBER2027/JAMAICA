"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { uploadFile } from "@/lib/upload-client";
import { saveTryonModel, toggleTryonModel } from "@/app/actions/admin";

export function TryonModelToggle({ id, active }: { id: string; active: boolean }) {
  const [pending, start] = useTransition();
  return (
    <button type="button" disabled={pending} className="mt-1 text-small font-semibold underline underline-offset-4" onClick={() => start(() => toggleTryonModel(id, !active))}>
      {active ? "Hide from customers" : "Show to customers"}
    </button>
  );
}

export function TryonModelForm() {
  const router = useRouter();
  const [f, setF] = useState({ name: "", gender: "women", body_type: "regular", view: "front" });
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  return (
    <form
      className="panel mt-6 grid gap-4 sm:grid-cols-5 sm:items-end"
      onSubmit={async (e) => {
        e.preventDefault();
        if (!file || !f.name.trim()) return setMsg({ ok: false, text: "Add a name and a photo." });
        setBusy(true);
        setMsg(null);
        try {
          const url = await uploadFile(file, "tryonModel");
          await saveTryonModel({ ...f, image_url: url });
          setMsg({ ok: true, text: `${f.name} added.` });
          setF({ ...f, name: "" });
          setFile(null);
          router.refresh();
        } catch (err) {
          setMsg({ ok: false, text: (err as Error).message });
        } finally {
          setBusy(false);
        }
      }}
    >
      <label><span className="label">Model name</span><input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} className="field bg-white" /></label>
      <label><span className="label">Shown as</span><select value={f.gender} onChange={(e) => setF({ ...f, gender: e.target.value })} className="field bg-white"><option value="women">Women</option><option value="men">Men</option></select></label>
      <label><span className="label">Body</span><select value={f.body_type} onChange={(e) => setF({ ...f, body_type: e.target.value })} className="field bg-white"><option value="slim">Slim</option><option value="regular">Regular</option><option value="curvy">Curvy</option><option value="plus">Plus</option><option value="athletic">Athletic</option></select></label>
      <label><span className="label">View</span><select value={f.view} onChange={(e) => setF({ ...f, view: e.target.value })} className="field bg-white"><option value="front">Front</option><option value="side">Side</option><option value="back">Back</option></select></label>
      <label className="cursor-pointer"><span className="label">Photo</span><span className="field flex items-center bg-white text-small">{file ? file.name : "Choose a photo…"}</span><input type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={(e) => setFile(e.target.files?.[0] ?? null)} /></label>
      <div className="flex items-center gap-4 sm:col-span-5">
        <button type="submit" className="btn" disabled={busy}>{busy ? "Uploading…" : "Add model"}</button>
        {msg && <p className={msg.ok ? "text-small font-semibold text-emerald" : "text-small text-danger"} aria-live="polite">{msg.text}</p>}
      </div>
    </form>
  );
}
