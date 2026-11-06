"use client";
import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import type { Media3D, ProductImage } from "@/lib/catalog";
import { ModelViewer } from "@/components/three/ModelViewer";
import { SequenceViewer } from "@/components/three/SequenceViewer";

type Mode = "photos" | "model" | "sequence";

export function MediaStage({ name, images, media3d, color }: { name: string; images: ProductImage[]; media3d: Media3D[]; color: string | null }) {
  const model = media3d.find((m) => m.kind === "model" && m.model_url);
  const sequence = media3d.find((m) => m.kind === "sequence" && m.frames.length >= 8);
  const modes: { id: Mode; label: string }[] = [
    { id: "photos", label: "Photos" },
    ...(model ? [{ id: "model" as const, label: "3D model" }] : []),
    ...(sequence ? [{ id: "sequence" as const, label: "360° photos" }] : []),
  ];
  const [mode, setMode] = useState<Mode>(model ? "model" : "photos");
  const [zoom, setZoom] = useState(0);
  const [reset, setReset] = useState(0);
  const [touched, setTouched] = useState(false);
  const [no3d, setNo3d] = useState(false);

  // Show the photos of the chosen colour when the product has per-colour photos.
  const shown = useMemo(() => {
    const forColour = images.filter((i) => i.color === color);
    return forColour.length ? forColour : images.filter((i) => !i.color).length ? images.filter((i) => !i.color) : images;
  }, [images, color]);
  const [active, setActive] = useState(0);
  useEffect(() => setActive(0), [color]);
  const [lightbox, setLightbox] = useState(false);

  const variant = model?.variant_map && color ? model.variant_map[color] ?? null : null;
  const credit = mode === "model" ? model?.credit : mode === "sequence" ? sequence?.credit : null;

  return (
    <div className="lg:sticky lg:top-[calc(var(--header-h)+16px)]">
      <div className="media relative aspect-[4/5] w-full lg:aspect-[5/6]">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div key={mode + (mode === "photos" ? shown[active]?.id : "")} className="absolute inset-0" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.25 }}>
            {mode === "photos" && shown[active] && (
              <button type="button" className="absolute inset-0 cursor-zoom-in" onClick={() => setLightbox(true)} aria-label={`Enlarge photo ${active + 1} of ${shown.length}`}>
                <Image src={shown[active].url} alt={shown[active].alt || name} fill priority sizes="(min-width: 1024px) 55vw, 100vw" className="object-cover" />
              </button>
            )}
            {mode === "photos" && !shown.length && <div className="grid h-full place-items-center text-muted">No photographs yet</div>}
            {mode === "model" && model?.model_url && (
              <ModelViewer
                url={model.model_url}
                poster={model.poster}
                variant={variant}
                label={`${name}: 3D model. Drag to turn, pinch or scroll to zoom.`}
                zoomSignal={zoom}
                resetSignal={reset}
                onInteract={() => setTouched(true)}
                onCapability={(ok) => setNo3d(!ok)}
              />
            )}
            {mode === "sequence" && sequence && (
              <SequenceViewer frames={sequence.frames} label={`${name}: 360° photo sequence. Drag or use the arrow keys to turn.`} zoomSignal={zoom} resetSignal={reset} onInteract={() => setTouched(true)} />
            )}
          </motion.div>
        </AnimatePresence>

        {mode !== "photos" && (
          <div className="absolute bottom-3 right-3 flex gap-1">
            <button type="button" className="grid h-11 w-11 place-items-center bg-white text-xl font-semibold hover:bg-stone" onClick={() => setZoom((z) => Math.abs(z) + 1)} aria-label="Zoom in">+</button>
            <button type="button" className="grid h-11 w-11 place-items-center bg-white text-xl font-semibold hover:bg-stone" onClick={() => setZoom((z) => -(Math.abs(z) + 1))} aria-label="Zoom out">−</button>
            <button type="button" className="h-11 bg-white px-3 text-small font-semibold hover:bg-stone" onClick={() => setReset((r) => r + 1)}>Reset</button>
          </div>
        )}
        <AnimatePresence>
          {mode !== "photos" && !touched && !no3d && (
            <motion.p initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="pointer-events-none absolute left-3 top-3 bg-white px-3 py-1.5 text-small font-semibold">
              {mode === "model" ? "Drag to turn · pinch to zoom" : "Drag to turn it round"}
            </motion.p>
          )}
        </AnimatePresence>
        {mode === "model" && no3d && (
          <p className="absolute inset-x-3 bottom-3 bg-white px-3 py-2 text-small">This device can’t show 3D, so you’re seeing a photograph. Try the 360° photos or another browser.</p>
        )}
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        {modes.length > 1 && (
          <div role="tablist" aria-label="How to view this product" className="flex gap-1">
            {modes.map((m) => (
              <button
                key={m.id}
                role="tab"
                type="button"
                aria-selected={mode === m.id}
                onClick={() => { setMode(m.id); setTouched(false); }}
                className={`relative h-11 px-4 text-small font-semibold ${mode === m.id ? "text-white" : "bg-stone hover:bg-stone-2"}`}
              >
                {mode === m.id && <motion.span layoutId="media-tab" className="absolute inset-0 bg-ink" transition={{ type: "spring", stiffness: 500, damping: 38 }} />}
                <span className="relative">{m.label}</span>
              </button>
            ))}
          </div>
        )}
        {mode === "photos" && shown.length > 1 && (
          <ul className="ml-auto flex gap-1.5 overflow-x-auto" aria-label="Photos">
            {shown.map((img, i) => (
              <li key={img.id}>
                <button type="button" onClick={() => setActive(i)} aria-label={`Photo ${i + 1}`} aria-current={i === active} className={`media relative block h-14 w-12 ${i === active ? "ring-2 ring-ink" : "opacity-70 hover:opacity-100"}`}>
                  <Image src={img.url} alt="" fill sizes="48px" className="object-cover" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
      {!model && !sequence && (
        <p className="mt-3 max-w-[60ch] text-small text-muted">
          360° and 3D views aren’t available for this product yet. These are its photographs.
        </p>
      )}
      {credit && <p className="mt-2 text-[0.8125rem] text-muted">{credit}</p>}

      <AnimatePresence>
        {lightbox && shown[active] && (
          <motion.div className="fixed inset-0 z-50 bg-black" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} role="dialog" aria-modal="true" aria-label={`${name} photos`} onKeyDown={(e) => e.key === "Escape" && setLightbox(false)}>
            <Image src={shown[active].url} alt={shown[active].alt || name} fill sizes="100vw" className="object-contain" />
            <button type="button" autoFocus className="absolute right-4 top-4 bg-white px-4 py-2 font-semibold" onClick={() => setLightbox(false)}>Close</button>
            {shown.length > 1 && (
              <div className="absolute inset-x-0 bottom-6 flex justify-center gap-2">
                <button type="button" className="bg-white px-4 py-2 font-semibold" onClick={() => setActive((a) => (a - 1 + shown.length) % shown.length)}>Previous</button>
                <button type="button" className="bg-white px-4 py-2 font-semibold" onClick={() => setActive((a) => (a + 1) % shown.length)}>Next</button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
