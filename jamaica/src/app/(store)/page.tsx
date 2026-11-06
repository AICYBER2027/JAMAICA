import Image from "next/image";
import Link from "next/link";
import { HeroObject } from "@/components/home/HeroObject";
import { Chapters } from "@/components/home/Chapters";
import { PhotoList } from "@/components/home/PhotoList";
import { SpinFrame } from "@/components/home/SpinFrame";
import { Reveal, RevealItem } from "@/components/Reveal";
import { Footer } from "@/components/Footer";
import { bestSellers, getProduct, listProducts } from "@/lib/catalog";
import { formatBRL, effectivePrice } from "@/lib/money";
import { sql } from "@/lib/db";

export const dynamic = "force-dynamic";

const firstSentence = (s: string) => (s.match(/^.*?[.!?](\s|$)/)?.[0] ?? s).trim();

export default async function Home() {
  const [hero, watch, newIn, best, sale] = await Promise.all([
    getProduct("velocity-sneaker"),
    getProduct("chrono-watch"),
    listProducts({ sort: "new", limit: 6 }),
    bestSellers(6),
    listProducts({ sale: true, sort: "featured", limit: 6 }),
  ]);
  const ids = [...newIn, ...best, ...sale].map((p) => p.id);
  const blurbs = new Map(
    (await sql<{ id: string; description: string }[]>`select id, description from products where id = any(${ids})`).map((r) => [r.id, firstSentence(r.description)]),
  );
  const withBlurb = (list: typeof newIn) => list.map((p) => ({ ...p, blurb: blurbs.get(p.id) ?? "" }));

  const heroModel = hero?.media3d.find((m) => m.kind === "model");
  const heroColours = hero
    ? hero.colors.map((c) => ({ ...c, variant: heroModel?.variant_map?.[c.name] ?? "" }))
    : [];
  const sequence = watch?.media3d.find((m) => m.kind === "sequence");

  return (
    <>
      {hero && heroModel?.model_url ? (
        <HeroObject
          slug={hero.slug}
          name={hero.name}
          priceCents={effectivePrice(hero)}
          modelUrl={heroModel.model_url}
          poster={hero.image ?? ""}
          colours={[...heroColours].sort((a, b) => Number(b.variant === "midnight") - Number(a.variant === "midnight"))}
        />
      ) : (
        <section className="frame bg-jade py-32 text-white">
          <h1 className="text-display">JAMAICA</h1>
          <p className="mt-6 max-w-[40ch]">Clothing, watches, sunglasses and shoes. Add products from the dashboard to fill the store.</p>
        </section>
      )}

      <Chapters
        chapters={[
          {
            href: "/shop/fashion",
            title: "Fashion",
            sentence: "Heavy tees, tailoring, denim and dresses, in nine categories from shirts to complete outfits.",
            linkText: "Shop fashion",
            image: "/catalog/ed-emerald.jpg",
            alt: "A woman in striped trousers leaning back against a green wall under a neon sign",
            field: "#0b3a31",
          },
          {
            href: "/shop/accessories",
            title: "Accessories",
            sentence: "Watches, sunglasses, belts, bags and jewelry. Several turn in full 3D.",
            linkText: "Shop accessories",
            image: "/catalog/ed-street.jpg",
            alt: "A woman in red sunglasses and a black jacket against a teal sky",
            field: "#0e3f47",
          },
          {
            href: "/shop/footwear",
            title: "Footwear",
            sentence: "Knit sneakers, leather boots, formal shoes and cork sandals, in Brazilian sizes 34 to 44.",
            linkText: "Shop footwear",
            image: "/catalog/obsidian-boot.jpg",
            alt: "A pair of dark brown leather boots on a black ground",
            field: "#141110",
          },
        ]}
      />

      <section aria-labelledby="look-title" className="frame pt-[clamp(80px,12vw,200px)]">
        <Reveal className="grid gap-4 md:grid-cols-12 md:gap-6">
          <RevealItem className="md:col-span-5">
            <h2 id="look-title" className="text-[clamp(2rem,3.4vw,3.1rem)]">Seen this season</h2>
            <p className="mt-4 max-w-[38ch] text-lead leading-snug">Tailoring with soft shoulders, washed denim, and colour kept for one piece at a time.</p>
          </RevealItem>
          {[
            { src: "/catalog/ed-milan.jpg", alt: "A woman in a pale blue coat and a pink bag in front of a cathedral", href: "/shop/fashion/jackets", label: "Coats and jackets", cls: "md:col-span-5 md:col-start-8 md:row-span-2 aspect-[3/4]" },
            { src: "/catalog/ed-tailored.jpg", alt: "A man in a tan suede jacket, white shirt and jeans", href: "/shop/fashion/jeans", label: "Denim", cls: "md:col-span-3 md:col-start-1 aspect-[4/5]" },
            { src: "/catalog/ed-suit.jpg", alt: "A checked suit and a white jacket on mannequins in a shop window", href: "/shop/fashion/outfits", label: "Complete outfits", cls: "md:col-span-3 aspect-[4/5]" },
          ].map((x) => (
            <RevealItem key={x.src} className={x.cls}>
              <Link href={x.href} className="group relative block h-full overflow-hidden bg-stone">
                <Image src={x.src} alt={x.alt} fill sizes="(min-width: 768px) 33vw, 100vw" className="object-cover transition-transform duration-[1.2s] ease-out group-hover:scale-[1.04]" />
                <span className="absolute bottom-0 left-0 bg-white px-3 py-2 font-semibold">{x.label}</span>
              </Link>
            </RevealItem>
          ))}
        </Reveal>
      </section>

      <PhotoList
        heading="New arrivals, best sellers and offers"
        groups={[
          { id: "new-in", title: "New arrivals", href: "/search?sort=new", items: withBlurb(newIn) },
          { id: "best", title: "Best sellers", href: "/search?sort=featured", items: withBlurb(best) },
          { id: "offers", title: "On sale now", href: "/search?sale=1", items: withBlurb(sale) },
        ]}
      />

      {watch && sequence && (
        <section aria-labelledby="spin-title" className="frame grid items-center gap-10 bg-stone py-[clamp(80px,10vw,180px)] md:grid-cols-12">
          <div className="md:col-span-4 md:col-start-2">
            <h2 id="spin-title" className="text-[clamp(2rem,3.4vw,3.25rem)]">All the way round</h2>
            <p className="mt-6 max-w-[34ch] text-lead leading-snug">
              Products with a 360° sequence or a 3D model can be turned and zoomed on their page, so you see the back and the sides before you buy.
            </p>
            <p className="mt-6 max-w-[38ch] text-muted">
              Where we have neither, the page says so and shows the photographs instead.
            </p>
          </div>
          <div className="md:col-span-5 md:col-start-7">
            <SpinFrame frames={sequence.frames} label={`${watch.name}, turning`} />
            <p className="mt-4 text-small">
              <Link href={`/p/${watch.slug}`} className="link font-semibold">{watch.name}</Link>
              <span className="tabular text-muted">, {formatBRL(effectivePrice(watch))}</span>
            </p>
          </div>
        </section>
      )}

      <section aria-labelledby="can-title" className="frame bg-black py-[clamp(96px,18vh,200px)] text-white">
        <Reveal as="ul" className="mx-auto max-w-[1360px]" stagger={0.09}>
          <RevealItem as="li" className="grid gap-2 pb-6 md:grid-cols-12">
            <h2 id="can-title" className="text-[clamp(2.4rem,5.2vw,5.25rem)] text-mist md:col-span-8">Here you can</h2>
          </RevealItem>
          {[
            ["Turn it in 3D", "Drag, pinch and zoom real 3D models and 360° photo sequences of watches, sunglasses and shoes.", "/search?has3d=1"],
            ["Build an outfit", "Pick a top, bottoms, shoes and accessories, see the total and add the whole look in one tap.", "/outfits"],
            ["Try it on a model", "Our virtual try-on puts a garment on a studio model, or on your own photo if you choose.", "/try-on"],
            ["Pay with PIX", "PIX, credit and debit cards. Your order is confirmed only once payment is received.", "/help/payments"],
            ["Follow your order", "Every order has its own page with its status and tracking code.", "/account/orders"],
          ].map(([name, desc, href]) => (
            <RevealItem as="li" key={name} className="grid items-baseline gap-x-8 gap-y-2 py-[0.35em] md:grid-cols-12">
              <Link href={href} className="block text-[clamp(2.4rem,5.2vw,5.25rem)] font-semibold leading-none transition-colors hover:text-emerald-bright md:col-span-8" style={{ fontStretch: "125%", letterSpacing: "-0.03em" }}>
                {name}
              </Link>
              <p className="max-w-[40ch] pl-[var(--gutter)] text-[1.0625rem] text-white md:col-span-4 md:pl-0">{desc}</p>
            </RevealItem>
          ))}
        </Reveal>
      </section>

      {hero && (
        <section aria-labelledby="return-title" className="relative grid overflow-hidden bg-stone md:min-h-[90svh] md:grid-cols-12">
          <div className="frame order-1 py-16 md:order-2 md:col-span-3 md:col-start-10 md:self-center md:px-0 md:pr-[var(--gutter)]">
            <h2 id="return-title" className="text-[clamp(1.75rem,2.6vw,2.5rem)]">Find your colourway</h2>
            <p className="mt-4 text-[1.0625rem]">Midnight blue, beach rose or street black, on a cushioned foam sole.</p>
            <p className="tabular mt-4 text-lead font-semibold">{formatBRL(effectivePrice(hero))}</p>
            <Link href={`/p/${hero.slug}`} className="btn btn-dark mt-6 w-full md:w-auto">Shop the sneaker</Link>
          </div>
          <div className="relative order-2 h-[55svh] overflow-hidden md:order-1 md:col-span-8 md:h-auto md:min-h-[90svh]">
            <Image src="/catalog/velocity-street-2.jpg" alt="The Velocity knit sneaker in street black, seen from the heel" fill sizes="(min-width: 768px) 66vw, 100vw" className="origin-bottom-left scale-[1.3] object-cover object-[30%_70%]" />
          </div>
        </section>
      )}

      <Footer tall />
    </>
  );
}
