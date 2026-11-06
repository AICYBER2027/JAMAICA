import { readLocalObject, storageMode } from "@/lib/storage";

// Serves uploaded catalogue media from local storage (development). In production files come from Supabase's CDN.
export async function GET(_req: Request, { params }: { params: Promise<{ path: string[] }> }) {
  if (storageMode() !== "local") return new Response("Not found", { status: 404 });
  const { path } = await params;
  const obj = await readLocalObject("public", path.join("/"));
  if (!obj) return new Response("Not found", { status: 404 });
  return new Response(new Uint8Array(obj.body), {
    headers: { "Content-Type": obj.type, "Cache-Control": "public, max-age=31536000, immutable", "X-Content-Type-Options": "nosniff" },
  });
}
