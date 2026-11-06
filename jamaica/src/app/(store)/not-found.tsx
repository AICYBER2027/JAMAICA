import Link from "next/link";

export default function NotFound() {
  return (
    <div className="frame grid min-h-[70svh] content-center py-20">
      <h1 className="max-w-[16ch] text-[clamp(2.4rem,6vw,5rem)]">We can’t find that page</h1>
      <p className="mt-5 max-w-[46ch] text-lead leading-snug">The product may have sold out for good, or the link has a typo. Try the shop or search for it.</p>
      <div className="mt-8 flex flex-wrap gap-3">
        <Link href="/shop/fashion" className="btn btn-dark">Go to the shop</Link>
        <Link href="/search" className="btn btn-ghost">Search</Link>
      </div>
    </div>
  );
}
