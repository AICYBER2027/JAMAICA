"use client";
import { SequenceViewer } from "@/components/three/SequenceViewer";

/** One fixed frame whose contents change: the product's real 360° sequence turning on its own. */
export function SpinFrame({ frames, label }: { frames: string[]; label: string }) {
  return (
    <div className="relative aspect-square w-full bg-stone mix-blend-multiply">
      <SequenceViewer frames={frames} label={label} autoplay interactive fps={12} />
    </div>
  );
}
