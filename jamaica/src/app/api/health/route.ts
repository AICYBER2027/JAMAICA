import { NextResponse } from "next/server";
import { sql } from "@/lib/db";

export const dynamic = "force-dynamic";

/** Public uptime check: says only whether the store can reach its database. Details are in Dashboard → Settings. */
export async function GET() {
  try {
    await sql`select 1 from products limit 1`;
    return NextResponse.json({ ok: true, database: "ok" }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ ok: false, database: "unreachable" }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
}
