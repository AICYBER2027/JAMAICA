import { Footer } from "./Footer";

/** Reading layout for help and policy pages. */
export function Prose({ title, intro, children }: { title: string; intro: string; children: React.ReactNode }) {
  return (
    <>
      <article className="frame pb-24 pt-12">
        <h1 className="max-w-[18ch] text-[clamp(2.4rem,5vw,4.5rem)]">{title}</h1>
        <p className="mt-5 max-w-[56ch] text-lead leading-snug">{intro}</p>
        <div className="prose-j mt-12 max-w-[68ch]">{children}</div>
      </article>
      <Footer />
    </>
  );
}
