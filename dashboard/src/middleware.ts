import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { SESSION_COOKIE_NAME, verifySessionToken } from "@/lib/auth";

// Match everything and filter inside the function instead of relying on a
// matcher regex: with `basePath` set, the root path of the app is reported
// to the matcher compiler as an empty string rather than "/", which a
// leading-slash regex (the usual Next.js middleware pattern) silently fails
// to match — leaving the dashboard root completely unauthenticated. Confirmed
// by testing against a live server before shipping this.
export const config = {
  matcher: ["/:path*"],
};

const PUBLIC_PATHS = new Set(["/login", "/api/login"]);

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname || "/";

  if (
    PUBLIC_PATHS.has(pathname) ||
    pathname.startsWith("/_next") ||
    pathname === "/icon.png" ||
    pathname === "/favicon.ico"
  ) {
    return NextResponse.next();
  }

  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  if (await verifySessionToken(token)) return NextResponse.next();

  // .clone() carries the request's basePath; NextResponse.redirect adds it
  // back onto the Location header automatically — do not prepend it here
  // too, or it ends up doubled (e.g. /dashboard/dashboard/login).
  const loginUrl = request.nextUrl.clone();
  loginUrl.pathname = "/login";
  loginUrl.search = "";
  loginUrl.searchParams.set("next", pathname + request.nextUrl.search);
  return NextResponse.redirect(loginUrl);
}
