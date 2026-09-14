import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { SESSION_COOKIE_NAME, verifySessionToken } from "@/lib/auth";
import { BASE_PATH } from "@/lib/basePath";

// Runs only under /dashboard — the marketing site at the true root never
// hits this middleware. Next.js requires the matcher to be a static literal
// (it's extracted without executing the module), so this can't be built
// from the BASE_PATH constant — keep the two in sync manually.
export const config = {
  matcher: ["/dashboard/:path*"],
};

const PUBLIC_PATHS = new Set([`${BASE_PATH}/login`, `${BASE_PATH}/api/login`]);

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  if (PUBLIC_PATHS.has(pathname) || pathname === `${BASE_PATH}/icon.png`) {
    return NextResponse.next();
  }

  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  if (await verifySessionToken(token)) return NextResponse.next();

  const loginUrl = request.nextUrl.clone();
  loginUrl.pathname = `${BASE_PATH}/login`;
  loginUrl.search = "";
  loginUrl.searchParams.set("next", pathname + request.nextUrl.search);
  return NextResponse.redirect(loginUrl);
}
