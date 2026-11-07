import "server-only";
import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { dirname, join, normalize, resolve } from "node:path";

/**
 * File storage for product photos, 3D models, 360° frames and try-on photos.
 * - Supabase Storage when SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set (production).
 * - Otherwise the local ./storage folder (development only; Vercel's disk is not persistent).
 * Two buckets: "public" (catalogue media, served to everyone) and "private" (customer photos,
 * only reachable through short-lived signed links).
 */
export type Bucket = "public" | "private";

const SUPABASE_URL = process.env.SUPABASE_URL?.replace(/\/$/, "");
// New Supabase projects issue "secret" keys (sb_secret_…); older ones a service_role JWT. Either works.
const SUPABASE_KEY = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
const BUCKETS: Record<Bucket, string> = {
  public: process.env.SUPABASE_PUBLIC_BUCKET || "media",
  private: process.env.SUPABASE_PRIVATE_BUCKET || "private",
};
// Local storage is for development only; excluded from Vercel's file tracing.
const LOCAL_ROOT = resolve(/*turbopackIgnore: true*/ process.cwd(), process.env.STORAGE_DIR || "storage");

export const storageMode = (): "supabase" | "local" => (SUPABASE_URL && SUPABASE_KEY ? "supabase" : "local");

function secret() {
  const s = process.env.SESSION_SECRET;
  if (!s || s.length < 16) throw new Error("SESSION_SECRET must be set (at least 16 characters).");
  return s;
}
const sign = (data: string) => createHmac("sha256", secret()).update(data).digest("base64url");
function safeEqual(a: string, b: string) {
  const x = Buffer.from(a), y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}

/** A path that cannot escape its folder. */
export function cleanPath(p: string): string {
  const n = normalize(p).replace(/^([/\\])+/, "");
  if (n.startsWith("..") || n.includes("\0")) throw new Error("Bad path");
  return n.replace(/\\/g, "/");
}

export function newObjectPath(folder: string, filename: string): string {
  const ext = (filename.match(/\.([a-z0-9]{2,5})$/i)?.[1] ?? "bin").toLowerCase();
  const base = filename.replace(/\.[^.]+$/, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40) || "file";
  return cleanPath(`${folder}/${Date.now().toString(36)}-${randomBytes(4).toString("hex")}-${base}.${ext}`);
}

export function publicUrl(path: string): string {
  return storageMode() === "supabase" ? `${SUPABASE_URL}/storage/v1/object/public/${BUCKETS.public}/${path}` : `/media/${path}`;
}

/** sb_secret_ keys go only in the apikey header; legacy JWT keys also as a Bearer token. */
function authHeaders(): Record<string, string> {
  const key = SUPABASE_KEY!;
  return key.startsWith("eyJ") ? { apikey: key, Authorization: `Bearer ${key}` } : { apikey: key };
}

/** For the dashboard's system check: does each bucket exist, and is the public one public? */
export async function bucketStatus(): Promise<{ name: string; role: Bucket; exists: boolean; public: boolean | null; error?: string }[]> {
  if (storageMode() !== "supabase") return [];
  return Promise.all(
    (Object.keys(BUCKETS) as Bucket[]).map(async (role) => {
      const name = BUCKETS[role];
      try {
        const res = await fetch(`${SUPABASE_URL}/storage/v1/bucket/${name}`, { headers: authHeaders(), cache: "no-store", signal: AbortSignal.timeout(8000) });
        if (res.status === 404 || res.status === 400) return { name, role, exists: false, public: null };
        if (!res.ok) return { name, role, exists: false, public: null, error: `HTTP ${res.status}` };
        const j = (await res.json()) as { public?: boolean };
        return { name, role, exists: true, public: !!j.public };
      } catch (e) {
        return { name, role, exists: false, public: null, error: (e as Error).message };
      }
    }),
  );
}

async function supabase(method: string, url: string, init: { body?: BodyInit; headers?: Record<string, string> } = {}) {
  const res = await fetch(`${SUPABASE_URL}/storage/v1${url}`, {
    method,
    body: init.body,
    headers: { ...authHeaders(), ...init.headers },
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`Supabase Storage ${method} ${url} failed: ${res.status} ${await res.text().catch(() => "")}`);
  return res;
}

export async function putObject(bucket: Bucket, path: string, body: Buffer, contentType: string): Promise<void> {
  path = cleanPath(path);
  if (storageMode() === "supabase") {
    await supabase("POST", `/object/${BUCKETS[bucket]}/${path}`, { body: new Uint8Array(body), headers: { "Content-Type": contentType, "x-upsert": "true", "cache-control": "31536000" } });
    return;
  }
  const file = join(/*turbopackIgnore: true*/ LOCAL_ROOT, bucket, path);
  await mkdir(/*turbopackIgnore: true*/ dirname(file), { recursive: true });
  await writeFile(/*turbopackIgnore: true*/ file, body);
  await writeFile(/*turbopackIgnore: true*/ file + ".type", contentType);
}

export async function readLocalObject(bucket: Bucket, path: string): Promise<{ body: Buffer; type: string } | null> {
  try {
    const file = join(/*turbopackIgnore: true*/ LOCAL_ROOT, bucket, cleanPath(path));
    if (!file.startsWith(join(LOCAL_ROOT, bucket))) return null;
    const [body, type] = await Promise.all([readFile(/*turbopackIgnore: true*/ file), readFile(/*turbopackIgnore: true*/ file + ".type", "utf8").catch(() => "application/octet-stream")]);
    return { body, type };
  } catch {
    return null;
  }
}

export async function deleteObject(bucket: Bucket, path: string): Promise<void> {
  path = cleanPath(path);
  if (storageMode() === "supabase") {
    await supabase("DELETE", `/object/${BUCKETS[bucket]}`, { body: JSON.stringify({ prefixes: [path] }), headers: { "Content-Type": "application/json" } });
    return;
  }
  const file = join(/*turbopackIgnore: true*/ LOCAL_ROOT, bucket, path);
  await rm(/*turbopackIgnore: true*/ file, { force: true });
  await rm(/*turbopackIgnore: true*/ file + ".type", { force: true });
}

/** Read a private object's bytes (used to send a customer's photo to the try-on provider). */
export async function getPrivateObject(path: string): Promise<{ body: Buffer; type: string } | null> {
  if (storageMode() === "supabase") {
    try {
      const res = await supabase("GET", `/object/authenticated/${BUCKETS.private}/${cleanPath(path)}`);
      return { body: Buffer.from(await res.arrayBuffer()), type: res.headers.get("content-type") ?? "image/jpeg" };
    } catch {
      return null;
    }
  }
  return readLocalObject("private", path);
}

/** A link to a private object that stops working after `seconds`. */
export async function signedPrivateUrl(path: string, seconds = 600): Promise<string> {
  path = cleanPath(path);
  if (storageMode() === "supabase") {
    const res = await supabase("POST", `/object/sign/${BUCKETS.private}/${path}`, { body: JSON.stringify({ expiresIn: seconds }), headers: { "Content-Type": "application/json" } });
    const { signedURL } = (await res.json()) as { signedURL: string };
    return `${SUPABASE_URL}/storage/v1${signedURL}`;
  }
  const exp = Math.floor(Date.now() / 1000) + seconds;
  return `/api/private-media/${path}?exp=${exp}&sig=${sign(`private:${path}:${exp}`)}`;
}

export function verifyPrivateLink(path: string, exp: string, sig: string): boolean {
  const e = Number(exp);
  if (!Number.isFinite(e) || e < Date.now() / 1000) return false;
  return safeEqual(sig, sign(`private:${cleanPath(path)}:${e}`));
}

// ── Upload tickets ──────────────────────────────────────────────────────
// The browser asks for a ticket, then sends the file straight to storage (Supabase signed upload URL)
// or, locally, to our own upload route. Large 3D models never pass through a serverless function.

export const UPLOAD_KINDS = {
  photo: { bucket: "public" as Bucket, folder: "products", maxMB: 15, types: ["image/jpeg", "image/png", "image/webp", "image/avif"] },
  frame: { bucket: "public" as Bucket, folder: "360", maxMB: 8, types: ["image/jpeg", "image/png", "image/webp"] },
  model: { bucket: "public" as Bucket, folder: "models", maxMB: 40, types: ["model/gltf-binary"] },
  category: { bucket: "public" as Bucket, folder: "categories", maxMB: 15, types: ["image/jpeg", "image/png", "image/webp"] },
  tryonModel: { bucket: "public" as Bucket, folder: "tryon-models", maxMB: 15, types: ["image/jpeg", "image/png", "image/webp"] },
} as const;
export type UploadKind = keyof typeof UPLOAD_KINDS;

export type UploadTicket = { method: "PUT"; url: string; headers: Record<string, string>; publicUrl: string; path: string };

export async function createUploadTicket(kind: UploadKind, filename: string, contentType: string, size: number, folderSuffix = ""): Promise<UploadTicket> {
  const spec = UPLOAD_KINDS[kind];
  // Browsers rarely know a type for .glb files; the extension decides, and the bytes are checked on arrival.
  const type = kind === "model" && /\.glb$/i.test(filename) ? "model/gltf-binary" : contentType;
  if (!(spec.types as readonly string[]).includes(type)) throw new Error(`That file type isn't accepted here. Use ${spec.types.join(", ")}.`);
  if (size <= 0 || size > spec.maxMB * 1024 * 1024) throw new Error(`Files here can be up to ${spec.maxMB} MB.`);
  const path = newObjectPath(spec.folder + (folderSuffix ? `/${folderSuffix}` : ""), filename);

  if (storageMode() === "supabase") {
    const res = await supabase("POST", `/object/upload/sign/${BUCKETS[spec.bucket]}/${path}`, { headers: { "Content-Type": "application/json" }, body: "{}" });
    const { url } = (await res.json()) as { url: string };
    return { method: "PUT", url: `${SUPABASE_URL}/storage/v1${url}`, headers: { "Content-Type": type, "x-upsert": "true" }, publicUrl: publicUrl(path), path };
  }
  const exp = Math.floor(Date.now() / 1000) + 900;
  const payload = Buffer.from(JSON.stringify({ path, type, size, kind, exp })).toString("base64url");
  return { method: "PUT", url: `/api/admin/upload?t=${payload}.${sign("upload:" + payload)}`, headers: { "Content-Type": type }, publicUrl: publicUrl(path), path };
}

export function readLocalTicket(t: string): { path: string; type: string; size: number; kind: UploadKind } | null {
  const [payload, sig] = t.split(".");
  if (!payload || !sig || !safeEqual(sig, sign("upload:" + payload))) return null;
  const data = JSON.parse(Buffer.from(payload, "base64url").toString()) as { path: string; type: string; size: number; kind: UploadKind; exp: number };
  return data.exp > Date.now() / 1000 ? data : null;
}
