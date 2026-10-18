
import { NextResponse } from "next/server";
import apiUrl from "@/services/api";

export const dynamic = "force-dynamic";

async function proxyRequest(request, context) {
  const { path = [] } = await context.params;
  const requestId = crypto.randomUUID();
  const incomingUrl = new URL(request.url);
  const targetUrl = `${apiUrl}/api/${path.map(encodeURIComponent).join("/")}${incomingUrl.search}`;

  try {
    const headers = new Headers();

    const contentType = request.headers.get("content-type");
    if (contentType) headers.set("content-type", contentType);

    // Forward the session cookie to the backend privately.
    const cookie = request.headers.get("cookie");
    if (cookie) headers.set("cookie", cookie);

    const method = request.method;
    const body =
      method === "GET" || method === "HEAD"
        ? undefined
        : await request.arrayBuffer();

    console.info("[API PROXY] Request", {
      requestId,
      method,
      path: `/api/${path.join("/")}`,
    });

    const upstream = await fetch(targetUrl, {
      method,
      headers,
      body,
      cache: "no-store",
      signal: AbortSignal.timeout(20000),
    });

    console.info("[API PROXY] Response", {
      requestId,
      status: upstream.status,
      path: `/api/${path.join("/")}`,
    });

    const responseHeaders = new Headers();
    const responseType = upstream.headers.get("content-type");

    if (responseType) {
      responseHeaders.set("content-type", responseType);
    }

    return new Response(upstream.body, {
      status: upstream.status,
      headers: responseHeaders,
    });
  } catch (error) {
    console.error("[API PROXY] Failed", {
      requestId,
      message: error.message,
      code: error.cause?.code,
    });

    return NextResponse.json(
      { success: false, message: "Backend request failed." },
      { status: 502 },
    );
  }
}

export const GET = proxyRequest;
export const POST = proxyRequest;
export const PUT = proxyRequest;
export const PATCH = proxyRequest;
export const DELETE = proxyRequest;