import { NextRequest, NextResponse } from "next/server";
import { getBackendBaseUrl } from "@/lib/config";
import { clearLegacyAuthCookies, extractBearerToken } from "@/lib/serverAuth";

export async function GET(request: NextRequest) {
  try {
    const token = extractBearerToken(request);

    if (!token) {
      return clearLegacyAuthCookies(
        request,
        NextResponse.json(
          { message: "Unauthenticated", user: null },
          { status: 401 },
        ),
      );
    }

    const backendResponse = await fetch(`${getBackendBaseUrl()}/auth/me`, {
      method: "GET",
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${token}`,
      },
    });

    const data = await backendResponse.json().catch(() => null);

    if (!backendResponse.ok) {
      return clearLegacyAuthCookies(
        request,
        NextResponse.json(
          { message: data?.message || "Session expired", user: null },
          { status: backendResponse.status || 401 },
        ),
      );
    }

    return clearLegacyAuthCookies(
      request,
      NextResponse.json({
        user: data?.user || null,
      }),
    );
  } catch (error: any) {
    console.error("[auth/me] Proxy error:", error);
    return NextResponse.json(
      { message: error?.message || "Failed to reach authentication backend." },
      { status: 500 },
    );
  }
}
