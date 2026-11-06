import { NextResponse } from "next/server";
import { releaseExpiredOrders } from "@/lib/orders";

// Called by Vercel Cron (see vercel.json). Cancels unpaid orders whose reservation ran out.
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const released = await releaseExpiredOrders();
  return NextResponse.json({ released });
}
