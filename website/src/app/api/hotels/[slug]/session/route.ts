import { NextResponse, type NextRequest } from "next/server";
import { signIn, signOut, verifyPassword } from "@/lib/auth.ts";
import { getHotel } from "@/lib/hotels.ts";
import { isLang } from "@/lib/i18n.ts";

// The admin sign-in form posts here; it redirects back to the admin page either way.
export async function POST(req: NextRequest, ctx: RouteContext<"/api/hotels/[slug]/session">) {
  const { slug } = await ctx.params;
  const hotel = await getHotel(slug);
  if (!hotel) return NextResponse.json({ error: "Hotel not found" }, { status: 404 });

  const form = await req.formData();
  const lang = isLang(form.get("lang")) ? (form.get("lang") as string) : hotel.languages[0];
  const back = new URL(`/${lang}/h/${hotel.slug}/admin`, req.url);

  if (form.get("action") === "signout") {
    await signOut(hotel.slug);
    return NextResponse.redirect(back, 303);
  }
  // Slow every attempt a little to make guessing passwords pointless.
  await new Promise((r) => setTimeout(r, 400));
  const password = String(form.get("password") ?? "");
  if (!verifyPassword(password, hotel.adminPasswordHash)) {
    back.searchParams.set("error", "1");
    return NextResponse.redirect(back, 303);
  }
  await signIn(hotel);
  return NextResponse.redirect(back, 303);
}
