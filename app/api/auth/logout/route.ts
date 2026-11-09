import { NextRequest, NextResponse } from "next/server";
import { getBackendBaseUrl } from "@/lib/config";

export async function POST(request: NextRequest) {
  const token = request.cookies.get("bupulse_token")?.value;

  // Notify backend in background without blocking client cookie clearing
  if (token) {
    fetch(`${getBackendBaseUrl()}/auth/logout`, {
      method: "POST",
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${token}`,
      },
      signal: AbortSignal.timeout(2000),
    }).catch(() => {
      // Ignore network errors/timeouts when notifying backend on logout
    });
  }

  const response = NextResponse.json({ success: true });
  response.cookies.set("bupulse_token", "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
  response.cookies.set("bupulse_session", "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });

  return response;
}
