"use client";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { uploadFile } from "@/lib/upload-client";
import { addColour, addImages, deleteImage, deleteVariant, moveImage, removeMedia3d, setColourHex, setModel, setSequence, setStock, updateImage } from "@/app/actions/products";
import { ModelViewer } from "@/components/three/ModelViewer";
import { SequenceViewer } from "@/components/three/SequenceViewer";
import { sortSizes } from "@/lib/sizes";

type Img = { id: string; url: string; alt: string; color: string | null };
type Variant = { id: string; size: string; color: string; color_hex: string; sku: string; stock: number };
type Media = { kind: "model" | "sequence"; model_url: string | null; frames: string[]; credit: string; variant_map: Record<string, string> };

function useBusy() {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const run = (fn: () => Promise<unknown>) =>
    start(async () => {
      setError(null);
      try {
        await fn();
        router.refresh();
      } catch (e) {
        setError((e as Error).message.replace(/^.*?\[.*?"message":\s*"([^"]+)".*$/s, "$1"));
      }
    });
  return { pending, error, run, setError };
}

function Progress({ value }: { value: number }) {
  return (
    <div className="h-1.5 w-full bg-stone-2" role="progressbar" aria-valuenow={Math.round(value * 100)} aria-valuemin={0} aria-valuemax={100}>
      <div className="h-full bg-emerald transition-[width]" style={{ width: `${value * 100}%` }} />
    </div>
  );
}

// ── Photos ──────────────────────────────────────────────────────────────
export function PhotosEditor({ productId, images, colours }: { productId: string; images: Img[]; colours: string[] }) {
  const { pending, error, run, setError } = useBusy();
  const [progress, setProgress] = useState<number | null>(null);

  const onFiles = async (files: FileList | null) => {
    if (!files?.length) return;
    setError(null);
    const list = [...files];
    const urls: string[] = [];
    try {
      for (const [i, f] of list.entries()) {
        urls.push(await uploadFile(f, "photo", { folder: productId.slice(0, 8), onProgress: (p) => setProgress((i + p) / list.length) }));
      }
      run(() => addImages(productId, urls));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setProgress(null);
    }
  };

  return (
    <div>
      <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-4">
        {images.map((img, i) => (
          <li key={img.id} className="flex flex-col gap-2">
            <div className="media relative aspect-[4/5]">
              <Image src={img.url} alt={img.alt} fill sizes="240px" className="object-cover" />
              {i === 0 && <span className="absolute left-0 top-0 bg-black px-2 py-0.5 text-small font-semibold text-white">Main photo</span>}
            </div>
            <label>
              <span className="sr-only">Description for screen readers</span>
              <input defaultValue={img.alt} placeholder="Describe the photo" className="field min-h-10 py-2 text-small" onBlur={(e) => e.target.value !== img.alt && run(() => updateImage(img.id, { alt: e.target.value, color: img.color }))} />
            </label>
            {colours.length > 1 && (
              <label>
                <span className="sr-only">Colour shown</span>
                <select defaultValue={img.color ?? ""} className="field min-h-10 py-2 text-small" onChange={(e) => run(() => updateImage(img.id, { alt: img.alt, color: e.target.value || null }))}>
                  <option value="">Shown for every colour</option>
                  {colours.map((c) => <option key={c} value={c}>Shows {c}</option>)}
                </select>
              </label>
            )}
            <div className="flex gap-1 text-small">
              <button type="button" className="bg-stone px-2.5 py-1.5 hover:bg-stone-2 disabled:opacity-40" disabled={i === 0 || pending} onClick={() => run(() => moveImage(img.id, -1))} aria-label="Move earlier">Earlier</button>
              <button type="button" className="bg-stone px-2.5 py-1.5 hover:bg-stone-2 disabled:opacity-40" disabled={i === images.length - 1 || pending} onClick={() => run(() => moveImage(img.id, 1))} aria-label="Move later">Later</button>
              <button type="button" className="ml-auto px-2.5 py-1.5 text-danger hover:bg-stone" disabled={pending} onClick={() => confirm("Remove this photo from the product?") && run(() => deleteImage(img.id))}>Remove</button>
            </div>
          </li>
        ))}
      </ul>
      <label className="mt-5 flex cursor-pointer flex-col items-start gap-2">
        <span className="btn btn-dark">{progress != null ? "Uploading…" : "Upload photos"}</span>
        <input type="file" accept="image/jpeg,image/png,image/webp,image/avif" multiple className="sr-only" onChange={(e) => { onFiles(e.target.files); e.target.value = ""; }} disabled={progress != null} />
        <span className="hint">JPEG, PNG, WebP or AVIF, up to 15 MB each. Portrait 4:5 photos fill the store’s frames best.</span>
      </label>
      {progress != null && <div className="mt-3 max-w-sm"><Progress value={progress} /></div>}
      {error && <p className="error-text" role="alert">{error}</p>}
    </div>
  );
}

// ── Colours, sizes and stock ────────────────────────────────────────────
export function VariantsEditor({ productId, variants }: { productId: string; variants: Variant[] }) {
  const { pending, error, run, setError } = useBusy();
  const [form, setForm] = useState({ color: "", hex: "#111111", sizes: "XS, S, M, L, XL", stock: 5 });
  const [note, setNote] = useState<string | null>(null);
  const colours = [...new Map(variants.map((v) => [v.color, v.color_hex])).entries()];

  return (
    <div>
      {colours.length === 0 && <p className="text-muted">No colours or sizes yet. Customers can’t buy this product until it has at least one.</p>}
      {colours.map(([colour, hex]) => {
        const rows = variants.filter((v) => v.color === colour);
        const sorted = sortSizes(rows.map((r) => r.size)).map((s) => rows.find((r) => r.size === s)!);
        return (
          <div key={colour} className="mb-6">
            <div className="flex items-center gap-3">
              <label className="relative h-8 w-8 cursor-pointer ring-1 ring-black/15" style={{ background: hex }} title="Change the swatch colour">
                <input type="color" defaultValue={hex} className="absolute inset-0 cursor-pointer opacity-0" onBlur={(e) => e.target.value !== hex && run(() => setColourHex(productId, colour, e.target.value))} aria-label={`Swatch colour for ${colour}`} />
              </label>
              <h3 className="text-[1.05rem] tracking-normal" style={{ fontStretch: "100%" }}>{colour}</h3>
              <span className="tabular text-small text-muted">{rows.reduce((n, r) => n + r.stock, 0)} in stock</span>
            </div>
            <table className="table mt-2">
              <thead><tr><th>Size</th><th>SKU</th><th className="num">Stock</th><th><span className="sr-only">Remove</span></th></tr></thead>
              <tbody>
                {sorted.map((v) => (
                  <tr key={v.id}>
                    <td className="font-semibold">{v.size}</td>
                    <td className="text-small text-muted">{v.sku}</td>
                    <td className="num">
                      <input type="number" min={0} defaultValue={v.stock} aria-label={`Stock for ${colour} ${v.size}`} className={`field tabular min-h-10 w-24 py-1.5 text-right ${v.stock === 0 ? "text-danger" : ""}`}
                        onBlur={(e) => { const n = Number(e.target.value); if (Number.isInteger(n) && n >= 0 && n !== v.stock) run(() => setStock(v.id, n)); }} />
                    </td>
                    <td className="text-right"><button type="button" className="text-small text-danger hover:underline" onClick={() => confirm(`Remove size ${v.size} in ${colour}?`) && run(() => deleteVariant(v.id))}>Remove</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
      })}
      <form
        className="panel mt-4 grid gap-4 sm:grid-cols-[1fr_auto_1.4fr_auto_auto] sm:items-end"
        onSubmit={(e) => {
          e.preventDefault();
          setNote(null);
          if (!form.color.trim()) return setError("Name the colour, for example “Navy”.");
          run(async () => {
            const r = await addColour(productId, form);
            setNote(r.skipped ? `Added ${r.added} sizes; ${r.skipped} already existed.` : `Added ${r.added} sizes in ${form.color}.`);
            setForm((f) => ({ ...f, color: "" }));
          });
        }}
      >
        <label><span className="label">New colour</span><input value={form.color} onChange={(e) => setForm({ ...form, color: e.target.value })} placeholder="Navy" className="field bg-white" /></label>
        <label><span className="label">Swatch</span><input type="color" value={form.hex} onChange={(e) => setForm({ ...form, hex: e.target.value })} className="h-[50px] w-16 cursor-pointer bg-white" /></label>
        <label><span className="label">Sizes, separated by commas</span><input value={form.sizes} onChange={(e) => setForm({ ...form, sizes: e.target.value })} className="field bg-white" /></label>
        <label><span className="label">Stock each</span><input type="number" min={0} value={form.stock} onChange={(e) => setForm({ ...form, stock: Number(e.target.value) })} className="field tabular w-24 bg-white" /></label>
        <button type="submit" className="btn btn-dark" disabled={pending}>Add colour</button>
      </form>
      <p className="mt-2 text-small" aria-live="polite">{error ? <span className="text-danger">{error}</span> : note}</p>
    </div>
  );
}

// ── 3D model ────────────────────────────────────────────────────────────
async function readVariantNames(file: File): Promise<string[]> {
  const buf = new DataView(await file.arrayBuffer());
  const len = buf.getUint32(12, true);
  const json = JSON.parse(new TextDecoder().decode(new Uint8Array(buf.buffer, 20, len)));
  return (json.extensions?.KHR_materials_variants?.variants ?? []).map((v: { name: string }) => v.name);
}

export function ModelEditor({ productId, media, colours }: { productId: string; media?: Media; colours: string[] }) {
  const { pending, error, run, setError } = useBusy();
  const [url, setUrl] = useState(media?.model_url ?? "");
  const [credit, setCredit] = useState(media?.credit ?? "");
  const [variants, setVariants] = useState<string[]>(Object.values(media?.variant_map ?? {}));
  const [map, setMap] = useState<Record<string, string>>(media?.variant_map ?? {});
  const [progress, setProgress] = useState<number | null>(null);
  const [preview, setPreview] = useState<string | null>(colours[0] ?? null);
  const dirty = url !== (media?.model_url ?? "") || credit !== (media?.credit ?? "") || JSON.stringify(map) !== JSON.stringify(media?.variant_map ?? {});

  const onFile = async (file?: File) => {
    if (!file) return;
    setError(null);
    try {
      if (!/\.glb$/i.test(file.name)) throw new Error("Upload a .glb file (binary glTF). Export it from Blender, CLO 3D or your 3D scanner app as glTF Binary.");
      const names = await readVariantNames(file).catch(() => []);
      const uploaded = await uploadFile(file, "model", { onProgress: setProgress });
      setUrl(uploaded);
      setVariants(names);
      setMap(Object.fromEntries(colours.map((c, i) => [c, names[i] ?? ""]).filter(([, v]) => v)));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setProgress(null);
    }
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <div className="media aspect-square">
        {url ? <ModelViewer url={url} label="Preview of the uploaded 3D model" variant={preview ? map[preview] : null} /> : (
          <div className="grid h-full place-items-center p-6 text-center text-muted">No 3D model. Customers see the photos, and the page says 3D isn’t available.</div>
        )}
      </div>
      <div className="flex flex-col gap-4">
        <label className="flex cursor-pointer flex-col items-start gap-2">
          <span className="btn btn-dark">{progress != null ? "Uploading…" : url ? "Replace the 3D model" : "Upload a 3D model"}</span>
          <input type="file" accept=".glb,model/gltf-binary" className="sr-only" onChange={(e) => { onFile(e.target.files?.[0]); e.target.value = ""; }} disabled={progress != null} />
          <span className="hint">A .glb file up to 40 MB. Keep textures at 2048 px or less so it loads quickly on phones.</span>
        </label>
        {progress != null && <Progress value={progress} />}
        <label>
          <span className="label">Credit or licence (shown under the viewer)</span>
          <input value={credit} onChange={(e) => setCredit(e.target.value)} className="field" placeholder="3D scan by JAMAICA studio" />
        </label>
        {variants.length > 0 && colours.length > 0 && (
          <fieldset>
            <legend className="label">The model has {variants.length} colourways. Match them to the product’s colours.</legend>
            <div className="flex flex-col gap-2">
              {colours.map((c) => (
                <label key={c} className="flex items-center gap-3">
                  <span className="w-32 shrink-0">{c}</span>
                  <select className="field min-h-10 py-1.5" value={map[c] ?? ""} onChange={(e) => { setMap({ ...map, [c]: e.target.value }); setPreview(c); }}>
                    <option value="">Model’s default look</option>
                    {variants.map((v) => <option key={v} value={v}>{v}</option>)}
                  </select>
                </label>
              ))}
            </div>
          </fieldset>
        )}
        <div className="flex flex-wrap gap-3">
          <button type="button" className="btn" disabled={!url || !dirty || pending} onClick={() => run(() => setModel(productId, { url, credit, variantMap: Object.fromEntries(Object.entries(map).filter(([, v]) => v)) }))}>
            {pending ? "Saving…" : "Save 3D model"}
          </button>
          {media?.model_url && (
            <button type="button" className="btn btn-ghost text-danger" disabled={pending} onClick={() => confirm("Remove the 3D model from this product?") && run(async () => { await removeMedia3d(productId, "model"); setUrl(""); setVariants([]); setMap({}); })}>
              Remove 3D model
            </button>
          )}
        </div>
        {error && <p className="error-text" role="alert">{error}</p>}
      </div>
    </div>
  );
}

// ── 360° photo sequence ─────────────────────────────────────────────────
export function SequenceEditor({ productId, media }: { productId: string; media?: Media }) {
  const { pending, error, run, setError } = useBusy();
  const [frames, setFrames] = useState<string[]>(media?.frames ?? []);
  const [credit, setCredit] = useState(media?.credit ?? "");
  const [progress, setProgress] = useState<number | null>(null);
  const dirty = JSON.stringify(frames) !== JSON.stringify(media?.frames ?? []) || credit !== (media?.credit ?? "");

  const onFiles = async (files: FileList | null) => {
    if (!files?.length) return;
    setError(null);
    const list = [...files].sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));
    if (list.length < 8) return setError(`You chose ${list.length} photos. A 360° sequence needs at least 8, taken at even steps all the way round (24 or 36 is ideal).`);
    try {
      const folder = `${productId.slice(0, 8)}-${Date.now().toString(36)}`;
      const urls: string[] = [];
      for (const [i, f] of list.entries()) urls.push(await uploadFile(f, "frame", { folder, onProgress: (p) => setProgress((i + p) / list.length) }));
      setFrames(urls);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setProgress(null);
    }
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <div className="media aspect-square">
        {frames.length >= 8 ? <SequenceViewer frames={frames} label="Preview of the 360° sequence" /> : (
          <div className="grid h-full place-items-center p-6 text-center text-muted">No 360° sequence yet.</div>
        )}
      </div>
      <div className="flex flex-col gap-4">
        <label className="flex cursor-pointer flex-col items-start gap-2">
          <span className="btn btn-dark">{progress != null ? "Uploading…" : frames.length ? "Replace the sequence" : "Upload 360° photos"}</span>
          <input type="file" accept="image/jpeg,image/png,image/webp" multiple className="sr-only" onChange={(e) => { onFiles(e.target.files); e.target.value = ""; }} disabled={progress != null} />
          <span className="hint">Choose all the photos at once, 8 to 120 of them, named in turning order (01.jpg, 02.jpg…). Same framing and light in every shot.</span>
        </label>
        {progress != null && <Progress value={progress} />}
        {frames.length > 0 && <p className="tabular text-small text-muted">{frames.length} photos, one every {Math.round(360 / frames.length)}°</p>}
        <label>
          <span className="label">Credit (optional)</span>
          <input value={credit} onChange={(e) => setCredit(e.target.value)} className="field" />
        </label>
        <div className="flex flex-wrap gap-3">
          <button type="button" className="btn" disabled={frames.length < 8 || !dirty || pending} onClick={() => run(() => setSequence(productId, { frames, credit }))}>{pending ? "Saving…" : "Save 360° sequence"}</button>
          {media && (
            <button type="button" className="btn btn-ghost text-danger" disabled={pending} onClick={() => confirm("Remove the 360° sequence?") && run(async () => { await removeMedia3d(productId, "sequence"); setFrames([]); })}>Remove sequence</button>
          )}
        </div>
        {error && <p className="error-text" role="alert">{error}</p>}
      </div>
    </div>
  );
}
