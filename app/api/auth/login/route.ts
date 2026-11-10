import { NextRequest, NextResponse } from "next/server";
import { getBackendBaseUrl } from "@/lib/config";
import { clearLegacyAuthCookies } from "@/lib/serverAuth";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json(
        { message: "Email and password are required." },
        { status: 400 },
      );
    }

    const backendResponse = await fetch(`${getBackendBaseUrl()}/auth/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({ email, password }),
    });

    const data = await backendResponse.json().catch(() => null);

    if (!backendResponse.ok) {
      return NextResponse.json(
        { message: data?.message || "Invalid credentials." },
        { status: backendResponse.status || 401 },
      );
    }

    const token = data?.token;
    if (!token) {
      return NextResponse.json(
        { message: "Authentication succeeded but no token returned." },
        { status: 502 },
      );
    }

    // Return token for per-tab sessionStorage rather than setting a shared browser cookie,
    // enabling independent multi-account sessions per tab and auto-logout on tab close.
    const response = NextResponse.json({
      success: true,
      token,
      user: data.user,
      token_type: data.token_type || "Bearer",
    });

    return clearLegacyAuthCookies(request, response);
  } catch (error: any) {
    console.error("[auth/login] Proxy error:", error);
    return NextResponse.json(
      { message: error?.message || "Failed to reach authentication backend." },
      { status: 500 },
    );
  }
}
