import "server-only";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import sharp from "sharp";
import { sql } from "./db";
import { getPrivateObject, readLocalObject } from "./storage";

/**
 * Virtual try-on through FASHN (https://fashn.ai): a diffusion model that redraws the garment onto the
 * person in a photo, following their pose and body. It is a generated image, not a physical simulation,
 * and the page says so. Nothing here runs without FASHN_API_KEY.
 */
// FASHN_API_BASE exists only to point tests at a local stand-in.
const API = process.env.FASHN_API_BASE || "https://api.fashn.ai/v1";
export const tryonEnabled = () => !!process.env.FASHN_API_KEY;
export const DAILY_LIMIT = 15;
export const CONSENT_VERSION = "2026-11-v1";
export const PHOTO_HOURS = 24;

async function fashn<T>(path: string, body?: unknown): Promise<T> {
  const res = await fetch(API + path, {
    method: body ? "POST" : "GET",
    headers: { Authorization: `Bearer ${process.env.FASHN_API_KEY}`, "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(20000),
    cache: "no-store",
  });
  const j = (await res.json().catch(() => ({}))) as T & { error?: unknown; message?: string };
  if (!res.ok) throw new Error(`FASHN ${path} ${res.status}: ${JSON.stringify(j).slice(0, 200)}`);
  return j;
}

/** Re-encodes an image as JPEG (≤1536px), dropping EXIF/GPS metadata, and returns a data URL. */
export async function toJpegDataUrl(input: Buffer): Promise<string> {
  const out = await sharp(input).rotate().resize({ width: 1536, height: 1536, fit: "inside", withoutEnlargement: true }).jpeg({ quality: 88 }).toBuffer();
  return `data:image/jpeg;base64,${out.toString("base64")}`;
}

/** Loads a catalogue or uploaded image (public path, /media path or https URL) as bytes. */
export async function loadImage(url: string): Promise<Buffer> {
  if (url.startsWith("/media/")) {
    const obj = await readLocalObject("public", url.slice("/media/".length));
    if (!obj) throw new Error("Image not found");
    return obj.body;
  }
  if (url.startsWith("/")) {
    if (url.includes("..")) throw new Error("Bad path");
    return readFile(join(process.cwd(), "public", url));
  }
  const supabase = process.env.SUPABASE_URL;
  if (!supabase || !url.startsWith(supabase)) throw new Error("Image host not allowed");
  const res = await fetch(url, { signal: AbortSignal.timeout(15000) });
  if (!res.ok) throw new Error(`Image fetch failed: ${res.status}`);
  return Buffer.from(await res.arrayBuffer());
}

type Step = { productId: string; garment: string; category: string };

export async function countToday(ownerKey: string): Promise<number> {
  const [r] = await sql<{ n: number }[]>`select count(*)::int as n from tryon_jobs where owner_key = ${ownerKey} and created_at > now() - interval '24 hours'`;
  return r.n;
}

function runBody(modelImage: string, step: Step) {
  const model = process.env.FASHN_MODEL || "tryon-v1.6";
  // Newer FASHN models name the garment input "product_image"; v1.x uses "garment_image".
  const garmentKey = model.startsWith("tryon-max") ? "product_image" : "garment_image";
  return { model_name: model, inputs: { model_image: modelImage, [garmentKey]: step.garment, category: step.category, mode: "balanced", garment_photo_type: "auto" } };
}

export async function startJob(opts: { ownerKey: string; productIds: string[]; modelId?: string; photoId?: string }) {
  const products = await sql<{ id: string; tryon_category: string | null; image: string | null; name: string }[]>`
    select p.id, p.tryon_category, p.name, (select url from product_images i where i.product_id = p.id order by sort limit 1) as image
    from products p where p.id = any(${opts.productIds}) and p.status = 'active'`;
  // Upper body first, then lower body, so the second garment is drawn over a photo already wearing the first.
  const order = { "one-pieces": 0, tops: 1, bottoms: 2 } as Record<string, number>;
  const usable = products.filter((p) => p.tryon_category && p.image).sort((a, b) => order[a.tryon_category!] - order[b.tryon_category!]);
  if (!usable.length) throw new Error("These products can’t be tried on.");

  let modelImage: string;
  if (opts.photoId) {
    const [ph] = await sql<{ storage_path: string }[]>`select storage_path from tryon_photos where id = ${opts.photoId} and owner_key = ${opts.ownerKey} and expires_at > now()`;
    if (!ph) throw new Error("That photo was deleted or has expired. Upload it again.");
    const obj = await getPrivateObject(ph.storage_path);
    if (!obj) throw new Error("That photo couldn’t be read. Upload it again.");
    modelImage = `data:${obj.type};base64,${obj.body.toString("base64")}`;
  } else {
    const [m] = await sql<{ image_url: string }[]>`select image_url from tryon_models where id = ${opts.modelId ?? ""} and active`;
    if (!m) throw new Error("Choose a model.");
    modelImage = await toJpegDataUrl(await loadImage(m.image_url));
  }
  const steps: Step[] = [];
  for (const p of usable) steps.push({ productId: p.id, garment: await toJpegDataUrl(await loadImage(p.image!)), category: p.tryon_category! });

  const run = await fashn<{ id: string }>("/run", runBody(modelImage, steps[0]));
  // Store only references and the generated chain; the customer's photo itself stays in private storage.
  const [job] = await sql<{ id: string }[]>`
    insert into tryon_jobs (owner_key, provider, provider_job_id, product_id, model_id, photo_id, status, steps, step)
    values (${opts.ownerKey}, 'fashn', ${run.id}, ${usable[0].id}, ${opts.modelId ?? null}, ${opts.photoId ?? null}, 'processing',
      ${sql.json(steps.map((s) => ({ productId: s.productId, category: s.category })))}, 0)
    returning id`;
  return job.id;
}

type Status = { id: string; status: "starting" | "in_queue" | "processing" | "completed" | "failed" | "canceled"; output?: string[]; error?: { name?: string; message?: string } | string | null };

/** Checks the provider and moves the job on: next garment, finished or failed. */
export async function advanceJob(jobId: string, ownerKey: string) {
  const [job] = await sql<{ id: string; status: string; provider_job_id: string; steps: { productId: string; category: string }[]; step: number; result_url: string | null; error: string | null }[]>`
    select id, status, provider_job_id, steps, step, result_url, error from tryon_jobs where id = ${jobId} and owner_key = ${ownerKey}`;
  if (!job) return null;
  if (job.status === "completed" || job.status === "failed") return job;
  const s = await fashn<Status>(`/status/${job.provider_job_id}`);
  if (s.status === "failed" || s.status === "canceled") {
    const msg = typeof s.error === "string" ? s.error : s.error?.message ?? "The try-on service couldn’t process this photo.";
    await sql`update tryon_jobs set status = 'failed', error = ${msg} where id = ${job.id}`;
    return { ...job, status: "failed", error: msg };
  }
  if (s.status !== "completed" || !s.output?.[0]) return { ...job, status: "processing" };
  const next = job.step + 1;
  if (next < job.steps.length) {
    const step = job.steps[next];
    const [p] = await sql<{ image: string }[]>`select (select url from product_images i where i.product_id = ${step.productId} order by sort limit 1) as image`;
    const garment = await toJpegDataUrl(await loadImage(p.image));
    const run = await fashn<{ id: string }>("/run", runBody(s.output[0], { productId: step.productId, garment, category: step.category }));
    await sql`update tryon_jobs set provider_job_id = ${run.id}, step = ${next} where id = ${job.id}`;
    return { ...job, status: "processing", step: next };
  }
  await sql`update tryon_jobs set status = 'completed', result_url = ${s.output[0]} where id = ${job.id}`;
  return { ...job, status: "completed", result_url: s.output[0] };
}
