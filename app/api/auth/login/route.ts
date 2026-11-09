import { NextRequest, NextResponse } from "next/server";
import { getBackendBaseUrl } from "@/lib/config";

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

    // Set secure HttpOnly cookie containing the real JWT
    const response = NextResponse.json({
      success: true,
      user: data.user,
      token_type: data.token_type || "Bearer",
    });

    response.cookies.set("bupulse_token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7, // 7 days
    });

    return response;
  } catch (error: any) {
    console.error("[auth/login] Proxy error:", error);
    return NextResponse.json(
      { message: error?.message || "Failed to reach authentication backend." },
      { status: 500 },
    );
  }
}
