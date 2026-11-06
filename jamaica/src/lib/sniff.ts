/** Checks a file's first bytes against its claimed type, so a renamed file can't pass as an image or model. */
export function sniffMatches(b: Uint8Array, type: string): boolean {
  const ascii = (start: number, len: number) => String.fromCharCode(...b.slice(start, start + len));
  switch (type) {
    case "image/jpeg": return b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff;
    case "image/png": return b[0] === 0x89 && ascii(1, 3) === "PNG";
    case "image/webp": return ascii(0, 4) === "RIFF" && ascii(8, 4) === "WEBP";
    case "image/avif": return ascii(4, 4) === "ftyp" && /avi[fs]/.test(ascii(8, 4));
    case "model/gltf-binary": return ascii(0, 4) === "glTF";
    case "model/gltf+json": {
      const head = new TextDecoder().decode(b.slice(0, 200)).trimStart();
      return head.startsWith("{") && head.includes("asset");
    }
    default: return false;
  }
}
