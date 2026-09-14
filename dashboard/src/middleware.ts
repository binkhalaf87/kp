import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { SESSION_COOKIE_NAME, verifySessionToken } from "@/lib/auth";

export const config = {
  matcher: ["/:path*"],
};

const PUBLIC_PATHS = new Set(["/login", "/api/login"]);

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname || "/";

  if (PUBLIC_PATHS.has(pathname) || pathname.startsWith("/_next") || pathname === "/icon.png" || pathname === "/favicon.ico") {
    return NextResponse.next();
  }

  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  if (await verifySessionToken(token)) return NextResponse.next();

  const loginUrl = request.nextUrl.clone();
  loginUrl.pathname = "/login";
  loginUrl.search = "";
  loginUrl.searchParams.set("next", pathname + request.nextUrl.search);
  return NextResponse.redirect(loginUrl);
}
