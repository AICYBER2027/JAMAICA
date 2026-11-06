"use client";
import dynamic from "next/dynamic";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";

const ModelScene = dynamic(() => import("./ModelScene"), { ssr: false });

/** Can this device draw WebGL, and is it not asking us to save data? */
export function use3DCapable(): boolean | null {
  const [ok, setOk] = useState<boolean | null>(null);
  useEffect(() => {
    try {
      const canvas = document.createElement("canvas");
      const gl = canvas.getContext("webgl2") || canvas.getContext("webgl");
      const saveData = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData === true;
      setOk(!!gl && !saveData);
    } catch {
      setOk(false);
    }
  }, []);
  return ok;
}

type Props = {
  url: string;
  poster?: string | null;
  posterAlt?: string;
  variant?: string | null;
  hero?: boolean;
  className?: string;
  tilt?: number;
  label: string;
  zoomSignal?: number;
  resetSignal?: number;
  onInteract?: () => void;
  /** Called once the device check finishes, with whether 3D is shown. */
  onCapability?: (ok: boolean) => void;
};

export function ModelViewer({ url, poster, posterAlt = "", variant, hero, className = "", tilt, label, zoomSignal, resetSignal, onInteract, onCapability }: Props) {
  const capable = use3DCapable();
  const [ready, setReady] = useState(false);
  // Render only while on screen and the tab is visible: saves battery and keeps scrolling smooth on phones.
  const box = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(true);
  useEffect(() => {
    const el = box.current;
    if (!el) return;
    let onScreen = true;
    const update = () => setVisible(onScreen && !document.hidden);
    const io = new IntersectionObserver(([e]) => { onScreen = e.isIntersecting; update(); }, { rootMargin: "100px" });
    io.observe(el);
    document.addEventListener("visibilitychange", update);
    return () => { io.disconnect(); document.removeEventListener("visibilitychange", update); };
  }, []);

  useEffect(() => {
    if (capable !== null) onCapability?.(capable);
  }, [capable, onCapability]);

  return (
    <div ref={box} className={`relative h-full w-full ${className}`} role="img" aria-label={label}>
      {poster && (!ready || capable === false) && (
        <Image src={poster} alt={posterAlt} fill sizes="(min-width: 1024px) 50vw, 100vw" className={`object-contain transition-opacity duration-500 ${capable && !ready ? "opacity-60" : ""}`} priority={hero} />
      )}
      {capable && (
        <div className={`absolute inset-0 transition-opacity duration-700 ${ready ? "opacity-100" : "opacity-0"}`} style={{ cursor: "grab" }}>
          <ModelScene active={visible} url={url} variant={variant} hero={hero} tilt={tilt} onReady={() => setReady(true)} zoomSignal={zoomSignal} resetSignal={resetSignal} onInteract={onInteract} />
        </div>
      )}
    </div>
  );
}
