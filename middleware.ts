import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

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

  const rawToken =
    request.cookies.get("bupulse_token")?.value?.trim() ||
    request.cookies.get("bupulse_session")?.value?.trim();
  const token =
    rawToken && rawToken !== "deleted" && rawToken !== '""' ? rawToken : null;

  const isLoginPage = pathname === "/login";

  // Explicit logout request always strips cookies and renders /login
  if (isLoginPage && request.nextUrl.searchParams.has("logout")) {
    const response = NextResponse.next();
    response.cookies.set("bupulse_token", "", { maxAge: 0, path: "/" });
    response.cookies.set("bupulse_session", "", { maxAge: 0, path: "/" });
    return response;
  }

  // Redirect unauthenticated requests for protected routes to /login?redirect=...
  if (!token && !isLoginPage) {
    const loginUrl = new URL("/login", request.url);
    if (pathname !== "/") {
      loginUrl.searchParams.set("redirect", pathname);
    }
    return NextResponse.redirect(loginUrl);
  }

  // Redirect authenticated requests away from /login to role-aware root /
  if (token && isLoginPage) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};

