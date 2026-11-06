"use client";
import Link from "next/link";

export default function StoreError({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="frame grid min-h-[70svh] content-center py-20">
      <h1 className="max-w-[18ch] text-[clamp(2.2rem,5vw,4rem)]">This page didn’t load</h1>
      <p className="mt-5 max-w-[46ch] text-lead leading-snug">Something went wrong on our side. Your bag is safe. Try again in a moment.</p>
      <div className="mt-8 flex flex-wrap gap-3">
        <button type="button" className="btn btn-dark" onClick={reset}>Try again</button>
        <Link href="/" className="btn btn-ghost">Go to the homepage</Link>
      </div>
    </div>
  );
}
