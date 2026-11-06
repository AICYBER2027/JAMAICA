import { NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { releaseExpiredOrders } from "@/lib/orders";
import { deleteObject } from "@/lib/storage";

// Called hourly by Vercel Cron (see vercel.json):
// cancels unpaid orders whose reservation ran out, and deletes try-on photos past their 24 hours.
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const released = await releaseExpiredOrders();
  const expired = await sql<{ id: string; storage_path: string }[]>`delete from tryon_photos where expires_at < now() returning id, storage_path`;
  for (const p of expired) await deleteObject("private", p.storage_path).catch(() => {});
  await sql`delete from tryon_jobs where created_at < now() - interval '7 days'`;
  return NextResponse.json({ releasedOrders: released, deletedPhotos: expired.length });
}
