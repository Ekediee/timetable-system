import { NextRequest, NextResponse } from "next/server";
import { getBackendBaseUrl } from "@/lib/config";
import { clearLegacyAuthCookies, extractBearerToken } from "@/lib/serverAuth";

export async function POST(request: NextRequest) {
  const token = extractBearerToken(request);

  // Revoke only this tab's Sanctum token on the backend without blocking response
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

  return clearLegacyAuthCookies(request, NextResponse.json({ success: true }));
}
