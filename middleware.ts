import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { clearLegacyAuthCookies } from "@/lib/serverAuth";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Pass through Next.js internals, API routes, and static assets
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api") ||
    pathname === "/favicon.ico"
  ) {
    return NextResponse.next();
  }

  // Auth tokens are stored per-tab in sessionStorage so multiple accounts can run
  // concurrently in separate tabs and closing a tab ends its session automatically.
  // Clear any legacy shared auth cookies to prevent cross-tab bleed or redirect loops.
  return clearLegacyAuthCookies(request, NextResponse.next());
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};

