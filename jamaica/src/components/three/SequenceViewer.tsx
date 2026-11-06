"use client";
import { useCallback, useEffect, useRef, useState } from "react";

type Props = {
  frames: string[];
  label: string;
  /** Turn on its own (paused when hidden, off under reduced motion). */
  autoplay?: boolean;
  /** Allow drag/zoom. Off for decorative use, where a tap just advances. */
  interactive?: boolean;
  fps?: number;
  className?: string;
  zoomSignal?: number;
  resetSignal?: number;
  onInteract?: () => void;
};

const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));

/**
 * A real 360° photo sequence: N photographs taken around the product. Dragging moves between them;
 * nothing is interpolated or faked between frames.
 */
export function SequenceViewer({ frames, label, autoplay = false, interactive = true, fps = 14, className = "", zoomSignal = 0, resetSignal = 0, onInteract }: Props) {
  const [index, setIndex] = useState(0);
  const [loaded, setLoaded] = useState(0);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [playing, setPlaying] = useState(autoplay);
  const box = useRef<HTMLDivElement>(null);
  const drag = useRef<{ x: number; y: number; index: number; pan: { x: number; y: number } } | null>(null);
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const pinch = useRef<{ dist: number; zoom: number } | null>(null);
  const n = frames.length;

  // Preload every frame so turning never shows a blank.
  useEffect(() => {
    let alive = true;
    let count = 0;
    const imgs = frames.map((src) => {
      const img = new Image();
      img.decoding = "async";
      img.onload = img.onerror = () => alive && setLoaded(++count);
      img.src = src;
      return img;
    });
    return () => {
      alive = false;
      imgs.forEach((i) => (i.onload = i.onerror = null));
    };
  }, [frames]);

  useEffect(() => {
    if (!playing || loaded < n) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let raf = 0;
    let last = performance.now();
    const tick = (t: number) => {
      if (t - last >= 1000 / fps && !document.hidden) {
        last = t;
        setIndex((i) => (i + 1) % n);
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [playing, loaded, n, fps]);

  const setZoomClamped = useCallback((z: number) => {
    const next = clamp(z, 1, 3);
    setZoom(next);
    if (next === 1) setPan({ x: 0, y: 0 });
  }, []);

  useEffect(() => {
    if (zoomSignal) setZoomClamped(zoom * (zoomSignal > 0 ? 1.35 : 1 / 1.35));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [zoomSignal]);
  useEffect(() => {
    if (!resetSignal) return;
    setZoom(1);
    setPan({ x: 0, y: 0 });
    setIndex(0);
  }, [resetSignal]);

  const stop = () => {
    if (playing) setPlaying(false);
    onInteract?.();
  };

  const onPointerDown = (e: React.PointerEvent) => {
    if (!interactive) return;
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    stop();
    if (pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()];
      pinch.current = { dist: Math.hypot(a.x - b.x, a.y - b.y), zoom };
      drag.current = null;
    } else {
      drag.current = { x: e.clientX, y: e.clientY, index, pan };
    }
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (!pointers.current.has(e.pointerId)) return;
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pinch.current && pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()];
      setZoomClamped(pinch.current.zoom * (Math.hypot(a.x - b.x, a.y - b.y) / pinch.current.dist));
      return;
    }
    const d = drag.current;
    if (!d) return;
    const dx = e.clientX - d.x;
    const dy = e.clientY - d.y;
    if (zoom > 1) {
      // Zoomed in: dragging moves around the photo to inspect detail.
      const w = box.current?.clientWidth ?? 1;
      const h = box.current?.clientHeight ?? 1;
      const maxX = ((zoom - 1) * w) / 2;
      const maxY = ((zoom - 1) * h) / 2;
      setPan({ x: clamp(d.pan.x + dx, -maxX, maxX), y: clamp(d.pan.y + dy, -maxY, maxY) });
    } else {
      const w = box.current?.clientWidth ?? 600;
      const step = Math.round((-dx / w) * n * 1.1);
      setIndex((((d.index + step) % n) + n) % n);
    }
  };
  const onPointerUp = (e: React.PointerEvent) => {
    pointers.current.delete(e.pointerId);
    if (pointers.current.size < 2) pinch.current = null;
    if (pointers.current.size === 0) drag.current = null;
  };
  // Wheel zooms only on a trackpad pinch (ctrlKey) or once already zoomed; otherwise the page scrolls.
  // React's wheel listener is passive, so attach a native one that may call preventDefault.
  const zoomRef = useRef(zoom);
  zoomRef.current = zoom;
  useEffect(() => {
    const el = box.current;
    if (!el || !interactive) return;
    const onWheel = (e: WheelEvent) => {
      if (!e.ctrlKey && zoomRef.current === 1) return;
      e.preventDefault();
      setPlaying(false);
      setZoomClamped(zoomRef.current * (e.deltaY < 0 ? 1.1 : 1 / 1.1));
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [interactive, setZoomClamped]);

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowRight") setIndex((i) => (i + 1) % n);
    else if (e.key === "ArrowLeft") setIndex((i) => (i - 1 + n) % n);
    else if (e.key === "+" || e.key === "=") setZoomClamped(zoom * 1.35);
    else if (e.key === "-") setZoomClamped(zoom / 1.35);
    else return;
    e.preventDefault();
    stop();
  };

  const ready = loaded >= n;
  const angle = Math.round((index / n) * 360);

  return (
    <div
      ref={box}
      className={`relative h-full w-full select-none overflow-hidden ${interactive ? (zoom > 1 ? "cursor-move" : "cursor-ew-resize") : "cursor-pointer"} ${className}`}
      style={{ touchAction: interactive ? "pan-y pinch-zoom" : "auto" }}
      role="slider"
      tabIndex={0}
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={359}
      aria-valuenow={angle}
      aria-valuetext={`${angle} degrees`}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      onKeyDown={onKey}
      onClick={() => !interactive && setIndex((i) => (i + Math.round(n / 8)) % n)}
    >
      <div className="absolute inset-0 will-change-transform" style={{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`, transition: drag.current ? "none" : "transform 160ms ease-out" }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={frames[index]} alt="" draggable={false} className="h-full w-full object-contain" />
      </div>
      {!ready && (
        <div className="absolute inset-x-0 bottom-0 h-1 bg-black/10" aria-hidden="true">
          <div className="h-full bg-emerald transition-[width]" style={{ width: `${(loaded / n) * 100}%` }} />
        </div>
      )}
    </div>
  );
}
