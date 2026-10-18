
import axios from "axios";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import apiUrl from "@/services/api";

export default async function verifySession() {
  const requestId = crypto.randomUUID();

  console.info(`[AUTH:${requestId}] Session verification started`);

  const cookieStore = await cookies();
  const session = cookieStore.get("ma_stall_session")?.value;

  console.info(`[AUTH:${requestId}] Cookie status`, {
    cookiePresent: Boolean(session),
    backendUrl: apiUrl,
  });

  if (!session) {
    console.warn(`[AUTH:${requestId}] No session cookie; redirecting to /`);
    redirect("/");
  }

  try {
    const response = await axios.get(
      `${apiUrl}/api/auth/session`,
      {
        headers: {
          Cookie: `ma_stall_session=${session}`,
        },
        timeout: 15000,
        validateStatus: () => true,
      }
    );

    console.info(`[AUTH:${requestId}] Backend session response`, {
      status: response.status,
      authenticated: response.data?.authenticated,
    });

    if (response.status !== 200) {
      console.warn(`[AUTH:${requestId}] Session rejected`, {
        status: response.status,
        message: response.data?.message,
      });

      redirect("/");
    }

    console.info(`[AUTH:${requestId}] Session verification successful`);
    return true;
  } catch (error) {
    if (error.message === "NEXT_REDIRECT") {
      throw error;
    }

    console.error(`[AUTH:${requestId}] Backend session request failed`, {
      message: error.message,
      code: error.code,
      status: error.response?.status,
      backendUrl: apiUrl,
    });

    redirect("/");
  }
}
