import { NextResponse } from "next/server";
import { z } from "zod";
import { sameOrigin } from "@/lib/http";
import { countToday, DAILY_LIMIT, startJob, tryonEnabled } from "@/lib/tryon";
import { tryonOwner } from "@/lib/tryon-owner";

const Body = z.object({ productIds: z.array(z.string().uuid()).min(1).max(2), modelId: z.string().uuid().optional(), photoId: z.string().uuid().optional() })
  .refine((b) => !!b.modelId !== !!b.photoId, "Choose a model or one of your photos.");

export async function POST(req: Request) {
  if (!sameOrigin(req)) return NextResponse.json({ error: "Bad origin" }, { status: 403 });
  if (!tryonEnabled()) return NextResponse.json({ error: "Virtual try-on isn’t switched on." }, { status: 503 });
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  const owner = await tryonOwner(true);
  if (!owner) return NextResponse.json({ error: "Enable cookies to use try-on." }, { status: 400 });
  if ((await countToday(owner.key)) >= DAILY_LIMIT) return NextResponse.json({ error: `You’ve used today’s ${DAILY_LIMIT} try-ons. Come back tomorrow.` }, { status: 429 });
  try {
    const id = await startJob({ ownerKey: owner.key, ...parsed.data });
    return NextResponse.json({ id });
  } catch (e) {
    console.error("try-on start failed", e);
    const msg = (e as Error).message;
    return NextResponse.json({ error: msg.startsWith("FASHN") ? "The try-on service didn’t accept the request. Try again in a moment." : msg }, { status: 502 });
  }
}
