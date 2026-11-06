import type { Metadata } from "next";
import { Prose } from "@/components/Prose";

export const metadata: Metadata = { title: "Credits" };

export default function Credits() {
  return (
    <Prose title="Photo and 3D model credits" intro="The sample catalogue uses openly licensed photography and 3D models. Replace them with your own as the collection grows.">
      <h2>Photography</h2>
      <p>Product and editorial photographs are from <a href="https://unsplash.com">Unsplash</a>, used under the Unsplash License.</p>
      <h2>3D models</h2>
      <ul>
        <li>“Materials Variants Shoe” by Shopify, <a href="https://creativecommons.org/licenses/by/4.0/">CC BY 4.0</a>, from the Khronos glTF Sample Assets.</li>
        <li>“Chronograph Watch” by Eric Chadwick / Darmstadt Graphics Group, CC BY 4.0, from the Khronos glTF Sample Assets.</li>
        <li>“Sunglasses Khronos” by Eric Chadwick / Darmstadt Graphics Group, CC BY 4.0, from the Khronos glTF Sample Assets.</li>
      </ul>
      <p>Models were compressed for the web (WebP textures, meshopt geometry). The 360° photo sequences and studio shots of these products were rendered from the same 3D models.</p>
    </Prose>
  );
}
