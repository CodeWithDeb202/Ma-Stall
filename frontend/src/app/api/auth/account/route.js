import { NextResponse } from "next/server";
import axios from "axios";
import apiUrl from "@/services/api";

async function proxyRequest(request, method) {
  try {
    const headers = {
      cookie: request.headers.get("cookie") || "",
    };

    const options = {
      method,
      url: `${apiUrl}/api/auth/account`,
      timeout: 15000,
      validateStatus: () => true,
      headers,
    };

    if (method === "PATCH") {
      options.data = await request.json();
      headers["Content-Type"] = "application/json";
    }

    const backendResponse = await axios(options);

    const responseHeaders = new Headers();
    const setCookie = backendResponse.headers["set-cookie"];

    if (setCookie) {
      const cookies = Array.isArray(setCookie) ? setCookie : [setCookie];
      for (const cookie of cookies) {
        responseHeaders.append("Set-Cookie", cookie);
      }
    }

    return NextResponse.json(backendResponse.data ?? {}, {
      status: backendResponse.status,
      headers: responseHeaders,
    });
  } catch (error) {
    console.error("[AUTH ACCOUNT PROXY ERROR]", {
      method,
      message: error.message,
      code: error.code,
    });

    return NextResponse.json(
      { success: false, message: "Unable to connect to server." },
      { status: 502 },
    );
  }
}

export async function GET(request) {
  return proxyRequest(request, "GET");
}

export async function PATCH(request) {
  return proxyRequest(request, "PATCH");
}

export async function DELETE(request) {
  return proxyRequest(request, "DELETE");
}
