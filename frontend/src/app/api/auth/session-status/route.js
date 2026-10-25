import { NextResponse } from "next/server";
import axios from "axios";
import apiUrl from "@/services/api";

export const dynamic = "force-dynamic";

export async function GET(request) {
  try {
    const backendResponse = await axios.get(`${apiUrl}/api/auth/session`, {
      headers: {
        cookie: request.headers.get("cookie") || "",
      },
      timeout: 10000,
      validateStatus: () => true,
    });

    if (backendResponse.status === 401) {
      return NextResponse.json(
        { success: true, authenticated: false, role: null, userId: null },
        { status: 200, headers: { "Cache-Control": "no-store" } },
      );
    }

    if (backendResponse.status !== 200) {
      return NextResponse.json(
        { success: false, authenticated: false },
        { status: backendResponse.status, headers: { "Cache-Control": "no-store" } },
      );
    }

    const data = backendResponse.data ?? {};
    const validSession =
      data.success === true &&
      data.authenticated === true &&
      ["user", "admin"].includes(data.role);

    return NextResponse.json(
      validSession
        ? {
            success: true,
            authenticated: true,
            role: data.role,
            userId: data.role === "user" ? data.userId : null,
          }
        : { success: true, authenticated: false, role: null, userId: null },
      { status: 200, headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    console.error("[SESSION STATUS ERROR]", {
      message: error.message,
      code: error.code,
    });

    return NextResponse.json(
      { success: false, authenticated: false },
      { status: 502, headers: { "Cache-Control": "no-store" } },
    );
  }
}
