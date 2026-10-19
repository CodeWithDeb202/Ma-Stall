import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

import apiUrl from "@/services/api";

async function proxyRequest(request, context) {
  const { path = [] } = await context.params;
  const incomingUrl = new URL(request.url);
  const targetUrl = `${apiUrl}/api/${path.map(encodeURIComponent).join("/")}${incomingUrl.search}`;

  try {
    const headers = new Headers();
    const contentType = request.headers.get("content-type");
    const cookie = request.headers.get("cookie");

    if (contentType) headers.set("content-type", contentType);
    if (cookie) headers.set("cookie", cookie);

    const method = request.method;
    const body =
      method === "GET" || method === "HEAD"
        ? undefined
        : await request.arrayBuffer();

    const upstream = await fetch(targetUrl, {
      method,
      headers,
      body,
      cache: "no-store",
      signal: AbortSignal.timeout(20000),
    });

    const responseHeaders = new Headers();
    const responseType = upstream.headers.get("content-type");

    if (responseType) responseHeaders.set("content-type", responseType);

    return new Response(upstream.body, {
      status: upstream.status,
      headers: responseHeaders,
    });
  } catch (error) {
    console.error("[API PROXY] Failed:", error.message);

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