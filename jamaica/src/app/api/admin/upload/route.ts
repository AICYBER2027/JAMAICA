import { NextResponse } from "next/server";
import { z } from "zod";
import { can, getUser, type Permission } from "@/lib/auth";
import { createUploadTicket, putObject, readLocalTicket, UPLOAD_KINDS, type UploadKind } from "@/lib/storage";
import { sniffMatches } from "@/lib/sniff";

const KIND_PERMISSION: Record<UploadKind, Permission> = { photo: "products", frame: "products", model: "products", category: "products", tryonModel: "settings" };

const TicketRequest = z.object({
  kind: z.enum(Object.keys(UPLOAD_KINDS) as [UploadKind, ...UploadKind[]]),
  filename: z.string().min(1).max(200),
  contentType: z.string().max(100),
  size: z.number().int().positive(),
  folder: z.string().regex(/^[a-z0-9-]{0,60}$/).optional(),
});

/** Staff ask for an upload ticket here. */
export async function POST(req: Request) {
  const parsed = TicketRequest.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid upload request." }, { status: 400 });
  const user = await getUser();
  if (!can(user, KIND_PERMISSION[parsed.data.kind])) return NextResponse.json({ error: "You don't have permission to upload this." }, { status: 403 });
  try {
    const { kind, filename, contentType, size, folder } = parsed.data;
    return NextResponse.json(await createUploadTicket(kind, filename, contentType, size, folder));
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}

/** Local storage only: receives the file body for a signed ticket. */
export async function PUT(req: Request) {
  const ticket = readLocalTicket(new URL(req.url).searchParams.get("t") ?? "");
  if (!ticket) return NextResponse.json({ error: "Upload link expired. Try again." }, { status: 403 });
  const user = await getUser();
  if (!can(user, KIND_PERMISSION[ticket.kind])) return NextResponse.json({ error: "Not allowed." }, { status: 403 });
  const body = Buffer.from(await req.arrayBuffer());
  if (body.length > ticket.size + 1024 || body.length > UPLOAD_KINDS[ticket.kind].maxMB * 1024 * 1024) return NextResponse.json({ error: "File is larger than announced." }, { status: 413 });
  if (!sniffMatches(body, ticket.type)) return NextResponse.json({ error: "The file's contents don't match its type." }, { status: 415 });
  await putObject(UPLOAD_KINDS[ticket.kind].bucket, ticket.path, body, ticket.type);
  return NextResponse.json({ ok: true });
}
