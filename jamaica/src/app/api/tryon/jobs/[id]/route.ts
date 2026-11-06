import { NextResponse } from "next/server";
import { advanceJob, tryonEnabled } from "@/lib/tryon";
import { tryonOwner } from "@/lib/tryon-owner";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!tryonEnabled()) return NextResponse.json({ error: "Virtual try-on isn’t switched on." }, { status: 503 });
  const { id } = await params;
  const owner = await tryonOwner(false);
  if (!owner || !/^[0-9a-f-]{36}$/.test(id)) return NextResponse.json({ error: "Not found" }, { status: 404 });
  try {
    const job = await advanceJob(id, owner.key);
    if (!job) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ status: job.status, step: job.step, steps: job.steps.length, result: job.result_url, error: job.error });
  } catch (e) {
    console.error("try-on status failed", e);
    return NextResponse.json({ status: "processing" });
  }
}
