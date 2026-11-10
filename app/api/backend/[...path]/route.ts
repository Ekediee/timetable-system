import { NextRequest, NextResponse } from "next/server";
import { getBackendBaseUrl } from "@/lib/config";
import { clearLegacyAuthCookies, extractBearerToken } from "@/lib/serverAuth";

async function proxyRequest(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> },
) {
  try {
    const { path } = await context.params;
    const subpath = Array.isArray(path) ? path.join("/") : path;
    const search = request.nextUrl.search;
    const targetUrl = `${getBackendBaseUrl()}/${subpath}${search}`;

    const token = extractBearerToken(request);

    const headers: Record<string, string> = {
      Accept: "application/json",
    };

    const contentType = request.headers.get("content-type");
    if (contentType) {
      headers["Content-Type"] = contentType;
    }

    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    const init: RequestInit = {
      method: request.method,
      headers,
    };

    if (request.method !== "GET" && request.method !== "HEAD") {
      init.body = await request.arrayBuffer();
    }

    const backendResponse = await fetch(targetUrl, init);
    const responseBody = await backendResponse.arrayBuffer();

    const forwardHeaders = new Headers();
    const respContentType = backendResponse.headers.get("content-type");
    if (respContentType) {
      forwardHeaders.set("content-type", respContentType);
    }

    const response = new NextResponse(responseBody, {
      status: backendResponse.status,
      statusText: backendResponse.statusText,
      headers: forwardHeaders,
    });

    return clearLegacyAuthCookies(request, response);
  } catch (error: any) {
    console.error("[api/backend proxy] Error:", error);
    return NextResponse.json(
      {
        message:
          error?.message || "Failed to communicate with timetable backend.",
      },
      { status: 502 },
    );
  }
}

export const GET = proxyRequest;
export const POST = proxyRequest;
export const PUT = proxyRequest;
export const DELETE = proxyRequest;
export const PATCH = proxyRequest;
