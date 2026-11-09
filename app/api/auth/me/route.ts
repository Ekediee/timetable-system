import { NextRequest, NextResponse } from "next/server";
import { getBackendBaseUrl } from "@/lib/config";

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get("bupulse_token")?.value;

    if (!token) {
      return NextResponse.json(
        { message: "Unauthenticated", user: null },
        { status: 401 },
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
      // Invalid/expired token: clear the cookie
      const response = NextResponse.json(
        { message: data?.message || "Session expired", user: null },
        { status: backendResponse.status || 401 },
      );
      response.cookies.set("bupulse_token", "", {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: 0,
      });
      return response;
    }

    return NextResponse.json({
      user: data?.user || null,
    });
  } catch (error: any) {
    console.error("[auth/me] Proxy error:", error);
    return NextResponse.json(
      { message: error?.message || "Failed to reach authentication backend." },
      { status: 500 },
    );
  }
}
