import { NextResponse, type NextRequest } from "next/server";
import { DEFAULT_LANG, LANGS } from "./lib/i18n.ts";

// Sends visitors without a language in the address (/, /h/pousada-mare) to the
// one their browser prefers: /pt, /pt/h/pousada-mare…
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const first = pathname.split("/")[1];
  if ((LANGS as readonly string[]).includes(first)) return;

  const wanted = (request.headers.get("accept-language") ?? "")
    .split(",")
    .map((part) => part.trim().slice(0, 2).toLowerCase());
  const lang = wanted.find((l) => (LANGS as readonly string[]).includes(l)) ?? DEFAULT_LANG;
  request.nextUrl.pathname = `/${lang}${pathname === "/" ? "" : pathname}`;
  return NextResponse.redirect(request.nextUrl);
}

export const config = {
  matcher: ["/((?!api|_next|hotels|favicon|.*\\..*).*)"],
};
