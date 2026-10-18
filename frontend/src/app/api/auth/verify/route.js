import { NextResponse } from "next/server";
import axios from "axios";
import apiUrl from "@/services/api";

export async function POST(request) {
    try {
        const body = await request.json();

        const backendResponse = await axios.post(
            `${apiUrl}/api/auth/verify`,
            body,
            {
                headers: { "Content-Type": "application/json" },
                timeout: 15000,
                validateStatus: () => true,
            }
        );

        console.info("[AUTH VERIFY PROXY RESPONSE]", { status: backendResponse.status, success: backendResponse.data?.success, setCookiePresent: Boolean(backendResponse.headers["set-cookie"]) });
        const data = backendResponse.data ?? {};
        const response = NextResponse.json(data, {
            status: backendResponse.status,
        });

        const setCookies = backendResponse.headers["set-cookie"];

        if (setCookies) {
            const isLocal = new URL(request.url).hostname === "localhost";
            const cookies = Array.isArray(setCookies) ? setCookies : [setCookies];

            for (const setCookie of cookies) {
                const cookie = isLocal
                    ? setCookie
                        .replace(/;\s*Secure/gi, "")
                        .replace(/;\s*SameSite=None/gi, "; SameSite=Lax")
                    : setCookie;

                response.headers.append("Set-Cookie", cookie);
            }
        }

        return response;
    } catch (error) {
        console.error("[AUTH VERIFY PROXY ERROR]", {
            message: error.message,
            code: error.code,
            url: `${apiUrl}/api/auth/verify`,
        });

        return NextResponse.json(
            { success: false, message: "Unable to connect to server." },
            { status: 502 }
        );
    }
}
