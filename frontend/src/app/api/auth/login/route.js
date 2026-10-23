import { NextResponse } from "next/server";
import axios from "axios";
import apiUrl from "@/services/api";

export async function POST(request) {
  try {
    const body = await request.json();
    const backendResponse = await axios.post(`${apiUrl}/api/auth/login`, body, {
      headers: { "Content-Type": "application/json" },
      timeout: 15000,
      validateStatus: () => true,
    });
    const response = NextResponse.json(backendResponse.data ?? {}, {
      status: backendResponse.status,
    });
    const setCookies = backendResponse.headers["set-cookie"];
    if (setCookies) {
      const isLocal = new URL(request.url).hostname === "localhost";
      for (const setCookie of (Array.isArray(setCookies) ? setCookies : [setCookies])) {
        const cookie = isLocal
          ? setCookie.replace(/;\s*Secure/gi, "").replace(/;\s*SameSite=None/gi, "; SameSite=Lax")
          : setCookie;
        response.headers.append("Set-Cookie", cookie);
      }
    }
    return response;
  } catch (error) {
    console.error("[AUTH LOGIN PROXY ERROR]", { message: error.message, code: error.code });
    return NextResponse.json({ success: false, message: "Unable to connect to server." }, { status: 502 });
  }
}
