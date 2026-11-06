import Link from "next/link";
import Image from "next/image";

/** The page closes on a photograph with the name running across its full width. */
export function Footer({ tall = false }: { tall?: boolean }) {
  return (
    <footer className={`relative isolate overflow-hidden bg-black text-white ${tall ? "min-h-[88svh] md:min-h-[100svh]" : "min-h-[70svh]"}`}>
      <Image
        src="/catalog/ed-coast.jpg"
        alt="A woman walking over pale rocks on the coast"
        fill
        sizes="100vw"
        className="-z-10 object-cover object-[50%_40%] brightness-[0.55]"
      />
      <div className="frame grid gap-10 pt-10 sm:grid-cols-[1fr_1fr_1fr] md:pt-12">
        <nav aria-label="Shop" className="flex flex-col gap-1.5">
          <h2 className="mb-1 text-[1rem] font-semibold tracking-normal">Shop</h2>
          <Link href="/shop/fashion" className="hover:text-mist">Fashion</Link>
          <Link href="/shop/accessories" className="hover:text-mist">Accessories</Link>
          <Link href="/shop/footwear" className="hover:text-mist">Footwear</Link>
          <Link href="/outfits" className="hover:text-mist">Outfit builder</Link>
          <Link href="/try-on" className="hover:text-mist">Try on</Link>
        </nav>
        <nav aria-label="Help" className="flex flex-col gap-1.5">
          <h2 className="mb-1 text-[1rem] font-semibold tracking-normal">Help</h2>
          <Link href="/help/shipping" className="hover:text-mist">Shipping and returns</Link>
          <Link href="/help/payments" className="hover:text-mist">Payments: PIX and cards</Link>
          <Link href="/account/orders" className="hover:text-mist">Your orders</Link>
          <Link href="/privacy" className="hover:text-mist">Privacy and your photos</Link>
        </nav>
        <div className="flex flex-col gap-1.5 sm:items-end sm:text-right">
          <h2 className="mb-1 text-[1rem] font-semibold tracking-normal">Delivering across Brazil</h2>
          <p className="max-w-[30ch]">Orders leave our studio in São Paulo within two working days.</p>
          <Link href="/credits" className="hover:text-mist">Photo and 3D model credits</Link>
        </div>
      </div>
      <div className="frame absolute inset-x-0 bottom-0 pb-6">
        <p aria-hidden="true" className="select-none text-center font-bold leading-[0.8] tracking-[-0.02em]" style={{ fontVariationSettings: '"wdth" 125', fontSize: "clamp(3.5rem, 17.2vw, 22rem)" }}>
          JAMAICA
        </p>
        <p className="mt-4 text-[0.8125rem] text-white/80">© {new Date().getFullYear()} JAMAICA. Prices in Brazilian reais.</p>
      </div>
    </footer>
  );
}
