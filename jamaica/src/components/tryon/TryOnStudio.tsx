"use client";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { formatBRL } from "@/lib/money";

type Garment = { id: string; slug: string; name: string; image: string | null; category: "tops" | "bottoms" | "one-pieces"; priceCents: number; gender: string };
type Model = { id: string; name: string; gender: "women" | "men"; body_type: string; view: string; image_url: string };
type Photo = { id: string; url: string; expiresAt: string };

const CONSENT = "2026-11-v1";

export function TryOnStudio({ garments, models, preselect }: { garments: Garment[]; models: Model[]; preselect: string[] }) {
  const [picked, setPicked] = useState<Garment[]>(() => garments.filter((g) => preselect.includes(g.slug)).slice(0, 2));
  const [who, setWho] = useState<"models" | "me">("models");
  const [gender, setGender] = useState<"women" | "men" | "all">("all");
  const [model, setModel] = useState<Model | null>(models[0] ?? null);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [photo, setPhoto] = useState<Photo | null>(null);
  const [consent, setConsent] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [job, setJob] = useState<{ id: string; status: string; step: number; steps: number; result: string | null; error: string | null } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const poll = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    fetch("/api/tryon/photos").then((r) => r.json()).then((j) => setPhotos(j.photos ?? [])).catch(() => {});
    return () => { if (poll.current) clearTimeout(poll.current); };
  }, []);

  const toggle = (g: Garment) => {
    setPicked((cur) => {
      if (cur.some((x) => x.id === g.id)) return cur.filter((x) => x.id !== g.id);
      // One upper-body or full-body garment, plus optionally one lower-body garment.
      const rest = cur.filter((x) => (g.category === "bottoms" ? x.category !== "bottoms" : g.category === "one-pieces" ? false : x.category === "bottoms"));
      return [...rest, g];
    });
  };

  const upload = async (file: File) => {
    setUploading(true);
    setError(null);
    const fd = new FormData();
    fd.set("photo", file);
    fd.set("consent", CONSENT);
    try {
      const res = await fetch("/api/tryon/photos", { method: "POST", body: fd });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error);
      setPhotos(j.photos);
      setPhoto(j.photos[0]);
    } catch (e) {
      setError((e as Error).message || "Upload failed.");
    } finally {
      setUploading(false);
    }
  };

  const remove = async (id: string) => {
    const res = await fetch(`/api/tryon/photos?id=${id}`, { method: "DELETE" });
    const j = await res.json();
    setPhotos(j.photos ?? []);
    if (photo?.id === id) setPhoto(null);
  };

  const check = async (id: string) => {
    const res = await fetch(`/api/tryon/jobs/${id}`);
    const j = await res.json();
    setJob({ id, ...j });
    if (j.status === "processing" || j.status === "queued") poll.current = setTimeout(() => check(id), 2500);
  };

  const generate = async () => {
    setError(null);
    setJob(null);
    const body = { productIds: picked.map((p) => p.id), ...(who === "me" ? { photoId: photo?.id } : { modelId: model?.id }) };
    const res = await fetch("/api/tryon/jobs", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const j = await res.json();
    if (!res.ok) return setError(j.error ?? "Try-on couldn’t start.");
    setJob({ id: j.id, status: "processing", step: 0, steps: picked.length, result: null, error: null });
    poll.current = setTimeout(() => check(j.id), 2500);
  };

  const person = who === "me" ? photo?.url : model?.image_url;
  const ready = picked.length > 0 && (who === "me" ? !!photo : !!model);
  const busy = job?.status === "processing" || job?.status === "queued";
  const shownModels = models.filter((m) => gender === "all" || m.gender === gender);

  return (
    <div className="grid gap-10 lg:grid-cols-12">
      <div className="flex flex-col gap-10 lg:col-span-7">
        <section aria-labelledby="g-title">
          <h2 id="g-title" className="text-[1.5rem]">1. Choose what to try</h2>
          <p className="mt-1 text-muted">A top or dress, and optionally bottoms to go with it.</p>
          <ul className="mt-4 grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-5">
            {garments.map((g) => {
              const on = picked.some((p) => p.id === g.id);
              return (
                <li key={g.id}>
                  <button type="button" aria-pressed={on} onClick={() => toggle(g)} className={`block w-full text-left ${on ? "ring-2 ring-ink ring-offset-2" : ""}`}>
                    <span className="media relative block aspect-[4/5]">{g.image && <Image src={g.image} alt="" fill sizes="140px" className="object-cover" />}</span>
                    <span className="mt-1.5 block text-small font-semibold leading-tight">{g.name}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </section>

        <section aria-labelledby="w-title">
          <h2 id="w-title" className="text-[1.5rem]">2. Choose who wears it</h2>
          <div role="tablist" className="mt-4 flex gap-1">
            {(["models", "me"] as const).map((w) => (
              <button key={w} role="tab" type="button" aria-selected={who === w} onClick={() => setWho(w)} className={`h-11 px-4 font-semibold ${who === w ? "bg-ink text-white" : "bg-stone hover:bg-stone-2"}`}>
                {w === "models" ? "Studio models" : "My own photo"}
              </button>
            ))}
          </div>
          {who === "models" ? (
            <>
              <div className="mt-4 flex gap-1" role="radiogroup" aria-label="Show models">
                {(["all", "women", "men"] as const).map((g) => (
                  <button key={g} type="button" role="radio" aria-checked={gender === g} onClick={() => setGender(g)} className={`h-9 px-3 text-small font-semibold ${gender === g ? "bg-jade text-white" : "bg-stone"}`}>{g === "all" ? "All" : g === "women" ? "Women" : "Men"}</button>
                ))}
              </div>
              <ul className="mt-3 grid grid-cols-3 gap-3 sm:grid-cols-4">
                {shownModels.map((m) => (
                  <li key={m.id}>
                    <button type="button" aria-pressed={model?.id === m.id} onClick={() => setModel(m)} className={`block w-full text-left ${model?.id === m.id ? "ring-2 ring-ink ring-offset-2" : ""}`}>
                      <span className="media relative block aspect-[3/4]"><Image src={m.image_url} alt={m.name} fill sizes="160px" className="object-cover" /></span>
                      <span className="mt-1.5 block text-small font-semibold">{m.name}</span>
                      <span className="block text-small capitalize text-muted">{m.body_type}, {m.view}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <div className="mt-4">
              <div className="bg-stone p-5">
                <label className="flex cursor-pointer gap-3">
                  <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} className="mt-1 h-5 w-5 shrink-0 accent-emerald" />
                  <span>I agree that JAMAICA stores this photo privately and sends it to its try-on provider (FASHN) only to make the images I ask for. It is deleted when I delete it, or automatically after 24 hours. <Link href="/privacy#photos" className="link">How we handle photos</Link></span>
                </label>
                <label className={`btn btn-dark mt-4 ${!consent || uploading ? "pointer-events-none opacity-50" : "cursor-pointer"}`} aria-disabled={!consent || uploading}>
                  {uploading ? "Uploading…" : "Upload a photo of yourself"}
                  <input type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" disabled={!consent || uploading} onChange={(e) => { const f = e.target.files?.[0]; if (f) upload(f); e.target.value = ""; }} />
                </label>
                <p className="hint">Full body or from the knees up, facing the camera, in good light. Location data in the file is removed.</p>
              </div>
              {photos.length > 0 && (
                <ul className="mt-4 grid grid-cols-3 gap-3 sm:grid-cols-4">
                  {photos.map((ph) => (
                    <li key={ph.id}>
                      <button type="button" aria-pressed={photo?.id === ph.id} onClick={() => setPhoto(ph)} className={`media relative block aspect-[3/4] w-full ${photo?.id === ph.id ? "ring-2 ring-ink ring-offset-2" : ""}`}>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={ph.url} alt="Your photo" className="h-full w-full object-cover" />
                      </button>
                      <button type="button" className="mt-1 text-small font-semibold text-danger hover:underline" onClick={() => remove(ph.id)}>Delete photo</button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </section>
      </div>

      <aside className="lg:col-span-5">
        <div className="lg:sticky lg:top-[calc(var(--header-h)+16px)]">
          <div className="grid grid-cols-2 gap-2">
            <div className="media relative aspect-[3/4]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              {person ? <img src={person} alt="Before" className="h-full w-full object-cover" /> : <span className="grid h-full place-items-center p-4 text-center text-small text-muted">Choose who wears it</span>}
              <span className="absolute left-0 top-0 bg-black px-2 py-0.5 text-small font-semibold text-white">Before</span>
            </div>
            <div className="media relative aspect-[3/4]">
              <AnimatePresence mode="wait">
                {job?.result ? (
                  <motion.img key="r" src={job.result} alt="AI-generated try-on result" className="h-full w-full object-cover" initial={{ opacity: 0, filter: "blur(12px)" }} animate={{ opacity: 1, filter: "blur(0px)" }} transition={{ duration: 0.6 }} />
                ) : busy ? (
                  <motion.div key="b" className="grid h-full place-items-center p-4 text-center" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                    <span>
                      <span className="mx-auto mb-3 block h-1 w-24 overflow-hidden bg-stone-2"><motion.span className="block h-full w-1/3 bg-emerald" animate={{ x: ["-100%", "300%"] }} transition={{ repeat: Infinity, duration: 1.2, ease: "easeInOut" }} /></span>
                      <span className="text-small">Dressing the model{job && job.steps > 1 ? `, garment ${job.step + 1} of ${job.steps}` : ""}. This takes 10 to 40 seconds.</span>
                    </span>
                  </motion.div>
                ) : (
                  <motion.span key="e" className="grid h-full place-items-center p-4 text-center text-small text-muted">The result appears here</motion.span>
                )}
              </AnimatePresence>
              <span className="absolute left-0 top-0 bg-emerald px-2 py-0.5 text-small font-semibold text-white">After</span>
            </div>
          </div>
          <button type="button" className="btn mt-4 w-full" disabled={!ready || busy} onClick={generate}>
            {busy ? "Working…" : job?.result ? "Try again" : "Try it on"}
          </button>
          {(error || job?.error) && <p className="error-text" role="alert">{error ?? job?.error}</p>}
          <p className="mt-3 text-small text-muted">The result is an AI-generated picture of how the garment could look. Fit, length and drape are approximate, so check the size guide before buying.</p>
          {picked.length > 0 && (
            <ul className="mt-5 flex flex-col gap-2">
              {picked.map((g) => (
                <li key={g.id} className="flex items-center justify-between gap-3 bg-stone px-4 py-3">
                  <span className="font-semibold">{g.name}</span>
                  <span className="tabular text-small">{formatBRL(g.priceCents)}</span>
                  <Link href={`/p/${g.slug}`} className="link text-small font-semibold">Choose size</Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </aside>
    </div>
  );
}
