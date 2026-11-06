import { readLocalObject, storageMode, verifyPrivateLink } from "@/lib/storage";

// Local stand-in for Supabase signed URLs: serves a private file only with a valid, unexpired signature.
export async function GET(req: Request, { params }: { params: Promise<{ path: string[] }> }) {
  if (storageMode() !== "local") return new Response("Not found", { status: 404 });
  const { path } = await params;
  const url = new URL(req.url);
  const p = path.join("/");
  if (!verifyPrivateLink(p, url.searchParams.get("exp") ?? "", url.searchParams.get("sig") ?? "")) return new Response("Link expired", { status: 403 });
  const obj = await readLocalObject("private", p);
  if (!obj) return new Response("Not found", { status: 404 });
  return new Response(new Uint8Array(obj.body), { headers: { "Content-Type": obj.type, "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" } });
}
