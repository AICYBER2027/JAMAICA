import { NextResponse, type NextRequest } from "next/server";
import { isSignedIn } from "@/lib/auth.ts";
import { addDays, isISODate, todayIn } from "@/lib/dates.ts";
import { getHotel } from "@/lib/hotels.ts";
import { setManualBlock, StoreUnavailableError } from "@/lib/store.ts";

// Marks one night of one room as booked (or free again). Hotel admins only.
export async function POST(req: NextRequest, ctx: RouteContext<"/api/hotels/[slug]/blocks">) {
  const { slug } = await ctx.params;
  const hotel = await getHotel(slug);
  if (!hotel) return NextResponse.json({ error: "Hotel not found" }, { status: 404 });
  if (!(await isSignedIn(hotel))) return NextResponse.json({ error: "Sign in again" }, { status: 401 });

  const body = (await req.json().catch(() => null)) as { room?: unknown; night?: unknown; booked?: unknown } | null;
  const room = hotel.rooms.find((r) => r.id === body?.room);
  const night = body?.night;
  const today = todayIn(hotel.timeZone);
  if (!room || !isISODate(night) || typeof body?.booked !== "boolean") {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }
  if (night < addDays(today, -1) || night > addDays(today, 730)) {
    return NextResponse.json({ error: "Date out of range" }, { status: 400 });
  }
  try {
    await setManualBlock(hotel.slug, room.id, night, body.booked);
  } catch (err) {
    if (err instanceof StoreUnavailableError) return NextResponse.json({ error: err.message }, { status: 503 });
    console.error(err);
    return NextResponse.json({ error: "the database did not answer. Try again." }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
