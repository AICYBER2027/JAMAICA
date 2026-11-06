import type { Metadata } from "next";
import { BagView } from "@/components/checkout/BagView";
import { Footer } from "@/components/Footer";

export const metadata: Metadata = { title: "Your bag", robots: { index: false } };

export default function Bag() {
  return (
    <>
      <div className="frame min-h-[60svh] pb-24 pt-10">
        <h1 className="text-[clamp(2.4rem,5vw,4.5rem)]">Your bag</h1>
        <BagView />
      </div>
      <Footer />
    </>
  );
}
