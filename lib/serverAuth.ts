import type { NextRequest, NextResponse } from "next/server";

const LEGACY_AUTH_COOKIES = ["bupulse_token", "bupulse_session"] as const;

/**
 * Extracts a Bearer token from the incoming request's Authorization header.
 */
export function extractBearerToken(request: NextRequest): string | null {
  const authHeader = request.headers.get("authorization")?.trim();
  if (!authHeader) return null;

  if (authHeader.toLowerCase().startsWith("bearer ")) {
    const token = authHeader.slice(7).trim();
    return token || null;
  }

  return null;
}

/**
 * Expires legacy shared HttpOnly auth cookies so stale browser-wide cookies
 * cannot leak across tabs or cause /login redirect loops.
 */
export function clearLegacyAuthCookies(
  request: NextRequest,
  response: NextResponse,
): NextResponse {
  for (const cookieName of LEGACY_AUTH_COOKIES) {
    if (request.cookies.has(cookieName)) {
      response.cookies.set(cookieName, "", {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: 0,
      });
    }
  }
  return response;
}
