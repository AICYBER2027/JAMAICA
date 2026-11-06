import { NextResponse } from "next/server";
import sharp from "sharp";
import { sql } from "@/lib/db";
import { sameOrigin } from "@/lib/http";
import { deleteObject, newObjectPath, putObject, signedPrivateUrl } from "@/lib/storage";
import { sniffMatches } from "@/lib/sniff";
import { CONSENT_VERSION, PHOTO_HOURS, tryonEnabled } from "@/lib/tryon";
import { tryonOwner } from "@/lib/tryon-owner";

const MAX_BYTES = 10 * 1024 * 1024;

async function list(ownerKey: string) {
  const rows = await sql<{ id: string; storage_path: string; expires_at: Date }[]>`
    select id, storage_path, expires_at from tryon_photos where owner_key = ${ownerKey} and expires_at > now() order by created_at desc`;
  return Promise.all(rows.map(async (r) => ({ id: r.id, url: await signedPrivateUrl(r.storage_path, 900), expiresAt: r.expires_at })));
}

export async function GET() {
  const owner = await tryonOwner(false);
  return NextResponse.json({ photos: owner ? await list(owner.key) : [] });
}

/** Upload a personal photo. Requires the explicit consent checkbox. */
export async function POST(req: Request) {
  if (!sameOrigin(req)) return NextResponse.json({ error: "Bad origin" }, { status: 403 });
  if (!tryonEnabled()) return NextResponse.json({ error: "Virtual try-on isn’t switched on." }, { status: 503 });
  const form = await req.formData().catch(() => null);
  const file = form?.get("photo");
  if (form?.get("consent") !== CONSENT_VERSION) return NextResponse.json({ error: "Tick the consent box to upload your photo." }, { status: 400 });
  if (!(file instanceof File)) return NextResponse.json({ error: "Choose a photo." }, { status: 400 });
  if (file.size > MAX_BYTES) return NextResponse.json({ error: "Photos can be up to 10 MB." }, { status: 413 });
  const bytes = Buffer.from(await file.arrayBuffer());
  if (!["image/jpeg", "image/png", "image/webp"].some((t) => sniffMatches(bytes, t))) return NextResponse.json({ error: "Use a JPEG, PNG or WebP photo." }, { status: 415 });
  const owner = await tryonOwner(true);
  if (!owner) return NextResponse.json({ error: "Enable cookies to use your own photo." }, { status: 400 });
  const [{ n }] = await sql<{ n: number }[]>`select count(*)::int as n from tryon_photos where owner_key = ${owner.key} and expires_at > now()`;
  if (n >= 5) return NextResponse.json({ error: "You can keep up to 5 photos. Delete one first." }, { status: 429 });

  // Re-encode: fixes orientation, caps the size and drops all metadata (EXIF, GPS location).
  const clean = await sharp(bytes).rotate().resize({ width: 1536, height: 1536, fit: "inside", withoutEnlargement: true }).jpeg({ quality: 90 }).toBuffer();
  const path = newObjectPath("tryon", "photo.jpg");
  await putObject("private", path, clean, "image/jpeg");
  await sql`insert into tryon_photos (owner_key, user_id, storage_path, consent_version, consented_at, expires_at)
    values (${owner.key}, ${owner.userId}, ${path}, ${CONSENT_VERSION}, now(), now() + ${`${PHOTO_HOURS} hours`}::interval)`;
  return NextResponse.json({ photos: await list(owner.key) });
}

/** Delete a personal photo now. */
export async function DELETE(req: Request) {
  if (!sameOrigin(req)) return NextResponse.json({ error: "Bad origin" }, { status: 403 });
  const owner = await tryonOwner(false);
  const id = new URL(req.url).searchParams.get("id") ?? "";
  if (!owner || !/^[0-9a-f-]{36}$/.test(id)) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const [row] = await sql<{ storage_path: string }[]>`delete from tryon_photos where id = ${id} and owner_key = ${owner.key} returning storage_path`;
  if (row) await deleteObject("private", row.storage_path);
  return NextResponse.json({ photos: await list(owner.key), deleted: !!row });
}
