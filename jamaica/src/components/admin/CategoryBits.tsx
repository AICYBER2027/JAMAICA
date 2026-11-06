"use client";
import Image from "next/image";
import { useState, useTransition } from "react";
import { uploadFile } from "@/lib/upload-client";
import { deleteCategory } from "@/app/actions/admin";

export function CategoryImageField({ initial }: { initial: string }) {
  const [url, setUrl] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  return (
    <div className="sm:col-span-2">
      <span className="label">Photo</span>
      <input type="hidden" name="image" value={url} />
      <div className="flex items-center gap-3">
        <span className="relative block h-[50px] w-10 overflow-hidden bg-stone-2">{url && <Image src={url} alt="" fill sizes="40px" className="object-cover" />}</span>
        <label className="cursor-pointer bg-white px-4 py-3 text-small font-semibold hover:bg-stone-2">
          {busy ? "Uploading…" : url ? "Replace photo" : "Upload photo"}
          <input type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" disabled={busy} onChange={async (e) => {
            const f = e.target.files?.[0];
            if (!f) return;
            setBusy(true); setError(null);
            try { setUrl(await uploadFile(f, "category")); } catch (err) { setError((err as Error).message); } finally { setBusy(false); }
          }} />
        </label>
      </div>
      {error && <p className="error-text">{error}</p>}
    </div>
  );
}

export function DeleteCategory({ id, count }: { id: string; count: number }) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  return (
    <div className="mt-4">
      <button type="button" disabled={pending} className="text-small font-semibold text-danger hover:underline"
        onClick={() => {
          if (count > 0) return setError(`Move its ${count} products to another category first.`);
          if (!confirm("Delete this category?")) return;
          start(async () => { const r = await deleteCategory(id); if (r.error) setError(r.error); });
        }}>Delete category</button>
      {error && <p className="error-text">{error}</p>}
    </div>
  );
}
