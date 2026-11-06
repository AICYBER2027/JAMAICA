import Link from "next/link";
import { Wordmark } from "@/components/Wordmark";

export default function NotFound() {
  return (
    <main className="frame grid min-h-svh content-center bg-jade py-20 text-white">
      <Link href="/" className="text-[1.4rem]" aria-label="JAMAICA home"><Wordmark /></Link>
      <h1 className="mt-10 max-w-[16ch] text-[clamp(2.4rem,6vw,5rem)]">We can’t find that page</h1>
      <p className="mt-5 max-w-[46ch] text-lead leading-snug">The link may have a typo, or the page has moved.</p>
      <Link href="/" className="btn btn-light mt-8 w-fit">Back to the store</Link>
    </main>
  );
}
